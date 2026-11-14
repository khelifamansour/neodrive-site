/** Suivi des clients et demandes d'avis Google — partagé navigateur / serveur. Aucun envoi automatique : on prépare des liens WhatsApp / SMS, le fondateur envoie lui-même. */

export const STATUSES = ["à contacter", "nouvelles demandées", "problème en cours", "avis demandé", "avis laissé", "ne pas contacter"] as const;
export type Status = typeof STATUSES[number];
export const isStatus = (s: unknown): s is Status => typeof s === "string" && (STATUSES as readonly string[]).includes(s);

export const SATISFACTIONS = ["content", "neutre", "pas content"] as const;
export type Satisfaction = typeof SATISFACTIONS[number];
export const isSatisfaction = (s: unknown): s is Satisfaction => typeof s === "string" && (SATISFACTIONS as readonly string[]).includes(s);

export type HistoryItem = { at: string; action: string; channel?: string | null; text?: string | null; by?: string | null };
export type Customer = {
  id: number; created_at: string; updated_at: string;
  first_name: string; last_name: string; phone: string | null; email: string | null; city: string | null; model: string | null; vin: string | null;
  delivered_at: string | null; source: string | null; status: Status; satisfaction: Satisfaction | null; notes: string | null;
  do_not_contact_reason: string | null; sav_ticket_ref: string | null; history: HistoryItem[]; last_contact_at: string | null;
};

export const REVIEW_URL = "https://g.page/r/CY-pd6eO0lLtEBM/review";

export type TemplateKey = "nouvelles" | "avis";
export const TEMPLATE_LABELS: Record<TemplateKey, string> = { nouvelles: "Prendre des nouvelles", avis: "Demander un avis" };

/** « Confort » → « NeoDrive Confort » ; vide → « NeoDrive ». */
export function modelLabel(model: string | null | undefined): string {
  const m = String(model || "").trim();
  if (!m) return "NeoDrive";
  return /^neodrive\b/i.test(m) ? m : `NeoDrive ${m}`;
}

export function messageFor(key: TemplateKey, c: Pick<Customer, "first_name" | "model">): string {
  const first = String(c.first_name || "").trim();
  if (key === "nouvelles") {
    return `Bonjour${first ? " " + first : ""}, c'est Mansour de NeoDrive. J'espère que vous allez bien ! Je voulais prendre de vos nouvelles : comment se passe votre ${modelLabel(c.model)} au quotidien ? N'hésitez pas si vous avez la moindre question.`;
  }
  return `Merci beaucoup${first ? " " + first : ""} ! Ça nous ferait très plaisir si vous pouviez partager votre expérience en laissant un avis sur Google, cela aide beaucoup d'autres familles qui hésitent à franchir le pas : ${REVIEW_URL} Merci encore et bonne route !`;
}

/**
 * Numéro au format international sans « + » (ex. 33628261446) pour wa.me.
 * Accepte 06…, +33 6…, 0033 6…, 33 6…, 6… (9 chiffres) et les numéros étrangers écrits avec + ou 00.
 */
export function normalizePhone(input: string | null | undefined): { intl: string; valid: boolean; warning: string | null } {
  const raw = String(input || "").trim();
  if (!raw) return { intl: "", valid: false, warning: "Pas de numéro de téléphone." };
  const plus = raw.startsWith("+");
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (!plus) {
    if (/^0\d{9}$/.test(d)) d = "33" + d.slice(1);
    else if (/^[1-9]\d{8}$/.test(d)) d = "33" + d;
  }
  if (/^330\d{9}$/.test(d)) d = "33" + d.slice(3); // +33 (0)6…
  if (d.startsWith("33")) {
    if (!/^33[1-9]\d{8}$/.test(d)) return { intl: d, valid: false, warning: "Ce numéro français semble incomplet ou incorrect (il faut 10 chiffres, ex. 06 12 34 56 78)." };
    const mobile = /^33[67]/.test(d);
    return { intl: d, valid: true, warning: mobile ? null : "Ce n'est pas un numéro de portable (06 / 07) : WhatsApp et SMS risquent de ne pas marcher." };
  }
  if (!plus && d.startsWith("0")) return { intl: d, valid: false, warning: "Ce numéro français semble incomplet ou incorrect (il faut 10 chiffres, ex. 06 12 34 56 78)." };
  if (/^\d{8,15}$/.test(d)) return { intl: d, valid: true, warning: "Numéro étranger : vérifiez l'indicatif du pays." };
  return { intl: d, valid: false, warning: "Ce numéro semble incorrect. Vérifiez-le avant d'envoyer." };
}

export const whatsappLink = (intl: string, text: string) => `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
export const smsLink = (intl: string, text: string) => `sms:+${intl}?body=${encodeURIComponent(text)}`;

export function savLink(c: Pick<Customer, "first_name" | "last_name" | "phone" | "vin" | "email">): string {
  const q = new URLSearchParams();
  const nom = `${c.first_name || ""} ${c.last_name || ""}`.trim();
  if (nom) q.set("nom", nom);
  if (c.phone) q.set("tel", c.phone);
  if (c.email) q.set("email", c.email);
  if (c.vin) q.set("vin", c.vin);
  q.set("source", "suivi-client");
  return `/sav?${q.toString()}`;
}

/* ---------- Import ---------- */

export type ImportRow = { first_name: string; last_name: string; phone: string; city: string; model: string; email?: string; vin?: string; delivered_at?: string };

const splitName = (full: string) => { const p = full.trim().split(/\s+/).filter(Boolean); return { first_name: p[0] || "", last_name: p.slice(1).join(" ") }; };

/** « Prénom Nom ; téléphone ; ville ; modèle » — une ligne par client (séparateur ; ou tabulation). */
export function parsePaste(text: string): ImportRow[] {
  const out: ImportRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = (line.includes(";") ? line.split(";") : line.includes("\t") ? line.split("\t") : line.split(",")).map(s => s.trim());
    const { first_name, last_name } = splitName(parts[0] || "");
    if (!first_name) continue;
    out.push({ first_name, last_name, phone: parts[1] || "", city: parts[2] || "", model: parts[3] || "" });
  }
  return out;
}

/** Petit lecteur CSV (guillemets, séparateur ; , ou tabulation détecté sur la 1re ligne). */
function parseCsvRows(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] || "";
  const count = (ch: string) => first.split(ch).length - 1;
  const sep = [";", ",", "\t"].sort((a, b) => count(b) - count(a))[0];
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const HEADERS: Record<string, string[]> = {
  first_name: ["prenom", "firstname", "first", "givenname"],
  last_name: ["nom", "lastname", "last", "surname", "nomdefamille", "familyname"],
  full_name: ["nomcomplet", "nomprenom", "prenomnom", "client", "name", "fullname", "contact", "acheteur"],
  phone: ["telephone", "tel", "phone", "mobile", "portable", "gsm", "numero", "numerodetelephone", "phonenumber", "telephoneportable"],
  email: ["email", "mail", "adressemail", "adresseemail", "courriel"],
  city: ["ville", "city", "commune", "localite"],
  model: ["modele", "model", "vehicule", "voiture", "version", "produit"],
  vin: ["vin", "chassis", "numerodechassis", "numerodeserie", "serie"],
  delivered_at: ["datedelivraison", "livraison", "livrele", "deliveredat", "date", "datelivraison", "datedevente", "vente"],
};

export function toIsoDate(s: string): string | undefined {
  const t = s.trim(); if (!t) return undefined;
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  return undefined;
}

export function parseCsv(text: string): { rows: ImportRow[]; columns: string[]; error?: string } {
  const all = parseCsvRows(text.replace(/^﻿/, ""));
  if (all.length < 2) return { rows: [], columns: [], error: "Le fichier est vide ou n'a pas de ligne d'en-tête." };
  const head = all[0].map(h => norm(h));
  const idx: Record<string, number> = {};
  for (const [key, names] of Object.entries(HEADERS)) { const i = head.findIndex(h => names.includes(h)); if (i >= 0) idx[key] = i; }
  if (idx.first_name === undefined && idx.last_name === undefined && idx.full_name === undefined) return { rows: [], columns: all[0], error: "Colonne du nom introuvable (ex. « Prénom », « Nom » ou « Client »)." };
  const get = (r: string[], k: string) => (idx[k] !== undefined ? (r[idx[k]] || "").trim() : "");
  const rows: ImportRow[] = [];
  for (const r of all.slice(1)) {
    let first_name = get(r, "first_name"), last_name = get(r, "last_name");
    if (!first_name && !last_name) ({ first_name, last_name } = splitName(get(r, "full_name")));
    else if (!first_name && last_name && idx.first_name === undefined) ({ first_name, last_name } = splitName(last_name));
    if (!first_name && !last_name) continue;
    rows.push({ first_name: first_name || last_name, last_name: first_name ? last_name : "", phone: get(r, "phone"), city: get(r, "city"), model: get(r, "model"), email: get(r, "email") || undefined, vin: get(r, "vin") || undefined, delivered_at: toIsoDate(get(r, "delivered_at")) });
  }
  return { rows, columns: all[0] };
}
