/** Rémunération des prestataires de l'équipe : ventes / confirmations depuis la base, relevés mensuels et PDF de facture. Serveur uniquement. */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PDFDocument from "pdfkit";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeText } from "./pdf-text";
import { COMPANY } from "./driver-docs";
import { fmtIban } from "./driver-invoice-shared";
import { INVOICE_DESCRIPTION, VAT_MENTION, assignItems, cleanTerms, computeMonth, dueDate, eur, frDate, monthLabel, monthsSince, parisDay, type Adjustment, type InvoiceStatus, type PayItem, type PayTerms, type Profile, type Statement } from "./team-pay";

export const TEAM_BUCKET = "team-docs";
/** Résultats d'appel qui ne sont pas un vrai échange avec le client. */
const NOT_EXCHANGE = new Set(["Injoignable", "Messagerie", "Mauvais numéro"]);
/** Un appel ne compte comme vrai échange (vente) que s'il est accompagné d'un compte rendu écrit d'au moins 30 caractères. */
export const MIN_NOTE = 30;

export type InvoiceRow = { id: number; member_id: number; month: string; status: InvoiceStatus; number: string | null; statement: Statement | null; total: number | null; adjustments: Adjustment[]; pdf_path: string | null; signature_path: string | null; sent_at: string | null; paid_at: string | null; resend: boolean };
export type Excluded = { reservation_id: number; client: string; city: string; date: string; reason: string };
export type MonthView = { month: string; label: string; status: InvoiceStatus; number: string | null; statement: Statement; sent_at: string | null; paid_at: string | null; resend: boolean; due: string; can_send_from: string; pdf_path: string | null };

const first = (s: unknown) => String(s || "").trim().split(/\s+/)[0] || "Client";

/** Ventes et confirmations livrées et payées du membre (art. 7.2 et 7.3), + les livrées écartées avec la raison (pour le fondateur). */
export async function payItems(db: SupabaseClient, memberId: number, t: PayTerms): Promise<{ items: PayItem[]; excluded: Excluded[] }> {
  const [{ data: acts, error: e1 }, { data: leads, error: e2 }] = await Promise.all([
    db.from("team_activity").select("at,action,lead_id,detail").eq("member_id", memberId).in("action", ["call_result", "whatsapp", "reservation_confirmed", "callback_assigned"]).gte("at", t.start_date + "T00:00:00Z").limit(20000),
    db.from("leads").select("id").eq("assigned_to", String(memberId)).limit(20000),
  ]);
  if (e1 || e2) throw new Error((e1 || e2)!.message);
  const leadSet = new Set<number>((leads || []).map(l => Number(l.id)));
  const exchanges = new Map<number, string[]>(); // lead → dates des vrais échanges
  const confirmed = new Map<number, string>(); // réservation → date de la confirmation ferme
  for (const a of acts || []) {
    const lead = a.lead_id == null ? null : Number(a.lead_id);
    if (a.action === "callback_assigned" && lead) leadSet.add(lead); // appel entrant confié au membre
    if ((a.action === "whatsapp" || (a.action === "call_result" && !NOT_EXCHANGE.has(String(a.detail?.result || "")) && String(a.detail?.note || "").trim().length >= MIN_NOTE)) && lead) exchanges.set(lead, [...(exchanges.get(lead) || []), a.at]);
    if (a.action === "reservation_confirmed") { const rid = Number(a.detail?.reservation_id); if (rid && (!confirmed.has(rid) || Date.parse(a.at) < Date.parse(confirmed.get(rid)!))) confirmed.set(rid, a.at); }
  }
  const cols = "id,created_at,updated_at,prenom,ville,quantite,statut,lead_id,livre_at,paiement_confirme_at,paiement_en_attente";
  const rows = new Map<number, Record<string, any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const ids = [...leadSet]; const cids = [...confirmed.keys()];
  for (let i = 0; i < ids.length; i += 300) { const { data, error } = await db.from("reservations").select(cols).eq("statut", "Livrée").in("lead_id", ids.slice(i, i + 300)); if (error) throw new Error(error.message); for (const r of data || []) rows.set(r.id, r); }
  for (let i = 0; i < cids.length; i += 300) { const { data, error } = await db.from("reservations").select(cols).eq("statut", "Livrée").in("id", cids.slice(i, i + 300)); if (error) throw new Error(error.message); for (const r of data || []) rows.set(r.id, r); }
  const items: PayItem[] = []; const excluded: Excluded[] = [];
  for (const r of rows.values()) {
    const date = parisDay(r.livre_at || r.updated_at);
    const base = { reservation_id: Number(r.id), client: first(r.prenom), city: String(r.ville || ""), date };
    if (date < t.start_date) continue;
    const paid = !!r.paiement_confirme_at && !r.paiement_en_attente;
    const sold = r.lead_id != null && leadSet.has(Number(r.lead_id)) && (exchanges.get(Number(r.lead_id)) || []).some(at => Date.parse(at) < Date.parse(r.created_at));
    const conf = confirmed.get(Number(r.id));
    if (!sold && !conf) { excluded.push({ ...base, reason: "Aucun échange réel (appel abouti ou WhatsApp) enregistré par le membre avant la réservation, ni confirmation ferme." }); continue; }
    if (!paid) { excluded.push({ ...base, reason: "Paiement non confirmé dans Réservations (bouton « Confirmer le paiement »)." }); continue; }
    items.push({ ...base, kind: sold ? "vente" : "confirmation", qty: Math.max(1, Number(r.quantite) || 1) });
  }
  return { items, excluded };
}

/** Relevés de tous les mois depuis le début du contrat (les mois envoyés ou payés restent figés). */
export async function memberMonths(db: SupabaseClient, memberId: number, termsRaw: unknown) {
  const t = cleanTerms(termsRaw); if (!t) return null;
  const { data: inv, error } = await db.from("team_invoices").select("*").eq("member_id", memberId);
  if (error) throw new Error(error.message);
  const rows = (inv || []) as InvoiceRow[];
  const byMonth = Object.fromEntries(rows.map(r => [r.month, r]));
  const today = parisDay();
  const months = [...new Set([...monthsSince(t, today.slice(0, 7)), ...rows.map(r => r.month)])].sort();
  const frozen: Record<string, number[]> = {};
  for (const r of rows) if (r.status !== "brouillon" && r.statement) frozen[r.month] = (r.statement.items || []).map(i => i.reservation_id);
  const { items, excluded } = await payItems(db, memberId, t);
  const assigned = assignItems(t, months, items, frozen);
  for (const m of Object.keys(assigned)) if (!months.includes(m)) months.push(m);
  months.sort();
  const views: MonthView[] = [];
  for (const m of months) {
    const r = byMonth[m];
    const st = r && r.status !== "brouillon" && r.statement ? r.statement : computeMonth(t, m, assigned[m] || [], r?.adjustments || []);
    if (!st) continue;
    views.push({ month: m, label: monthLabel(m), status: r?.status || "brouillon", number: r?.number || null, statement: st, sent_at: r?.sent_at || null, paid_at: r?.paid_at || null, resend: !!r?.resend, due: dueDate(m), can_send_from: st.to, pdf_path: r?.pdf_path || null });
  }
  const sentCount = rows.filter(r => r.number).length;
  return { terms: t, months: views.reverse(), excluded, sentCount, rows: byMonth };
}

export type InvoicePdfData = { number: string; issued: string; month: string; profile: Profile; memberName: string; st: Statement; signature: Buffer | null };

export function teamInvoicePdf(x: InvoicePdfData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const p = x.profile; const name = p.full_name?.trim() || x.memberName;
    const doc = safeText(new PDFDocument({ size: "A4", margin: 40, info: { Title: `Facture ${x.number}`, Author: name } }));
    const chunks: Buffer[] = [];
    doc.on("data", (b: Buffer) => chunks.push(b)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    const ink = "#111", grey = "#666", accent = "#f05a28";

    doc.font("Helvetica-Bold").fontSize(14).fillColor(ink).text(name, 40, 40, { width: 260 });
    doc.font("Helvetica").fontSize(9).fillColor(ink).text(["Auto-entrepreneur (prestataire indépendante)", p.address || "", p.ae_number ? `N° auto-entrepreneur : ${p.ae_number}` : "", p.email || ""].filter(Boolean).join("\n"), 40, 60, { width: 260 });
    doc.font("Helvetica-Bold").fontSize(20).fillColor(accent).text("FACTURE", 300, 40, { width: 255, align: "right" });
    doc.font("Helvetica").fontSize(9.5).fillColor(ink).text(`N° ${x.number}\nDate : ${frDate(x.issued)}\nPériode : du ${frDate(x.st.from)} au ${frDate(x.st.to)}`, 300, 66, { width: 255, align: "right" });

    let y = Math.max(140, doc.y + 14);
    doc.roundedRect(300, y, 255, 66, 6).lineWidth(0.6).stroke("#bbb");
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("CLIENT", 310, y + 8);
    doc.font("Helvetica").fontSize(9).text(`MK HOLDING SAS (NeoDrive)\n${COMPANY.address}, France\nSIREN ${COMPANY.siren}`, 310, y + 21, { width: 235 });
    doc.font("Helvetica-Bold").fontSize(9).text("Objet", 40, y + 4, { width: 245 });
    doc.font("Helvetica").fontSize(9).fillColor(grey).text(`${INVOICE_DESCRIPTION}. Mois de ${monthLabel(x.month)}.`, 40, y + 17, { width: 245 });
    y += 84;

    doc.rect(40, y, 515, 18).fill("#f3efe9");
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("Désignation", 46, y + 5, { width: 400 }).text("Montant", 470, y + 5, { width: 80, align: "right" });
    y += 24;
    for (const l of x.st.lines) {
      const h = doc.font("Helvetica").fontSize(9).heightOfString(l.label, { width: 410 });
      if (y + h > 740) { doc.addPage(); y = 40; }
      doc.fillColor(l.kind === "info" ? grey : ink).text(l.label, 46, y, { width: 410 });
      doc.text(l.amount == null ? "—" : eur(l.amount), 470, y, { width: 80, align: "right" });
      y += h + 6;
    }
    doc.moveTo(40, y).lineTo(555, y).lineWidth(0.5).stroke("#ccc"); y += 10;
    doc.font("Helvetica-Bold").fontSize(12).fillColor(ink).text("TOTAL À PAYER", 280, y, { width: 190 }).text(eur(x.st.total), 450, y, { width: 105, align: "right" }); y += 20;
    doc.font("Helvetica").fontSize(8.5).fillColor(grey).text(VAT_MENTION + ".", 40, y, { width: 515 }); y = doc.y + 14;

    if (y > 640) { doc.addPage(); y = 40; }
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(ink).text("Paiement", 40, y); y += 14;
    const bank = [`Par virement bancaire en euros, le ${frDate(dueDate(x.month))} au plus tard.`, `Titulaire : ${p.bank_holder?.trim() || name}${p.bank_name ? ` · Banque : ${p.bank_name}` : ""}`, p.iban ? `IBAN : ${fmtIban(p.iban)}` : p.rib ? `RIB : ${p.rib}` : "", p.bic ? `SWIFT / BIC : ${String(p.bic).toUpperCase()}` : ""].filter(Boolean).join("\n");
    doc.font("Helvetica").fontSize(9).fillColor(ink).text(bank, 40, y, { width: 515 }); y = doc.y + 18;

    if (y > 660) { doc.addPage(); y = 40; }
    doc.font("Helvetica").fontSize(9).fillColor(ink).text(`Fait le ${frDate(x.issued)}, signature de la prestataire :`, 300, y, { width: 255 }); y += 14;
    if (x.signature) { try { doc.image(x.signature, 300, y, { fit: [200, 80] }); } catch { /* signature illisible */ } }
    doc.font("Helvetica").fontSize(9).text(name, 300, y + 84, { width: 255 });
    doc.end();
  });
}
