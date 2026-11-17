import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { brevoReady, sendEmail, sendSms, OWNER_EMAIL } from "../../../../lib/brevo";
import { confirmationTexts, reservationTemplateStatus, sendPendingReservationWhatsapp } from "../../../../lib/reservation-confirm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Confirmations WhatsApp des réservations en attente du modèle Meta « neodrive_reservation_confirmee ».
 * Accès : tâche planifiée (Authorization: Bearer CRON_SECRET) ou jeton à usage unique « res-confirm » (?token=…).
 * ?status=1 : état du modèle (le crée chez Meta s'il n'existe pas). ?test=owner : envoie les textes (Confort + sur commande) au fondateur seulement.
 */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const url = new URL(req.url); const token = url.searchParams.get("token") || "";
  const sb = crmDatabase();
  let ok = !!process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!ok && /^[a-f0-9]{48}$/.test(token)) {
    const { data } = await sb.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "res-confirm").is("used_at", null).gt("expires_at", new Date().toISOString()).select("token");
    ok = !!data?.length;
  }
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    if (url.searchParams.get("status") === "1") return NextResponse.json({ ok: true, template: await reservationTemplateStatus(true) });
    if (url.searchParams.get("test") === "owner") {
      if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" });
      const a = confirmationTexts({ prenom: "Mansour", nom: "Test", modele: "NeoDrive Confort", ville: "Muret", total: 5590 });
      const b = confirmationTexts({ prenom: "Mansour", nom: "Test", modele: "NeoDrive Essentielle", ville: "Muret", total: 4590 });
      const phone = process.env.OWNER_SMS_PHONE || "0689781710";
      await sendSms(phone, `[TEST Confort] ${a.sms}`); await sendSms(phone, `[TEST sur commande] ${b.sms}`);
      await sendEmail(OWNER_EMAIL, "Mansour", `[TEST] ${a.subject}`, a.html); await sendEmail(OWNER_EMAIL, "Mansour", `[TEST] ${b.subject}`, b.html);
      return NextResponse.json({ ok: true, sent: "owner", sms: [a.sms.length, b.sms.length] });
    }
    return NextResponse.json({ ok: true, ...(await sendPendingReservationWhatsapp(sb)) });
  } catch (e) { console.error("[RES-WA]", e); return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
