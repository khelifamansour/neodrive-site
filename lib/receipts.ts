/** Justificatifs d'achat : lecture automatique (OpenAI), rapprochement avec les débits Revolut, attestation de justificatif manquant. Serveur uniquement. */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PDFDocument from "pdfkit";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeText } from "./pdf-text";
import { SELLER_INVOICE, eurFr } from "./stock-shared";
import { RECEIPT_CATEGORIES, VAT_REGIMES, receiptToBankCategory } from "./accounting";

export const RECEIPT_BUCKET = "erp-documents";
export const RECEIPT_FOLDER = "justificatifs";
type DB = SupabaseClient;
const r2 = (n: number) => Math.round(n * 100) / 100;

const INSTRUCTIONS = `Tu lis un justificatif d'achat de la société française MK HOLDING SAS (NeoDrive, importateur de voitures) : ticket de caisse, ticket de carburant ou de péage, note d'hôtel ou de restaurant, facture fournisseur (française, européenne ou étrangère, par exemple chinoise), déclaration en douane, photo, PDF ou texte d'e-mail.
Réponds uniquement en json : {"document_achat": true si c'est bien un ticket, une facture ou un reçu de paiement (false pour un logo, des conditions générales, une publicité, un devis non accepté, un simple e-mail sans montant), "date": "AAAA-MM-JJ ou null" (date de la facture), "marchand": "nom du commerce ou du fournisseur", "numero_facture": "numéro de la facture ou du ticket, sinon vide", "total_ttc": nombre ou null (montant total à payer), "total_ht": nombre ou null, "tva_montant": nombre ou null (total de la TVA facturée), "tva_taux": nombre ou null (taux principal, ex. 20), "tva_lignes": [{"taux": nombre, "base_ht": nombre ou null, "tva": nombre ou null}] (une ligne par taux de TVA, [] si aucune), "devise": "EUR, USD, CNY… (code ISO)", "regime_tva": "normale" (TVA française facturée) | "autoliquidation" (mentions « autoliquidation », « reverse charge », « article 283-2 », « article 196 », TVA non facturée par un fournisseur de l'UE ou étranger) | "import" (déclaration en douane, DAU, « TVA à l'import autoliquidée ») | "sans TVA" (exonération, franchise en base, débours), "iban": "IBAN du fournisseur s'il figure, sinon vide", "paiement": "carte | espèces | virement | inconnu (+ 4 derniers chiffres de la carte si visibles)", "categorie": une valeur parmi ${RECEIPT_CATEGORIES.map(c => `"${c}"`).join(", ")} ("transport" = fret maritime ou routier, convoyage ; "dépotage/logistique" = dépotage de conteneur, manutention, stockage, port ; "logiciel" = logiciels et abonnements en ligne ; "achat véhicules" = facture de l'usine ou d'un vendeur de voitures), "facture_complete": true si c'est une vraie facture au nom de l'acheteur (nom ou SIREN de l'acheteur indiqué), false pour un simple ticket, "acheteur": "nom de l'acheteur s'il figure, sinon vide", "objet": "ce qui a été acheté, en quelques mots"}.
Montants avec un point décimal, dans la devise de la facture. N'invente rien : null ou vide si illisible.`;

export type VatLine = { rate: number | null; base: number | null; tva: number | null };
export type ReceiptRead = { is_document: boolean; date: string | null; merchant: string; invoice_number: string; total_ttc: number | null; total_ht: number | null; tva_amount: number | null; tva_rate: number | null; vat_lines: VatLine[]; currency: string; vat_regime: string; iban: string; payment_hint: string; category: string; is_invoice: boolean; buyer: string; objet: string };

/** Lecture automatique (OpenAI) d'une photo, d'un PDF ou d'un texte (mime text/plain : corps d'un e-mail). */
export async function readReceipt(buf: Uint8Array, mime: string, name: string): Promise<ReceiptRead> {
  const key = process.env.OPENAI_API_KEY; if (!key) throw new Error("Lecture automatique indisponible (clé OpenAI absente)");
  const ext = (name.match(/\.([a-z0-9]{1,5})$/i)?.[1] || "").toLowerCase(); const b64 = Buffer.from(buf).toString("base64");
  const img = /^image\/(jpeg|png|webp|gif)$/.test(mime) ? mime : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : /^jpe?g$/.test(ext) ? "image/jpeg" : "";
  const part = mime === "text/plain" ? { type: "input_text", text: `Texte de l'e-mail :\n${Buffer.from(buf).toString("utf8").slice(0, 30000)}` }
    : mime === "application/pdf" || ext === "pdf" ? { type: "input_file", filename: ext === "pdf" ? name : `${name}.pdf`, file_data: `data:application/pdf;base64,${b64}` }
    : img ? { type: "input_image", image_url: `data:${img};base64,${b64}`, detail: "high" } : null;
  if (!part) throw new Error("Format non lisible (HEIC ?) : envoyez une photo JPG ou un PDF");
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 75_000);
  try {
    const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", signal: ctl.signal, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_RECEIPT_MODEL || process.env.OPENAI_VIN_MODEL || "gpt-4.1-mini", instructions: INSTRUCTIONS, input: [{ role: "user", content: [{ type: "input_text", text: "Lis ce justificatif. Réponds en json." }, part] }], text: { format: { type: "json_object" } }, max_output_tokens: 1000 }) });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`Lecture impossible (${r.status})`);
    const txt: string = (j?.output || []).flatMap((x: { content?: unknown[] }) => x.content || []).filter((x: { type?: string }) => x.type === "output_text").map((x: { text?: string }) => x.text || "").join("");
    const o = JSON.parse(txt || "{}") as Record<string, unknown>;
    const num = (v: unknown) => v === null || v === undefined || v === "" ? null : Number.isFinite(Number(String(v).replace(/\s/g, "").replace(",", "."))) ? r2(Number(String(v).replace(/\s/g, "").replace(",", "."))) : null;
    const cat = String(o.categorie || "autre"); const regime = String(o.regime_tva || "");
    const cur = String(o.devise || "EUR").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) || "EUR";
    const lines = Array.isArray(o.tva_lignes) ? (o.tva_lignes as Record<string, unknown>[]).slice(0, 6).map(l => ({ rate: num(l?.taux), base: num(l?.base_ht), tva: num(l?.tva) })).filter(l => l.rate !== null || l.tva !== null) : [];
    const iban = String(o.iban || "").replace(/\s/g, "").toUpperCase();
    return {
      is_document: o.document_achat !== false,
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(o.date)) ? String(o.date) : null, merchant: String(o.marchand || "").slice(0, 120), invoice_number: String(o.numero_facture || "").trim().slice(0, 80),
      total_ttc: num(o.total_ttc), total_ht: num(o.total_ht), tva_amount: num(o.tva_montant), tva_rate: num(o.tva_taux), vat_lines: lines, currency: cur,
      vat_regime: (VAT_REGIMES as readonly string[]).includes(regime) ? regime : "normale", iban: /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban) ? iban : "",
      payment_hint: String(o.paiement || "").slice(0, 80), category: (RECEIPT_CATEGORIES as readonly string[]).includes(cat) ? cat : "autre", is_invoice: o.facture_complete === true, buyer: String(o.acheteur || "").slice(0, 120), objet: String(o.objet || "").slice(0, 200),
    };
  } finally { clearTimeout(t); }
}

/** Fournisseur ramené à une clé simple pour repérer les doublons (« SARL Garage Dupont » = « garage dupont »). */
export const supplierKey = (s: string | null | undefined) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(sas|sarl|sasu|eurl|sa|ltd|co|gmbh|srl|bv|inc|llc|limited|company|france)\b/g, "").replace(/[^a-z0-9]/g, "");
const numberKey = (s: string | null | undefined) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Raisons de vérifier une lecture à la main (montants incohérents, devise, acheteur…). */
export function reviewReasons(o: Pick<ReceiptRead, "date" | "total_ttc" | "total_ht" | "tva_amount" | "vat_lines" | "currency" | "is_invoice" | "invoice_number" | "buyer" | "merchant">) {
  const out: string[] = [];
  if (!o.date) out.push("date illisible");
  if (o.total_ttc == null) out.push("montant illisible");
  if (!o.merchant) out.push("fournisseur illisible");
  if (o.currency && o.currency !== "EUR") out.push(`facture en ${o.currency} : rapprochement à faire à la main`);
  if (o.is_invoice && !o.invoice_number) out.push("numéro de facture absent");
  if (o.total_ttc != null && o.total_ht != null && o.tva_amount != null && Math.abs(o.total_ht + o.tva_amount - o.total_ttc) > 0.05) out.push("HT + TVA ≠ TTC");
  const sumLines = o.vat_lines.reduce((a, l) => a + Number(l.tva || 0), 0);
  if (o.vat_lines.length && o.tva_amount != null && Math.abs(sumLines - o.tva_amount) > 0.05) out.push("TVA par taux ≠ TVA totale");
  if (o.is_invoice && o.buyer && !/mk\s*holding|neodrive|neo\s*drive|easy\s*drive|khelifa/i.test(o.buyer)) out.push(`facture au nom de « ${o.buyer} »`);
  return out;
}

/** Enregistre une lecture automatique sur le justificatif, repère un doublon (même fournisseur + même n°) et cherche le débit Revolut. */
export async function applyReceiptRead(db: DB, id: number, o: ReceiptRead, fallbackMonth: string) {
  const reasons = reviewReasons(o);
  let duplicateOf: number | null = null;
  if (o.invoice_number) {
    const { data: same } = await db.from("receipts").select("id,merchant,invoice_number").neq("id", id).not("invoice_number", "is", null).ilike("invoice_number", `%${o.invoice_number.replace(/[%_]/g, "").slice(-12)}%`).limit(50);
    duplicateOf = (same || []).find(x => numberKey(x.invoice_number) === numberKey(o.invoice_number) && supplierKey(x.merchant) && supplierKey(x.merchant) === supplierKey(o.merchant))?.id ?? null;
    if (duplicateOf) reasons.unshift(`doublon de la pièce n° ${duplicateOf}`);
  }
  const deductible = o.is_invoice && Number(o.tva_amount) > 0 && o.vat_regime === "normale" && o.currency === "EUR";
  await db.from("receipts").update({
    status: "lu", date: o.date, month: o.date ? o.date.slice(0, 7) : fallbackMonth, merchant: o.merchant || null, invoice_number: o.invoice_number || null,
    total_ttc: o.total_ttc, total_ht: o.total_ht, tva_amount: o.tva_amount, tva_rate: o.tva_rate, vat_lines: o.vat_lines, currency: o.currency, vat_regime: o.vat_regime, iban: o.iban || null,
    payment_hint: o.payment_hint || null, category: o.category, is_invoice: o.is_invoice, buyer: o.buyer || null, vat_deductible: deductible,
    extracted: o, note: o.objet || null, review: reasons.length ? reasons.join(" · ").slice(0, 500) : null, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (!duplicateOf) await matchReceipt(db, id);
  return { duplicateOf };
}

const words = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter(w => w.length >= 4);
const days = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;

/**
 * Relie un justificatif au débit Revolut correspondant. Ticket : montant ±0,50 €, date ±3 jours, nom du marchand en bonus.
 * Facture fournisseur (vraie facture ou reçue par e-mail) : payée souvent plus tard (ou en acompte avant) → débit de −30 à +60 jours,
 * montant ±0,50 € (ou 0,2 %) ; n° de facture dans le libellé du virement ou nom du fournisseur exigé si le débit est loin de la date.
 * Factures hors euros : pas de rapprochement automatique. Jamais de doute : deux candidats ex æquo → rien.
 */
export async function matchReceipt(db: DB, id: number) {
  const { data: rc } = await db.from("receipts").select("*").eq("id", id).maybeSingle();
  if (!rc || rc.transaction_id || !rc.total_ttc || !rc.date) return null;
  if (rc.currency && rc.currency !== "EUR") return null;
  const invoice = !!rc.is_invoice || rc.source === "email";
  const day = 86400000, at = new Date(rc.date).getTime();
  const lo = new Date(at - (invoice ? 30 : 3) * day).toISOString().slice(0, 10), hi = new Date(at + (invoice ? 60 : 3) * day).toISOString().slice(0, 10);
  const tol = Math.max(0.5, invoice ? Number(rc.total_ttc) * 0.002 : 0);
  const [{ data: tx }, { data: taken }] = await Promise.all([
    db.from("bank_transactions").select("id,date,label,counterparty,reference,amount,category,match_kind").lt("amount", 0).gte("date", lo).lte("date", hi).limit(1000),
    db.from("receipts").select("transaction_id").not("transaction_id", "is", null).limit(10000),
  ]);
  const used = new Set((taken || []).map(t => t.transaction_id));
  const mw = words(rc.merchant || "");
  const num = String(rc.invoice_number || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const cands = (tx || []).filter(t => !used.has(t.id) && Math.abs(-Number(t.amount) - Number(rc.total_ttc)) <= tol)
    .map(t => {
      const text = `${t.label || ""} ${t.counterparty || ""} ${t.reference || ""}`;
      const byNum = num.length >= 4 && text.toUpperCase().replace(/[^A-Z0-9]/g, "").includes(num);
      const byName = mw.some(w => words(text).includes(w));
      const d = days(t.date, rc.date);
      return { t, ok: !invoice || byNum || byName || d <= 5, score: (byNum ? 3 : 0) + (byName ? 2 : 0) + (d <= 1 ? 1 : d <= 7 ? 0.5 : 0) };
    })
    .filter(x => x.ok).sort((a, b) => b.score - a.score);
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

/** Facture envoyée dans le corps d'un e-mail (sans pièce jointe) : mise en PDF pour servir de justificatif. */
export function emailBodyPdf(a: { from: string; subject: string; date: string; text: string }): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = safeText(new PDFDocument({ size: "A4", margin: 50, info: { Title: a.subject || "Facture reçue par e-mail", Author: a.from } }));
    const chunks: Buffer[] = []; doc.on("data", (b: Buffer) => chunks.push(b)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    doc.font("Helvetica-Bold").fontSize(13).text(a.subject || "Facture reçue par e-mail");
    doc.moveDown(0.4).font("Helvetica").fontSize(9).fillColor("#555").text(`De : ${a.from}\nReçu le : ${a.date}\nDestinataire : ${SELLER_INVOICE.name}`);
    doc.moveDown(1).fillColor("#111").fontSize(10).text(a.text.replace(/[^\x09\x0a\x0d\x20-\x7e -ɏ‘-„€]/g, " ").slice(0, 60000), { lineGap: 2 });
    doc.end();
  });
}
