"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";
import { CATEGORIES } from "../../lib/accounting";
import { eurFr } from "../../lib/stock-shared";

type Tx = { id: number; date: string; label: string | null; amount: number; counterparty: string | null; reference: string | null; category: string | null; supplier: string | null; match_kind: string | null; invoice_id: number | null; reservation_id: number | null; parts_order: string | null; vat_deductible: number | null; ignored: boolean; note: string | null };
type InvL = { id: number; number: string | null; status: string; client_name: string | null; total_ttc: number | null; reservation_id: number | null };
type Stats = { credits: { matched: number; unmatched: number; total: number; matchedTotal: number }; debits: { matched: number; unmatched: number; total: number; matchedTotal: number }; caTtc: number; caHt: number; tvaCollectee: number; debours: number; validated: number; drafts: number; achatsTtc: number; tvaDeductible: number; marge: number };
type M = { month: string; months: string[]; transactions: Tx[]; invoices: InvL[]; stats: Stats; invoicesNoPayment: { id: number; number: string | null; client_name: string | null; total_ttc: number | null; status: string }[]; paymentsNoInvoice: { id: number; date: string; label: string | null; amount: number }[]; checklist: { releve: boolean; rapproche: boolean; factures: boolean; pennylane: boolean }; exportedAt: string | null; imports: { id: number; created_at: string; file_name: string; months: string[]; rows: number; inserted: number }[] };

const code = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
async function capi<T = Record<string, unknown>>(body: object): Promise<T> {
  const r = await fetch("/api/comptabilite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: code(), ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}
const download = (name: string, data: BlobPart, type: string) => { const url = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); };
const b64 = (s: string) => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
const dfr = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const monthLabel = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const small: React.CSSProperties = { fontSize: 14, padding: "8px 12px" };

/** Onglet « Comptabilité » : relevé Revolut du mois, rapprochement, exports Pennylane, clôture. */
export default function Compta() {
  const [month, setMonth] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - (d.getDate() < 10 ? 1 : 0)); return d.toISOString().slice(0, 7); });
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
  const exportInv = async () => { const r = await act("inv", { action: "export_invoices" }, r => `✅ ${r.count} facture(s) exportée(s).`); if (r) download(`pennylane-factures-${month}.zip`, b64(String(r.zip)), "application/zip"); };
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
            <div className={c.small}>{dfr(t.date)}{t.reference ? ` · réf. ${t.reference}` : ""}{t.ignored ? " · ignorée" : ""} · {t.invoice_id ? `🧾 ${invName(t.invoice_id)}` : t.parts_order ? `📦 ${t.parts_order}` : t.category ? `${t.category}${t.supplier ? ` (${t.supplier})` : ""}` : <span style={{ color: "#b91c1c" }}>non rapprochée</span>}{t.match_kind ? ` · ${t.match_kind}` : ""}</div></div>
          <b style={{ color: t.amount > 0 ? "#166534" : "#141414", whiteSpace: "nowrap" }}>{t.amount > 0 ? "+" : ""}{eurFr(t.amount)}</b>
        </div>
        {open === t.id ? <TxEdit t={t} invoices={d.invoices} busy={!!busy} save={body => act("tx", { action: "tx_update", id: t.id, ...body }, () => "✅ Enregistré.")} /> : null}
      </div>)}
    </div>

    <div className={c.card}><b>🧾 Factures sans paiement ({d.invoicesNoPayment.length})</b>
      {d.invoicesNoPayment.length ? <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{d.invoicesNoPayment.map(i => <li key={i.id}>{i.number || "brouillon"} · {i.client_name} · {eurFr(i.total_ttc)}</li>)}</ul> : <p className={c.muted} style={{ margin: "6px 0 0" }}>Aucune.</p>}
    </div>
    <div className={c.card}><b>💶 Paiements sans facture ({d.paymentsNoInvoice.length})</b>
      {d.paymentsNoInvoice.length ? <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{d.paymentsNoInvoice.map(t => <li key={t.id}>{dfr(t.date)} · {t.label} · {eurFr(t.amount)}</li>)}</ul> : <p className={c.muted} style={{ margin: "6px 0 0" }}>Aucun.</p>}
    </div>

    <div className={c.card} style={{ display: "grid", gap: 8 }}>
      <b>3. Exports Pennylane</b>
      <p className={c.small} style={{ margin: 0, lineHeight: 1.5 }}>Conseil : dans Pennylane, activez la <b>synchronisation bancaire Revolut</b> (Paramètres → Banques → Revolut Business) : les opérations arrivent seules. Les exports ci-dessous servent aux <b>factures de vente</b> et aux <b>justificatifs</b> : importez le CSV des factures (ou déposez les PDF), puis servez-vous du CSV de rapprochement pour justifier chaque opération.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={`${c.btn} ${c.btnBrand}`} style={small} disabled={!!busy} onClick={exportInv}>{busy === "inv" ? "Préparation…" : "⬇️ Factures du mois (CSV + PDF, .zip)"}</button>
        <button className={`${c.btn} ${c.btnGhost}`} style={small} disabled={!!busy} onClick={exportBank}>⬇️ Rapprochement bancaire (CSV)</button>
      </div>
    </div>
  </div>;
}

function TxEdit({ t, invoices, busy, save }: { t: Tx; invoices: InvL[]; busy: boolean; save: (b: object) => Promise<unknown> }) {
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
    </div>
  </div>;
}
