/** Justificatifs d'achat : lecture automatique (OpenAI), rapprochement avec les débits Revolut, attestation de justificatif manquant. Serveur uniquement. */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PDFDocument from "pdfkit";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeText } from "./pdf-text";
import { SELLER_INVOICE, eurFr } from "./stock-shared";
import { RECEIPT_CATEGORIES, receiptToBankCategory } from "./accounting";

export const RECEIPT_BUCKET = "erp-documents";
export const RECEIPT_FOLDER = "justificatifs";
type DB = SupabaseClient;
const r2 = (n: number) => Math.round(n * 100) / 100;

const INSTRUCTIONS = `Tu lis un justificatif d'achat d'une entreprise française (ticket de caisse, ticket de carburant ou de péage, note d'hôtel ou de restaurant, facture fournisseur), photo ou PDF.
Réponds uniquement en json : {"date": "AAAA-MM-JJ ou null", "marchand": "nom du commerce ou du fournisseur", "total_ttc": nombre ou null (montant total payé), "tva_montant": nombre ou null, "tva_taux": nombre ou null (ex. 20), "paiement": "carte | espèces | virement | inconnu (+ 4 derniers chiffres de la carte si visibles)", "categorie": une valeur parmi ${RECEIPT_CATEGORIES.map(c => `"${c}"`).join(", ")}, "facture_complete": true si c'est une vraie facture au nom de l'acheteur (nom ou SIREN de l'acheteur indiqué), false pour un simple ticket, "acheteur": "nom de l'acheteur s'il figure, sinon vide", "objet": "ce qui a été acheté, en quelques mots"}.
Les montants sont en euros, avec un point décimal. N'invente rien : null si illisible.`;

export type ReceiptRead = { date: string | null; merchant: string; total_ttc: number | null; tva_amount: number | null; tva_rate: number | null; payment_hint: string; category: string; is_invoice: boolean; buyer: string; objet: string };

export async function readReceipt(buf: Uint8Array, mime: string, name: string): Promise<ReceiptRead> {
  const key = process.env.OPENAI_API_KEY; if (!key) throw new Error("Lecture automatique indisponible (clé OpenAI absente)");
  const ext = (name.match(/\.([a-z0-9]{1,5})$/i)?.[1] || "").toLowerCase(); const b64 = Buffer.from(buf).toString("base64");
  const img = /^image\/(jpeg|png|webp|gif)$/.test(mime) ? mime : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : /^jpe?g$/.test(ext) ? "image/jpeg" : "";
  const part = mime === "application/pdf" || ext === "pdf" ? { type: "input_file", filename: ext === "pdf" ? name : `${name}.pdf`, file_data: `data:application/pdf;base64,${b64}` }
    : img ? { type: "input_image", image_url: `data:${img};base64,${b64}`, detail: "high" } : null;
  if (!part) throw new Error("Format non lisible (HEIC ?) : envoyez une photo JPG ou un PDF");
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 60_000);
  try {
    const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", signal: ctl.signal, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_RECEIPT_MODEL || process.env.OPENAI_VIN_MODEL || "gpt-4.1-mini", instructions: INSTRUCTIONS, input: [{ role: "user", content: [{ type: "input_text", text: "Lis ce justificatif. Réponds en json." }, part] }], text: { format: { type: "json_object" } }, max_output_tokens: 500 }) });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`Lecture impossible (${r.status})`);
    const txt: string = (j?.output || []).flatMap((x: { content?: unknown[] }) => x.content || []).filter((x: { type?: string }) => x.type === "output_text").map((x: { text?: string }) => x.text || "").join("");
    const o = JSON.parse(txt || "{}") as Record<string, unknown>;
    const num = (v: unknown) => v === null || v === undefined || v === "" ? null : Number.isFinite(Number(String(v).replace(",", "."))) ? r2(Number(String(v).replace(",", "."))) : null;
    const cat = String(o.categorie || "autre");
    return {
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(o.date)) ? String(o.date) : null, merchant: String(o.marchand || "").slice(0, 120), total_ttc: num(o.total_ttc), tva_amount: num(o.tva_montant), tva_rate: num(o.tva_taux),
      payment_hint: String(o.paiement || "").slice(0, 80), category: (RECEIPT_CATEGORIES as readonly string[]).includes(cat) ? cat : "autre", is_invoice: o.facture_complete === true, buyer: String(o.acheteur || "").slice(0, 120), objet: String(o.objet || "").slice(0, 200),
    };
  } finally { clearTimeout(t); }
}

const words = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter(w => w.length >= 4);
const days = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;

/** Relie un justificatif au débit Revolut correspondant (montant ±0,50 €, date ±3 jours, nom du marchand en bonus). Complète la catégorie du débit. */
export async function matchReceipt(db: DB, id: number) {
  const { data: rc } = await db.from("receipts").select("*").eq("id", id).maybeSingle();
  if (!rc || rc.transaction_id || !rc.total_ttc || !rc.date) return null;
  const lo = new Date(new Date(rc.date).getTime() - 3 * 86400000).toISOString().slice(0, 10), hi = new Date(new Date(rc.date).getTime() + 3 * 86400000).toISOString().slice(0, 10);
  const [{ data: tx }, { data: taken }] = await Promise.all([
    db.from("bank_transactions").select("id,date,label,counterparty,amount,category,match_kind").lt("amount", 0).gte("date", lo).lte("date", hi).limit(500),
    db.from("receipts").select("transaction_id").not("transaction_id", "is", null).limit(10000),
  ]);
  const used = new Set((taken || []).map(t => t.transaction_id));
  const mw = words(rc.merchant || "");
  const cands = (tx || []).filter(t => !used.has(t.id) && Math.abs(-Number(t.amount) - Number(rc.total_ttc)) <= 0.5)
    .map(t => ({ t, score: (mw.some(w => words(`${t.label || ""} ${t.counterparty || ""}`).includes(w)) ? 2 : 0) + (days(t.date, rc.date) <= 1 ? 1 : 0) }))
    .sort((a, b) => b.score - a.score);
  if (!cands.length || (cands[1] && cands[1].score === cands[0].score)) return null;
  const t = cands[0].t;
  await db.from("receipts").update({ transaction_id: t.id, match_kind: "auto", updated_at: new Date().toISOString() }).eq("id", id).is("transaction_id", null);
  await syncTransaction(db, id);
  return t.id;
}

/** Le débit relié reprend la catégorie et le fournisseur du justificatif (sans écraser un choix manuel) et la TVA déductible si c'est une vraie facture. */
export async function syncTransaction(db: DB, receiptId: number) {
  const { data: rc } = await db.from("receipts").select("*").eq("id", receiptId).maybeSingle();
  if (!rc?.transaction_id) return;
  const { data: t } = await db.from("bank_transactions").select("id,category,supplier,match_kind,vat_deductible").eq("id", rc.transaction_id).maybeSingle();
  if (!t) return;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (t.match_kind !== "manuel" || !t.category) { patch.category = receiptToBankCategory(rc.category); patch.supplier = rc.merchant || t.supplier; patch.match_kind = t.match_kind || "auto"; }
  patch.vat_deductible = rc.vat_deductible && rc.tva_amount ? Number(rc.tva_amount) : rc.kind === "attestation" ? 0 : t.vat_deductible;
  await db.from("bank_transactions").update(patch).eq("id", t.id);
}

/** Attestation interne de dépense sans justificatif (ticket perdu), signée par le dirigeant. La TVA n'est pas déductible. */
export function attestationPdf(a: { date: string; amount: number; supplier: string; objet: string; raison: string; label: string; signedAt: string }): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = safeText(new PDFDocument({ size: "A4", margin: 50, info: { Title: "Attestation de dépense sans justificatif", Author: SELLER_INVOICE.name } }));
    const chunks: Buffer[] = []; doc.on("data", (b: Buffer) => chunks.push(b)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    const d = (s: string) => new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
    doc.font("Helvetica-Bold").fontSize(11).text(SELLER_INVOICE.name);
    doc.font("Helvetica").fontSize(9).fillColor("#555").text([...SELLER_INVOICE.address, `SIREN ${SELLER_INVOICE.siren}`].join("\n"));
    doc.moveDown(2).fillColor("#111").font("Helvetica-Bold").fontSize(16).text("ATTESTATION DE DÉPENSE SANS JUSTIFICATIF", { align: "center" });
    doc.moveDown(1.5).font("Helvetica").fontSize(11).text(`Je soussigné Mansour Khelifa, président de ${SELLER_INVOICE.name}, atteste que la dépense ci-dessous a été engagée pour les besoins de l'entreprise et que le justificatif d'origine n'a pas pu être produit.`, { lineGap: 3 });
    doc.moveDown(1);
    const row = (k: string, v: string) => { doc.font("Helvetica-Bold").text(`${k} : `, { continued: true }).font("Helvetica").text(v || "—"); doc.moveDown(0.3); };
    row("Date de la dépense", d(a.date)); row("Montant TTC", eurFr(a.amount)); row("Fournisseur", a.supplier); row("Objet professionnel", a.objet); row("Raison de l'absence de justificatif", a.raison); row("Opération bancaire (Revolut)", a.label);
    doc.moveDown(1).font("Helvetica-Bold").fillColor("#b91c1c").text("TVA non déductible : en l'absence de facture conforme, aucune TVA n'est récupérée sur cette dépense.");
    doc.moveDown(2).fillColor("#111").font("Helvetica").text(`Fait à Muret, le ${d(a.signedAt)}.`);
    doc.moveDown(0.5).text("Mansour Khelifa, président");
    doc.font("Helvetica-Oblique").fontSize(9).fillColor("#555").text(`Signé électroniquement dans l'outil de gestion NeoDrive le ${new Date(a.signedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}.`);
    doc.end();
  });
}
