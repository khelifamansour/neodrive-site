import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { brevoReady, marketingEmailGate, sendEmail } from "../../../../lib/brevo";
import { emailContent } from "../../../../lib/multichannel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Envoi ponctuel du 1er e-mail (catalogue + vidéos) à une liste de prospects, déclenché par un jeton à usage unique (admin_once_tokens.purpose « email-now », payload = { lead_ids }). Le suivi automatique reprend ensuite à l'étape 2.
 * Budget Brevo : n'envoie que ce que le quota permet (réserve transactionnelle gardée) ; s'il en reste, le jeton est libéré pour relancer le même lien plus tard, sans doublon (prospects ayant déjà reçu un e-mail exclus). */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "email-now").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const ids = ((data?.[0] as any)?.payload?.lead_ids || []).map(Number).filter(Boolean) as number[];
  if (!ids.length) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: leads } = await db.from("leads").select("*").in("id", ids).is("opted_out_at", null);
  const results: { id: number; sent: boolean; error?: string }[] = [];
  const gate = marketingEmailGate("email-now"); let deferred = 0;
  for (const l of leads || []) {
    const h = Array.isArray(l.history) ? l.history : [];
    if (h.some((x: any) => x?.type === "email") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(l.email || "").trim())) { results.push({ id: l.id, sent: false, error: "déjà envoyé ou e-mail invalide" }); continue; }
    if (!(await gate.take())) { results.push({ id: l.id, sent: false, error: "reporté (quota Brevo)" }); deferred++; continue; }
    try {
      const at = new Date().toISOString(); const c = emailContent(1, l);
      const mid = await sendEmail(String(l.email).trim(), String(l.nom || ""), c.subject, c.html);
      await db.from("crm_messages").insert({ lead_id: l.id, direction: "outbound", channel: "email", body: c.subject, provider_message_id: mid, status: "sent", ai_generated: false });
      await db.from("leads").update({ history: [...h, { type: "email", step: 1, sent_at: at }].slice(-60), last_contact_at: at, updated_at: at }).eq("id", l.id);
      results.push({ id: l.id, sent: true });
    } catch (e: any) { results.push({ id: l.id, sent: false, error: e?.message || "erreur" }); }
  }
  const quota = await gate.finish(deferred);
  if (deferred > 0) await db.from("admin_once_tokens").update({ used_at: null }).eq("token", token).eq("purpose", "email-now");
  return NextResponse.json({ ok: true, sent: results.filter(r => r.sent).length, deferred, quota, results: results.filter(r => r.error !== "reporté (quota Brevo)") });
}
export const GET = run;
export const POST = run;
