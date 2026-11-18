"use client";
import { useEffect, useState } from "react";
import c from "../giga/giga.module.css";
import { dayWorked } from "../../lib/driver-invoice";
import { supabase } from "../../lib/supabase";
import TicketsBulk from "./TicketsBulk";

type Api = <T = Record<string, unknown>>(body: object) => Promise<T>;
type Day = { date: string; depart: string; start: string; end: string; pause_min: number };
type Dlv = { client: string; vin: string; date: string | null; accuse: boolean; delivered: boolean };
type Prep = {
  rate: number; days: Day[]; deliveries: Dlv[]; planned: { h: number; km: number; stops: number }; blockers: string[];
  expenses: { card: number; perso: number; count: number; today?: number; no_photo: number; by_day: { date: string; n: number; card: number; perso: number; flags: string[] }[] };
  existing: { number: string; status: string; total: number; sent_at: string; paid_at: string | null } | null;
};
const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
const hm = (m: number) => `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, "0")}`;
const dTxt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** Clôture de la tournée par le livreur : journées (départ, pauses, fin), contrôle, aperçu et envoi de la facture (heures × taux uniquement). */
export default function Invoice({ tourId, api, onMsg, onDone }: { tourId: string; api: Api; onMsg: (m: string) => void; onDone: () => void }) {
  const [p, setP] = useState<Prep | null>(null); const [days, setDays] = useState<Day[]>([]); const [busy, setBusy] = useState("");
  useEffect(() => { api<Prep>({ action: "invoice_prepare", tour_id: tourId }).then(j => { setP(j); setDays(j.days.map(d => ({ date: d.date, depart: d.depart, start: d.start, end: d.end, pause_min: d.pause_min }))); }).catch(e => onMsg("❌ " + (e as Error).message)); }, [api, tourId, onMsg]);
  const refreshExpenses = async () => { const j = await api<Prep>({ action: "invoice_prepare", tour_id: tourId }); setP(v => v ? { ...v, expenses: j.expenses } : j); };
  const uploadTicket = async (f: File) => { if (f.size > 15 * 1024 * 1024) throw new Error("Photo trop lourde (15 Mo maximum)."); const u = await api<{ bucket: string; path: string; token: string }>({ action: "ticket_upload_url", tour_id: tourId }); const { error } = await supabase.storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, f, { contentType: f.type || "image/jpeg" }); if (error) throw new Error("Envoi de la photo impossible, réessayez."); return u.path; };
  if (!p) return <p className={c.muted}>Chargement de la tournée…</p>;
  if (p.existing) return <div style={{ padding: 10, borderRadius: 10, background: "#e7f6ec" }}>🧾 Facture <b>{p.existing.number}</b> envoyée le {new Date(p.existing.sent_at).toLocaleDateString("fr-FR")} · {eur(p.existing.total)} · {p.existing.status === "payee" ? `✅ payée le ${new Date(p.existing.paid_at || "").toLocaleDateString("fr-FR")}` : "⏳ à payer par NeoDrive"}</div>;

  const worked = days.reduce((a, d) => a + dayWorked(d.start, d.end, d.pause_min), 0);
  const total = Math.round(worked / 60 * p.rate * 100) / 100;
  const set = (i: number, k: keyof Day, v: string) => setDays(ds => ds.map((d, j) => j === i ? { ...d, [k]: k === "pause_min" ? Math.max(0, Number(v.replace(/\D/g, "")) || 0) : v } : d));
  const addDay = () => { const last = days[days.length - 1]?.date; const next = last ? new Date(Date.parse(last + "T12:00:00Z") + 86400e3).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10); setDays([...days, { date: next, depart: "", start: "08:00", end: "", pause_min: 0 }]); };
  const done = p.deliveries.filter(d => d.delivered);
  const run = async (k: string, fn: () => Promise<void>) => { setBusy(k); try { await fn(); } catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); } };
  const preview = () => run("preview", async () => {
    const j = await api<{ pdf: string }>({ action: "invoice_preview", tour_id: tourId, days });
    const bin = Uint8Array.from(atob(j.pdf), ch => ch.charCodeAt(0));
    window.open(URL.createObjectURL(new Blob([bin], { type: "application/pdf" })), "_blank");
  });
  const send = () => run("send", async () => {
    if (!confirm(`Envoyer la facture de ${eur(total)} (${hm(worked)}) ? Elle sera envoyée par e-mail à vous et à NeoDrive.`)) return;
    const j = await api<{ number: string; emailed_to_driver: boolean }>({ action: "invoice_send", tour_id: tourId, days });
    onMsg(`✅ Facture ${j.number} envoyée${j.emailed_to_driver ? " (copie dans votre boîte e-mail)" : ""}. NeoDrive la paie par virement.`); onDone();
  });
  const inp = { padding: "8px 10px", fontSize: 15 } as const;

  return <div style={{ display: "grid", gap: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
    <b>🏁 Clôturer ma tournée</b>
    <small className={c.muted}>Vérifiez chaque journée : lieu et heure de départ, total des pauses, heure de fin. Facture = heures × {eur(p.rate)}, TVA non applicable. Les dépenses (carte société) ne sont jamais sur la facture.</small>
    {days.map((d, i) => <div key={i} style={{ display: "grid", gap: 6, padding: 10, borderRadius: 10, background: "#faf8f5" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}><b>{dTxt(d.date)}</b><span>{hm(dayWorked(d.start, d.end, d.pause_min))}</span></div>
      <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
        <label className={c.muted}>Jour<input className={c.input} style={inp} type="date" value={d.date} onChange={e => set(i, "date", e.target.value)} /></label>
        <label className={c.muted}>Départ de<input className={c.input} style={inp} value={d.depart} onChange={e => set(i, "depart", e.target.value)} placeholder="Muret" /></label>
        <label className={c.muted}>Heure de départ<input className={c.input} style={inp} type="time" value={d.start} onChange={e => set(i, "start", e.target.value)} /></label>
        <label className={c.muted}>Pauses (minutes)<input className={c.input} style={inp} inputMode="numeric" value={String(d.pause_min)} onChange={e => set(i, "pause_min", e.target.value)} /></label>
        <label className={c.muted}>Heure de fin<input className={c.input} style={inp} type="time" value={d.end} onChange={e => set(i, "end", e.target.value)} /></label>
      </div>
      {days.length > 1 ? <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "4px 10px" }} onClick={() => setDays(days.filter((_, j) => j !== i))}>Retirer ce jour</button> : null}
    </div>)}
    <button className={`${c.btn} ${c.btnGhost}`} onClick={addDay}>➕ Ajouter un jour</button>

    <div style={{ display: "grid", gap: 4, padding: 10, borderRadius: 10, background: "#eef6ff" }}>
      <span>⏱️ Heures : <b>{hm(worked)}</b> (prévu ≈ {hm(p.planned.h * 60)})</span>
      <span>🚗 Livraisons : <b>{done.length}/{p.planned.stops}</b>{done.some(d => !d.vin) ? ` · ⚠️ ${done.filter(d => !d.vin).length} sans VIN` : ""}{done.some(d => !d.accuse) ? ` · ⚠️ ${done.filter(d => !d.accuse).length} sans accusé` : ""}</span>
      {p.deliveries.map(d => <small key={d.client} className={c.muted}>{d.delivered ? "✅" : "⏳"} {d.client}{d.vin ? ` · VIN ${d.vin}` : ""}{d.accuse ? " · accusé" : ""}</small>)}
      <span>💳 Dépenses carte société (hors facture) : {eur(p.expenses.card)}</span>
      {p.expenses.perso ? <span>🧾 À vous rembourser (hors facture) : {eur(p.expenses.perso)}</span> : null}
      <span>🧾 {p.expenses.count} ticket{p.expenses.count > 1 ? "s" : ""} ajouté{p.expenses.count > 1 ? "s" : ""}</span>
      {!p.expenses.count ? <small style={{ color: "#93370d" }}>Aucun ticket pour cette tournée. Si vous avez des tickets, ajoutez les photos ci-dessous (ça ne bloque pas la facture).</small> : null}
      <b style={{ fontSize: 17 }}>Total facture : {eur(total)}</b>
    </div>
    {p.blockers.length ? <div className={c.err}>Avant l’envoi : {p.blockers.join(" ; ")}.</div> : null}
    <TicketsBulk upload={uploadTicket} onMsg={onMsg} btnClass={`${c.btn} ${c.btnGhost}`} todayCount={p.expenses.today || 0} save={async paths => { await api({ action: "ticket_add", tour_id: tourId, paths }); await refreshExpenses(); }} />
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className={`${c.btn} ${c.btnGhost}`} disabled={!!busy || !worked} onClick={preview}>{busy === "preview" ? "…" : "👀 Voir la facture"}</button>
      <button className={`${c.btn} ${c.btnBrand}`} disabled={!!busy || !worked || p.blockers.length > 0} onClick={send}>{busy === "send" ? "…" : "📤 Envoyer la facture"}</button>
    </div>
  </div>;
}
