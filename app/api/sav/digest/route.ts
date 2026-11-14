import { NextResponse } from "next/server";
import { applyStoredSecrets, isAuthorized } from "../../../../lib/integrations";
import { OWNER_EMAIL, brevoReady, sendEmail } from "../../../../lib/brevo";
import { CLOSED_STATUSES, alertsOf, daysOpen, statusOf } from "../../../../lib/sav-center";
import { SITE_URL, adminUrl, esc, savDb } from "../../../../lib/sav-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tâche planifiée (CRON_SECRET) : e-mail quotidien au fondateur avec les tickets SAV « À traiter maintenant ».
 * ?dry=1 : calcule et renvoie la liste sans envoyer d'e-mail. Aucun e-mail si rien n'est en alerte.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const sb = savDb();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  const { data, error } = await sb.from("sav_tickets").select("id,public_reference,sav_status,priority,customer_name,category,assigned_to,created_at,closed_at,updated_at,status_changed_at,last_customer_message_at,last_staff_message_at").order("created_at", { ascending: true }).limit(500);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const now = Date.now();
  const open = (data || []).filter(t => !CLOSED_STATUSES.includes(t.sav_status || "nouveau"));
  const hot = open.map(t => ({ t, alerts: alertsOf(t, now) })).filter(x => x.alerts.length);
  const items = hot.map(({ t, alerts }) => ({ ref: t.public_reference, client: t.customer_name, status: statusOf(t.sav_status).label, days: daysOpen(t, now), assigned: t.assigned_to || null, alerts: alerts.map(a => a.label) }));
  if (dry || !items.length) return NextResponse.json({ ok: true, dry, open: open.length, alerts: items.length, items, sent: false });

  await applyStoredSecrets();
  if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté", items }, { status: 503 });
  const rows = items.map(i => `<tr><td style="padding:8px;border-bottom:1px solid #eee"><a href="${esc(adminUrl(i.ref))}" style="color:#111;font-weight:800">${esc(i.ref)}</a><br><span style="color:#666">${esc(i.client)}</span></td><td style="padding:8px;border-bottom:1px solid #eee">${esc(i.status)}<br><span style="color:#666">${i.days} j · ${esc(i.assigned || "non attribué")}</span></td><td style="padding:8px;border-bottom:1px solid #eee;color:#b42318">${i.alerts.map(esc).join("<br>")}</td></tr>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#111"><h2 style="margin:0 0 6px">SAV : ${items.length} ticket${items.length > 1 ? "s" : ""} à traiter</h2><p style="color:#666;margin:0 0 14px">${open.length} ticket${open.length > 1 ? "s" : ""} ouvert${open.length > 1 ? "s" : ""} au total.</p><table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table><p style="margin:20px 0"><a href="${SITE_URL}/sav/admin" style="background:#ff6a00;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:800">Ouvrir le SAV</a></p></div>`;
  try {
    await sendEmail(OWNER_EMAIL, "NeoDrive", `🔧 SAV : ${items.length} ticket${items.length > 1 ? "s" : ""} à traiter aujourd’hui`, html);
  } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message, items }, { status: 502 }); }
  return NextResponse.json({ ok: true, open: open.length, alerts: items.length, items, sent: true });
}
