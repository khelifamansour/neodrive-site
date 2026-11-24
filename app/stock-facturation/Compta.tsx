"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";
import { CATEGORIES, RECEIPT_CATEGORIES, RECEIPT_CATEGORY_LABEL, VAT_REGIMES, VAT_REGIME_LABEL, receiptState } from "../../lib/accounting";
import { capi, uploadReceipt } from "../../lib/receipt-upload";
import { eurFr } from "../../lib/stock-shared";

type Tx = { id: number; date: string; label: string | null; amount: number; counterparty: string | null; reference: string | null; category: string | null; supplier: string | null; match_kind: string | null; invoice_id: number | null; reservation_id: number | null; parts_order: string | null; vat_deductible: number | null; ignored: boolean; note: string | null };
type InvL = { id: number; number: string | null; status: string; client_name: string | null; total_ttc: number | null; reservation_id: number | null };
type Stats = { credits: { matched: number; unmatched: number; total: number; matchedTotal: number }; debits: { matched: number; unmatched: number; total: number; matchedTotal: number }; caTtc: number; caHt: number; tvaCollectee: number; debours: number; validated: number; drafts: number; achatsTtc: number; tvaDeductible: number; marge: number };
type VatLine = { rate: number | null; base: number | null; tva: number | null };
type Rc = { id: number; kind: string; file_name: string | null; status: string; date: string | null; merchant: string | null; total_ttc: number | null; tva_amount: number | null; tva_rate: number | null; payment_hint: string | null; category: string | null; is_invoice: boolean | null; buyer: string | null; vat_deductible: boolean; transaction_id: number | null; match_kind: string | null; note: string | null;
  source?: string | null; invoice_number?: string | null; total_ht?: number | null; vat_lines?: VatLine[] | null; currency?: string | null; vat_regime?: string | null; iban?: string | null; email_from?: string | null; email_subject?: string | null; review?: string | null; checked_at?: string | null };
type Vat = { collectee: number; deductibleFactures: number; deductibleManuelle: number; deductible: number; net: number; autoliqTva: number; autoliq: { id: number; date: string | null; merchant: string | null; number: string | null; regime: string; currency: string; base: number; tva: number }[] };
type Inbound = { id: number; created_at: string; from_email: string | null; from_name: string | null; subject: string | null; attachments: number; receipts: number; duplicates: number; ignored: number; status: string; error: string | null };
type M = { receipts: Rc[]; withReceipt: number[]; receiptStats: { debitsWith: number; debitsWithout: number; receiptsNoDebit: number; attestations: number; toCheck?: number }; vat?: Vat; supplierUnpaid?: { id: number; date: string | null; merchant: string | null; number: string | null; total_ttc: number | null; currency: string }[]; inbound?: Inbound[]; inboundAddress?: string; month: string; months: string[]; transactions: Tx[]; invoices: InvL[]; stats: Stats; invoicesNoPayment: { id: number; number: string | null; client_name: string | null; total_ttc: number | null; status: string }[]; paymentsNoInvoice: { id: number; date: string; label: string | null; amount: number }[]; checklist: { releve: boolean; rapproche: boolean; factures: boolean; pennylane: boolean; justificatifs: boolean }; exportedAt: string | null; imports: { id: number; created_at: string; file_name: string; months: string[]; rows: number; inserted: number }[] };

const download = (name: string, data: BlobPart, type: string) => { const url = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); };
const b64 = (s: string) => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
const dfr = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const monthLabel = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const small: React.CSSProperties = { fontSize: 14, padding: "8px 12px" };

/** Onglet « Comptabilité » : relevé Revolut du mois, rapprochement, exports Pennylane, clôture. */
export default function Compta() {
  const [month, setMonth] = useState(() => { try { const q = new URLSearchParams(window.location.search).get("mois"); if (q && /^\d{4}-\d{2}$/.test(q)) return q; } catch { /* rendu serveur */ }
    const d = new Date(); d.setMonth(d.getMonth() - (d.getDate() < 10 ? 1 : 0)); return d.toISOString().slice(0, 7); });
  const [d, setD] = useState<M | null>(null); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(""); const [f, setF] = useState<"todo" | "credits" | "debits" | "all">("todo"); const [open, setOpen] = useState<number | null>(null);
  const load = useCallback(async (m = month) => { try { setD(await capi<M>({ action: "month", month: m })); } catch (e) { setMsg("❌ " + (e as Error).message); } }, [month]);
  useEffect(() => { load().catch(() => null); }, [load]);
  const act = async (label: string, body: object, ok?: (r: Record<string, unknown>) => string) => {
    setBusy(label); setMsg("");
    try { const r = await capi<Record<string, unknown>>({ month, ...body }); if (ok) setMsg(ok(r)); await load(); return r; } catch (e) { setMsg("❌ " + (e as Error).message); return null; } finally { setBusy(""); }
  };
  const importFile = async (file?: File | null) => {
    if (!file) return;
    if (/\.pdf$/i.test(file.name)) { setMsg("❌ Relevé PDF non lu : dans Revolut Business, exportez le relevé au format CSV (Relevé → Exporter → CSV)."); return; }
    const text = await file.text();
    await act("import", { action: "import", text, file_name: file.name }, r => `✅ ${r.rows} opération(s) lue(s) : ${r.inserted} nouvelle(s), ${r.duplicates} déjà importée(s), ${r.matched} rapprochée(s) automatiquement (${(r.months as string[]).join(", ")}).`);
  };
  const exportInv = async () => { const r = await act("inv", { action: "export_invoices" }, r => `✅ ${r.count} facture(s) et ${r.receipts} justificatif(s) exportés.`); if (r) download(`pennylane-factures-${month}.zip`, b64(String(r.zip)), "application/zip"); };
  const exportBank = async () => { const r = await act("bank", { action: "export_bank" }); if (r) download(`pennylane-banque-${month}.csv`, String(r.csv), "text/csv;charset=utf-8"); };

  if (!d) return <p className={c.muted}>Chargement…</p>;
  const s = d.stats;
  const isMatched = (t: Tx) => !!t.match_kind && (!!t.category || !!t.invoice_id);
  const list = d.transactions.filter(t => f === "all" ? true : f === "credits" ? t.amount > 0 : f === "debits" ? t.amount < 0 : !t.ignored && !isMatched(t));
  const invName = (id: number | null) => { const i = d.invoices.find(x => x.id === id); return i ? `${i.number || "brouillon"} · ${i.client_name}` : ""; };
  const check = (ok: boolean, t: string) => <li style={{ color: ok ? "#166534" : "#b91c1c" }}>{ok ? "✅" : "⬜"} {t}</li>;

  return <div style={{ display: "grid", gap: 14 }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <select className={c.input} style={{ ...small, fontSize: 16 }} value={month} onChange={e => setMonth(e.target.value)}>{d.months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
      <input className={c.input} style={{ ...small, width: 130 }} type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)} />
    </div>
    {msg ? <p className={c.msg} style={{ margin: 0 }}>{msg}</p> : null}

    <div className={c.card}>
      <b>📅 Clôture de {monthLabel(month)}</b>
      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", lineHeight: 1.8 }}>
        {check(d.checklist.releve, "Relevé Revolut du mois importé")}
        {check(d.checklist.rapproche, `Tout rapproché (${s.credits.unmatched + s.debits.unmatched} opération(s) restante(s))`)}
        {check(d.checklist.justificatifs, `Justificatifs : ${d.receiptStats.debitsWithout} débit(s) sans justificatif`)}
        {check(d.checklist.factures, `Factures du mois validées (${s.drafts} brouillon(s) de voitures livrées ce mois)`)}
        {check(d.checklist.pennylane, `Export Pennylane fait${d.exportedAt ? ` le ${new Date(d.exportedAt).toLocaleDateString("fr-FR")}` : ""}`)}
      </ul>
    </div>

    <div className={c.stats}>
      <div className={c.stat}><p className={c.statLabel}>Chiffre d’affaires TTC</p><p className={c.statValue}>{eurFr(s.caTtc)}</p><p className={c.statNote}>{s.validated} facture(s) validée(s) · HT {eurFr(s.caHt)}</p></div>
      <div className={c.stat}><p className={c.statLabel}>TVA collectée</p><p className={c.statValue}>{eurFr(s.tvaCollectee)}</p><p className={c.statNote}>Débours exclus ({eurFr(s.debours)} sans TVA)</p></div>
      <div className={c.stat}><p className={c.statLabel}>Achats (débits)</p><p className={c.statValue}>{eurFr(s.achatsTtc)}</p><p className={c.statNote}>TVA déductible saisie : {eurFr(s.tvaDeductible)}</p></div>
      <div className={c.stat}><p className={c.statLabel}>Marge estimée</p><p className={c.statValue}>{eurFr(s.marge)}</p><p className={c.statNote}>CA HT − achats hors TVA déductible (estimation, pas un résultat comptable)</p></div>
      <div className={c.stat}><p className={c.statLabel}>Encaissements</p><p className={c.statValue}>{eurFr(s.credits.total)}</p><p className={c.statNote}>{s.credits.matched} rapproché(s) · <b style={{ color: s.credits.unmatched ? "#b91c1c" : undefined }}>{s.credits.unmatched} à rapprocher</b></p></div>
      <div className={c.stat}><p className={c.statLabel}>Décaissements</p><p className={c.statValue}>{eurFr(s.debits.total)}</p><p className={c.statNote}>{s.debits.matched} rapproché(s) · <b style={{ color: s.debits.unmatched ? "#b91c1c" : undefined }}>{s.debits.unmatched} à rapprocher</b></p></div>
    </div>

    {d.vat ? <VatCard v={d.vat} month={month} busy={!!busy} send={() => act("sum", { action: "send_summary" }, r => `✅ Résumé du mois envoyé à ${r.to}.`)} /> : null}

    <div className={c.card} style={{ display: "grid", gap: 8 }}>
      <b>1. Importer le relevé Revolut Business (CSV)</b>
      <p className={c.small} style={{ margin: 0 }}>Revolut Business → Comptes → Relevé → période du mois → format <b>CSV</b>. Réimporter le même fichier ne crée pas de doublon.</p>
      <input type="file" accept=".csv,text/csv,.pdf" disabled={!!busy} onChange={e => { importFile(e.target.files?.[0]); e.target.value = ""; }} />
      {d.imports.length ? <p className={c.small} style={{ margin: 0 }}>Derniers imports : {d.imports.slice(0, 3).map(i => `${i.file_name} (${i.inserted}/${i.rows}, ${new Date(i.created_at).toLocaleDateString("fr-FR")})`).join(" · ")}</p> : null}
    </div>

    <div className={c.card} style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <b>2. Rapprochement ({d.transactions.length} opération(s))</b>
        <button className={`${c.btn} ${c.btnGhost}`} style={small} disabled={!!busy} onClick={() => act("auto", { action: "automatch" }, r => `✅ ${r.matched} opération(s) rapprochée(s).`)}>{busy === "auto" ? "…" : "Rapprocher automatiquement"}</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([["todo", "À rapprocher"], ["credits", "Encaissements"], ["debits", "Décaissements"], ["all", "Tout"]] as const).map(([k, l]) => <button key={k} className={`${c.btn} ${f === k ? c.btnBrand : c.btnGhost}`} style={{ fontSize: 13, padding: "7px 10px" }} onClick={() => setF(k)}>{l}</button>)}
      </div>
      {!list.length ? <p className={c.muted} style={{ margin: 0 }}>Rien ici.</p> : null}
      {list.map(t => <div key={t.id} style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
        <div onClick={() => setOpen(open === t.id ? null : t.id)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{t.label || t.counterparty || "—"}</div>
            <div className={c.small}>{dfr(t.date)}{t.reference ? ` · réf. ${t.reference}` : ""}{t.ignored ? " · ignorée" : ""} · {t.invoice_id ? `🧾 ${invName(t.invoice_id)}` : t.parts_order ? `📦 ${t.parts_order}` : t.category ? `${t.category}${t.supplier ? ` (${t.supplier})` : ""}` : <span style={{ color: "#b91c1c" }}>non rapprochée</span>}{t.match_kind ? ` · ${t.match_kind}` : ""}{t.amount < 0 && !t.ignored ? (d.withReceipt.includes(t.id) ? " · 📎 justificatif" : <span style={{ color: "#b45309" }}> · sans justificatif</span>) : null}</div></div>
          <b style={{ color: t.amount > 0 ? "#166534" : "#141414", whiteSpace: "nowrap" }}>{t.amount > 0 ? "+" : ""}{eurFr(t.amount)}</b>
        </div>
        {open === t.id ? <TxEdit t={t} invoices={d.invoices} busy={!!busy} hasReceipt={d.withReceipt.includes(t.id)} save={body => act("tx", { action: "tx_update", id: t.id, ...body }, () => "✅ Enregistré.")}
          missing={body => act("att", { action: "missing_receipt", tx_id: t.id, ...body }, () => "✅ Attestation créée (TVA non déductible).")} /> : null}
      </div>)}
    </div>

    <div className={c.card}><b>🧾 Factures sans paiement ({d.invoicesNoPayment.length})</b>
      {d.invoicesNoPayment.length ? <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{d.invoicesNoPayment.map(i => <li key={i.id}>{i.number || "brouillon"} · {i.client_name} · {eurFr(i.total_ttc)}</li>)}</ul> : <p className={c.muted} style={{ margin: "6px 0 0" }}>Aucune.</p>}
    </div>
    <div className={c.card}><b>💶 Paiements sans facture ({d.paymentsNoInvoice.length})</b>
      {d.paymentsNoInvoice.length ? <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{d.paymentsNoInvoice.map(t => <li key={t.id}>{dfr(t.date)} · {t.label} · {eurFr(t.amount)}</li>)}</ul> : <p className={c.muted} style={{ margin: "6px 0 0" }}>Aucun.</p>}
    </div>

    {d.supplierUnpaid?.length ? <div className={c.card}><b>📄 Factures fournisseurs sans paiement relié ({d.supplierUnpaid.length})</b>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{d.supplierUnpaid.map(r => <li key={r.id}>{r.date ? dfr(r.date) : "date ?"} · {r.merchant || "?"}{r.number ? ` · n° ${r.number}` : ""} · {r.currency === "EUR" ? eurFr(r.total_ttc) : `${r.total_ttc ?? "?"} ${r.currency}`}</li>)}</ul>
      <p className={c.small} style={{ margin: "6px 0 0" }}>Payée en espèces ou avec une autre carte ? Ouvrez la pièce plus bas et notez-le ; sinon importez le relevé du mois du paiement puis « Rapprocher automatiquement ».</p></div> : null}

    <InboundCard d={d} busy={!!busy} act={act} setMsg={setMsg} />

    <Receipts d={d} month={month} busy={!!busy} act={act} reload={() => load()} setMsg={setMsg} />

    <div className={c.card} style={{ display: "grid", gap: 8 }}>
      <b>4. Exports Pennylane</b>
      <p className={c.small} style={{ margin: 0, lineHeight: 1.5 }}>Conseil : dans Pennylane, activez la <b>synchronisation bancaire Revolut</b> (Paramètres → Banques → Revolut Business) : les opérations arrivent seules. Les exports ci-dessous servent aux <b>factures de vente</b> et aux <b>justificatifs</b> : importez le CSV des factures (ou déposez les PDF), puis servez-vous du CSV de rapprochement pour justifier chaque opération.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={`${c.btn} ${c.btnBrand}`} style={small} disabled={!!busy} onClick={exportInv}>{busy === "inv" ? "Préparation…" : "⬇️ Factures + justificatifs du mois (.zip)"}</button>
        <button className={`${c.btn} ${c.btnGhost}`} style={small} disabled={!!busy} onClick={exportBank}>⬇️ Rapprochement bancaire (CSV)</button>
      </div>
    </div>
  </div>;
}

function TxEdit({ t, invoices, busy, save, hasReceipt, missing }: { t: Tx; invoices: InvL[]; busy: boolean; save: (b: object) => Promise<unknown>; hasReceipt: boolean; missing: (b: object) => Promise<unknown> }) {
  const [cat, setCat] = useState(t.category || ""); const [inv, setInv] = useState(t.invoice_id ? String(t.invoice_id) : ""); const [note, setNote] = useState(t.note || ""); const [vat, setVat] = useState(t.vat_deductible == null ? "" : String(t.vat_deductible)); const [sup, setSup] = useState(t.supplier || "");
  const near = [...invoices].sort((a, b) => Math.abs(Number(a.total_ttc) - t.amount) - Math.abs(Number(b.total_ttc) - t.amount)).slice(0, 40);
  return <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
    <select className={c.input} style={small} value={cat} onChange={e => setCat(e.target.value)}><option value="">Catégorie…</option>{CATEGORIES.map(x => <option key={x} value={x}>{x}</option>)}</select>
    {t.amount > 0 ? <select className={c.input} style={small} value={inv} onChange={e => setInv(e.target.value)}><option value="">Facture liée (aucune)</option>{near.map(i => <option key={i.id} value={i.id}>{i.number || "brouillon"} · {i.client_name} · {eurFr(i.total_ttc)}</option>)}</select>
      : <><input className={c.input} style={small} placeholder="Fournisseur" value={sup} onChange={e => setSup(e.target.value)} />
        <input className={c.input} style={small} type="number" step="0.01" inputMode="decimal" placeholder="TVA déductible (si facture avec TVA)" value={vat} onChange={e => setVat(e.target.value)} /></>}
    <input className={c.input} style={small} placeholder="Note" value={note} onChange={e => setNote(e.target.value)} />
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button className={`${c.btn} ${c.btnBrand}`} style={small} disabled={busy} onClick={() => save({ category: cat, note, ...(t.amount > 0 ? { invoice_id: inv ? Number(inv) : null } : { supplier: sup, vat_deductible: vat }) })}>Enregistrer</button>
      {t.match_kind ? <button className={`${c.btn} ${c.btnGhost}`} style={small} disabled={busy} onClick={() => save({ unmatch: true })}>Défaire le rapprochement</button> : null}
      <button className={`${c.btn} ${c.btnGhost}`} style={small} disabled={busy} onClick={() => save({ ignored: !t.ignored, category: t.ignored ? cat : "virement interne" })}>{t.ignored ? "Ne plus ignorer" : "Ignorer (virement interne)"}</button>
      {t.amount < 0 && !hasReceipt ? <button className={`${c.btn} ${c.btnGhost}`} style={{ ...small, color: "#b45309" }} disabled={busy} onClick={() => {
        const supplier = prompt("Fournisseur :", t.supplier || t.counterparty || t.label || ""); if (supplier === null) return;
        const objet = prompt("Objet professionnel de la dépense (ex. carburant tournée Toulouse → Lyon) :"); if (!objet) return;
        const raison = prompt("Raison de l'absence de justificatif (ex. ticket perdu, non remis par le commerçant) :"); if (!raison) return;
        if (confirm("Créer l'attestation signée ? La TVA de cette dépense ne sera PAS déductible.")) missing({ supplier, objet, raison });
      }}>Justificatif manquant</button> : null}
    </div>
  </div>;
}

function Receipts({ d, month, busy, act, reload, setMsg }: { d: M; month: string; busy: boolean; act: (l: string, b: object, ok?: (r: Record<string, unknown>) => string) => Promise<unknown>; reload: () => Promise<void>; setMsg: (s: string) => void }) {
  const [prog, setProg] = useState(""); const [f, setF] = useState<"todo" | "all">("all");
  const upload = async (list: FileList | null) => {
    const files = [...(list || [])]; if (!files.length) return;
    let ok = 0, err = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i]; setProg(`Envoi et lecture ${i + 1}/${files.length} : ${file.name}`);
      try {
        const r = await uploadReceipt<Rc>(file, month);
        if (r.status === "erreur") err++; else ok++;
      } catch (e) { err++; setMsg(`❌ ${file.name} : ${(e as Error).message}`); }
    }
    setProg(""); setMsg(`✅ ${ok} justificatif(s) lu(s)${err ? `, ${err} à vérifier` : ""}.`); await reload();
  };
  const st = d.receiptStats;
  const rows = d.receipts.filter(r => f === "all" || receiptState(r) === "à vérifier" || !r.transaction_id);
  return <div className={c.card} style={{ display: "grid", gap: 8 }}>
    <b>3. Justificatifs (tickets, factures fournisseurs)</b>
    <p className={c.small} style={{ margin: 0 }}>Débits avec justificatif : <b>{st.debitsWith}</b> · sans justificatif : <b style={{ color: st.debitsWithout ? "#b91c1c" : undefined }}>{st.debitsWithout}</b> · justificatifs sans débit (espèces, autre carte) : <b>{st.receiptsNoDebit}</b>{st.attestations ? ` · ${st.attestations} attestation(s)` : ""}{st.toCheck ? <> · <b style={{ color: "#b45309" }}>{st.toCheck} à vérifier</b></> : null}</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <label className={`${c.btn} ${c.btnBrand}`} style={{ ...small, cursor: "pointer" }}>📷 Prendre en photo<input type="file" accept="image/*" capture="environment" hidden disabled={busy || !!prog} onChange={e => { upload(e.target.files); e.target.value = ""; }} /></label>
      <label className={`${c.btn} ${c.btnGhost}`} style={{ ...small, cursor: "pointer" }}>🗂️ Plusieurs photos / PDF<input type="file" accept="image/*,application/pdf" multiple hidden disabled={busy || !!prog} onChange={e => { upload(e.target.files); e.target.value = ""; }} /></label>
      <a className={`${c.btn} ${c.btnGhost}`} style={small} href="/stock-facturation/tickets">📱 Page tickets (téléphone)</a>
      <select className={c.input} style={small} value={f} onChange={e => setF(e.target.value as "todo" | "all")}><option value="all">Tous ({d.receipts.length})</option><option value="todo">Sans débit ou à vérifier</option></select>
    </div>
    {prog ? <p className={c.small} style={{ margin: 0 }}>⏳ {prog}</p> : null}
    <p className={c.small} style={{ margin: 0, color: "#666" }}>La TVA n’est comptée comme déductible que pour une vraie facture au nom de MK HOLDING (avec TVA française indiquée). Pour un ticket perdu, ouvrez le débit ci-dessus et touchez « Justificatif manquant ».</p>
    {rows.map(r => <ReceiptRow key={r.id} r={r} d={d} busy={busy} act={act} setMsg={setMsg} />)}
  </div>;
}

const STATE_STYLE: Record<string, { bg: string; color: string; icon: string }> = { "lue": { bg: "#eef2ff", color: "#3730a3", icon: "👁️" }, "à vérifier": { bg: "#fff4d6", color: "#92400e", icon: "⚠️" }, "rapprochée": { bg: "#e7f6ec", color: "#166534", icon: "✅" } };
const catLabel = (x: string | null | undefined) => x ? RECEIPT_CATEGORY_LABEL[x] || x : "?";

function ReceiptRow({ r, d, busy, act, setMsg }: { r: Rc; d: M; busy: boolean; act: (l: string, b: object, ok?: (r: Record<string, unknown>) => string) => Promise<unknown>; setMsg: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const view = async () => { try { const x = await capi<{ url: string }>({ action: "receipt_url", id: r.id }); window.open(x.url, "_blank"); } catch (e) { setMsg("❌ " + (e as Error).message); } };
  const state = receiptState(r); const ss = STATE_STYLE[state];
  const cur = r.currency && r.currency !== "EUR" ? r.currency : "";
  return <div style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
    <div onClick={() => setOpen(!open)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8 }}>
      <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{r.kind === "attestation" ? "📝 " : r.source === "email" ? "📬 " : r.is_invoice ? "🧾 " : "🎫 "}{r.merchant || r.file_name || "—"}{r.invoice_number ? <span style={{ fontWeight: 400 }}> · n° {r.invoice_number}</span> : null}</div>
        <div className={c.small}><span className={c.pill} style={{ background: ss.bg, color: ss.color }}>{ss.icon} {state}</span> {r.date ? dfr(r.date) : "date ?"} · {catLabel(r.category)}{r.tva_amount != null ? ` · TVA ${eurFr(r.tva_amount)}` : ""}{r.vat_deductible ? " (déductible)" : ""}{r.vat_regime && r.vat_regime !== "normale" ? ` · ${r.vat_regime}` : ""} · {r.status === "erreur" ? <span style={{ color: "#b91c1c" }}>lecture impossible : {r.note}</span> : r.transaction_id ? `débit relié (${r.match_kind})` : <span style={{ color: "#b45309" }}>aucun débit Revolut</span>}</div>
        {r.review && !r.checked_at && r.status !== "erreur" ? <div className={c.small} style={{ color: "#b45309" }}>⚠️ {r.review}</div> : null}
        {r.source === "email" && r.email_from ? <div className={c.small} style={{ color: "#666", overflowWrap: "anywhere" }}>Reçue de {r.email_from}{r.email_subject ? ` · « ${r.email_subject} »` : ""}</div> : null}
      </div>
      <b style={{ whiteSpace: "nowrap" }}>{cur ? `${r.total_ttc ?? "?"} ${cur}` : eurFr(r.total_ttc)}</b>
    </div>
    {open ? <ReceiptEdit r={r} debits={d.transactions.filter(t => t.amount < 0 && !t.ignored)} busy={busy} save={b => act("rc", { action: "receipt_update", id: r.id, ...b }, () => "✅ Justificatif enregistré.")} view={view}
      remove={() => { if (confirm("Supprimer ce justificatif (fichier compris) ?")) act("rc", { action: "receipt_delete", id: r.id }, () => "Justificatif supprimé."); }} /> : null}
  </div>;
}

function VatCard({ v, month, busy, send }: { v: Vat; month: string; busy: boolean; send: () => void }) {
  return <div className={c.card} style={{ display: "grid", gap: 6 }}>
    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <b>🧮 TVA de {monthLabel(month)} (estimation)</b>
      <button className={`${c.btn} ${c.btnGhost}`} style={small} disabled={busy} onClick={send}>📧 M’envoyer le résumé du mois</button>
    </div>
    <div className={c.small} style={{ lineHeight: 1.7 }}>
      TVA collectée (factures FA-… validées) : <b>{eurFr(v.collectee)}</b><br />
      TVA déductible (factures fournisseurs françaises) : <b>− {eurFr(v.deductibleFactures)}</b>{v.deductibleManuelle ? <> · saisie sur des débits : <b>− {eurFr(v.deductibleManuelle)}</b></> : null}<br />
      <b style={{ fontSize: 16 }}>{v.net >= 0 ? "À payer" : "Crédit de TVA"} : {eurFr(Math.abs(v.net))}</b>
    </div>
    {v.autoliq.length ? <div className={c.small} style={{ lineHeight: 1.6 }}>
      <b>Autoliquidation à déclarer</b> (TVA due et déductible du même montant, ≈ {eurFr(v.autoliqTva)}) :
      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{v.autoliq.map(a => <li key={a.id}>{a.date ? dfr(a.date) : "?"} · {a.merchant || "?"}{a.number ? ` · n° ${a.number}` : ""} · {a.regime === "import" ? "import (douane)" : "UE / étranger"} · base {a.currency === "EUR" ? eurFr(a.base) : `${a.base} ${a.currency}`}</li>)}</ul>
    </div> : null}
    <p className={c.small} style={{ margin: 0, color: "#666" }}>Calcul fait à partir des pièces enregistrées ici : il aide à préparer la déclaration, il ne la remplace pas. Résumé envoyé aussi automatiquement le 3 de chaque mois.</p>
  </div>;
}

function InboundCard({ d, busy, act, setMsg }: { d: M; busy: boolean; act: (l: string, b: object, ok?: (r: Record<string, unknown>) => string) => Promise<unknown>; setMsg: (s: string) => void }) {
  const mails = d.receipts.filter(r => r.source === "email");
  const [copied, setCopied] = useState(false);
  const addr = d.inboundAddress || "";
  return <div className={c.card} style={{ display: "grid", gap: 8 }}>
    <b>📬 Factures fournisseurs reçues par e-mail ({mails.length})</b>
    {addr ? <p className={c.small} style={{ margin: 0, lineHeight: 1.5 }}>Faites envoyer vos factures (ou transférez-les) à <b style={{ userSelect: "all" }}>{addr}</b> <button className={`${c.btn} ${c.btnGhost}`} style={{ fontSize: 12, padding: "4px 8px" }} onClick={() => { navigator.clipboard?.writeText(addr).then(() => setCopied(true)).catch(() => null); }}>{copied ? "Copiée" : "Copier"}</button><br />Chaque pièce jointe (PDF, photo) est rangée, lue, dédoublonnée et reliée au débit Revolut. Une facture écrite dans le corps de l’e-mail est aussi gardée en PDF.</p> : null}
    {mails.length ? mails.map(r => <ReceiptRow key={r.id} r={r} d={d} busy={busy} act={act} setMsg={setMsg} />) : <p className={c.muted} style={{ margin: 0 }}>Aucune facture reçue par e-mail pour ce mois.</p>}
    {d.inbound?.length ? <details><summary className={c.small} style={{ cursor: "pointer" }}>Derniers e-mails reçus ({d.inbound.length})</summary>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }} className={c.small}>{d.inbound.map(m => <li key={m.id}>{new Date(m.created_at).toLocaleDateString("fr-FR")} · {m.from_name || m.from_email} · « {m.subject || "sans objet"} » · {m.status === "reçu" ? "⏳ en cours" : m.status === "erreur" ? <span style={{ color: "#b91c1c" }}>erreur : {m.error}</span> : `${m.receipts} pièce(s)${m.duplicates ? `, ${m.duplicates} doublon(s)` : ""}${m.ignored ? `, ${m.ignored} ignorée(s)` : ""}`}</li>)}</ul>
    </details> : null}
  </div>;
}

function ReceiptEdit({ r, debits, busy, save, view, remove }: { r: Rc; debits: Tx[]; busy: boolean; save: (b: object) => Promise<unknown>; view: () => void; remove: () => void }) {
  const ns = (x: number | null | undefined) => x == null ? "" : String(x);
  const [v, setV] = useState({ date: r.date || "", merchant: r.merchant || "", invoice_number: r.invoice_number || "", total_ttc: ns(r.total_ttc), total_ht: ns(r.total_ht), tva_amount: ns(r.tva_amount), currency: r.currency || "EUR", vat_regime: r.vat_regime || "normale", iban: r.iban || "", category: r.category || "autre", is_invoice: !!r.is_invoice, vat_deductible: r.vat_deductible, transaction_id: r.transaction_id ? String(r.transaction_id) : "", note: r.note || "" });
  const [lines, setLines] = useState((r.vat_lines || []).map(l => ({ rate: ns(l.rate), base: ns(l.base), tva: ns(l.tva) })));
  const near = [...debits].sort((a, b) => Math.abs(-a.amount - Number(v.total_ttc || 0)) - Math.abs(-b.amount - Number(v.total_ttc || 0))).slice(0, 30);
  const set = (k: keyof typeof v, x: string | boolean) => setV(o => ({ ...o, [k]: x }));
  const setLine = (i: number, k: "rate" | "base" | "tva", x: string) => setLines(ls => ls.map((l, j) => j === i ? { ...l, [k]: x } : l));
  const lab: React.CSSProperties = { display: "grid", gap: 2, fontSize: 12, color: "#555" };
  return <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 6 }}>
      <label style={lab}>Date<input className={c.input} style={small} type="date" value={v.date} onChange={e => set("date", e.target.value)} /></label>
      <label style={lab}>Fournisseur<input className={c.input} style={small} value={v.merchant} onChange={e => set("merchant", e.target.value)} /></label>
      <label style={lab}>N° de facture<input className={c.input} style={small} value={v.invoice_number} onChange={e => set("invoice_number", e.target.value)} /></label>
      <label style={lab}>Total HT<input className={c.input} style={small} inputMode="decimal" value={v.total_ht} onChange={e => set("total_ht", e.target.value)} /></label>
      <label style={lab}>TVA totale<input className={c.input} style={small} inputMode="decimal" value={v.tva_amount} onChange={e => set("tva_amount", e.target.value)} /></label>
      <label style={lab}>Total TTC<input className={c.input} style={small} inputMode="decimal" value={v.total_ttc} onChange={e => set("total_ttc", e.target.value)} /></label>
      <label style={lab}>Devise<input className={c.input} style={small} maxLength={3} value={v.currency} onChange={e => set("currency", e.target.value.toUpperCase())} /></label>
      <label style={lab}>IBAN du fournisseur<input className={c.input} style={small} value={v.iban} onChange={e => set("iban", e.target.value)} /></label>
    </div>
    <div style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, color: "#555" }}>TVA par taux</span>
      {lines.map((l, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr 36px", gap: 4 }}>
        <input className={c.input} style={small} inputMode="decimal" placeholder="taux %" value={l.rate} onChange={e => setLine(i, "rate", e.target.value)} />
        <input className={c.input} style={small} inputMode="decimal" placeholder="base HT" value={l.base} onChange={e => setLine(i, "base", e.target.value)} />
        <input className={c.input} style={small} inputMode="decimal" placeholder="TVA" value={l.tva} onChange={e => setLine(i, "tva", e.target.value)} />
        <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: 4 }} onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}>✕</button>
      </div>)}
      <button className={`${c.btn} ${c.btnGhost}`} style={{ fontSize: 12, padding: "4px 8px", justifySelf: "start" }} onClick={() => setLines(ls => [...ls, { rate: "20", base: "", tva: "" }])}>+ taux de TVA</button>
    </div>
    <select className={c.input} style={small} value={v.category} onChange={e => set("category", e.target.value)}>{RECEIPT_CATEGORIES.map(x => <option key={x} value={x}>{catLabel(x)}</option>)}</select>
    <select className={c.input} style={small} value={v.vat_regime} onChange={e => { set("vat_regime", e.target.value); if (e.target.value !== "normale") set("vat_deductible", false); }}>{VAT_REGIMES.map(x => <option key={x} value={x}>{VAT_REGIME_LABEL[x]}</option>)}</select>
    <label className={c.small}><input type="checkbox" checked={v.is_invoice} onChange={e => set("is_invoice", e.target.checked)} /> Vraie facture (au nom de MK HOLDING / SIREN)</label>
    <label className={c.small}><input type="checkbox" checked={v.vat_deductible} onChange={e => set("vat_deductible", e.target.checked)} /> TVA déductible</label>
    <select className={c.input} style={small} value={v.transaction_id} onChange={e => set("transaction_id", e.target.value)}><option value="">Aucun débit (espèces, autre carte)</option>{near.map(t => <option key={t.id} value={t.id}>{dfr(t.date)} · {t.label} · {eurFr(t.amount)}</option>)}</select>
    <input className={c.input} style={small} placeholder="Note (ex. payé en espèces)" value={v.note} onChange={e => set("note", e.target.value)} />
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button className={`${c.btn} ${c.btnBrand}`} style={small} disabled={busy} onClick={() => save({ ...v, vat_lines: lines, checked: true, transaction_id: v.transaction_id ? Number(v.transaction_id) : null })}>Enregistrer (vérifiée)</button>
      <button className={`${c.btn} ${c.btnGhost}`} style={small} onClick={view}>Voir</button>
      <button className={`${c.btn} ${c.btnGhost}`} style={{ ...small, color: "#b91c1c" }} disabled={busy} onClick={remove}>Supprimer</button>
    </div>
  </div>;
}
