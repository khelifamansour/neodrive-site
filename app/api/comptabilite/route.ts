import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { zipSync } from "fflate";
import { isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { INVOICE_BUCKET, storeInvoicePdf, type SalesInvoice } from "../../../lib/stock";
import { CATEGORIES, bankMatchCsv, matchCredit, parseRevolutCsv, pennylaneInvoiceRows, pennylaneInvoicesCsv, supplierOf, type InvLite, type ResLite } from "../../../lib/accounting";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
type DB = ReturnType<typeof crmDatabase>;
const clean = (v: unknown, n = 300) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const MONTH = /^\d{4}-\d{2}$/;
const monthEnd = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10); };
const r2 = (n: number) => Math.round(n * 100) / 100;
const TX = "id,date,label,amount,currency,counterparty,reference,balance,category,supplier,match_kind,invoice_id,reservation_id,parts_order,vat_deductible,ignored,note,import_month";

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
      let matched = 0; for (const m of months) matched += await autoMatch(db, m);
      return NextResponse.json({ ok: true, rows: rows.length, inserted, duplicates: rows.length - inserted, months, matched, errors: errors.slice(0, 20) });
    }

    if (b.action === "automatch") return NextResponse.json({ ok: true, matched: await autoMatch(db, month) });

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

    if (b.action === "month") {
      const [{ data: tx }, { data: inv }, { data: am }, { data: imports }, { data: monthsRaw }] = await Promise.all([
        db.from("bank_transactions").select(TX).eq("import_month", month).order("date").order("id"),
        db.from("sales_invoices").select("id,number,status,issued_at,delivered_at,client_name,vin,total_ht,tva,total_ttc,lines,reservation_id").limit(5000),
        db.from("accounting_months").select("*").eq("month", month).maybeSingle(),
        db.from("bank_imports").select("id,created_at,file_name,months,rows,inserted").order("id", { ascending: false }).limit(12),
        db.from("bank_transactions").select("import_month").limit(10000),
      ]);
      const txs = tx || []; const invs = inv || [];
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
      const checklist = {
        releve: txs.length > 0,
        rapproche: txs.length > 0 && live.every(matched),
        factures: drafts.length === 0,
        pennylane: !!am?.pennylane_exported_at,
      };
      return NextResponse.json({
        ok: true, month, months, transactions: txs, imports: imports || [],
        invoices: invs.filter(i => i.status === "validée" || inMonth(i.delivered_at) || i.status === "brouillon").map(i => ({ id: i.id, number: i.number, status: i.status, client_name: i.client_name, total_ttc: i.total_ttc, reservation_id: i.reservation_id })),
        stats: {
          credits: { matched: credits.filter(matched).length, unmatched: credits.filter(t => !matched(t)).length, total: sum(credits), matchedTotal: sum(credits.filter(matched)) },
          debits: { matched: debits.filter(matched).length, unmatched: debits.filter(t => !matched(t)).length, total: sum(debits), matchedTotal: sum(debits.filter(matched)) },
          caTtc, caHt, tvaCollectee, debours, validated: validated.length, drafts: drafts.length, achatsTtc, tvaDeductible, marge: r2(caHt - (achatsTtc - tvaDeductible)),
        },
        invoicesNoPayment, paymentsNoInvoice, checklist, exportedAt: am?.pennylane_exported_at || null,
      });
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
      const csv = pennylaneInvoicesCsv(rows);
      files[`factures-ventes-${month}.csv`] = new TextEncoder().encode(csv);
      const zip = zipSync(files, { level: 6 });
      await db.from("accounting_months").upsert({ month, pennylane_exported_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "month" });
      return NextResponse.json({ ok: true, count: (inv || []).length, csv, zip: Buffer.from(zip).toString("base64") });
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
