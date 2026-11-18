import { NextResponse } from "next/server";
import { applyStoredSecrets, isAuthorized } from "../../../../lib/integrations";
import { crmDatabase } from "../../../../lib/crm-agent";
import { brevoReady, sendEmail, OWNER_EMAIL } from "../../../../lib/brevo";
import { notifyOwner, sendingWindowOpen } from "../../../../lib/import-notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX_RELANCES = 3;
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Tâche planifiée (CRON_SECRET, chaque jour 10 h 30 heure de Paris) : relance poliment par e-mail chaque destinataire
 * qui n'a pas répondu (case « répondu » non cochée) depuis plus de 24 h, 3 relances au maximum, jamais entre 20 h et 8 h
 * ni le dimanche. Résumé par SMS au fondateur. ?dry=1 : calcule sans envoyer.
 */
export async function GET(req: Request) {
  await applyStoredSecrets();
  if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  if (!sendingWindowOpen()) return NextResponse.json({ ok: true, skipped: "hors horaires (8 h – 20 h, hors dimanche)" });
  const db = crmDatabase();
  const { data: rows } = await db.from("shipment_followups").select("*, shipments(name,bl_number,eta)").eq("auto", true).is("answered_at", null).lt("relance_count", MAX_RELANCES);
  const due = (rows || []).filter(r => Date.now() - new Date(r.last_relance_at || r.sent_at).getTime() >= 24 * 3600000 - 15 * 60000);
  const done: string[] = [];
  for (const r of due) {
    const sh = (r as any).shipments || {}; const n = Number(r.relance_count || 0) + 1;
    const en = r.kind === "usine";
    const html = en
      ? `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6"><p>Hello,</p><p>Kindly following up on our previous message${r.subject ? ` « ${esc(r.subject)} »` : ""} about ${esc(sh.name || "our order")}. Could you please send us an update?</p><p>Thank you,<br>Mansour Khelifa<br>MK HOLDING – NeoDrive (France)</p></div>`
      : `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6"><p>Bonjour,</p><p>Je me permets de revenir vers vous au sujet de mon message${r.subject ? ` « ${esc(r.subject)} »` : ""}${sh.name ? ` (dossier ${esc(sh.name)}${sh.bl_number ? `, B/L ${esc(String(sh.bl_number).split(" ")[0])}` : ""})` : ""}.</p><p>Pourriez-vous me faire un retour dès que possible ? Merci d'avance.</p><p>Bien cordialement,<br>Mansour Khelifa<br>MK HOLDING – NeoDrive<br>06 89 78 17 10</p></div>`;
    if (!dry && brevoReady()) {
      try {
        await sendEmail(r.recipient, "", `${en ? "Follow-up" : "Relance"} – ${r.subject || sh.name || "MK HOLDING"}`, html, [], { cc: String(r.cc || "").split(/[,; ]+/).filter(Boolean), replyTo: OWNER_EMAIL });
        const log = [...(Array.isArray(r.log) ? r.log : []), { at: new Date().toISOString(), relance: n }].slice(-20);
        await db.from("shipment_followups").update({ relance_count: n, last_relance_at: new Date().toISOString(), log }).eq("id", r.id);
      } catch (e) { console.error("[followups]", e); continue; }
    }
    done.push(`${r.label || r.recipient} (relance ${n}/${MAX_RELANCES})`);
  }
  if (!dry && done.length) await notifyOwner(`📦 Relances import envoyées : ${done.join(" ; ")}`).catch(() => null);
  return NextResponse.json({ ok: true, dry, relanced: done });
}
