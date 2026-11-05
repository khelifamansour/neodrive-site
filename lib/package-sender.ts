/**
 * Envoi automatique du package de bienvenue aux nouveaux contacts Leboncoin, depuis le
 * numéro WhatsApp de NeoDrive (celui de Hana) : WhatsApp impose un modèle validé par Meta
 * pour écrire en premier. Quand le client répond, c'est Hana qui prend la conversation.
 * Base : le contact a lui-même écrit à NeoDrive sur Leboncoin (réponse à sa demande),
 * un seul message de bienvenue, STOP respecté.
 */
import { crmDatabase, normalizePhone } from "./crm-agent";
import { isOffTopic, personalLine, PACKAGE_VIDEOS } from "./welcome-package";

const SITE = "https://www.easydrive-auto.fr";
const V = () => process.env.WHATSAPP_API_VERSION || "v22.0";
export const PACKAGE_TEMPLATE = process.env.WHATSAPP_PACKAGE_TEMPLATE || "neodrive_package_bienvenue";

const BODY = [
  "Bonjour {{1}} 👋",
  "",
  "Merci pour votre message sur Leboncoin ! Ici NeoDrive, le fabricant français de voitures sans permis 100 % électriques, neuves, en acier, livrées chez vous partout en France.",
  "",
  "{{2}}",
  "",
  "Nos 3 versions : Essentielle 3 990 € · Confort 4 990 € (en stock) · Confort Plus+ 5 990 €. 0 € d'acompte, vous payez à la livraison.",
  "",
  "Découvrez-la en vidéo :",
  ...PACKAGE_VIDEOS.map(v => `${v.label} : ${v.url}`),
  "",
  "Pour bien vous conseiller, dites-moi : c'est pour qui (un ado de 14-16 ans, vous-même, une personne âgée…), votre code postal, et pour quand ?",
].join("\n");

export function packageParams(lead: any): [string, string] {
  const first = String(lead?.nom || "").trim().split(/\s+/)[0] || "";
  const prenom = first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "et merci";
  const perso = (personalLine(lead) || "Votre NeoDrive peut être livrée chez vous rapidement.").replace(/\n+/g, " ");
  return [prenom, perso.slice(0, 300)];
}

/** Lit (et crée si demandé) le modèle du package chez Meta. */
export async function packageTemplateStatus(create: boolean) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN; const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "364388790101381";
  if (!token || !waba) throw new Error("Accès WhatsApp du nouveau numéro manquant : jeton + identifiant du compte WhatsApp Business (page /connexions)");
  const r = await fetch(`https://graph.facebook.com/${V()}/${waba}/message_templates?name=${PACKAGE_TEMPLATE}&fields=name,status,rejected_reason`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || "Lecture du modèle impossible");
  const found = (j.data || []).find((x: any) => x.name === PACKAGE_TEMPLATE);
  if (found || !create) return { name: PACKAGE_TEMPLATE, status: found?.status || "ABSENT", reason: found?.rejected_reason || null };
  const c = await fetch(`https://graph.facebook.com/${V()}/${waba}/message_templates`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: PACKAGE_TEMPLATE, category: "MARKETING", language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr", components: [
      { type: "BODY", text: BODY, example: { body_text: [["Marie", "Oui, elle est disponible : la Confort est en stock et livrable rapidement ✅"]] } },
      { type: "FOOTER", text: "Répondez STOP pour ne plus être contacté" },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "Prix livré et réservation", url: `${SITE}/reservation-devis` }, { type: "QUICK_REPLY", text: "STOP" }] },
    ] }),
  });
  const cj = await c.json().catch(() => ({}));
  if (!c.ok) throw new Error(cj?.error?.error_user_msg || cj?.error?.message || "Création du modèle refusée");
  return { name: PACKAGE_TEMPLATE, status: String(cj.status || "PENDING"), reason: null };
}

async function sendTemplate(phone: string, params: string[]) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN; const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw Object.assign(new Error("Accès WhatsApp manquant (page /connexions)"), { fatal: true });
  const r = await fetch(`https://graph.facebook.com/${V()}/${phoneId}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: normalizePhone(phone), type: "template", template: { name: PACKAGE_TEMPLATE, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr" }, components: [{ type: "body", parameters: params.map(text => ({ type: "text", text })) }] } }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j?.error?.message || "Envoi refusé"), { fatal: r.status === 401 || j?.error?.code === 190 || j?.error?.code === 132001 });
  return j?.messages?.[0]?.id || null;
}

const sentPackage = (lead: any) => (Array.isArray(lead?.history) ? lead.history : []).some((h: any) => h?.type === "package");

/** Envoie le package aux nouveaux contacts (au plus `limit` par appel, pour protéger le numéro). */
export async function sendDailyPackages(limit = Number(process.env.PACKAGE_PER_RUN || 20)) {
  const db = crmDatabase();
  const { data, error } = await db.from("leads").select("*").eq("statut", "Nouveau").is("opted_out_at", null).not("telephone", "is", null).order("id", { ascending: true }).limit(400);
  if (error) throw new Error(error.message);
  const todo = (data || []).filter((l: any) => normalizePhone(l.telephone) && !sentPackage(l) && !isOffTopic(l)).slice(0, limit);
  const results: any[] = []; let stopped = "";
  for (const lead of todo) {
    try {
      const params = packageParams(lead);
      const id = await sendTemplate(lead.telephone, params);
      const now = new Date().toISOString();
      const body = BODY.replace("{{1}}", params[0]).replace("{{2}}", params[1]);
      await db.from("crm_messages").insert({ lead_id: lead.id, direction: "outbound", channel: "whatsapp", body, provider_message_id: id, status: "sent", ai_generated: false });
      await db.from("leads").update({ statut: "Contacté", phase: "Attente réponse", last_contact_at: now, derniere_relance: now, next_followup_at: null, history: [...(Array.isArray(lead.history) ? lead.history : []), { type: "package", template: PACKAGE_TEMPLATE, sent_at: now, basis: "réponse à la demande Leboncoin" }].slice(-60), updated_at: now }).eq("id", lead.id);
      results.push({ id: lead.id, sent: true });
    } catch (e: any) {
      results.push({ id: lead.id, error: e?.message || "erreur" });
      if (e?.fatal) { stopped = e.message; break; }
    }
  }
  return { sent: results.filter(r => r.sent).length, failed: results.filter(r => r.error).length, remaining: Math.max(0, (data || []).filter((l: any) => normalizePhone(l.telephone) && !sentPackage(l) && !isOffTopic(l)).length - results.filter(r => r.sent).length), stopped, results };
}
