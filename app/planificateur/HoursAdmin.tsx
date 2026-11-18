"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import s from "./planif.module.css";
import type { PlanTour } from "../../lib/planif";
import type { TourEvent } from "../../lib/schedule";
import { HOTEL_CAP, MEAL_CAP, computeHours, dayTxt, eur, expenseLabel, hm, parisTime, recapText } from "../../lib/driver-hours";

type Api = (body: object) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const esc = (t: string) => t.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

/** Heures et frais du chauffeur (côté NeoDrive) : prévu / réel, montant à facturer, tickets, récapitulatif. */
export default function HoursAdmin({ tour, api }: { tour: PlanTour; api: Api }) {
  const [d, setD] = useState<{ events: TourEvent[]; photos: Record<string, string>; rate: number; estH: number } | null>(null);
  const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [rate, setRate] = useState(""); const [now, setNow] = useState(() => Date.now());
  const apiRef = useRef(api); useEffect(() => { apiRef.current = api; });
  const load = useCallback(async () => { try { const j = await apiRef.current({ action: "hours", id: tour.id }); setD({ events: j.events || [], photos: j.photos || {}, rate: j.rate, estH: j.estH || 0 }); setRate(String(j.rate)); setNow(Date.now()); setErr(""); } catch (e) { setErr((e as Error).message); } }, [tour.id]);
  useEffect(() => { const f = setTimeout(load, 0); return () => clearTimeout(f); }, [load]);
  const sum = useMemo(() => d ? computeHours(d.events, d.rate, now) : null, [d, now]);
  if (err) return <p className={s.err}>Heures indisponibles : {err}</p>;
  if (!d || !sum) return <p className={s.muted}>Chargement des heures…</p>;

  const realH = sum.workedMin / 60, gap = d.estH ? (realH - d.estH) / d.estH : 0, red = d.estH > 0 && realH > 0 && Math.abs(gap) > 0.15;
  const text = recapText(tour.name || "Tournée", tour.driver || "", sum, d.estH);
  const saveRate = async () => { try { await apiRef.current({ action: "hours_rate", id: tour.id, rate }); setMsg("✅ Taux enregistré."); await load(); } catch (e) { setMsg("❌ " + (e as Error).message); } };
  const print = () => { const w = window.open("", "_blank"); if (!w) return; w.document.write(`<!doctype html><meta charset="utf-8"><title>Récapitulatif chauffeur</title><pre style="font:14px/1.5 system-ui;white-space:pre-wrap;padding:24px">${esc(text)}</pre>`); w.document.close(); w.print(); };
  const corrections = d.events.filter(e => e.kind === "correction");

  return <section className={s.dash}>
    <div className={s.rowHead}><h3>⏱️ Heures et frais du chauffeur</h3><button className={s.small} onClick={load}>↻ Actualiser</button></div>
    <div className={s.kpis}>
      <div><small>Heures prévues</small><b>{d.estH ? hm(d.estH * 60) : "—"}</b></div>
      <div><small>Heures réelles</small><b>{hm(sum.workedMin)}</b></div>
      <div><small>Écart</small><b style={{ color: red ? "#b42318" : undefined }}>{d.estH && realH ? `${gap > 0 ? "+" : ""}${Math.round(gap * 100)} %` : "—"}</b></div>
      <div><small>À facturer par le chauffeur</small><b>{eur(sum.total)}</b></div>
    </div>
    {red ? <p className={s.err} style={{ fontWeight: 400 }}>Écart de plus de 15 % entre le prévu et le réel : vérifiez le journal et les corrections avant de valider la facture.</p> : null}

    <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
      <label className={s.field} style={{ maxWidth: 180 }}>Taux horaire (€/h)<input inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} /></label>
      <button className={s.ghost} onClick={saveRate}>Enregistrer</button>
      {msg ? <span className={msg.startsWith("❌") ? s.err : s.ok}>{msg}</span> : null}
    </div>

    {sum.days.length ? <table className={s.costs}><tbody>
      <tr><td><b>Jour</b></td><td><b>Heures</b></td></tr>
      {sum.days.map(x => <tr key={x.date}><td>
        <b>{dayTxt(x.date)}</b>{x.start ? ` · ${parisTime(x.start)} → ${x.end ? parisTime(x.end) : x.open ? "en cours" : "?"}` : ""}{x.pauseMin >= 1 ? ` · pauses ${hm(x.pauseMin)}` : ""}{x.correctionMin ? ` · correction ${x.correctionMin > 0 ? "+" : ""}${hm(x.correctionMin)}` : ""}
        {x.corrections.map((c, k) => <small key={k} style={{ display: "block" }}>✏️ {c.minutes > 0 ? "+" : ""}{hm(c.minutes)} — « {c.note} »</small>)}
        {x.expenses.map((p, k) => <small key={"e" + k} style={{ display: "block" }}>{expenseLabel(p.type)} {eur(p.amount)}{p.paid === "perso" ? " · à rembourser" : ""} {p.photo && d.photos[p.photo] ? <a href={d.photos[p.photo]} target="_blank" rel="noreferrer">📷 ticket</a> : <b style={{ color: "#b42318" }}>sans photo</b>}</small>)}
        {x.flags.map((f, k) => <small key={"f" + k} style={{ display: "block", color: "#b42318" }}>⚠️ {f}</small>)}
      </td><td>{hm(x.workedMin)}</td></tr>)}
      <tr><td>Heures × {eur(sum.rate)}</td><td>{eur(sum.amount)}</td></tr>
      <tr className={s.tot}><td>Total facturé par le chauffeur (heures seulement)</td><td>{eur(sum.total)}</td></tr>
      <tr><td>Dépenses carte société (hors facture){sum.overCap ? <b style={{ color: "#b42318" }}> · au-dessus des repères (hôtel {HOTEL_CAP} €/nuit, repas {MEAL_CAP} €/jour)</b> : null}</td><td>{eur(sum.card)}</td></tr>
      {sum.refund ? <tr><td>À rembourser au chauffeur (payé personnellement, note de frais hors facture)</td><td>{eur(sum.refund)}</td></tr> : null}
    </tbody></table> : <p className={s.muted}>Aucune heure notée pour l’instant. Le chauffeur utilise « Début de journée », « Pause », « Reprise » et « Fin de journée » sur son lien.</p>}
    {corrections.length ? <p className={s.muted}>✏️ {corrections.length} correction{corrections.length > 1 ? "s" : ""} manuelle{corrections.length > 1 ? "s" : ""} : chacune a une explication du chauffeur.</p> : null}

    <pre style={{ whiteSpace: "pre-wrap", background: "#f6f4f0", padding: 12, borderRadius: 12, fontSize: 13 }}>{text}</pre>
    <div className={s.btns}>
      <button className={s.ghost} onClick={() => navigator.clipboard?.writeText(text).then(() => setMsg("✅ Récapitulatif copié.")).catch(() => setMsg("Copie impossible."))}>📋 Copier le récapitulatif</button>
      <button className={s.ghost} onClick={print}>🖨️ Imprimer</button>
    </div>
  </section>;
}
