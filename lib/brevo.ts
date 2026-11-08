/**
 * Brevo (ex-Sendinblue) : envoi d'e-mails et de SMS pour NeoDrive.
 * Clé et expéditeur enregistrés sur /connexions (BREVO_API_KEY, BREVO_SENDER_EMAIL).
 */
import { createHmac } from "crypto";
import { normalizePhone } from "./crm-agent";

export const SITE = "https://www.easydrive-auto.fr";
export const OWNER_EMAIL = "khelifamansour@hotmail.fr";
export const brevoReady = () => Boolean(process.env.BREVO_API_KEY);
let senderOverride = "";
export const setSenderOverride = (e: string) => { senderOverride = e; };
const senderEmail = () => senderOverride || process.env.BREVO_SENDER_EMAIL || "contact.neodrivefrance@gmail.com";

async function brevo(path: string, body: unknown) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw Object.assign(new Error("Brevo n'est pas encore connecté (page /connexions)"), { fatal: true });
  const r = await fetch(`https://api.brevo.com/v3/${path}`, { method: "POST", headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j?.message || `Brevo ${r.status}`), { fatal: r.status === 401 || r.status === 403 });
  return j;
}

export async function sendEmail(to: string, toName: string, subject: string, html: string) {
  const j = await brevo("smtp/email", { sender: { name: "NeoDrive", email: senderEmail() }, replyTo: { email: process.env.BREVO_REPLY_TO || "contact.neodrivefrance@gmail.com", name: "NeoDrive" }, to: [{ email: to, ...(toName ? { name: toName } : {}) }], subject, htmlContent: html });
  return j?.messageId || null;
}

export async function sendSms(phone: string, content: string) {
  const to = normalizePhone(phone);
  if (!to) throw new Error("Numéro invalide");
  const j = await brevo("transactionalSMS/sms", { sender: "NeoDrive", recipient: to, content, type: "marketing" });
  return j?.messageId ? String(j.messageId) : null;
}

/** Lien de désinscription signé (sans compte client). */
export function unsubscribeUrl(leadId: number) {
  const sig = createHmac("sha256", process.env.CRON_SECRET || "neodrive").update(String(leadId)).digest("hex").slice(0, 20);
  return `${SITE}/api/crm/unsubscribe?id=${leadId}&s=${sig}`;
}
export function checkUnsubscribe(id: string, sig: string) {
  const good = createHmac("sha256", process.env.CRON_SECRET || "neodrive").update(String(Number(id))).digest("hex").slice(0, 20);
  return Boolean(id) && sig === good;
}

/** État des domaines d'envoi dans Brevo (lecture seule). */
export async function brevoDomains() {
  const key = process.env.BREVO_API_KEY; if (!key) return null;
  const r = await fetch("https://api.brevo.com/v3/senders/domains", { headers: { "api-key": key, accept: "application/json" }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return (j?.domains || []).map((d: any) => ({ domain: d.domain_name, authenticated: d.authenticated, verified: d.verified }));
}

/** Plan et crédits restants (e-mails, SMS) du compte Brevo. */
export async function brevoAccount() {
  const key = process.env.BREVO_API_KEY; if (!key) return null;
  const r = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": key, accept: "application/json" }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return (j?.plan || []).map((p: any) => ({ type: p.type, credits: p.credits, creditsType: p.creditsType }));
}

/** Derniers événements d'envoi Brevo vers une adresse (livré, bloqué, rejeté…). */
export async function brevoEvents(email: string) {
  const key = process.env.BREVO_API_KEY; if (!key) return null;
  const r = await fetch(`https://api.brevo.com/v3/smtp/statistics/events?limit=15&sort=desc&email=${encodeURIComponent(email)}`, { headers: { "api-key": key, accept: "application/json" }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return (j?.events || []).map((e: any) => ({ date: e.date, event: e.event, reason: e.reason || null, from: e.from, subject: e.subject }));
}
