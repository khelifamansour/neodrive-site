"use client";
import { useEffect, useRef, useState } from "react";
import c from "../../giga/giga.module.css";
import { RECEIPT_CATEGORY_LABEL, receiptState } from "../../../lib/accounting";
import { Unauthorized, capi, uploadReceipt } from "../../../lib/receipt-upload";
import { eurFr } from "../../../lib/stock-shared";

type Rc = { id: number; status: string; date: string | null; merchant: string | null; total_ttc: number | null; category: string | null; transaction_id: number | null; review?: string | null; checked_at?: string | null; note: string | null; currency?: string | null };
type Item = { key: string; name: string; state: "envoi" | "ok" | "erreur"; rc?: Rc; error?: string };

/** Tickets au téléphone : une photo après l'autre, chaque ticket est envoyé et lu tout de suite (même circuit que l'onglet Comptabilité). */
export default function Tickets() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [pc, setPc] = useState(""); const [err, setErr] = useState("");
  const [items, setItems] = useState<Item[]>([]); const [recent, setRecent] = useState<Rc[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const month = new Date().toISOString().slice(0, 7);

  const check = async (p?: string) => {
    try { await capi({ action: "ping" }, p); if (p) { try { sessionStorage.setItem("nd_pc", p); } catch { /* privé */ } } setState("ready"); loadRecent(); }
    catch (e) { if (e instanceof Unauthorized) { setState("login"); if (p) setErr("Code incorrect"); } else { setErr((e as Error).message); setState("login"); } }
  };
  const loadRecent = () => capi<{ receipts: Rc[] }>({ action: "recent_receipts" }).then(r => setRecent(r.receipts)).catch(() => null);
  useEffect(() => { check(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (list: FileList | null) => {
    for (const file of [...(list || [])]) {
      const key = `${Date.now()}-${Math.random()}`;
      setItems(xs => [{ key, name: file.name, state: "envoi" }, ...xs]);
      // Envois l'un après l'autre : on peut reprendre une photo pendant que la précédente est lue.
      queue.current = queue.current.then(async () => {
        try { const rc = await uploadReceipt<Rc>(file, month, "telephone"); setItems(xs => xs.map(x => x.key === key ? { ...x, state: rc.status === "erreur" ? "erreur" : "ok", rc, error: rc.status === "erreur" ? rc.note || "lecture impossible" : undefined } : x)); }
        catch (e) { setItems(xs => xs.map(x => x.key === key ? { ...x, state: "erreur", error: (e as Error).message } : x)); }
      });
    }
    queue.current.then(loadRecent);
  };

  if (state === "loading") return <main className={c.page}><div className={c.wrap}><p className={c.muted}>Chargement…</p></div></main>;
  if (state === "login") return <main className={c.page}><form className={c.login} onSubmit={e => { e.preventDefault(); check(pc.trim()); }}>
    <h1>📷 Tickets</h1><p className={c.muted}>Code d’accès du fondateur.</p>
    <input className={c.input} type="password" value={pc} onChange={e => setPc(e.target.value)} placeholder="Code" autoFocus />
    <button className={`${c.btn} ${c.btnBrand}`}>Entrer</button>{err ? <p className={c.err}>{err}</p> : null}</form></main>;

  const busy = items.filter(i => i.state === "envoi").length;
  const line = (r: Rc) => `${r.date ? new Date(`${r.date}T12:00:00`).toLocaleDateString("fr-FR") : "date ?"} · ${r.merchant || "?"} · ${r.currency && r.currency !== "EUR" ? `${r.total_ttc ?? "?"} ${r.currency}` : eurFr(r.total_ttc)} · ${r.category ? RECEIPT_CATEGORY_LABEL[r.category] || r.category : "?"}`;
  return <main className={c.page}><div className={c.wrap} style={{ maxWidth: 520 }}>
    <div className={c.top}><a href="/stock-facturation?onglet=compta" className={c.back}>← Comptabilité</a></div>
    <h1 style={{ margin: "0 0 4px" }}>📷 Tickets et factures</h1>
    <p className={c.muted} style={{ marginTop: 0 }}>Une photo par ticket, bien à plat et lisible. Reprenez une photo tout de suite : les tickets sont envoyés et lus l’un après l’autre, puis reliés au débit Revolut.</p>
    <div style={{ display: "grid", gap: 10, margin: "14px 0" }}>
      <label className={`${c.btn} ${c.btnBrand}`} style={{ cursor: "pointer", fontSize: 20, padding: "22px 16px", textAlign: "center" }}>📷 Photographier un ticket<input type="file" accept="image/*" capture="environment" hidden onChange={e => { add(e.target.files); e.target.value = ""; }} /></label>
      <label className={`${c.btn} ${c.btnGhost}`} style={{ cursor: "pointer", textAlign: "center" }}>🗂️ Choisir plusieurs photos ou PDF<input type="file" accept="image/*,application/pdf" multiple hidden onChange={e => { add(e.target.files); e.target.value = ""; }} /></label>
    </div>
    {busy ? <p className={c.small}>⏳ {busy} ticket(s) en cours de lecture…</p> : null}
    {items.length ? <div className={c.card} style={{ display: "grid", gap: 6 }}>
      <b>Cette fois-ci ({items.length})</b>
      {items.map(i => <div key={i.key} className={c.small} style={{ borderTop: "1px solid #eee", paddingTop: 6 }}>
        {i.state === "envoi" ? `⏳ ${i.name}` : i.state === "erreur" ? <span style={{ color: "#b91c1c" }}>❌ {i.name} : {i.error}</span> : i.rc ? <>{receiptState(i.rc) === "rapprochée" ? "✅" : receiptState(i.rc) === "à vérifier" ? "⚠️" : "👁️"} {line(i.rc)}{i.rc.review ? <span style={{ color: "#b45309" }}> · {i.rc.review}</span> : null}</> : null}
      </div>)}
    </div> : null}
    {recent.length ? <div className={c.card} style={{ display: "grid", gap: 4, marginTop: 12 }}>
      <b>Derniers justificatifs</b>
      {recent.map(r => <div key={r.id} className={c.small}>{receiptState(r) === "rapprochée" ? "✅" : receiptState(r) === "à vérifier" ? "⚠️" : "👁️"} {line(r)}</div>)}
      <p className={c.small} style={{ margin: "6px 0 0", color: "#666" }}>Corrections et pièces sans débit : onglet Comptabilité sur l’ordinateur.</p>
    </div> : null}
  </div></main>;
}
