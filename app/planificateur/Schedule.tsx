"use client";
import s from "./planif.module.css";
import type { Stop } from "../../lib/planif";
import { SCHEDULE_RULES, dayLabel, dayOf, durTxt, hhmm, scheduleIcs, type Schedule, type SchedItem } from "../../lib/schedule";

const ICON: Record<SchedItem["kind"], string> = { load: "📦", drive: "🚚", pause: "☕", lunch: "🍽️", handover: "🚗", wait: "⏳", night: "🌙", end: "🏁" };
const CLS: Partial<Record<SchedItem["kind"], string>> = { pause: s.tlPause, lunch: s.tlPause, night: s.tlNight, handover: s.tlTask, load: s.tlTask, wait: s.tlWait, end: s.tlTask };

/** Télécharge le planning au format agenda (.ics) : iPhone, Android, Outlook. */
export function downloadIcs(sched: Schedule, stops: Stop[], name: string, id: string) {
  const blob = new Blob([scheduleIcs(sched, stops, name, id)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "tournee"}.ics`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** Résumé : jours, conduite, travail, pauses, nuits. */
export function ScheduleKpis({ sched }: { sched: Schedule }) {
  return <div className={s.kpis}>
    <div><small>Jours</small><b>{sched.days}</b></div>
    <div><small>Conduite</small><b>{durTxt(sched.driveMin)}</b></div>
    <div><small>Pauses</small><b>{sched.pauses}</b></div>
    <div><small>Retour prévu</small><b style={{ fontSize: 16 }}>J{dayOf(sched.endAbs) + 1} · {hhmm(sched.endAbs)}</b></div>
  </div>;
}

/** Calendrier jour par jour : heure, étape, pauses recommandées en jaune, nuits en violet. */
export function ScheduleView({ sched, nowAbs, onlyDay, doneStops }: { sched: Schedule; nowAbs?: number; onlyDay?: number; doneStops?: Set<number> }) {
  const days = new Map<number, SchedItem[]>();
  for (const it of sched.items) { const d = dayOf(it.start); if (onlyDay != null && d !== onlyDay && !(it.kind === "night" && dayOf(it.end) === onlyDay)) continue; if (!days.has(d)) days.set(d, []); days.get(d)!.push(it); }
  if (!days.size) return <p className={s.muted}>Rien de prévu ce jour-là.</p>;
  return <div className={s.days}>{[...days.entries()].map(([d, list]) => {
    const drive = list.filter(x => x.kind === "drive").reduce((a, x) => a + x.end - x.start, 0);
    const deliveries = list.filter(x => x.kind === "handover").length;
    return <section key={d} className={s.day}>
      <header className={s.dayHead}><b>Jour {d + 1} · {dayLabel(sched.date, d)}</b><small>{deliveries ? `${deliveries} livraison${deliveries > 1 ? "s" : ""} · ` : ""}{durTxt(drive)} de route</small></header>
      <ol className={s.tl}>{list.map((it, k) => {
        const now = nowAbs != null && nowAbs >= it.start && nowAbs < it.end;
        const done = doneStops && it.stopIndex != null && doneStops.has(it.stopIndex) && (it.kind === "handover" || it.kind === "load");
        return <li key={k} className={`${CLS[it.kind] || ""} ${now ? s.tlNow : ""} ${done ? s.tlDone : ""}`}>
          <time>{hhmm(it.start)}{it.kind !== "end" && it.kind !== "night" ? <small>{hhmm(it.end)}</small> : null}</time>
          <span className={s.tlIcon} aria-hidden>{ICON[it.kind]}</span>
          <div><b>{it.label}{done ? " ✓" : ""}</b>{it.detail ? <small>{it.detail}</small> : null}{it.kind === "night" ? <small>Reprise jour {dayOf(it.end) + 1} à {hhmm(it.end)}</small> : null}{now ? <small className={s.okTxt}>◀ maintenant</small> : null}</div>
        </li>;
      })}</ol>
    </section>;
  })}</div>;
}

/** Rappel des règles utilisées (texte simple). */
export function ScheduleRulesNote() {
  const r = SCHEDULE_RULES;
  return <p className={s.muted}>Règles : chargement {r.loadMin} min au dépôt · remise {r.handoverMin} min par client · pause {r.shortBreakMin} min après {durTxt(r.shortBreakAfterMin)} de route · déjeuner {r.lunchMin} min entre {hhmm(r.lunchFrom)} et {hhmm(r.lunchTo)} · {durTxt(r.maxWorkMin)} de travail max par jour puis nuit · livraisons entre {hhmm(r.customerOpen)} et {hhmm(r.customerClose)}.</p>;
}
