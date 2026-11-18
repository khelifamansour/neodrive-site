"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";

type Row = { id: number; date: string; kind: string; start_time: string; end_time: string; pause_min: number; worked_min: number; note: string | null; tour_id: string | null; invoice_id: number | null };
type Api = <T = Record<string, unknown>>(body: object) => Promise<T>;
const KINDS = ["Tournée", "Préparation / nettoyage", "Contrôle à l'arrivée", "Réparation / pièces", "Transport vers partenaire", "Autre"];
const hm = (m: number) => `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

/** Saisie des heures (tournée ou autre mission) et facture des heures sélectionnées. */
export default function Hours({ api, onMsg, tours, onInvoiced }: { api: Api; onMsg: (m: string) => void; tours: { id: string; name: string }[]; onInvoiced: () => void }) {
  const [rows, setRows] = useState<Row[]>([]); const [rate, setRate] = useState(25);
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState("");
  const [f, setF] = useState({ date: today(), kind: KINDS[1], start: "08:00", end: "12:00", pause_min: "0", note: "", tour_id: "" });
  const [sel, setSel] = useState<Set<number>>(new Set());

  const load = useCallback(async () => { try { const j = await api<{ hours: Row[]; rate: number }>({ action: "hours_list" }); setRows(j.hours); setRate(j.rate || 25); setSel(new Set(j.hours.filter(x => !x.invoice_id).map(x => x.id))); } catch (e) { onMsg("❌ " + (e as Error).message); } }, [api, onMsg]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setBusy("add");
    try { await api({ action: "hours_add", ...f, pause_min: Number(f.pause_min) || 0 }); onMsg("✅ Heures enregistrées."); setOpen(false); setF(x => ({ ...x, note: "" })); await load(); }
    catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  };
  const del = async (id: number) => { if (!confirm("Supprimer cette ligne d'heures ?")) return; try { await api({ action: "hours_delete", id }); await load(); } catch (e) { onMsg("❌ " + (e as Error).message); } };
  const invoice = async () => {
    const ids = [...sel]; if (!ids.length) return;
    if (!confirm(`Générer votre facture pour ${ids.length} ligne(s) d'heures ? Elle sera envoyée automatiquement à Mansour.`)) return;
    setBusy("inv");
    try { const j = await api<{ number: string; total: number }>({ action: "hours_invoice", ids }); onMsg(`✅ Facture ${j.number} générée (${eur(j.total)}) et envoyée à Mansour.`); await load(); onInvoiced(); }
    catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  };

  const open_ = rows.filter(x => !x.invoice_id);
  const selMin = open_.filter(x => sel.has(x.id)).reduce((a, x) => a + x.worked_min, 0);
  const inp: React.CSSProperties = { width: "100%" };

  return <section className={c.card} style={{ display: "grid", gap: 10 }}>
    <button className={`${c.btn} ${c.btnBrand}`} style={{ justifyContent: "center", fontSize: 18, padding: 16 }} onClick={() => setOpen(!open)}>{open ? "Fermer" : "➕ Saisir mes heures"}</button>
    {open ? <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
      <label className={c.small}>Date<input className={c.input} type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} style={inp} /></label>
      <label className={c.small}>Type de mission<select className={c.input} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })} style={inp}>{KINDS.map(k => <option key={k}>{k}</option>)}</select></label>
      <label className={c.small}>Début<input className={c.input} type="time" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} style={inp} /></label>
      <label className={c.small}>Fin<input className={c.input} type="time" value={f.end} onChange={e => setF({ ...f, end: e.target.value })} style={inp} /></label>
      <label className={c.small}>Pauses (minutes)<input className={c.input} type="number" min={0} value={f.pause_min} onChange={e => setF({ ...f, pause_min: e.target.value })} style={inp} /></label>
      <label className={c.small}>Tournée (facultatif)<select className={c.input} value={f.tour_id} onChange={e => setF({ ...f, tour_id: e.target.value })} style={inp}><option value="">— Aucune —</option>{tours.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label className={c.small} style={{ gridColumn: "1 / -1" }}>Courte description<input className={c.input} value={f.note} maxLength={200} onChange={e => setF({ ...f, note: e.target.value })} placeholder="Ex. : contrôle des 9 voitures du conteneur, nettoyage" style={inp} /></label>
      <button className={`${c.btn} ${c.btnBrand}`} style={{ gridColumn: "1 / -1", justifyContent: "center" }} disabled={busy === "add"} onClick={add}>{busy === "add" ? "…" : "Enregistrer ces heures"}</button>
    </div> : null}
    <b>Heures pas encore facturées</b>
    {open_.length ? open_.map(x => <label key={x.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: 8, borderRadius: 10, background: "#fafafa" }}>
      <input type="checkbox" checked={sel.has(x.id)} onChange={e => setSel(p => { const n = new Set(p); if (e.target.checked) n.add(x.id); else n.delete(x.id); return n; })} style={{ width: 20, height: 20, marginTop: 2 }} />
      <span style={{ flex: 1 }}><b>{new Date(x.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} · {x.kind}</b> · {x.start_time}–{x.end_time}{x.pause_min ? ` (pause ${x.pause_min} min)` : ""} · <b>{hm(x.worked_min)}</b>{x.note ? <><br /><small className={c.muted}>{x.note}</small></> : null}</span>
      <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "4px 8px", fontSize: 12 }} onClick={e => { e.preventDefault(); del(x.id); }}>Supprimer</button>
    </label>) : <small className={c.muted}>Aucune heure en attente. Appuyez sur « ➕ Saisir mes heures » après chaque mission.</small>}
    {open_.length ? <>
      <div style={{ fontSize: 16 }}>Sélection : <b>{hm(selMin)}</b> × {rate} € HT = <b>{eur(Math.round(selMin / 60 * rate * 100) / 100)}</b></div>
      <button className={`${c.btn} ${c.btnBrand}`} style={{ justifyContent: "center", fontSize: 17 }} disabled={busy === "inv" || !sel.size} onClick={invoice}>{busy === "inv" ? "Génération…" : "📄 Générer ma facture"}</button>
      <small className={c.muted}>La facture arrive automatiquement chez Mansour. Les tickets (carburant, péages, hôtel, repas) payés avec la carte de l’entreprise ne sont pas sur la facture.</small>
    </> : null}
  </section>;
}
