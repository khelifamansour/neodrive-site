"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";
import { CATEGORIES, RECEIPT_CATEGORIES } from "../../lib/accounting";
import { supabase } from "../../lib/supabase";
import { eurFr } from "../../lib/stock-shared";

type Tx = { id: number; date: string; label: string | null; amount: number; counterparty: string | null; reference: string | null; category: string | null; supplier: string | null; match_kind: string | null; invoice_id: number | null; reservation_id: number | null; parts_order: string | null; vat_deductible: number | null; ignored: boolean; note: string | null };
type InvL = { id: number; number: string | null; status: string; client_name: string | null; total_ttc: number | null; reservation_id: number | null };
type Stats = { credits: { matched: number; unmatched: number; total: number; matchedTotal: number }; debits: { matched: number; unmatched: number; total: number; matchedTotal: number }; caTtc: number; caHt: number; tvaCollectee: number; debours: number; validated: number; drafts: number; achatsTtc: number; tvaDeductible: number; marge: number };
type Rc = { id: number; kind: string; file_name: string | null; status: string; date: string | null; merchant: string | null; total_ttc: number | null; tva_amount: number | null; tva_rate: number | null; payment_hint: string | null; category: string | null; is_invoice: boolean | null; buyer: string | null; vat_deductible: boolean; transaction_id: number | null; match_kind: string | null; note: string | null };
type M = { receipts: Rc[]; withReceipt: number[]; receiptStats: { debitsWith: number; debitsWithout: number; receiptsNoDebit: number; attestations: number }; month: string; months: string[]; transactions: Tx[]; invoices: InvL[]; stats: Stats; invoicesNoPayment: { id: number; number: string | null; client_name: string | null; total_ttc: number | null; status: string }[]; paymentsNoInvoice: { id: number; date: string; label: string | null; amount: number }[]; checklist: { releve: boolean; rapproche: boolean; factures: boolean; pennylane: boolean; justificatifs: boolean }; exportedAt: string | null; imports: { id: number; created_at: string; file_name: string; months: string[]; rows: number; inserted: number }[] };

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

/** Photo → JPEG réduit (≤ 2000 px) : envoi rapide et lisible par la lecture automatique. */
async function toJpeg(f: File): Promise<Blob> {
  if (!f.type.startsWith("image/")) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
    const b = await new Promise<Blob | null>(res => cv.toBlob(res, "image/jpeg", 0.85));
    if (b) return b;
  } catch { /* format non lisible par le navigateur : on envoie l'original */ }
  return f;
}

function Receipts({ d, month, busy, act, reload, setMsg }: { d: M; month: string; busy: boolean; act: (l: string, b: object, ok?: (r: Record<string, unknown>) => string) => Promise<unknown>; reload: () => Promise<void>; setMsg: (s: string) => void }) {
  const [prog, setProg] = useState(""); const [open, setOpen] = useState<number | null>(null); const [f, setF] = useState<"todo" | "all">("all");
  const upload = async (list: FileList | null) => {
    const files = [...(list || [])]; if (!files.length) return;
    let ok = 0, err = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i]; setProg(`Envoi et lecture ${i + 1}/${files.length} : ${file.name}`);
      try {
        const blob = await toJpeg(file); const type = blob.type || file.type || "image/jpeg"; const name = blob === file ? file.name : file.name.replace(/\.[^.]+$/, "") + ".jpg";
        const u = await capi<{ bucket: string; path: string; token: string }>({ action: "receipt_upload", month, name, type, size: blob.size });
        const { error } = await supabase.storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, blob, { contentType: type });
        if (error) throw new Error(error.message);
        const r = await capi<{ receipt: Rc }>({ action: "receipt_read", month, path: u.path, name, type, size: blob.size });
        if (r.receipt.status === "erreur") err++; else ok++;
      } catch (e) { err++; setMsg(`❌ ${file.name} : ${(e as Error).message}`); }
    }
    setProg(""); setMsg(`✅ ${ok} justificatif(s) lu(s)${err ? `, ${err} à vérifier` : ""}.`); await reload();
  };
  const view = async (id: number) => { try { const r = await capi<{ url: string }>({ action: "receipt_url", id }); window.open(r.url, "_blank"); } catch (e) { setMsg("❌ " + (e as Error).message); } };
  const st = d.receiptStats;
  const debits = d.transactions.filter(t => t.amount < 0 && !t.ignored);
  const rows = d.receipts.filter(r => f === "all" || !r.transaction_id || r.status === "erreur");
  return <div className={c.card} style={{ display: "grid", gap: 8 }}>
    <b>3. Justificatifs (tickets, factures fournisseurs)</b>
    <p className={c.small} style={{ margin: 0 }}>Débits avec justificatif : <b>{st.debitsWith}</b> · sans justificatif : <b style={{ color: st.debitsWithout ? "#b91c1c" : undefined }}>{st.debitsWithout}</b> · justificatifs sans débit (espèces, autre carte) : <b>{st.receiptsNoDebit}</b>{st.attestations ? ` · ${st.attestations} attestation(s)` : ""}</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <label className={`${c.btn} ${c.btnBrand}`} style={{ ...small, cursor: "pointer" }}>📷 Prendre en photo<input type="file" accept="image/*" capture="environment" hidden disabled={busy || !!prog} onChange={e => { upload(e.target.files); e.target.value = ""; }} /></label>
      <label className={`${c.btn} ${c.btnGhost}`} style={{ ...small, cursor: "pointer" }}>🗂️ Plusieurs photos / PDF<input type="file" accept="image/*,application/pdf" multiple hidden disabled={busy || !!prog} onChange={e => { upload(e.target.files); e.target.value = ""; }} /></label>
      <select className={c.input} style={small} value={f} onChange={e => setF(e.target.value as "todo" | "all")}><option value="all">Tous ({d.receipts.length})</option><option value="todo">Sans débit ou à vérifier</option></select>
    </div>
    {prog ? <p className={c.small} style={{ margin: 0 }}>⏳ {prog}</p> : null}
    <p className={c.small} style={{ margin: 0, color: "#666" }}>La TVA n’est comptée comme déductible que pour une vraie facture au nom de MK HOLDING (avec TVA indiquée). Pour un ticket perdu, ouvrez le débit ci-dessus et touchez « Justificatif manquant ».</p>
    {rows.map(r => <div key={r.id} style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
      <div onClick={() => setOpen(open === r.id ? null : r.id)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700 }}>{r.kind === "attestation" ? "📝 " : r.is_invoice ? "🧾 " : "🎫 "}{r.merchant || r.file_name || "—"}</div>
          <div className={c.small}>{r.date ? dfr(r.date) : "date ?"} · {r.category || "?"}{r.tva_amount != null ? ` · TVA ${eurFr(r.tva_amount)}` : ""}{r.vat_deductible ? " (déductible)" : ""} · {r.status === "erreur" ? <span style={{ color: "#b91c1c" }}>lecture impossible : {r.note}</span> : r.transaction_id ? `✅ débit relié (${r.match_kind})` : <span style={{ color: "#b45309" }}>aucun débit Revolut</span>}</div></div>
        <b style={{ whiteSpace: "nowrap" }}>{eurFr(r.total_ttc)}</b>
      </div>
      {open === r.id ? <ReceiptEdit r={r} debits={debits} busy={busy} save={b => act("rc", { action: "receipt_update", id: r.id, ...b }, () => "✅ Justificatif enregistré.")} view={() => view(r.id)}
        remove={() => { if (confirm("Supprimer ce justificatif (fichier compris) ?")) act("rc", { action: "receipt_delete", id: r.id }, () => "Justificatif supprimé."); }} /> : null}
    </div>)}
  </div>;
}

function ReceiptEdit({ r, debits, busy, save, view, remove }: { r: Rc; debits: Tx[]; busy: boolean; save: (b: object) => Promise<unknown>; view: () => void; remove: () => void }) {
  const [v, setV] = useState({ date: r.date || "", merchant: r.merchant || "", total_ttc: r.total_ttc == null ? "" : String(r.total_ttc), tva_amount: r.tva_amount == null ? "" : String(r.tva_amount), category: r.category || "autre", is_invoice: !!r.is_invoice, vat_deductible: r.vat_deductible, transaction_id: r.transaction_id ? String(r.transaction_id) : "" });
  const near = [...debits].sort((a, b) => Math.abs(-a.amount - Number(v.total_ttc || 0)) - Math.abs(-b.amount - Number(v.total_ttc || 0))).slice(0, 30);
  const set = (k: keyof typeof v, x: string | boolean) => setV(o => ({ ...o, [k]: x }));
  return <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      <input className={c.input} style={small} type="date" value={v.date} onChange={e => set("date", e.target.value)} />
      <input className={c.input} style={small} placeholder="Fournisseur" value={v.merchant} onChange={e => set("merchant", e.target.value)} />
      <input className={c.input} style={small} inputMode="decimal" placeholder="Total TTC" value={v.total_ttc} onChange={e => set("total_ttc", e.target.value)} />
      <input className={c.input} style={small} inputMode="decimal" placeholder="TVA" value={v.tva_amount} onChange={e => set("tva_amount", e.target.value)} />
    </div>
    <select className={c.input} style={small} value={v.category} onChange={e => set("category", e.target.value)}>{RECEIPT_CATEGORIES.map(x => <option key={x} value={x}>{x}</option>)}</select>
    <label className={c.small}><input type="checkbox" checked={v.is_invoice} onChange={e => set("is_invoice", e.target.checked)} /> Vraie facture (au nom de MK HOLDING / SIREN)</label>
    <label className={c.small}><input type="checkbox" checked={v.vat_deductible} onChange={e => set("vat_deductible", e.target.checked)} /> TVA déductible</label>
    <select className={c.input} style={small} value={v.transaction_id} onChange={e => set("transaction_id", e.target.value)}><option value="">Aucun débit (espèces, autre carte)</option>{near.map(t => <option key={t.id} value={t.id}>{dfr(t.date)} · {t.label} · {eurFr(t.amount)}</option>)}</select>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button className={`${c.btn} ${c.btnBrand}`} style={small} disabled={busy} onClick={() => save({ ...v, transaction_id: v.transaction_id ? Number(v.transaction_id) : null })}>Enregistrer</button>
      <button className={`${c.btn} ${c.btnGhost}`} style={small} onClick={view}>Voir</button>
      <button className={`${c.btn} ${c.btnGhost}`} style={{ ...small, color: "#b91c1c" }} disabled={busy} onClick={remove}>Supprimer</button>
    </div>
  </div>;
}
