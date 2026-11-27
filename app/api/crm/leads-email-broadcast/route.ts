import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { brevoReady, marketingEmailGate, sendEmail, unsubscribeUrl } from "../../../../lib/brevo";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Envoi groupé ponctuel d'un e-mail commercial à une liste de prospects, validé par le fondateur.
 * Jeton à usage unique admin_once_tokens (purpose « leads-email-broadcast », payload { lead_ids, subject, html, key }).
 * Le html peut contenir {{prenom}} et reçoit automatiquement un pied de page avec le lien de désinscription.
 * Exclus : désinscrits, e-mail invalide, doublons d'e-mail, prospects ayant déjà reçu la même « key ».
 * Budget Brevo (marketingEmailGate) : n'envoie que ce que le quota du jour permet en gardant la réserve transactionnelle.
 * S'il reste des prospects (budget atteint ou temps écoulé), le jeton est libéré : le même lien relancé un autre jour
 * (avant expiration) envoie la suite, sans doublon grâce à la « key ».
 */
const validEmail = (e: unknown) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
const first = (n: unknown) => { const f = String(n || "").trim().split(/\s+/)[0] || ""; return f && !/@|\d/.test(f) ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : ""; };

async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  await applyStoredSecrets();
  if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "leads-email-broadcast").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: { lead_ids?: number[]; subject?: string; html?: string; key?: string } } | undefined)?.payload;
  const ids = (p?.lead_ids || []).map(Number).filter(Boolean);
  if (!ids.length || !p?.subject || !p?.html || !p?.key) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: leads } = await db.from("leads").select("id,nom,email,history,opted_out_at").in("id", ids).is("opted_out_at", null);
  const seen = new Set<string>(); const results: { id: number; sent: boolean; error?: string }[] = []; const started = Date.now();
  const gate = marketingEmailGate("leads-email-broadcast"); let deferred = 0;
  for (const l of leads || []) {
    if (Date.now() - started > 270_000) { results.push({ id: l.id, sent: false, error: "temps écoulé" }); deferred++; continue; }
    const email = String(l.email || "").trim().toLowerCase(); const h = Array.isArray(l.history) ? l.history : [];
    if (!validEmail(email) || seen.has(email) || h.some((x: { type?: string; key?: string }) => x?.type === "email_broadcast" && x?.key === p.key)) { results.push({ id: l.id, sent: false, error: "exclu" }); continue; }
    seen.add(email);
    if (!(await gate.take())) { results.push({ id: l.id, sent: false, error: "reporté (quota Brevo)" }); deferred++; continue; }
    const name = first(l.nom);
    const html = p.html.replace(/\{\{prenom\}\}/g, name ? ` ${name}` : "") + `<p style="font-size:12px;color:#64748b;margin-top:28px">NeoDrive — MK HOLDING SAS (SIREN 908 645 393). Vous recevez ce message suite à votre demande d'information. <a href="${unsubscribeUrl(l.id)}" style="color:#64748b">Ne plus recevoir de messages de NeoDrive</a></p>`;
    try {
      const at = new Date().toISOString();
      const mid = await sendEmail(email, String(l.nom || ""), p.subject, html);
      await db.from("crm_messages").insert({ lead_id: l.id, direction: "outbound", channel: "email", body: p.subject, provider_message_id: mid, status: "sent", ai_generated: false });
      await db.from("leads").update({ history: [...h, { type: "email_broadcast", key: p.key, sent_at: at }].slice(-60), last_contact_at: at, updated_at: at }).eq("id", l.id);
      results.push({ id: l.id, sent: true });
    } catch (e) { results.push({ id: l.id, sent: false, error: (e as Error).message.slice(0, 120) }); }
  }
  const quota = await gate.finish(deferred);
  // Il reste des prospects : on libère le jeton pour un prochain passage (la « key » empêche tout doublon).
  if (deferred > 0) await db.from("admin_once_tokens").update({ used_at: null }).eq("token", token).eq("purpose", "leads-email-broadcast");
  const failed = results.filter(r => !r.sent && r.error !== "exclu" && r.error !== "reporté (quota Brevo)" && r.error !== "temps écoulé");
  return NextResponse.json({ ok: true, sent: results.filter(r => r.sent).length, deferred, excluded: results.filter(r => r.error === "exclu").length, failed: failed.length, skipped: results.filter(r => !r.sent).length, resume: deferred > 0 ? "Relancer le même lien demain (avant expiration) pour envoyer la suite, sans doublon." : null, quota, results: failed });
}
export const GET = run;
export const POST = run;
