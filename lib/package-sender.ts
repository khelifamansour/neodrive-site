/**
 * Envoi automatique du package de bienvenue aux nouveaux contacts Leboncoin, depuis le
 * numéro WhatsApp de NeoDrive (celui de Hana) : WhatsApp impose un modèle validé par Meta
 * pour écrire en premier. Quand le client répond, c'est Hana qui prend la conversation.
 * Base : le contact a lui-même écrit à NeoDrive sur Leboncoin (réponse à sa demande),
 * un seul message de bienvenue, STOP respecté.
 */
import { crmDatabase, normalizePhone } from "./crm-agent";
import { isOffTopic, personalLine } from "./welcome-package";

const SITE = "https://www.easydrive-auto.fr";

/** Relais Supabase (fonction neodrive-wa-send) : utilise le jeton Meta de Hana, qui est à jour. */
const RELAY_URL = "https://tzlsdjzcxdjaatcpwqwn.supabase.co/functions/v1/neodrive-wa-send";
async function relay(action: string, payload: Record<string, unknown>) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw Object.assign(new Error("Clé Supabase du serveur absente"), { fatal: true });
  const r = await fetch(RELAY_URL, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }), cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

export const PACKAGE_TEMPLATE = process.env.WHATSAPP_PACKAGE_TEMPLATE || "neodrive_bienvenue_video";
export const PACKAGE_VIDEO = `${"https://www.easydrive-auto.fr"}/presentation.mp4`;

const BODY = [
  "Bonjour {{1}} 👋",
  "",
  "Merci pour votre message sur Leboncoin ! Voici la NeoDrive SWITCH en vidéo 🎬",
  "",
  "3 versions de 3 990 € à 5 990 €, 0 € d'acompte, paiement à la livraison, livrée chez vous partout en France.",
  "",
  "C'est pour qui, et quel est votre code postal ?",
].join("\n");

export function packageParams(lead: any): [string, string] {
  const first = String(lead?.nom || "").trim().split(/\s+/)[0] || "";
  const prenom = first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "et merci";
  const perso = (personalLine(lead) || "Votre NeoDrive peut être livrée chez vous rapidement.").replace(/\n+/g, " ");
  return [prenom, perso.slice(0, 300)];
}

/** Lit (et crée si demandé) le modèle du package chez Meta, et celui de la relance. */
export async function packageTemplateStatus(create: boolean) {
  const pkg = await packageOnlyStatus(create);
  let relance: any = null;
  try { relance = await relanceTemplateStatus(create); } catch (e: any) { relance = { name: "relances", status: "ERREUR", reason: e?.message || null }; }
  return { ...pkg, relance };
}

async function packageOnlyStatus(create: boolean) {
  return templateStatus(PACKAGE_TEMPLATE, create, async () => {
    const up = await relay("upload-handle", { url: PACKAGE_VIDEO, type: "video/mp4" });
    if (!up.ok || !up.j?.h) throw new Error(up.j?.error?.message || up.j?.error || "Téléversement de la vidéo refusé");
    return [
      { type: "HEADER", format: "VIDEO", example: { header_handle: [up.j.h] } },
      { type: "BODY", text: BODY, example: { body_text: [["Marie"]] } },
      { type: "FOOTER", text: "Répondez STOP pour ne plus être contacté" },
      { type: "BUTTONS", buttons: [
        { type: "URL", text: "Voir toutes les vidéos", url: `${SITE}/videos` },
        { type: "URL", text: "Prix livré et réservation", url: `${SITE}/reservation-devis` },
        { type: "QUICK_REPLY", text: "STOP" },
      ] },
    ];
  });
}

async function templateStatus(name: string, create: boolean, components: any[] | (() => Promise<any[]>)) {
  const r = await relay("template-status", { name });
  if (!r.ok) throw new Error(r.j?.error?.message || r.j?.error || "Lecture du modèle impossible");
  const found = (r.j.data || []).find((x: any) => x.name === name);
  if (found || !create) return { name, status: found?.status || "ABSENT", reason: found?.rejected_reason || null };
  const comps = typeof components === "function" ? await components() : components;
  const c = await relay("template-create", { template: { name, category: "MARKETING", language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr", components: comps } });
  if (!c.ok) throw new Error(c.j?.error?.error_user_msg || c.j?.error?.message || "Création du modèle refusée");
  return { name, status: String(c.j.status || "PENDING"), reason: null };
}

async function sendTemplate(phone: string, params: string[], name = PACKAGE_TEMPLATE) {
  const r = await relay("send-template", { to: normalizePhone(phone), name, language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr", params, ...(name === PACKAGE_TEMPLATE ? { headerVideo: PACKAGE_VIDEO } : {}) });
  if (!r.ok) {
    const code = r.j?.error?.code;
    throw Object.assign(new Error(r.j?.error?.message || r.j?.error || "Envoi refusé"), { fatal: r.status === 401 || r.status === 403 || code === 190 || code === 132001 || code === 131042 });
  }
  return r.j?.messages?.[0]?.id || null;
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
      const params = [packageParams(lead)[0]];
      const id = await sendTemplate(lead.telephone, params);
      const now = new Date().toISOString();
      const body = "🎬 [vidéo de présentation]\n" + BODY.replace("{{1}}", params[0]);
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

/* ---------- Relances automatiques : 3 messages différents, arrêt dès la première réponse ou STOP ---------- */
const CATALOGUE = { link: `${SITE}/catalogue-neodrive-2026.pdf`, filename: "Catalogue NeoDrive 2026.pdf" };
type Step = { step: number; name: string; afterDays: number; body: string; header?: "VIDEO" | "DOCUMENT"; media?: string };
export const RELANCES: Step[] = [
  { step: 1, name: "neodrive_relance_livraison", afterDays: 1, header: "VIDEO", media: `${SITE}/client1.mp4`, body: [
    "Bonjour {{1}} 🙂",
    "",
    "Voici une vraie livraison NeoDrive chez un client 🚚 C'est comme ça que votre voiture arrive chez vous, prête à rouler.",
    "",
    "La Confort est en stock à 4 990 €, rien à payer avant la livraison.",
    "",
    "Quel est votre code postal ? Je vous donne le prix livré chez vous.",
  ].join("\n") },
  { step: 2, name: "neodrive_relance_catalogue", afterDays: 2, header: "DOCUMENT", media: CATALOGUE.link, body: [
    "Bonjour {{1}},",
    "",
    "Je vous laisse notre catalogue 2026 📄 : les 3 versions, les équipements et les prix.",
    "",
    "Vous hésitez entre quelles versions ? Dites-moi pour qui c'est et je vous conseille en 2 minutes.",
  ].join("\n") },
  { step: 3, name: "neodrive_relance_derniere", afterDays: 4, body: [
    "Bonjour {{1}},",
    "",
    "Dernier message de ma part concernant votre demande NeoDrive 🙂",
    "",
    "Si votre projet tient toujours, répondez simplement OUI : je vous prépare le prix livré chez vous ou un conseiller vous rappelle.",
    "",
    "Sinon, pas de souci, je ne vous relancerai plus. Bonne journée !",
  ].join("\n") },
];

async function relanceComponents(st: Step) {
  const comps: any[] = [];
  if (st.header) {
    const up = await relay("upload-handle", { url: st.media, type: st.header === "VIDEO" ? "video/mp4" : "application/pdf" });
    if (!up.ok || !up.j?.h) throw new Error(up.j?.error?.message || up.j?.error || "Téléversement du média refusé");
    comps.push({ type: "HEADER", format: st.header, example: { header_handle: [up.j.h] } });
  }
  comps.push({ type: "BODY", text: st.body, example: { body_text: [["Marie"]] } });
  comps.push({ type: "FOOTER", text: "Répondez STOP pour ne plus être contacté" });
  comps.push({ type: "BUTTONS", buttons: [{ type: "URL", text: "Prix livré et réservation", url: `${SITE}/reservation-devis` }, { type: "QUICK_REPLY", text: "STOP" }] });
  return comps;
}

async function relanceTemplateStatus(create: boolean) {
  const out: any[] = [];
  for (const st of RELANCES) {
    try { out.push(await templateStatus(st.name, create, () => relanceComponents(st))); }
    catch (e: any) { out.push({ name: st.name, status: "ERREUR", reason: e?.message || null }); }
  }
  const all = out.every(x => x.status === "APPROVED") ? "APPROVED" : out.some(x => x.status === "REJECTED") ? "REJECTED" : out.some(x => x.status === "PENDING") ? "PENDING" : out.some(x => x.status === "ERREUR") ? "ERREUR" : "ABSENT";
  return { name: "relances", status: all, reason: null, details: out };
}

async function sendRelanceTemplate(phone: string, prenom: string, st: Step) {
  const r = await relay("send-template", { to: normalizePhone(phone), name: st.name, language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr", params: [prenom],
    ...(st.header === "VIDEO" ? { headerVideo: st.media } : {}), ...(st.header === "DOCUMENT" ? { headerDocument: CATALOGUE } : {}) });
  if (!r.ok) { const code = r.j?.error?.code; throw Object.assign(new Error(r.j?.error?.message || r.j?.error || "Envoi refusé"), { fatal: r.status === 401 || r.status === 403 || code === 190 || code === 132001 || code === 131042 }); }
  return r.j?.messages?.[0]?.id || null;
}

/** Numéros qui ont répondu sur WhatsApp (conversations de Hana) depuis une date. */
async function repliedSince(phones: string[], sinceIso: string) {
  const db = crmDatabase(); const out = new Set<string>();
  if (!phones.length) return out;
  const { data } = await db.from("whatsapp_ai_processed").select("phone,created_at").in("phone", phones).gte("created_at", sinceIso).limit(5000);
  for (const row of data || []) out.add(String((row as any).phone));
  return out;
}

/** Envoie la relance suivante (J+1 vidéo livraison, J+3 catalogue, J+7 dernier message) aux contacts sans réponse. Pas le dimanche. */
export async function sendRelances(limit = Number(process.env.RELANCE_PER_RUN || 20)) {
  if (new Date().toLocaleDateString("fr-FR", { weekday: "long", timeZone: "Europe/Paris" }) === "dimanche") return { sent: 0, failed: 0, answered: 0, stopped: "", results: [], skipped: "dimanche" };
  const db = crmDatabase();
  const { data, error } = await db.from("leads").select("*").eq("statut", "Contacté").is("opted_out_at", null).not("telephone", "is", null).order("id", { ascending: true }).limit(1000);
  if (error) throw new Error(error.message);
  const hist = (l: any) => (Array.isArray(l?.history) ? l.history : []);
  const now = Date.now();
  const candidates = (data || []).map((l: any) => {
    const pkg = hist(l).find((h: any) => h?.type === "package");
    if (!pkg?.sent_at || !normalizePhone(l.telephone)) return null;
    const done = hist(l).filter((h: any) => h?.type === "relance");
    const lastStep = done.reduce((m: number, h: any) => Math.max(m, Number(h?.step || 0)), 0);
    const next = RELANCES.find(r => r.step === lastStep + 1);
    if (!next) return null;
    const lastAt = lastStep ? done.find((h: any) => Number(h?.step) === lastStep)?.sent_at : pkg.sent_at;
    if (!lastAt || now - new Date(lastAt).getTime() < next.afterDays * 86400000) return null;
    if (l.last_inbound_at && new Date(l.last_inbound_at).getTime() >= new Date(pkg.sent_at).getTime()) return null;
    return { lead: l, next, since: pkg.sent_at as string };
  }).filter(Boolean) as { lead: any; next: Step; since: string }[];
  const oldest = candidates.reduce((m, c) => (!m || c.since < m ? c.since : m), "");
  const replied = await repliedSince(candidates.map(c => normalizePhone(c.lead.telephone)), oldest || new Date(now - 30 * 86400000).toISOString());
  const answered = candidates.filter(c => replied.has(normalizePhone(c.lead.telephone)));
  for (const c of answered) await db.from("leads").update({ statut: "Chaud", phase: "Attente réponse", last_inbound_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", c.lead.id);
  const todo = candidates.filter(c => !replied.has(normalizePhone(c.lead.telephone))).slice(0, limit);
  const results: any[] = []; let stopped = "";
  for (const { lead, next } of todo) {
    try {
      const prenom = packageParams(lead)[0];
      const id = await sendRelanceTemplate(lead.telephone, prenom, next);
      const at = new Date().toISOString();
      await db.from("crm_messages").insert({ lead_id: lead.id, direction: "outbound", channel: "whatsapp", body: (next.header ? `[${next.header === "VIDEO" ? "vidéo livraison" : "catalogue PDF"}]\n` : "") + next.body.replace("{{1}}", prenom), provider_message_id: id, status: "sent", ai_generated: false });
      await db.from("leads").update({ phase: next.step === 3 ? "Terminé si pas de réponse" : "Réfléchit", last_contact_at: at, derniere_relance: at, history: [...hist(lead), { type: "relance", step: next.step, template: next.name, sent_at: at }].slice(-60), updated_at: at }).eq("id", lead.id);
      results.push({ id: lead.id, step: next.step, sent: true });
    } catch (e: any) {
      results.push({ id: lead.id, error: e?.message || "erreur" });
      if (e?.fatal) { stopped = e.message; break; }
    }
  }
  return { sent: results.filter(r => r.sent).length, failed: results.filter(r => r.error).length, answered: answered.length, stopped, results };
}

/** Test du fondateur : envoie le package uniquement à son numéro personnel (fixe, aucun autre numéro possible). */
const OWNER_TEST_PHONE = "33628261446";
export async function sendOwnerTestPackage() {
  const id = await sendTemplate(OWNER_TEST_PHONE, ["Mansour"]);
  return { sent: true, to: "06 28 26 14 46", id };
}
