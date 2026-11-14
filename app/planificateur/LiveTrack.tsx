"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import s from "./planif.module.css";
import TourMap from "./TourMap";
import { ScheduleView } from "./Schedule";
import type { PlanClient, PlanTour } from "../../lib/planif";
import { EVENT_LABEL, absFromDate, dayLabel, dayOf, delayTxt, hhmm, plannedSchedule, stopTown, tourProgress, type TourEvent } from "../../lib/schedule";
import { waNumber } from "../../lib/sav";

type Api = (body: object) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const round5 = (abs: number) => Math.round(abs / 5) * 5;

/** Heure d'arrivée lisible pour le client : « 14h30 », « demain vers 9h00 », « samedi 15 novembre vers 9h00 ». */
export function etaPhrase(date: string, abs: number, now = Date.now()) {
  const today = dayOf(absFromDate(date, now)); const d = dayOf(abs);
  return d === today ? `aujourd’hui vers ${hhmm(round5(abs))}` : d === today + 1 ? `demain vers ${hhmm(round5(abs))}` : `le ${dayLabel(date, d)} vers ${hhmm(round5(abs))}`;
}

/** Suivi en direct d'une tournée validée : position, journal, livrées / restantes, retard, prévenir le client. */
export default function LiveTrack({ tour, api }: { tour: PlanTour; api: Api }) {
  const [data, setData] = useState<{ events: TourEvent[]; clients: PlanClient[]; driverLink: string | null } | null>(null);
  const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [now, setNow] = useState(() => Date.now()); const [showPlan, setShowPlan] = useState(false);
  const apiRef = useRef(api); useEffect(() => { apiRef.current = api; });
  const load = useCallback(async () => { try { const j = await apiRef.current({ action: "live", id: tour.id }); setData({ events: j.events || [], clients: j.clients || [], driverLink: j.driverLink || null }); setErr(""); setNow(Date.now()); } catch (e) { setErr((e as Error).message); } }, [tour.id]);
  useEffect(() => { const first = setTimeout(load, 0); const it = setInterval(() => { if (document.visibilityState === "visible") load(); }, 60000); return () => { clearTimeout(first); clearInterval(it); }; }, [load]);

  const stops = useMemo(() => tour.stops || [], [tour.stops]);
  const plan = useMemo(() => plannedSchedule(stops, tour.date, tour.departTime), [stops, tour.date, tour.departTime]);
  const prog = useMemo(() => data ? tourProgress(stops, plan, data.events, data.clients.filter(c => c.status === "livre").map(c => c.id), now) : null, [data, stops, plan, now]);
  if (err) return <p className={s.err}>Suivi indisponible : {err}</p>;
  if (!data || !prog) return <p className={s.muted}>Chargement du suivi…</p>;

  const clientStops = stops.map((st, i) => ({ st, i })).filter(x => x.st.kind === "client");
  const done = clientStops.filter(x => prog.delivered.has(x.st.id)), left = clientStops.filter(x => !prog.delivered.has(x.st.id));
  const next = prog.nextIndex != null ? stops[prog.nextIndex] : null;
  const state = prog.finished ? "🏁 Tournée terminée" : !prog.started ? "⏳ Pas encore parti" : prog.paused ? "☕ En pause" : prog.phase === "arrived" ? `📍 Chez ${stops[prog.pos]?.name}` : next ? `🚚 En route vers ${next.kind === "client" ? next.name : next.name}` : "🚚 En route";
  const clientOf = (id: string) => data.clients.find(c => c.id === id);
  const deliveredAt = (id: string) => data.events.find(e => e.kind === "livre" && e.client_id === id)?.created_at || clientOf(id)?.delivered_at || null;
  const notified = (id: string) => [...data.events].reverse().find(e => e.kind === "prevenir" && e.client_id === id);
  const notify = (cid: string, eta: string) => { apiRef.current({ action: "log_notify", id: tour.id, client_id: cid, note: `arrivée annoncée ${eta}` }).then(() => load()).catch(() => null); };
  const link = data.driverLink ? `${typeof window !== "undefined" ? window.location.origin : ""}/chauffeur?k=${data.driverLink}` : "";
  const journal = data.events.filter(e => e.kind !== "position").slice().reverse();

  return <section className={s.dash}>
    <div className={s.rowHead}><h3>📡 Suivi en direct</h3><button className={s.small} onClick={load}>↻ Actualiser</button></div>
    <div className={s.kpis}>
      <div><small>Situation</small><b style={{ fontSize: 15 }}>{state}</b></div>
      <div><small>Livrées</small><b>{done.length} / {clientStops.length}</b></div>
      <div><small>Par rapport au plan</small><b style={{ fontSize: 16 }} className={prog.delayMin != null && prog.delayMin > 10 ? s.late : s.ontime}>{prog.delayMin == null ? "—" : !prog.started ? `départ en retard de ${delayTxt(prog.delayMin).replace(" de retard", "")}` : delayTxt(prog.delayMin)}</b></div>
      <div><small>Dernière nouvelle</small><b style={{ fontSize: 14 }}>{prog.lastEvent ? `${EVENT_LABEL[prog.lastEvent.kind] || prog.lastEvent.kind} · ${fmt(prog.lastEvent.created_at)}` : "aucune"}</b></div>
    </div>
    {prog.lastPos ? <p className={s.muted}>📍 Dernière position : {fmt(prog.lastPos.at)}{prog.lastPos.accuracy ? ` (± ${Math.round(prog.lastPos.accuracy)} m)` : ""}</p> : <p className={s.muted}>📍 Pas encore de position (le livreur peut refuser la localisation : le suivi se fait alors par ses boutons).</p>}
    <TourMap stops={stops} path={tour.path} live={prog.lastPos} done={[...prog.delivered]} />

    {left.length ? <><h3>Restent à livrer ({left.length})</h3>
      <ul className={s.remain}>{left.map(({ st, i }) => {
        const eta = prog.etaOf(i); const planned = plan.etas.find(e => e.stopIndex === i)?.arrive; const c = clientOf(st.id); const phrase = eta != null ? etaPhrase(tour.date, eta, now) : "";
        const n = notified(st.id);
        const text = `Bonjour ${c?.prenom || ""}, votre livreur NeoDrive arrive ${phrase}. À tout à l’heure ! L’équipe NeoDrive`.replace("Bonjour ,", "Bonjour,");
        return <li key={st.id}><div><b>{st.name}</b><small>{stopTown(st)} · prévu {planned != null ? `J${dayOf(planned) + 1} ${hhmm(planned)}` : "—"}{eta != null && prog.started ? ` · estimé maintenant J${dayOf(eta) + 1} ${hhmm(eta)}` : ""}</small>{n ? <small>📲 Prévenu {fmt(n.created_at)}{n.note ? ` (${n.note})` : ""}</small> : null}</div>
          {c?.telephone && eta != null ? <a href={`https://wa.me/${waNumber(c.telephone)}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" onClick={() => notify(st.id, hhmm(round5(eta)))}>📲 Prévenir le client</a> : <small>pas de téléphone</small>}
        </li>;
      })}</ul>
      <p className={s.muted}>« Prévenir le client » ouvre WhatsApp avec le message prêt (heure estimée) : c’est vous qui l’envoyez. L’action est notée dans le journal.</p></> : null}
    {done.length ? <><h3>Livrées ({done.length})</h3><ul className={s.mini}>{done.map(({ st }) => { const at = deliveredAt(st.id); const c = clientOf(st.id); return <li key={st.id}><span>✅ {st.name} · {stopTown(st)}</span><small>{at ? fmt(at) : ""}{c?.received_at ? " · ✍️ signé" : ""}</small></li>; })}</ul></> : null}

    <button className={s.ghost} onClick={() => setShowPlan(v => !v)}>{showPlan ? "Masquer" : "🗓️ Voir"} le planning recalculé</button>
    {showPlan ? (prog.live ? <ScheduleView sched={prog.live} nowAbs={absFromDate(tour.date, now)} /> : <p className={s.muted}>Le planning recalculé apparaît dès le premier bouton du livreur (« Je pars »).</p>) : null}

    <h3>Journal</h3>
    {journal.length ? <ul className={s.log}>{journal.map((e, k) => <li key={e.id || k}><time>{fmt(e.created_at)}</time><span>{EVENT_LABEL[e.kind] || e.kind}{e.stop_index != null && stops[e.stop_index] ? ` · ${stops[e.stop_index].name}` : ""}{e.note ? ` — « ${e.note} »` : ""}{e.lat != null ? " 📍" : ""}{e.author ? <small className={s.muted}> · {e.author}</small> : null}</span></li>)}</ul> : <p className={s.muted}>Aucun événement pour l’instant.</p>}
    {link ? <div className={s.btns}><button className={s.ghost} onClick={() => navigator.clipboard?.writeText(link).then(() => setMsg("✅ Lien chauffeur copié : envoyez-le au livreur."))}>🔗 Copier le lien du livreur</button>{msg ? <p className={s.ok}>{msg}</p> : null}</div> : null}
  </section>;
}
