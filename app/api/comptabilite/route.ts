import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { zipSync } from "fflate";
import { isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { INVOICE_BUCKET, storeInvoicePdf, type SalesInvoice } from "../../../lib/stock";
import { RECEIPT_BUCKET, RECEIPT_FOLDER, applyReceiptRead, attestationPdf, matchReceipt, readReceipt, syncTransaction } from "../../../lib/receipts";
import { MONTH, RC, RC_BASE, TX, monthData, monthEnd, safeName, summaryEmail } from "../../../lib/compta-server";
import { applyStoredSecrets } from "../../../lib/integrations";
import { OWNER_EMAIL, brevoReady, sendEmail } from "../../../lib/brevo";
import { runPaymentMatch } from "../../../lib/payment-match";
import { CATEGORIES, RECEIPT_CATEGORIES, VAT_REGIMES, receiptFileName, receiptsCsv, bankMatchCsv, matchCredit, parseRevolutCsv, pennylaneInvoiceRows, pennylaneInvoicesCsv, supplierOf, type InvLite, type ResLite } from "../../../lib/accounting";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
type DB = ReturnType<typeof crmDatabase>;
const clean = (v: unknown, n = 300) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Rapprochement automatique des opérations non rapprochées d'un mois (jamais celles réglées à la main). */
async function autoMatch(db: DB, month: string) {
  const [{ data: tx }, { data: inv }, { data: res }] = await Promise.all([
    db.from("bank_transactions").select(TX).eq("import_month", month).is("match_kind", null).eq("ignored", false),
    db.from("sales_invoices").select("id,number,status,total_ttc,client_name,reservation_id,delivered_at,issued_at").limit(5000),
    db.from("reservations").select("id,nom,prenom,total,montant_du,acompte,livre_at,created_at,statut").limit(5000),
  ]);
  let n = 0;
  for (const t of tx || []) {
    const text = `${t.label || ""} ${t.reference || ""} ${t.counterparty || ""}`;
    let patch: Record<string, unknown> | null = null;
    if (Number(t.amount) > 0) {
      const po = text.toUpperCase().match(/PC-\d{4}-\d{4}/)?.[0];
      if (po) patch = { category: "pièces", parts_order: po, note: `commande de pièces ${po}` };
      else {
        const m = matchCredit({ amount: Number(t.amount), date: t.date, label: t.label || "", reference: t.reference || "", counterparty: t.counterparty || "" }, (inv || []) as InvLite[], (res || []) as ResLite[]);
        if (m) patch = { category: "vente voiture", invoice_id: m.invoice_id, reservation_id: m.reservation_id, note: `rapproché par ${m.why}` };
      }
    } else {
      const s = supplierOf(text);
      if (s) patch = { category: s.category, supplier: s.supplier };
    }
    if (!patch) continue;
    await db.from("bank_transactions").update({ ...patch, match_kind: "auto", updated_at: new Date().toISOString() }).eq("id", t.id).is("match_kind", null);
    n++;
  }
  return n;
}

/** Comptabilité mensuelle : relevé Revolut, rapprochement, exports Pennylane. Fondateur seulement. */
export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, typeof b.passcode === "string" ? b.passcode : "")) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  const month = MONTH.test(String(b.month || "")) ? String(b.month) : new Date().toISOString().slice(0, 7);
  const from = `${month}-01`, to = monthEnd(month);
  try {
    if (b.action === "ping") return NextResponse.json({ ok: true });
    if (b.action === "recent_receipts") {
      const { data } = await db.from("receipts").select(RC).order("id", { ascending: false }).limit(15);
      return NextResponse.json({ ok: true, receipts: data || [] });
    }
    if (b.action === "import") {
      const { rows, errors, columns } = parseRevolutCsv(String(b.text || "").slice(0, 8_000_000));
      if (!rows.length) return NextResponse.json({ ok: false, error: errors[0] || "Aucune opération lue.", columns }, { status: 400 });
      const months = [...new Set(rows.map(r => r.date.slice(0, 7)))].sort();
      const { data: imp } = await db.from("bank_imports").insert({ file_name: clean(b.file_name, 200) || "relevé.csv", months, rows: rows.length }).select("id").single();
      const records = rows.map(r => ({
        hash: r.id ? `revolut:${r.id}` : "h:" + createHash("sha256").update([r.date, r.amount, r.label, r.reference, r.balance, r.counterparty].join("|")).digest("hex").slice(0, 40),
        import_id: imp?.id ?? null, import_month: r.date.slice(0, 7), date: r.date, label: r.label, amount: r.amount, currency: r.currency, counterparty: r.counterparty || null, reference: r.reference || null, balance: r.balance, raw: r.raw,
      }));
      let inserted = 0;
      for (let i = 0; i < records.length; i += 200) {
        const { data, error } = await db.from("bank_transactions").upsert(records.slice(i, i + 200), { onConflict: "hash", ignoreDuplicates: true }).select("id");
        if (error) throw new Error(error.message);
        inserted += data?.length || 0;
      }
      if (imp?.id) await db.from("bank_imports").update({ inserted, skipped: rows.length - inserted }).eq("id", imp.id);
      // Paiements clients d'abord (relie + confirme les paiements sûrs, met les autres « à vérifier »), puis rapprochement comptable.
      const pay = await runPaymentMatch(db).catch(e => { console.error("[COMPTA] paiements", e); return null; });
      let matched = 0; for (const m of months) matched += await autoMatch(db, m);
      return NextResponse.json({ ok: true, rows: rows.length, inserted, duplicates: rows.length - inserted, months, matched, payments: pay?.linked.length ?? 0, toReview: pay?.review ?? 0, errors: errors.slice(0, 20) });
    }

    if (b.action === "automatch") {
      await runPaymentMatch(db).catch(e => console.error("[COMPTA] paiements", e));
      const matched = await autoMatch(db, month);
      const { data: rcs } = await db.from("receipts").select("id").eq("month", month).is("transaction_id", null);
      let receipts = 0; for (const r of rcs || []) if (await matchReceipt(db, r.id)) receipts++;
      return NextResponse.json({ ok: true, matched, receipts });
    }

    /* ───────────── Justificatifs ───────────── */
    if (b.action === "receipt_upload") {
      const type = String(b.type || "");
      if (!/^(image\/[a-z0-9.+-]+|application\/pdf)$/i.test(type)) return NextResponse.json({ ok: false, error: "Photo ou PDF seulement" }, { status: 400 });
      if (!(Number(b.size) > 0) || Number(b.size) > 20 * 1024 * 1024) return NextResponse.json({ ok: false, error: "Fichier trop lourd (20 Mo maximum)" }, { status: 400 });
      const path = `${RECEIPT_FOLDER}/${month}/${crypto.randomUUID().slice(0, 8)}-${safeName(String(b.name || ""))}`;
      const { data, error } = await db.storage.from(RECEIPT_BUCKET).createSignedUploadUrl(path);
      if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 });
      return NextResponse.json({ ok: true, bucket: RECEIPT_BUCKET, path: data.path, token: data.token });
    }
    if (b.action === "receipt_read") {
      const path = String(b.path || "");
      if (!path.startsWith(`${RECEIPT_FOLDER}/`) || path.includes("..")) return NextResponse.json({ ok: false, error: "Fichier invalide" }, { status: 400 });
      await db.from("receipts").upsert({ path, month, file_name: clean(b.name, 200), mime: clean(b.type, 80), size: Number(b.size) || null }, { onConflict: "path", ignoreDuplicates: true });
      const { data: rc } = await db.from("receipts").select(RC_BASE).eq("path", path).single();
      if (!rc) throw new Error("Justificatif non enregistré");
      try {
        const { data: blob } = await db.storage.from(RECEIPT_BUCKET).download(path);
        if (!blob) throw new Error("Fichier introuvable dans le stockage");
        const o = await readReceipt(new Uint8Array(await blob.arrayBuffer()), rc.mime || blob.type || "", rc.file_name || path);
        if (b.source === "telephone") await db.from("receipts").update({ source: "telephone" }).eq("id", rc.id);
        await applyReceiptRead(db, rc.id, o, month);
      } catch (e) {
        await db.from("receipts").update({ status: "erreur", note: (e as Error).message.slice(0, 300), updated_at: new Date().toISOString() }).eq("id", rc.id);
      }
      const { data: out } = await db.from("receipts").select(RC).eq("id", rc.id).single();
      if (!out) { const { data: old } = await db.from("receipts").select(RC_BASE).eq("id", rc.id).single(); return NextResponse.json({ ok: true, receipt: old }); }
      return NextResponse.json({ ok: true, receipt: out });
    }
    if (b.action === "receipt_update") {
      const id = Number(b.id); const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if ("date" in b) { patch.date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) ? b.date : null; if (patch.date) patch.month = String(patch.date).slice(0, 7); }
      if ("merchant" in b) patch.merchant = clean(b.merchant, 120) || null;
      for (const k of ["total_ttc", "tva_amount", "tva_rate"]) if (k in b) patch[k] = b[k] === "" || b[k] === null ? null : r2(Number(String(b[k]).replace(",", ".")) || 0);
      if ("category" in b) patch.category = (RECEIPT_CATEGORIES as readonly string[]).includes(b.category) ? b.category : "autre";
      if ("is_invoice" in b) patch.is_invoice = !!b.is_invoice;
      if ("vat_deductible" in b) patch.vat_deductible = !!b.vat_deductible;
      if ("note" in b) patch.note = clean(b.note, 500) || null;
      if ("invoice_number" in b) patch.invoice_number = clean(b.invoice_number, 80) || null;
      if ("total_ht" in b) patch.total_ht = b.total_ht === "" || b.total_ht === null ? null : r2(Number(String(b.total_ht).replace(",", ".")) || 0);
      if ("currency" in b) patch.currency = clean(b.currency, 3).toUpperCase().replace(/[^A-Z]/g, "") || "EUR";
      if ("vat_regime" in b) patch.vat_regime = (VAT_REGIMES as readonly string[]).includes(b.vat_regime) ? b.vat_regime : "normale";
      if ("iban" in b) patch.iban = clean(b.iban, 40).replace(/\s/g, "").toUpperCase() || null;
      if (Array.isArray(b.vat_lines)) patch.vat_lines = (b.vat_lines as Record<string, unknown>[]).slice(0, 6).map(l => ({ rate: l.rate === "" || l.rate == null ? null : Number(String(l.rate).replace(",", ".")) || 0, base: l.base === "" || l.base == null ? null : r2(Number(String(l.base).replace(",", ".")) || 0), tva: l.tva === "" || l.tva == null ? null : r2(Number(String(l.tva).replace(",", ".")) || 0) })).filter(l => l.rate !== null || l.tva !== null);
      if ("checked" in b) patch.checked_at = b.checked ? new Date().toISOString() : null;
      const { data: cur } = await db.from("receipts").select("transaction_id").eq("id", id).maybeSingle();
      if ("transaction_id" in b && (Number(b.transaction_id) || null) !== (cur?.transaction_id ?? null)) {
        if (b.transaction_id) { const { data: other } = await db.from("receipts").select("id").eq("transaction_id", Number(b.transaction_id)).neq("id", id).limit(1); if (other?.length) return NextResponse.json({ ok: false, error: "Ce débit a déjà un justificatif." }, { status: 409 }); }
        patch.transaction_id = Number(b.transaction_id) || null; patch.match_kind = patch.transaction_id ? "manuel" : null;
      }
      const { error } = await db.from("receipts").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      await syncTransaction(db, id);
      if (!("transaction_id" in b)) await matchReceipt(db, id);
      return NextResponse.json({ ok: true });
    }
    if (b.action === "receipt_url") {
      const { data: rc } = await db.from("receipts").select("path,file_name").eq("id", Number(b.id)).maybeSingle();
      if (!rc) return NextResponse.json({ ok: false, error: "Introuvable" }, { status: 404 });
      const { data } = await db.storage.from(RECEIPT_BUCKET).createSignedUrl(rc.path, 900);
      return NextResponse.json({ ok: !!data, url: data?.signedUrl });
    }
    if (b.action === "receipt_delete") {
      const { data: rc } = await db.from("receipts").select("id,path,kind,transaction_id").eq("id", Number(b.id)).maybeSingle();
      if (!rc) return NextResponse.json({ ok: false, error: "Introuvable" }, { status: 404 });
      await db.from("receipts").delete().eq("id", rc.id);
      await db.storage.from(RECEIPT_BUCKET).remove([rc.path]);
      return NextResponse.json({ ok: true });
    }
    // Ticket perdu : attestation interne signée, rangée comme justificatif du débit ; TVA non déductible.
    if (b.action === "missing_receipt") {
      const { data: t } = await db.from("bank_transactions").select("id,date,label,counterparty,amount,supplier").eq("id", Number(b.tx_id)).maybeSingle();
      if (!t || Number(t.amount) >= 0) return NextResponse.json({ ok: false, error: "Débit introuvable" }, { status: 404 });
      const { data: has } = await db.from("receipts").select("id").eq("transaction_id", t.id).limit(1);
      if (has?.length) return NextResponse.json({ ok: false, error: "Ce débit a déjà un justificatif." }, { status: 409 });
      const objet = clean(b.objet, 300), raison = clean(b.raison, 300), supplier = clean(b.supplier, 120) || t.supplier || t.counterparty || t.label || "";
      if (!objet || !raison) return NextResponse.json({ ok: false, error: "Indiquez l'objet professionnel et la raison." }, { status: 400 });
      const at = new Date().toISOString(); const amount = -Number(t.amount);
      const pdf = await attestationPdf({ date: t.date, amount, supplier, objet, raison, label: `${t.date} · ${t.label || ""} · ${amount.toFixed(2)} €`, signedAt: at });
      const path = `${RECEIPT_FOLDER}/${t.date.slice(0, 7)}/attestation-${t.id}-${Date.now()}.pdf`;
      const up = await db.storage.from(RECEIPT_BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: false });
      if (up.error) throw new Error("PDF non enregistré : " + up.error.message);
      const { data: rc, error } = await db.from("receipts").insert({ kind: "attestation", path, file_name: "attestation.pdf", mime: "application/pdf", size: pdf.length, status: "lu", month: t.date.slice(0, 7), date: t.date, merchant: supplier, total_ttc: amount, tva_amount: null, category: "autre", is_invoice: false, vat_deductible: false, transaction_id: t.id, match_kind: "manuel", note: `Justificatif manquant : ${objet} (${raison})` }).select("id").single();
      if (error) throw new Error(error.message);
      await syncTransaction(db, rc.id);
      return NextResponse.json({ ok: true, id: rc.id });
    }

    if (b.action === "tx_update") {
      const id = Number(b.id); const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (b.unmatch) Object.assign(patch, { match_kind: null, invoice_id: null, reservation_id: null, parts_order: null, supplier: null, category: null });
      else {
        if ("category" in b) patch.category = (CATEGORIES as readonly string[]).includes(b.category) ? b.category : null;
        if ("supplier" in b) patch.supplier = clean(b.supplier, 120) || null;
        if ("invoice_id" in b) {
          const inv = b.invoice_id ? (await db.from("sales_invoices").select("id,reservation_id").eq("id", Number(b.invoice_id)).maybeSingle()).data : null;
          if (b.invoice_id && !inv) return NextResponse.json({ ok: false, error: "Facture introuvable" }, { status: 404 });
          patch.invoice_id = inv?.id ?? null; if (inv?.reservation_id) patch.reservation_id = inv.reservation_id;
          if (inv && !("category" in b)) patch.category = "vente voiture";
        }
        if ("reservation_id" in b && !("invoice_id" in b)) patch.reservation_id = Number(b.reservation_id) || null;
        if ("note" in b) patch.note = clean(b.note, 1000) || null;
        if ("vat_deductible" in b) patch.vat_deductible = b.vat_deductible === "" || b.vat_deductible === null ? null : r2(Number(b.vat_deductible) || 0);
        if ("ignored" in b) patch.ignored = !!b.ignored;
        patch.match_kind = "manuel";
      }
      const { error } = await db.from("bank_transactions").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (b.action === "month") return NextResponse.json({ ok: true, ...await monthData(db, month) });

    if (b.action === "send_summary") {
      await applyStoredSecrets();
      if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo n'est pas connecté (page /connexions)" }, { status: 503 });
      const { subject, html } = summaryEmail(await monthData(db, month));
      await sendEmail(OWNER_EMAIL, "NeoDrive", subject, html);
      return NextResponse.json({ ok: true, to: OWNER_EMAIL });
    }

    if (b.action === "export_invoices") {
      const { data: inv, error } = await db.from("sales_invoices").select("*").eq("status", "validée").gte("issued_at", from).lte("issued_at", to).order("seq");
      if (error) throw new Error(error.message);
      const ids = (inv || []).map(i => i.id);
      const { data: tx } = ids.length ? await db.from("bank_transactions").select("invoice_id,date,label,amount").in("invoice_id", ids) : { data: [] };
      const payRef = (id: number) => (tx || []).filter(t => t.invoice_id === id).map(t => `${t.date} ${t.label || ""} ${Number(t.amount).toFixed(2)} €`.trim()).join(" | ");
      const rows = (inv || []).flatMap(i => pennylaneInvoiceRows(i, payRef(i.id)));
      const files: Record<string, Uint8Array> = {};
      for (const i of inv || []) {
        const path = i.pdf_path || await storeInvoicePdf(db, i as SalesInvoice);
        const { data: blob } = await db.storage.from(INVOICE_BUCKET).download(path);
        if (blob) files[`factures/${i.number}.pdf`] = new Uint8Array(await blob.arrayBuffer());
      }
      const { data: rcs } = await db.from("receipts").select(`${RC},bank_transactions(date,label,amount)`).eq("month", month).order("date");
      const rrows = [];
      for (const r of rcs || []) {
        const name = receiptFileName(r);
        const { data: blob } = await db.storage.from(RECEIPT_BUCKET).download(r.path);
        if (blob) files[`justificatifs/${name}`] = new Uint8Array(await blob.arrayBuffer());
        const t = r.bank_transactions as unknown as { date: string; label: string | null; amount: number } | null;
        rrows.push({ date: r.date, merchant: r.merchant, category: r.category, total_ttc: r.total_ttc, tva_amount: r.tva_amount, is_invoice: r.is_invoice, kind: r.kind, vat_deductible: r.vat_deductible, file: name, tx: t ? `${t.date} ${t.label || ""} ${Number(t.amount).toFixed(2)} €` : "aucune (payé hors Revolut)" });
      }
      files[`justificatifs-${month}.csv`] = new TextEncoder().encode(receiptsCsv(rrows));
      const csv = pennylaneInvoicesCsv(rows);
      files[`factures-ventes-${month}.csv`] = new TextEncoder().encode(csv);
      const zip = zipSync(files, { level: 6 });
      await db.from("accounting_months").upsert({ month, pennylane_exported_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "month" });
      return NextResponse.json({ ok: true, count: (inv || []).length, receipts: rrows.length, csv, zip: Buffer.from(zip).toString("base64") });
    }

    if (b.action === "export_bank") {
      const { data: tx, error } = await db.from("bank_transactions").select(`${TX},sales_invoices(number)`).eq("import_month", month).order("date");
      if (error) throw new Error(error.message);
      const csv = bankMatchCsv((tx || []).filter(t => !t.ignored).map(t => ({ date: t.date, label: t.label, counterparty: t.counterparty, amount: Number(t.amount), category: t.category, supplier: t.supplier, invoice_number: (t.sales_invoices as unknown as { number: string | null } | null)?.number || t.parts_order || null, note: t.note })));
      return NextResponse.json({ ok: true, csv, count: (tx || []).length });
    }

    if (b.action === "close_month") {
      await db.from("accounting_months").upsert({ month, closed_at: b.reopen ? null : new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "month" });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[COMPTA]", b.action, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
