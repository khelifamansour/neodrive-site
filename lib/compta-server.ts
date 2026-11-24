/**
 * Comptabilité côté serveur : vue du mois (rapprochement, justificatifs, TVA estimée), boîte de réception des factures
 * fournisseurs (Brevo Inbound Parsing) et résumé mensuel envoyé au fondateur. Serveur uniquement.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RECEIPT_BUCKET, RECEIPT_FOLDER, applyReceiptRead, emailBodyPdf, readReceipt } from "./receipts";
import { SITE } from "./brevo";
import { eurFr } from "./stock-shared";
import { RECEIPT_CATEGORY_LABEL, receiptState } from "./accounting";

type DB = SupabaseClient;
export const MONTH = /^\d{4}-\d{2}$/;
export const monthEnd = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10); };
const r2 = (n: number) => Math.round(n * 100) / 100;
export const TX = "id,date,label,amount,currency,counterparty,reference,balance,category,supplier,match_kind,invoice_id,reservation_id,parts_order,vat_deductible,ignored,note,import_month";
export const RC_BASE = "id,created_at,month,kind,path,file_name,mime,size,status,date,merchant,total_ttc,tva_amount,tva_rate,payment_hint,category,is_invoice,buyer,vat_deductible,transaction_id,match_kind,note";
export const RC = `${RC_BASE},source,invoice_number,total_ht,vat_lines,currency,vat_regime,iban,email_from,email_subject,review,checked_at`;
export const safeName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-60) || "justificatif";
export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const comptaUrl = (month: string) => `${SITE}/stock-facturation?onglet=compta&mois=${month}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Justificatifs (avec les colonnes « factures fournisseurs » si le script SQL a été passé, sinon les colonnes d'origine). */
async function receiptsOf(db: DB, q: (cols: string) => PromiseLike<{ data: Row[] | null; error: unknown }>) {
  const a = await q(RC); if (!a.error) return a.data || [];
  const b = await q(RC_BASE); return b.data || [];
}

/** Vue complète d'un mois : opérations, rapprochement, justificatifs, factures, TVA estimée, liste de contrôle. */
export async function monthData(db: DB, month: string) {
  const from = `${month}-01`, to = monthEnd(month);
  const [{ data: tx }, { data: inv }, { data: am }, { data: imports }, { data: monthsRaw }] = await Promise.all([
    db.from("bank_transactions").select(TX).eq("import_month", month).order("date").order("id"),
    db.from("sales_invoices").select("id,number,status,issued_at,delivered_at,client_name,vin,total_ht,tva,total_ttc,lines,reservation_id").limit(5000),
    db.from("accounting_months").select("*").eq("month", month).maybeSingle(),
    db.from("bank_imports").select("id,created_at,file_name,months,rows,inserted").order("id", { ascending: false }).limit(12),
    db.from("bank_transactions").select("import_month").limit(10000),
  ]);
  const rcs = await receiptsOf(db, cols => db.from("receipts").select(cols).eq("month", month).order("date", { nullsFirst: true }).order("id") as unknown as PromiseLike<{ data: Row[] | null; error: unknown }>);
  const since = new Date(new Date(`${from}T12:00:00Z`).getTime() - 180 * 86400000).toISOString().slice(0, 10);
  const older = await receiptsOf(db, cols => db.from("receipts").select(cols).eq("is_invoice", true).is("transaction_id", null).gte("date", since).lt("date", from).limit(300) as unknown as PromiseLike<{ data: Row[] | null; error: unknown }>);
  const { data: inbound } = await db.from("inbound_emails").select("id,created_at,from_email,from_name,subject,attachments,receipts,duplicates,ignored,status,error").order("id", { ascending: false }).limit(15);
  const txs = tx || []; const invs = inv || [];
  const withReceipt = new Set(rcs.map(r => r.transaction_id).filter(Boolean));
  const { data: linkedOther } = txs.length ? await db.from("receipts").select("transaction_id").in("transaction_id", txs.map(t => t.id)) : { data: [] };
  for (const l of linkedOther || []) withReceipt.add(l.transaction_id);
  const needsReceipt = (t: typeof txs[number]) => Number(t.amount) < 0 && !t.ignored && t.category !== "frais bancaires" && t.category !== "virement interne";
  const inMonth = (d?: string | null) => !!d && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  const validated = invs.filter(i => i.status === "validée" && inMonth(i.issued_at));
  const drafts = invs.filter(i => i.status === "brouillon" && inMonth(i.delivered_at));
  const { data: paidLinks } = await db.from("bank_transactions").select("invoice_id,reservation_id").or("invoice_id.not.is.null,reservation_id.not.is.null").limit(10000);
  const paidInv = new Set((paidLinks || []).map(p => p.invoice_id).filter(Boolean)); const paidRes = new Set((paidLinks || []).map(p => p.reservation_id).filter(Boolean));
  const live = txs.filter(t => !t.ignored);
  const credits = live.filter(t => Number(t.amount) > 0), debits = live.filter(t => Number(t.amount) < 0);
  const matched = (t: typeof txs[number]) => !!t.match_kind && (!!t.category || !!t.invoice_id);
  const sum = (a: { amount?: unknown; total_ttc?: unknown }[], k: "amount" | "total_ttc" = "amount") => r2(a.reduce((s, x) => s + Number(x[k] || 0), 0));
  const caTtc = sum(validated, "total_ttc"); const caHt = r2(validated.reduce((s, i) => s + Number(i.total_ht || 0), 0)); const tvaCollectee = r2(validated.reduce((s, i) => s + Number(i.tva || 0), 0));
  const debours = r2(validated.reduce((s, i) => s + ((i.lines || []) as { debours?: boolean; ttc: number }[]).filter(l => l.debours).reduce((a, l) => a + Number(l.ttc || 0), 0), 0));
  const achatsTtc = r2(-sum(debits.filter(t => t.category !== "virement interne")));
  const tvaDeductible = r2(debits.reduce((s, t) => s + Number(t.vat_deductible || 0), 0));
  const invoicesNoPayment = [...validated, ...drafts].filter(i => !paidInv.has(i.id) && !(i.reservation_id && paidRes.has(i.reservation_id))).map(i => ({ id: i.id, number: i.number, client_name: i.client_name, total_ttc: i.total_ttc, status: i.status }));
  const paymentsNoInvoice = credits.filter(t => !t.invoice_id && (t.reservation_id || t.category === "vente voiture")).map(t => ({ id: t.id, date: t.date, label: t.label, amount: t.amount }));
  const months = [...new Set([...(monthsRaw || []).map(x => x.import_month), new Date().toISOString().slice(0, 7), month])].sort().reverse();

  // TVA estimée : collectée (factures FA-… validées du mois) − déductible (factures fournisseurs du mois, TVA française,
  // + TVA saisie à la main sur un débit sans justificatif). Autoliquidation / import : due et déductible du même montant, à déclarer.
  const real = rcs.filter(r => r.kind !== "attestation");
  const dedFactures = r2(real.filter(r => r.vat_deductible).reduce((s, r) => s + Number(r.tva_amount || 0), 0));
  const dedManuelle = r2(debits.filter(t => !withReceipt.has(t.id)).reduce((s, t) => s + Number(t.vat_deductible || 0), 0));
  const autoliq = real.filter(r => r.vat_regime === "autoliquidation" || r.vat_regime === "import").map(r => {
    const base = Number(r.total_ht ?? r.total_ttc ?? 0); const lines = Array.isArray(r.vat_lines) ? r.vat_lines as { tva?: number | null }[] : [];
    const fromDoc = lines.reduce((s, l) => s + Number(l.tva || 0), 0);
    return { id: r.id, date: r.date, merchant: r.merchant, number: r.invoice_number || null, regime: r.vat_regime, currency: r.currency || "EUR", base: r2(base), tva: r2(fromDoc > 0 ? fromDoc : base * 0.2) };
  });
  const vat = { collectee: tvaCollectee, deductibleFactures: dedFactures, deductibleManuelle: dedManuelle, deductible: r2(dedFactures + dedManuelle), autoliq, autoliqTva: r2(autoliq.filter(a => a.currency === "EUR").reduce((s, a) => s + a.tva, 0)), net: r2(tvaCollectee - dedFactures - dedManuelle) };
  const supplierUnpaid = [...older, ...rcs.filter(r => r.is_invoice && !r.transaction_id && r.kind !== "attestation")].map(r => ({ id: r.id, date: r.date, merchant: r.merchant, number: r.invoice_number || null, total_ttc: r.total_ttc, currency: r.currency || "EUR" }));

  const checklist = {
    releve: txs.length > 0,
    rapproche: txs.length > 0 && live.every(matched),
    factures: drafts.length === 0,
    pennylane: !!am?.pennylane_exported_at,
    justificatifs: txs.length > 0 && txs.filter(needsReceipt).every(t => withReceipt.has(t.id)),
  };
  return {
    month, months, transactions: txs, imports: imports || [],
    invoices: invs.filter(i => i.status === "validée" || inMonth(i.delivered_at) || i.status === "brouillon").map(i => ({ id: i.id, number: i.number, status: i.status, client_name: i.client_name, total_ttc: i.total_ttc, reservation_id: i.reservation_id })),
    stats: {
      credits: { matched: credits.filter(matched).length, unmatched: credits.filter(t => !matched(t)).length, total: sum(credits), matchedTotal: sum(credits.filter(matched)) },
      debits: { matched: debits.filter(matched).length, unmatched: debits.filter(t => !matched(t)).length, total: sum(debits), matchedTotal: sum(debits.filter(matched)) },
      caTtc, caHt, tvaCollectee, debours, validated: validated.length, drafts: drafts.length, achatsTtc, tvaDeductible, marge: r2(caHt - (achatsTtc - tvaDeductible)),
    },
    invoicesNoPayment, paymentsNoInvoice, checklist, exportedAt: am?.pennylane_exported_at || null,
    receipts: rcs, withReceipt: [...withReceipt], vat, supplierUnpaid, inbound: inbound || [], inboundAddress: inboundAddress(),
    debitsWithoutReceipt: txs.filter(t => needsReceipt(t) && !withReceipt.has(t.id)).map(t => ({ id: t.id, date: t.date, label: t.label || t.counterparty, amount: Number(t.amount) })),
    receiptStats: { debitsWith: txs.filter(t => needsReceipt(t) && withReceipt.has(t.id)).length, debitsWithout: txs.filter(t => needsReceipt(t) && !withReceipt.has(t.id)).length, receiptsNoDebit: rcs.filter(r => !r.transaction_id).length, attestations: rcs.filter(r => r.kind === "attestation").length, toCheck: rcs.filter(r => receiptState(r as Parameters<typeof receiptState>[0]) === "à vérifier").length },
  };
}
export type MonthData = Awaited<ReturnType<typeof monthData>>;

/* ───────────── Boîte de réception des factures (Brevo Inbound Parsing) ───────────── */

/** Domaine qui reçoit les factures (MX vers Brevo). Sous-domaine : la boîte mail du domaine principal n'est pas touchée. */
export const INBOUND_DOMAIN = () => process.env.COMPTA_INBOUND_DOMAIN || "factures.easydrive-auto.fr";
export const inboundAddress = () => `compta@${INBOUND_DOMAIN()}`;
/** Clé secrète de l'adresse du webhook (?k=…) : COMPTA_INBOUND_KEY, sinon dérivée de CRON_SECRET (rien à configurer). */
export function inboundKey() {
  if (process.env.COMPTA_INBOUND_KEY) return process.env.COMPTA_INBOUND_KEY;
  const s = process.env.CRON_SECRET; if (!s) return "";
  return createHmac("sha256", s).update("compta-inbound").digest("hex").slice(0, 40);
}
export function checkInboundKey(k: string) {
  const good = inboundKey(); if (!good || !k) return false;
  const a = Buffer.from(k), b = Buffer.from(good);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const inboundWebhookUrl = () => `${SITE}/api/compta/inbound?k=${inboundKey()}`;

/** Lecture tolérante d'un champ Brevo (« Subject », « subject »…). */
function g(o: unknown, ...keys: string[]): unknown {
  if (!o || typeof o !== "object") return undefined;
  const rec = o as Record<string, unknown>;
  for (const k of keys) if (rec[k] !== undefined && rec[k] !== null) return rec[k];
  const low = Object.keys(rec).reduce<Record<string, string>>((a, k) => { a[k.toLowerCase()] = k; return a; }, {});
  for (const k of keys) { const real = low[k.toLowerCase()]; if (real && rec[real] !== undefined && rec[real] !== null) return rec[real]; }
  return undefined;
}
const str = (v: unknown, n = 300): string => typeof v === "string" ? v.slice(0, n) : Array.isArray(v) ? str(v[0], n) : "";
const addr = (v: unknown): { email: string; name: string } => {
  if (Array.isArray(v)) return addr(v[0]);
  if (typeof v === "string") { const m = v.match(/<([^>]+)>/); return { email: (m?.[1] || v).trim().slice(0, 200), name: v.replace(/<[^>]+>/, "").replace(/"/g, "").trim().slice(0, 120) }; }
  return { email: str(g(v, "Address", "Email"), 200), name: str(g(v, "Name"), 120) };
};
const htmlToText = (h: string) => h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n").replace(/<\/t[dh]>/gi, "  ").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&euro;/g, "€").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
const OK_TYPES: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export type InboundItem = Record<string, unknown>;
/** Une ligne inbound_emails par e-mail (message_id unique : un renvoi de Brevo n'est pas traité deux fois). null si déjà reçu. */
export async function recordInbound(db: DB, item: InboundItem) {
  const from = addr(g(item, "From", "from")); const to = addr(g(item, "To", "to"));
  const atts = g(item, "Attachments", "attachments");
  const mid = str(g(item, "MessageId", "Message-Id", "messageId"), 300) || `sans-id:${createHash("sha256").update(JSON.stringify([from.email, g(item, "Subject"), g(item, "SentAtDate"), Array.isArray(atts) ? atts.length : 0])).digest("hex").slice(0, 32)}`;
  const { data, error } = await db.from("inbound_emails").upsert({ message_id: mid, from_email: from.email || null, from_name: from.name || null, to_email: to.email || null, subject: str(g(item, "Subject", "subject"), 300) || null, attachments: Array.isArray(atts) ? atts.length : 0 }, { onConflict: "message_id", ignoreDuplicates: true }).select("id");
  if (error) throw new Error(error.message);
  return (data?.[0]?.id as number | undefined) ?? null;
}

async function brevoAttachment(token: string) {
  const key = process.env.BREVO_API_KEY; if (!key) throw new Error("Brevo n'est pas connecté (page /connexions)");
  const r = await fetch(`https://api.brevo.com/v3/inbound/attachments/${encodeURIComponent(token)}`, { headers: { "api-key": key, accept: "*/*" }, cache: "no-store" });
  if (!r.ok) throw new Error(`Pièce jointe non téléchargée (Brevo ${r.status})`);
  return new Uint8Array(await r.arrayBuffer());
}

/** Enregistre un fichier reçu, le lit, supprime les doublons et les pièces qui ne sont pas des justificatifs, rapproche du débit Revolut. */
async function ingest(db: DB, f: { buf: Uint8Array; mime: string; name: string; readAs?: { buf: Uint8Array; mime: string }; emailId: number; from: string; subject: string; month: string }) {
  const hash = createHash("sha256").update(f.buf).digest("hex");
  const { data: same } = await db.from("receipts").select("id").eq("file_hash", hash).limit(1);
  if (same?.length) return "duplicate" as const;
  const path = `${RECEIPT_FOLDER}/${f.month}/mail-${crypto.randomUUID().slice(0, 8)}-${safeName(f.name)}`;
  const up = await db.storage.from(RECEIPT_BUCKET).upload(path, f.buf, { contentType: f.mime, upsert: false });
  if (up.error) throw new Error(`Stockage : ${up.error.message}`);
  const { data: rc, error } = await db.from("receipts").insert({ path, month: f.month, file_name: f.name.slice(0, 200), mime: f.mime, size: f.buf.length, source: "email", file_hash: hash, email_id: f.emailId, email_from: f.from.slice(0, 200) || null, email_subject: f.subject.slice(0, 300) || null }).select("id").single();
  if (error) { await db.storage.from(RECEIPT_BUCKET).remove([path]); throw new Error(error.message); }
  const drop = async () => { await db.from("receipts").delete().eq("id", rc.id); await db.storage.from(RECEIPT_BUCKET).remove([path]); };
  try {
    const o = await readReceipt(f.readAs?.buf || f.buf, f.readAs?.mime || f.mime, f.name);
    if (!o.is_document) { await drop(); return "ignored" as const; }
    const { duplicateOf } = await applyReceiptRead(db, rc.id, o, f.month);
    if (duplicateOf) { await drop(); return "duplicate" as const; }
    return "created" as const;
  } catch (e) {
    await db.from("receipts").update({ status: "erreur", note: (e as Error).message.slice(0, 300), review: "lecture automatique impossible", updated_at: new Date().toISOString() }).eq("id", rc.id);
    return "created" as const;
  }
}

/** Traite un e-mail reçu : pièces jointes PDF / JPG / PNG, ou corps de l'e-mail s'il contient la facture. */
export async function processInbound(db: DB, emailId: number, item: InboundItem) {
  const from = addr(g(item, "From", "from")); const subject = str(g(item, "Subject", "subject"), 300);
  const sent = str(g(item, "SentAtDate", "Date", "date"), 80); const sentDate = new Date(sent);
  const month = (Number.isNaN(sentDate.getTime()) ? new Date() : sentDate).toISOString().slice(0, 7);
  const fromLabel = from.name ? `${from.name} <${from.email}>` : from.email;
  const count = { receipts: 0, duplicates: 0, ignored: 0 }; const errors: string[] = [];
  const tally = (r: "created" | "duplicate" | "ignored") => { if (r === "created") count.receipts++; else if (r === "duplicate") count.duplicates++; else count.ignored++; };
  try {
    const spam = Number(g(item, "SpamScore", "spamScore"));
    if (Number.isFinite(spam) && spam >= 8) throw new Error(`E-mail classé indésirable (score ${spam})`);
    const atts = (Array.isArray(g(item, "Attachments", "attachments")) ? g(item, "Attachments", "attachments") as unknown[] : []).map(a => {
      const name = str(g(a, "Name", "name", "FileName"), 200) || "piece-jointe";
      const ext = (name.match(/\.([a-z0-9]{1,5})$/i)?.[1] || "").toLowerCase();
      const ct = str(g(a, "ContentType", "contentType", "MimeType"), 100).toLowerCase().split(";")[0].trim();
      const mime = Object.values(OK_TYPES).includes(ct) ? ct : OK_TYPES[ext] || "";
      return { name, mime, size: Number(g(a, "ContentLength", "Size", "size")) || 0, token: str(g(a, "DownloadToken", "downloadToken", "Token"), 500) };
    });
    const usable = atts.filter(a => a.mime && a.token && !(a.mime.startsWith("image/") && a.size > 0 && a.size < 15_000) && a.size <= 20 * 1024 * 1024);
    if (atts.length && !usable.length) count.ignored += atts.length;
    for (const a of usable.slice(0, 10)) {
      try { const buf = await brevoAttachment(a.token); tally(await ingest(db, { buf, mime: a.mime, name: a.name, emailId, from: fromLabel, subject, month })); }
      catch (e) { errors.push(`${a.name} : ${(e as Error).message}`); }
    }
    if (!usable.length) {
      const raw = str(g(item, "RawTextBody", "TextBody", "text"), 100_000) || str(g(item, "ExtractedMarkdownMessage"), 100_000) || htmlToText(str(g(item, "RawHtmlBody", "HtmlBody", "html"), 400_000));
      const text = raw.trim();
      if (text.length > 40 && /factur|invoice|re[çc]u|receipt|ticket|commande|order|total|montant|tva|vat|ttc|€|eur\b/i.test(`${subject}\n${text}`)) {
        const pdf = await emailBodyPdf({ from: fromLabel, subject, date: Number.isNaN(sentDate.getTime()) ? new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : sentDate.toLocaleString("fr-FR", { timeZone: "Europe/Paris" }), text });
        tally(await ingest(db, { buf: new Uint8Array(pdf), mime: "application/pdf", name: `${safeName(subject || "facture-email").slice(0, 50)}.pdf`, readAs: { buf: new TextEncoder().encode(`Objet : ${subject}\nDe : ${fromLabel}\nDate : ${sent}\n\n${text}`), mime: "text/plain" }, emailId, from: fromLabel, subject, month }));
      } else count.ignored++;
    }
    await db.from("inbound_emails").update({ ...count, status: errors.length && !count.receipts ? "erreur" : "traité", error: errors.length ? errors.join(" | ").slice(0, 1000) : null }).eq("id", emailId);
  } catch (e) {
    await db.from("inbound_emails").update({ ...count, status: "erreur", error: (e as Error).message.slice(0, 1000) }).eq("id", emailId);
  }
  return count;
}

/* ───────────── Résumé mensuel ───────────── */

export const previousMonth = (d = new Date()) => { const p = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Paris" })); p.setDate(1); p.setMonth(p.getMonth() - 1); return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}`; };
const monthLabel = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const dfr = (d: string | null) => d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : "date ?";

/** E-mail « comptabilité du mois » : ce qui manque, TVA estimée, lien vers l'export Pennylane. */
export function summaryEmail(d: MonthData) {
  const m = monthLabel(d.month); const v = d.vat;
  const td = "padding:6px 8px;border-bottom:1px solid #eee;font-size:14px";
  const list = (title: string, rows: string[], empty: string) => `<h3 style="margin:22px 0 6px;font-size:16px">${title}</h3>${rows.length ? `<table style="width:100%;border-collapse:collapse">${rows.slice(0, 40).join("")}</table>${rows.length > 40 ? `<p style="color:#666;font-size:13px">… et ${rows.length - 40} autre(s).</p>` : ""}` : `<p style="color:#166534;margin:0">✅ ${empty}</p>`}`;
  const toCheck = d.receipts.filter(r => receiptState(r as Parameters<typeof receiptState>[0]) === "à vérifier");
  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#111">
<h2 style="margin:0 0 4px">📒 Comptabilité de ${esc(m)}</h2>
<p style="color:#666;margin:0 0 14px">MK HOLDING SAS · NeoDrive · résumé automatique</p>
<ul style="line-height:1.8;padding-left:18px;margin:0">
<li>${d.checklist.releve ? "✅" : "⬜"} Relevé Revolut ${d.checklist.releve ? `importé (${d.transactions.length} opérations)` : "<b>pas encore importé</b>"}</li>
<li>${d.checklist.justificatifs ? "✅" : "⬜"} ${d.receiptStats.debitsWithout} débit(s) sans justificatif</li>
<li>${d.invoicesNoPayment.length + d.supplierUnpaid.length ? "⬜" : "✅"} ${d.invoicesNoPayment.length} facture(s) de vente et ${d.supplierUnpaid.length} facture(s) fournisseur sans paiement relié</li>
<li>${toCheck.length ? "⬜" : "✅"} ${toCheck.length} justificatif(s) à vérifier</li>
<li>${d.checklist.pennylane ? "✅" : "⬜"} Export Pennylane ${d.checklist.pennylane ? "fait" : "à faire"}</li>
</ul>
<h3 style="margin:22px 0 6px;font-size:16px">TVA du mois (estimation)</h3>
<table style="width:100%;border-collapse:collapse">
<tr><td style="${td}">TVA collectée (factures de vente FA-… validées)</td><td style="${td};text-align:right"><b>${eurFr(v.collectee)}</b></td></tr>
<tr><td style="${td}">TVA déductible (factures fournisseurs françaises)</td><td style="${td};text-align:right">− ${eurFr(v.deductibleFactures)}</td></tr>
${v.deductibleManuelle ? `<tr><td style="${td}">TVA déductible saisie sur des débits</td><td style="${td};text-align:right">− ${eurFr(v.deductibleManuelle)}</td></tr>` : ""}
<tr><td style="${td}"><b>${v.net >= 0 ? "TVA à payer (estimation)" : "Crédit de TVA (estimation)"}</b></td><td style="${td};text-align:right"><b>${eurFr(Math.abs(v.net))}</b></td></tr>
</table>
${v.autoliq.length ? `<p style="margin:10px 0 4px"><b>À déclarer aussi (autoliquidation, sans effet sur le montant à payer)</b> : TVA due et déductible du même montant, environ ${eurFr(v.autoliqTva)}.</p><table style="width:100%;border-collapse:collapse">${v.autoliq.map(a => `<tr><td style="${td}">${dfr(a.date)} · ${esc(a.merchant || "?")}${a.number ? ` · n° ${esc(a.number)}` : ""}<br><span style="color:#666">${a.regime === "import" ? "TVA à l'import (douane)" : "achat UE / étranger"}</span></td><td style="${td};text-align:right">base ${a.currency === "EUR" ? eurFr(a.base) : `${a.base} ${esc(a.currency)}`}<br>TVA ${a.currency === "EUR" ? eurFr(a.tva) : "à convertir en €"}</td></tr>`).join("")}</table>
<p style="color:#666;font-size:13px;margin:6px 0 0">Sur la CA3 : importations (ligne A4 et TVA à l'import), achats de services UE (A3) ou de biens UE (B2), puis la même TVA en déductible. À confirmer avec le comptable.</p>` : ""}
<p style="color:#666;font-size:13px">Estimation à partir des pièces enregistrées dans l'outil : elle ne remplace pas la déclaration faite par le comptable.</p>
${list(`Débits sans justificatif (${d.debitsWithoutReceipt.length})`, d.debitsWithoutReceipt.map(t => `<tr><td style="${td}">${dfr(t.date)} · ${esc(t.label || "—")}</td><td style="${td};text-align:right;white-space:nowrap">${eurFr(t.amount)}</td></tr>`), "Tous les débits ont un justificatif.")}
${list(`Factures fournisseurs sans paiement relié (${d.supplierUnpaid.length})`, d.supplierUnpaid.map(r => `<tr><td style="${td}">${dfr(r.date)} · ${esc(r.merchant || "?")}${r.number ? ` · n° ${esc(r.number)}` : ""}</td><td style="${td};text-align:right;white-space:nowrap">${r.currency === "EUR" ? eurFr(r.total_ttc) : `${r.total_ttc ?? "?"} ${esc(r.currency)}`}</td></tr>`), "Aucune.")}
${list(`Factures de vente sans paiement (${d.invoicesNoPayment.length})`, d.invoicesNoPayment.map(i => `<tr><td style="${td}">${esc(i.number || "brouillon")} · ${esc(i.client_name || "")}</td><td style="${td};text-align:right;white-space:nowrap">${eurFr(i.total_ttc)}</td></tr>`), "Aucune.")}
${toCheck.length ? list(`Justificatifs à vérifier (${toCheck.length})`, toCheck.map(r => `<tr><td style="${td}">${dfr(r.date)} · ${esc(r.merchant || r.file_name || "?")} <span style="color:#666">(${esc(RECEIPT_CATEGORY_LABEL[r.category] || r.category || "?")})</span><br><span style="color:#b45309">${esc(r.review || r.note || "")}</span></td><td style="${td};text-align:right;white-space:nowrap">${eurFr(r.total_ttc)}</td></tr>`), "") : ""}
<p style="margin:24px 0"><a href="${comptaUrl(d.month)}" style="background:#ff6a00;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:800">Ouvrir la comptabilité et l'export Pennylane</a></p>
<p style="color:#666;font-size:13px">Factures fournisseurs : faites-les envoyer (ou transférez-les) à <b>${esc(inboundAddress())}</b>. Tickets : photographiez-les sur ${SITE}/stock-facturation/tickets</p>
</div>`;
  const todo = d.receiptStats.debitsWithout + d.supplierUnpaid.length + toCheck.length;
  return { subject: `📒 Comptabilité ${m} : ${todo ? `${todo} point(s) à régler` : "tout est en ordre"} · TVA estimée ${eurFr(v.net)}`, html };
}
