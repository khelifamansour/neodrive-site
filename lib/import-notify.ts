/** Notifications du fondateur pour la chaîne import : SMS (Brevo) ; WhatsApp prêt à brancher dès que le numéro est connu (OWNER_WHATSAPP). */
import { brevoReady, sendSms } from "./brevo";

export async function notifyOwner(text: string) {
  const msg = text.replace(/\s+/g, " ").trim().slice(0, 300);
  const out: { sms?: boolean; whatsapp?: string } = {};
  if (brevoReady()) { try { await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", msg); out.sms = true; } catch (e) { console.error("[import-notify] sms", e); out.sms = false; } }
  // WhatsApp : le numéro du fondateur n'est pas encore connu. Dès que OWNER_WHATSAPP est renseigné, brancher ici l'envoi
  // par le relais WhatsApp existant (modèle utilitaire validé par Meta requis hors fenêtre de 24 h).
  if (process.env.OWNER_WHATSAPP) out.whatsapp = "à brancher";
  return out;
}

/** Heures d'envoi autorisées pour les relances : 8 h – 20 h, heure de Paris, hors dimanche. */
export function sendingWindowOpen(now = new Date()) {
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", hour12: false }).formatToParts(now);
  const h = Number(parts.find(p => p.type === "hour")?.value || 0); const wd = parts.find(p => p.type === "weekday")?.value || "";
  return h >= 8 && h < 20 && !/^dim/i.test(wd);
}
