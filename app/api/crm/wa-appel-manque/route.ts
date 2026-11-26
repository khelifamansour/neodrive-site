import { NextResponse } from "next/server";
import { crmDatabase, normalizePhone } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { relay, templateStatus } from "../../../../lib/package-sender";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * WhatsApp aux personnes qui ont appelé sans réponse (ligne Quicktalk), via le modèle Meta « neodrive_appel_manque ».
 * Jeton à usage unique admin_once_tokens.purpose « wa-appel-manque », payload { phones: string[], create?: boolean, spacing?: number }.
 * create=true soumet le modèle à Meta s'il n'existe pas (rien n'est envoyé tant qu'il n'est pas APPROVED).
 * Envoi espacé (25 s par défaut, 6 numéros max par appel), jamais au 06 76 19 22 34 ni aux contacts désinscrits.
 * Chaque envoi est noté dans la fiche du prospect (history + crm_messages).
 */
const SITE = "https://www.easydrive-auto.fr";
export const APPEL_MANQUE_TEMPLATE = "neodrive_appel_manque";
const BODY = [
  "Bonjour {{1}},",
  "",
  "Vous avez essayé de joindre NeoDrive et nous n'avons pas pu décrocher, désolés : nous étions en livraison.",
  "",
  `🌐 Notre site : ${SITE}`,
  `🎬 Une cliente livrée cette semaine vous raconte : ${SITE}/temoignage`,
  `📄 Notre catalogue : ${SITE}/catalogue`,
  "",
  "Voiture sans permis 100 % électrique, livrée chez vous partout en France, paiement à la livraison.",
  "",
  "Répondez simplement à ce message avec votre code postal : nous vous donnons le prix livré chez vous et le délai.",
  "",
  "L'équipe NeoDrive",
].join("\n");
const EXCLUDED = new Set(["676192234", "628261446", "689781710"]);
const last9 = (p: unknown) => String(p || "").replace(/\D/g, "").slice(-9);

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "wa-appel-manque").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: { phones?: string[]; create?: boolean; spacing?: number } } | undefined)?.payload;
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  await applyStoredSecrets();
  const tpl = await templateStatus(APPEL_MANQUE_TEMPLATE, !!p.create, [
    { type: "BODY", text: BODY, example: { body_text: [["à vous"]] } },
    { type: "FOOTER", text: "Répondez STOP pour ne plus recevoir nos messages" },
  ], "MARKETING").catch(e => ({ name: APPEL_MANQUE_TEMPLATE, status: "ERREUR", reason: (e as Error).message }));
  if (tpl.status !== "APPROVED") return NextResponse.json({ ok: true, template: tpl, sent: 0, note: "Modèle pas encore approuvé par Meta : rien n'a été envoyé." });

  const phones = [...new Set((p.phones || []).map(x => last9(x)).filter(x => x.length === 9 && !EXCLUDED.has(x)))].slice(0, 6);
  const spacing = Math.min(45, Math.max(10, Number(p.spacing) || 25)) * 1000;
  const results: { phone: string; sent: boolean; error?: string }[] = [];
  for (const [i, k] of phones.entries()) {
    if (i) await new Promise(r => setTimeout(r, spacing));
    const { data: leads } = await db.from("leads").select("id,history,opted_out_at,telephone").ilike("telephone", `%${k}`).limit(5);
    if ((leads || []).some(l => l.opted_out_at)) { results.push({ phone: k, sent: false, error: "désinscrit" }); continue; }
    const to = normalizePhone("0" + k);
    const r = await relay("send-template", { to, name: APPEL_MANQUE_TEMPLATE, language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr", params: ["à vous"] })
      .catch(e => ({ ok: false, status: 0, j: { error: { message: (e as Error).message } } } as { ok: boolean; status: number; j: { error?: { message?: string; code?: number } } }));
    if (!r.ok) { results.push({ phone: k, sent: false, error: r.j?.error?.message || "refusé" }); continue; }
    const at = new Date().toISOString();
    for (const l of leads || []) {
      const h = Array.isArray(l.history) ? l.history : [];
      await db.from("leads").update({ history: [...h, { type: "wa_appel_manque", channel: "whatsapp", sent_at: at }].slice(-60), last_contact_at: at, updated_at: at }).eq("id", l.id);
      await db.from("crm_messages").insert({ lead_id: l.id, direction: "outbound", channel: "whatsapp", body: BODY.replace("{{1}}", "à vous"), status: "sent", ai_generated: false });
    }
    results.push({ phone: k, sent: true });
  }
  return NextResponse.json({ ok: true, template: tpl, sent: results.filter(r => r.sent).length, results });
}
