/**
 * Conseils batterie envoyés sur WhatsApp aux clients déjà livrés (/clients), TRÈS lentement (3 par jour max)
 * pour protéger le numéro de Hana, qui sert aux ventes. Modèle Meta UTILITY « neodrive_conseils_batterie ».
 * Envoi seulement si le modèle est APPROVED et WHATSAPP_SENDING=on. Arrêt de la journée à la moindre erreur Meta + e-mail au fondateur.
 */
import { crmDatabase } from "./crm-agent";
import { relay, templateStatus } from "./package-sender";
import { brevoReady, OWNER_EMAIL, sendEmail, SITE } from "./brevo";
import { normalizePhone, type Customer } from "./clients";
import { optedOutPhones, prettyFirst } from "./client-followup";

type DB = ReturnType<typeof crmDatabase>;
export const BATTERY_TEMPLATE = "neodrive_conseils_batterie";
export const BATTERY_MARK = "wa:conseils-batterie";
const LANG = () => process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr";
const last9 = (p: unknown) => String(p || "").replace(/\D/g, "").slice(-9);
const parisDay = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

export const BATTERY_BODY = [
  "Bonjour {{1}}, c'est NeoDrive. Voici des conseils importants pour vos batteries et votre garantie :",
  "",
  "🔌 Pendant la charge, le chargeur peut rester sur le plancher, à l'air libre (jamais couvert). Avant de rouler, rangez-le à l'arrière, dans une boîte avec un tissu doux en dessous, à cause des vibrations.",
  "🔋 Rechargez votre véhicule chaque soir.",
  "",
  "Le guide complet : https://www.easydrive-auto.fr/guide-batterie",
  "Les réponses aux questions fréquentes : https://www.easydrive-auto.fr/sav/problemes",
  "",
  "L'équipe NeoDrive",
].join("\n");

export async function batteryTemplateStatus(create = false) {
  return templateStatus(BATTERY_TEMPLATE, create, [
    { type: "BODY", text: BATTERY_BODY, example: { body_text: [["Marie"]] } },
    { type: "FOOTER", text: "Répondez STOP pour ne plus recevoir ces messages" },
  ], "UTILITY");
}

/** Numéros qui ont écrit STOP à Hana, ou bloqués (liste noire WhatsApp). */
async function waBlocked(db: DB): Promise<Set<string>> {
  const out = new Set<string>();
  const [bl, stops] = await Promise.all([
    db.from("whatsapp_blacklist").select("phone").limit(5000),
    db.from("whatsapp_ai_processed").select("phone,user_text").ilike("user_text", "%stop%").limit(5000),
  ]);
  for (const r of (bl.data || []) as { phone: string }[]) out.add(last9(r.phone));
  for (const r of (stops.data || []) as { phone: string; user_text: string }[]) if (/^\s*stop\b/i.test(String(r.user_text || ""))) out.add(last9(r.phone));
  return out;
}

/** File d'attente : clients livrés, contactables, portable valide (06/07), pas encore servis, un seul envoi par numéro. */
export async function batteryQueue(db = crmDatabase()) {
  const [{ data }, optedOut, blocked] = await Promise.all([db.from("customers_followup").select("*").order("id").limit(5000), optedOutPhones(db), waBlocked(db)]);
  const all = (data || []) as Customer[];
  const done = new Set(all.filter(c => (c.history || []).some(h => h.kind === BATTERY_MARK)).map(c => last9(c.phone)));
  const seen = new Set<string>(); const queue: Customer[] = [];
  for (const c of all) {
    const ph = normalizePhone(c.phone); const k = last9(c.phone);
    if (c.status === "ne pas contacter" || !ph.valid || !/^33[67]\d{8}$/.test(ph.intl)) continue;
    if (done.has(k) || seen.has(k) || optedOut.has(k) || blocked.has(k)) continue;
    seen.add(k); queue.push(c);
  }
  const sentToday = all.reduce((n, c) => n + (c.history || []).filter(h => h.kind === BATTERY_MARK && h.channel === "whatsapp" && parisDay(h.at) === parisDay(new Date())).length, 0);
  return { queue, sentToday };
}

export async function sendBatteryWhatsApp(perDay = Number(process.env.BATTERY_WA_PER_DAY || 3)) {
  if (process.env.WHATSAPP_SENDING !== "on") return { sent: 0, skipped: "WHATSAPP_SENDING n'est pas activé" };
  const tpl = await batteryTemplateStatus(false);
  if (tpl.status !== "APPROVED") return { sent: 0, skipped: `modèle ${BATTERY_TEMPLATE} : ${tpl.status}` };
  const db = crmDatabase();
  const { queue, sentToday } = await batteryQueue(db);
  const budget = Math.max(0, Math.min(3, perDay) - sentToday);
  if (!budget) return { sent: 0, skipped: "plafond du jour atteint", remaining: queue.length };
  const sent: string[] = []; let stopped = "";
  for (const c of queue.slice(0, budget)) {
    const first = prettyFirst(c.first_name) || "et bienvenue";
    const now = new Date().toISOString();
    const r = await relay("send-template", { to: normalizePhone(c.phone).intl, name: BATTERY_TEMPLATE, language: LANG(), params: [first] }).catch(e => ({ ok: false, status: 0, j: { error: { message: (e as Error).message } } }));
    if (!r.ok) {
      const code = r.j?.error?.code;
      if (code === 131026) { // pas de WhatsApp sur ce numéro : on le note pour ne pas réessayer
        await db.from("customers_followup").update({ history: [...(c.history || []), { at: now, action: "Conseils batterie WhatsApp : pas de WhatsApp sur ce numéro", channel: "none", kind: BATTERY_MARK, by: "Automatique" }], updated_at: now }).eq("id", c.id);
        continue;
      }
      stopped = `${r.j?.error?.message || r.j?.error || "Erreur Meta"}${code ? ` (code ${code})` : ""}`;
      break;
    }
    await db.from("customers_followup").update({ history: [...(c.history || []), { at: now, action: "Conseils batterie envoyés sur WhatsApp", channel: "whatsapp", kind: BATTERY_MARK, text: BATTERY_BODY.replace("{{1}}", first), by: "Automatique" }], last_contact_at: now, updated_at: now }).eq("id", c.id);
    sent.push(`${first} ${c.last_name || ""}`.trim());
  }
  if (stopped && brevoReady()) {
    try { await sendEmail(OWNER_EMAIL, "Mansour", "WhatsApp : envoi des conseils batterie arrêté pour aujourd'hui", `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5"><p>Meta a refusé un envoi du modèle <b>${BATTERY_TEMPLATE}</b> : <b>${stopped.replace(/</g, "&lt;")}</b>.</p><p>Les envois de conseils batterie sont arrêtés pour aujourd'hui (${sent.length} envoyé${sent.length > 1 ? "s" : ""} avant l'erreur). Ils reprendront demain. Si l'erreur parle de qualité ou de limite, vous pouvez les couper en mettant BATTERY_WA_PER_DAY à 0.</p><p>Suivi : <a href="${SITE}/clients">${SITE}/clients</a></p></div>`); } catch (e) { console.error("[CONSEILS-WA] e-mail", e); }
  }
  return { sent: sent.length, names: sent, stopped, remaining: queue.length - sent.length };
}
