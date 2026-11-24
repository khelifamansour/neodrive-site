/**
 * Comptabilité mensuelle : lecture du relevé Revolut Business (CSV), règles de rapprochement, lignes d'export Pennylane.
 * Calculs purs, utilisables côté serveur et navigateur. Les lignes d'export sont construites ici une seule fois :
 * un futur envoi par l'API Pennylane réutilisera pennylaneInvoiceRows() sans toucher au reste.
 */
import { DEBOURS_KEY, lineHt, type InvoiceLine } from "./stock-shared";

export const CATEGORIES = ["vente voiture", "pièces", "achat véhicules", "transport", "douane", "salaires/prestataires", "logiciel", "publicité", "carburant/péage", "frais bancaires", "virement interne", "autre"] as const;
export type Category = typeof CATEGORIES[number];

/* ───────────── Relevé Revolut Business ───────────── */

export type BankRow = { date: string; label: string; amount: number; currency: string; counterparty: string; reference: string; balance: number | null; id: string; raw: Record<string, string> };

function splitCsvLine(line: string, sep: string) {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur); return out.map(s => s.trim());
}
/** Montant « 1 234,56 », « -1,234.56 », « 1234.56 € » → nombre. */
export function parseAmount(s: string): number | null {
  let t = String(s || "").replace(/[\s  €$£]/g, "").replace(/[A-Z]{3}$/i, "");
  if (!t) return null;
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, "").replace(",", "."); else t = t.replace(/,/g, "");
  const n = Number(t); return Number.isFinite(n) ? n : null;
}
/** Date « 2026-11-03 12:00:00 », « 03/11/2026 », « 3 nov. 2026 »… → AAAA-MM-JJ. */
export function parseDate(s: string): string | null {
  const t = String(s || "").trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(t); return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
const pick = (heads: string[], ...names: string[]) => { for (const n of names) { const i = heads.findIndex(h => h === n); if (i >= 0) return i; } for (const n of names) { const i = heads.findIndex(h => h.includes(n)); if (i >= 0) return i; } return -1; };

/** Lit un export CSV Revolut Business (« Statement ») ; colonnes détectées par leur nom, séparateur , ou ;. Opérations refusées / annulées ignorées. */
export function parseRevolutCsv(text: string): { rows: BankRow[]; errors: string[]; columns: string[] } {
  const lines = String(text || "").replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ["Fichier vide ou illisible."], columns: [] };
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : lines[0].includes("\t") ? "\t" : ",";
  const columns = splitCsvLine(lines[0], sep);
  const heads = columns.map(norm);
  const c = {
    date: pick(heads, "datecompletedutc", "datecompleted", "completeddate", "date", "datestartedutc"),
    desc: pick(heads, "description", "libelle", "label"),
    total: pick(heads, "totalamount", "montanttotal"),
    amount: pick(heads, "amount", "montant", "paymentamount"),
    fee: pick(heads, "fee", "frais"),
    cur: pick(heads, "paymentcurrency", "currency", "devise"),
    bal: pick(heads, "balance", "solde"),
    ref: pick(heads, "reference"),
    cp: pick(heads, "counterparty", "payer", "beneficiary", "contrepartie"),
    id: heads.findIndex(h => h === "id" || h === "transactionid"),
    state: pick(heads, "state", "status", "etat"),
    type: heads.indexOf("type"),
  };
  if (c.date < 0 || (c.amount < 0 && c.total < 0)) return { rows: [], errors: [`Colonnes Date / Amount introuvables (colonnes lues : ${columns.join(", ")}).`], columns };
  const rows: BankRow[] = []; const errors: string[] = [];
  lines.slice(1).forEach((l, i) => {
    const v = splitCsvLine(l, sep); const get = (k: number) => k >= 0 ? v[k] || "" : "";
    const state = get(c.state).toUpperCase();
    if (state && /DECLINED|REVERTED|FAILED|CANCEL|PENDING|REFUSE|ANNUL/.test(state)) return;
    const date = parseDate(get(c.date)) || parseDate(get(pick(heads, "datestartedutc")));
    let amount = c.total >= 0 ? parseAmount(get(c.total)) : null;
    if (amount === null) { amount = parseAmount(get(c.amount)); const fee = parseAmount(get(c.fee)); if (amount !== null && fee) amount = amount - Math.abs(fee); }
    if (!date || amount === null) { errors.push(`Ligne ${i + 2} ignorée (date ou montant illisible).`); return; }
    const raw: Record<string, string> = {}; columns.forEach((h, k) => { if (v[k]) raw[h] = v[k]; });
    rows.push({ date, amount: Math.round(amount * 100) / 100, label: [get(c.desc), get(c.type) && !get(c.desc) ? get(c.type) : ""].filter(Boolean).join(" ").slice(0, 300), currency: get(c.cur) || "EUR", counterparty: get(c.cp).slice(0, 200), reference: get(c.ref).slice(0, 200), balance: parseAmount(get(c.bal)), id: get(c.id), raw });
  });
  return { rows, errors, columns };
}

/* ───────────── Fournisseurs connus (décaissements) ───────────── */

export const SUPPLIER_RULES: { re: RegExp; supplier: string; category: Category }[] = [
  { re: /haibao|shandong|bus international|kevin|yihai|oceanexp/i, supplier: "Usine / fret Chine", category: "achat véhicules" },
  { re: /seatrans|ansquer|douane|dgddi|customs/i, supplier: "Transitaire / douane", category: "douane" },
  { re: /\bdls\b|\bcms\b|rabouin|transport|logisti|depann|dépann|plateau/i, supplier: "Transport / dépotage", category: "transport" },
  { re: /brevo|sendinblue|vercel|supabase|openai|chatgpt|anthropic|google|gsuite|workspace|github|resend|twilio|hostinger|ovh|ionos|canva|notion|adobe|apple\.com|microsoft/i, supplier: "Logiciel / abonnement", category: "logiciel" },
  { re: /facebook|meta|instagram|leboncoin|tiktok|google ads|adwords/i, supplier: "Publicité", category: "publicité" },
  { re: /total|esso|shell|\bbp\b|avia|carbu|station|intermarche|leclerc|vinci|sanef|aprr|\basf\b|autoroute|peage|péage|ulys|bip&go|bipandgo/i, supplier: "Carburant / péage", category: "carburant/péage" },
  { re: /\bfee\b|frais|commission|revolut business plan|plan fee|abonnement revolut/i, supplier: "Revolut", category: "frais bancaires" },
];
export function supplierOf(text: string) { return SUPPLIER_RULES.find(r => r.re.test(text)) || null; }

/* ───────────── Rapprochement des encaissements ───────────── */

export type InvLite = { id: number; number: string | null; status: string; total_ttc: number | null; client_name: string | null; reservation_id: number | null; delivered_at: string | null; issued_at: string | null };
export type ResLite = { id: number; nom: string | null; prenom: string | null; total: number | null; montant_du: number | null; acompte: number | null; livre_at: string | null; created_at: string; statut: string | null };
const days = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;
const nameIn = (hay: string, ...names: (string | null | undefined)[]) => names.map(n => norm(String(n || ""))).filter(n => n.length >= 4).some(n => hay.includes(n));

/** Meilleure vente pour un encaissement : n° de facture dans le libellé, ou nom du client + montant (±1 €) / date proche. null si doute. */
export function matchCredit(t: { amount: number; date: string; label: string; reference: string; counterparty: string }, invoices: InvLite[], res: ResLite[]) {
  const text = `${t.label} ${t.reference} ${t.counterparty}`;
  const hay = norm(text);
  const num = text.toUpperCase().match(/FA-\d{4}-\d{4}/)?.[0];
  if (num) { const inv = invoices.find(i => i.number === num); if (inv) return { invoice_id: inv.id, reservation_id: inv.reservation_id, why: `n° ${num}` }; }
  const resId = text.match(/(?:r[ée]s(?:ervation)?\.?\s*(?:n°|no|#)?\s*)(\d{1,6})/i)?.[1];
  const near = (amt: unknown) => amt != null && Math.abs(Number(amt) - t.amount) <= 1;
  const cands: { invoice_id: number | null; reservation_id: number; score: number; why: string }[] = [];
  for (const r of res) {
    if (r.statut === "Annulée") continue;
    const inv = invoices.find(i => i.reservation_id === r.id) || null;
    const name = nameIn(hay, r.nom, `${r.prenom || ""}${r.nom || ""}`);
    const amount = near(inv?.total_ttc) || near(r.total) || near(r.montant_du) || near(r.acompte);
    const ref = resId && Number(resId) === r.id;
    const when = r.livre_at || r.created_at;
    const close = when ? days(t.date, when) <= 90 : true;
    let score = 0; const why: string[] = [];
    if (ref) { score += 3; why.push(`réservation n° ${r.id}`); }
    if (name) { score += 2; why.push("nom"); }
    if (amount) { score += 1; why.push("montant"); }
    if (close && (name || ref)) score += 0.5;
    if ((ref || name) && score >= 2.5) cands.push({ invoice_id: inv?.id ?? null, reservation_id: r.id, score, why: why.join(" + ") });
  }
  cands.sort((a, b) => b.score - a.score);
  if (!cands.length || (cands[1] && cands[1].score === cands[0].score)) return null;
  return cands[0];
}

/* ───────────── Exports Pennylane ───────────── */

export type InvoiceForExport = { number: string | null; issued_at: string | null; client_name: string | null; vin: string | null; lines: InvoiceLine[]; total_ht: number | null; tva: number | null; total_ttc: number | null };
const frDate = (d: string | null) => d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : "";
const n2 = (v: number) => v.toFixed(2).replace(".", ",");
export const csvCell = (v: unknown) => { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** Une ligne par ligne de facture (le débours sur sa propre ligne, taux 0 %). Même contenu qu'un futur envoi API. */
export function pennylaneInvoiceRows(inv: InvoiceForExport, payRef: string) {
  return (inv.lines || []).filter(l => Number(l.ttc)).map(l => {
    const ttc = Number(l.ttc); const ht = lineHt(l); const deb = !!l.debours || l.key === DEBOURS_KEY;
    return { date: frDate(inv.issued_at), numero: inv.number || "", client: inv.client_name || "", libelle: `${l.label}${inv.vin ? ` – VIN ${inv.vin}` : ""}`, ht, tva: Math.round((ttc - ht) * 100) / 100, ttc, taux: deb ? "0 % (débours)" : "20 %", reference_paiement: payRef };
  });
}
export function pennylaneInvoicesCsv(rows: ReturnType<typeof pennylaneInvoiceRows>) {
  return "﻿" + [["Date", "Numéro de facture", "Client", "Libellé", "Montant HT", "Montant TVA", "Montant TTC", "Taux TVA", "Référence paiement"].join(";"),
    ...rows.map(r => [r.date, r.numero, r.client, r.libelle, n2(r.ht), n2(r.tva), n2(r.ttc), r.taux, r.reference_paiement].map(csvCell).join(";"))].join("\r\n");
}
export type TxForExport = { date: string; label: string | null; counterparty: string | null; amount: number; category: string | null; supplier: string | null; invoice_number: string | null; note: string | null };
export function bankMatchCsv(tx: TxForExport[]) {
  return "﻿" + [["Date", "Libellé", "Contrepartie", "Montant", "Numéro de facture", "Catégorie", "Fournisseur", "Note"].join(";"),
    ...tx.map(t => [frDate(t.date), t.label, t.counterparty, n2(Number(t.amount)), t.invoice_number, t.category, t.supplier, t.note].map(csvCell).join(";"))].join("\r\n");
}
