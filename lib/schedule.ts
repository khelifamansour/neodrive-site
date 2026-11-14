/**
 * Planning horaire d'une tournée NeoDrive (calendrier du livreur).
 * À partir de l'heure de départ : trajets (legH OSRM ou estimation), chargement au dépôt,
 * remise des voitures chez les clients, pauses recommandées, déjeuner et nuits.
 * Toutes les heures sont en heure de Paris, en minutes depuis 00:00 du jour de départ (« abs »).
 * Fonctions pures : utilisables côté navigateur (chauffeur, planificateur) et serveur.
 */
import { roadKm, type Stop } from "./planif";

/** Règles du planning : à ajuster ici. Durées en minutes, heures en minutes depuis minuit. */
export const SCHEDULE_RULES = {
  loadMin: 20,               // chargement d'une remorque au dépôt
  handoverMin: 40,           // remise chez le client (explication de la voiture) : 30 à 45 min
  shortBreakAfterMin: 120,   // pause conseillée après 2 h de conduite continue
  shortBreakMin: 20,         // durée de la pause (15 à 20 min)
  lunchFrom: 12 * 60,        // fenêtre du déjeuner
  lunchTo: 13 * 60 + 30,
  lunchMin: 45,
  maxWorkMin: 9.5 * 60,      // travail max par jour (conduite + chargements + remises), hors pauses
  dayStartMin: 8 * 60,       // reprise le lendemain d'une nuit
  customerOpen: 8 * 60,      // livraisons chez les clients seulement de jour
  customerClose: 19 * 60,    // la remise doit être finie avant cette heure
  depotOpen: 6 * 60,         // dépôts NeoDrive : chargement possible tôt
  depotClose: 19 * 60,
  kmhFallback: 72,           // vitesse moyenne si pas de calcul routier (remorque)
  fallbackFactor: 1.2,       // majoration (remorque) appliquée à l'estimation
  finishLegMin: 60,          // s'il reste moins d'1 h de route, on finit l'étape au lieu de dormir en route
} as const;
export type ScheduleRules = { -readonly [K in keyof typeof SCHEDULE_RULES]: number };

export type SchedKind = "load" | "drive" | "pause" | "lunch" | "handover" | "wait" | "night" | "end";
export type SchedItem = { kind: SchedKind; start: number; end: number; label: string; detail?: string; stopIndex?: number; clientId?: string; km?: number; recommended?: boolean };
export type StopEta = { stopIndex: number; id: string; kind: Stop["kind"]; arrive: number; leave: number };
export type Schedule = { date: string; startAbs: number; items: SchedItem[]; etas: StopEta[]; days: number; endAbs: number; driveMin: number; workMin: number; pauses: number; nights: number };

export type ScheduleStart = {
  date: string;                 // AAAA-MM-JJ, jour de départ
  startAbs: number;             // minutes depuis minuit du jour de départ
  fromIndex?: number;           // recalcul : arrêt où se trouve le livreur
  phase?: "start" | "arrived" | "done"; // start : tâche de l'arrêt à faire ; arrived : arrivé, tâche en cours ; done : tâche faite
  workTodayMin?: number;        // travail déjà fait aujourd'hui (recalcul)
  lunchDone?: boolean;
  skip?: Set<string>;           // clients déjà livrés (sautés)
};

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const hhmm = (abs: number) => { const m = ((Math.round(abs) % 1440) + 1440) % 1440; return `${pad2(Math.floor(m / 60))}h${pad2(m % 60)}`; };
export const dayOf = (abs: number) => Math.floor(abs / 1440);
export const durTxt = (min: number) => { const m = Math.round(min); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? " " + pad2(m % 60) : ""}`; };
export const parseHm = (s: string | undefined, def = 8 * 60) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ""); return m ? Math.min(23, +m[1]) * 60 + Math.min(59, +m[2]) : def; };
const dateUtc = (date: string) => Date.parse(`${/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10)}T00:00:00Z`);
/** Date (AAAA-MM-JJ) du n-ième jour de la tournée. */
export const dayDate = (date: string, day: number) => new Date(dateUtc(date) + day * 86400000).toISOString().slice(0, 10);
export const dayLabel = (date: string, day: number) => new Date(dateUtc(date) + day * 86400000 + 12 * 3600000).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** Heure de Paris d'un instant, en minutes depuis minuit du jour de départ. */
export function absFromDate(date: string, at: Date | string | number) {
  const d = new Date(at);
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).map(x => [x.type, x.value]));
  const days = Math.round((Date.UTC(+p.year, +p.month - 1, +p.day) - dateUtc(date)) / 86400000);
  return days * 1440 + (+p.hour % 24) * 60 + +p.minute;
}

/** Ville d'un arrêt (pour proposer la ville de la nuit). */
export const stopTown = (s: Stop) => s.kind === "depot" ? s.name.split(" (")[0] : (/\d{5}\s+(.+)$/.exec(s.label || "")?.[1] || s.label || s.name);

/** Durée de conduite (min) de l'arrêt `from` jusqu'à l'arrêt `to`. */
export function legMinutes(stops: Stop[], from: number, to: number, r: ScheduleRules = SCHEDULE_RULES) {
  if (to === from + 1 && stops[to].legH != null) return Math.max(1, Math.round((stops[to].legH as number) * 60));
  return Math.max(1, Math.round(roadKm(stops[from], stops[to]) / r.kmhFallback * 60 * r.fallbackFactor));
}
const legKm = (stops: Stop[], from: number, to: number) => to === from + 1 && stops[to].legKm != null ? stops[to].legKm as number : Math.round(roadKm(stops[from], stops[to]));

/** Calcule le planning jour par jour (ou le recalcule depuis la position réelle du livreur). */
export function buildSchedule(stops: Stop[], start: ScheduleStart, rules: Partial<ScheduleRules> = {}): Schedule {
  const r: ScheduleRules = { ...SCHEDULE_RULES, ...rules };
  const items: SchedItem[] = []; const etas: StopEta[] = [];
  const loc = (t: number) => ((t % 1440) + 1440) % 1440;
  let t = start.startAbs, work = start.workTodayMin || 0, cont = 0, driveMin = 0, workMin = 0, pauses = 0, nights = 0;
  let lunchDone = start.lunchDone ?? loc(t) > r.lunchTo;
  const push = (it: SchedItem) => { if (it.end > it.start || it.kind === "night" || it.kind === "end") items.push(it); };
  const newDay = (town: string, why: string) => {
    const next = (dayOf(t) + 1) * 1440 + r.dayStartMin;
    push({ kind: "night", start: t, end: next, label: `Nuit à ${town}`, detail: why, recommended: true });
    t = next; work = 0; cont = 0; lunchDone = false; nights++;
  };
  const lunchNow = () => {
    push({ kind: "lunch", start: t, end: t + r.lunchMin, label: "Pause déjeuner recommandée", detail: `${r.lunchMin} min`, recommended: true });
    t += r.lunchMin; cont = 0; lunchDone = true; pauses++;
  };
  const maybeLunch = () => { if (!lunchDone && loc(t) >= r.lunchFrom && loc(t) <= r.lunchTo + 60) lunchNow(); else if (!lunchDone && loc(t) > r.lunchTo + 60) lunchDone = true; };
  const task = (kind: "load" | "handover", min: number, label: string, i: number, detail?: string) => {
    push({ kind, start: t, end: t + min, label, detail, stopIndex: i, clientId: stops[i].kind === "client" ? stops[i].id : undefined });
    t += min; work += min; workMin += min; cont = 0;
  };
  /** Fenêtre horaire de l'arrêt i : attente le matin, sinon nuit sur place et passage le lendemain. */
  const windowFor = (i: number, min: number) => {
    const s = stops[i]; const open = s.kind === "client" ? r.customerOpen : r.depotOpen, close = s.kind === "client" ? r.customerClose : r.depotClose;
    if (loc(t) + min > close) newDay(stopTown(s), s.kind === "client" ? `Arrivée trop tard pour livrer : livraison demain matin à partir de ${hhmm(r.customerOpen)}` : "Journée de travail complète");
    if (loc(t) < open) { const until = dayOf(t) * 1440 + open; push({ kind: "wait", start: t, end: until, label: s.kind === "client" ? "Attente : livraison possible à partir de " + hhmm(open) : "Attente ouverture du dépôt", stopIndex: i }); t = until; }
  };
  const doStopTask = (i: number) => {
    const s = stops[i];
    if (s.kind === "client") { windowFor(i, r.handoverMin); maybeLunch(); task("handover", r.handoverMin, `Livraison ${s.name}`, i, "Remise de la voiture et explication · photo plaque VIN · « Livré »"); }
    else if (s.loaded && i < stops.length - 1) { windowFor(i, r.loadMin); task("load", r.loadMin, `${s.action} · ${s.name}`, i, "Photo de la plaque VIN de chaque voiture"); }
  };

  const from = start.fromIndex || 0; const phase = start.phase || "start";
  const skip = start.skip || new Set<string>();
  const arrive0 = t;
  if (phase === "start") doStopTask(from);
  else if (phase === "arrived" && stops[from]?.kind === "client") { task("handover", r.handoverMin, `Livraison ${stops[from].name}`, from, "en cours"); }
  etas.push({ stopIndex: from, id: stops[from]?.id || "", kind: stops[from]?.kind || "depot", arrive: arrive0, leave: t });

  let prev = from;
  for (let i = from + 1; i < stops.length; i++) {
    const s = stops[i];
    if (s.kind === "client" && skip.has(s.id)) continue;
    if (s.kind === "depot" && !s.loaded && i < stops.length - 1) continue;
    let remaining = legMinutes(stops, prev, i, r); const km = legKm(stops, prev, i); const total = remaining;
    // Journée presque finie : nuit à l'arrêt actuel plutôt qu'au bord de la route
    const nextTask = s.kind === "client" ? r.handoverMin : 0;
    const overflow = work + remaining + nextTask - r.maxWorkMin;
    if (work > 60 && overflow > 30 && r.maxWorkMin - work < remaining * 0.5) newDay(stopTown(stops[prev]), "Journée de travail complète : dormir ici et repartir frais");
    // Dépassement de 30 min au plus : on finit l'étape plutôt que de dormir à 30 min du but.
    const limit = work + remaining + nextTask - r.maxWorkMin <= 30 ? r.maxWorkMin + 30 : r.maxWorkMin;
    let driven = 0;
    while (remaining > 0) {
      maybeLunch();
      const capped = remaining > r.finishLegMin;
      if (capped && work >= limit) newDay(`l'étape sur la route (≈ ${Math.round(km * driven / total)} km après ${stopTown(stops[prev])})`, "Journée de travail complète : hôtel sur le trajet vers " + stopTown(s));
      let chunk = Math.min(remaining, r.shortBreakAfterMin - cont, capped ? limit - work : remaining);
      if (!lunchDone && loc(t) < r.lunchFrom) chunk = Math.min(chunk, r.lunchFrom - loc(t));
      chunk = Math.max(1, Math.round(chunk));
      push({ kind: "drive", start: t, end: t + chunk, label: `Route vers ${s.kind === "client" ? s.name : s.name}`, detail: `${stopTown(s)}${driven === 0 ? ` · ${km} km · ${durTxt(total)} au total` : " (suite)"}`, stopIndex: i, km: driven === 0 ? km : undefined });
      t += chunk; remaining -= chunk; driven += chunk; cont += chunk; work += chunk; workMin += chunk; driveMin += chunk;
      if (remaining > r.shortBreakMin && cont >= r.shortBreakAfterMin && (work < limit || !capped)) {
        if (!lunchDone && loc(t) >= r.lunchFrom) lunchNow();
        else { push({ kind: "pause", start: t, end: t + r.shortBreakMin, label: "Pause recommandée", detail: `après ${durTxt(cont)} de conduite · aire de repos`, recommended: true }); t += r.shortBreakMin; cont = 0; pauses++; }
      }
    }
    const arrive = t;
    if (i === stops.length - 1) { push({ kind: "end", start: t, end: t, label: `Arrivée ${s.name}`, detail: "Fin de la tournée", stopIndex: i }); etas.push({ stopIndex: i, id: s.id, kind: s.kind, arrive, leave: t }); prev = i; break; }
    doStopTask(i);
    let taskStart = arrive;
    for (let k = items.length - 1; k >= 0; k--) if (items[k].stopIndex === i && (items[k].kind === "handover" || items[k].kind === "load")) { taskStart = items[k].start; break; }
    etas.push({ stopIndex: i, id: s.id, kind: s.kind, arrive: Math.max(arrive, taskStart), leave: t });
    prev = i;
  }
  return { date: start.date, startAbs: start.startAbs, items, etas, days: dayOf(t) - dayOf(start.startAbs) + 1, endAbs: t, driveMin, workMin, pauses, nights };
}

/** Planning prévu d'une tournée (heure de départ par défaut : 8h00). */
export const plannedSchedule = (stops: Stop[], date: string, departTime?: string) => buildSchedule(stops, { date, startAbs: parseHm(departTime, 8 * 60) });

// ───────── Suivi en direct ─────────
export type TourEvent = { id?: number; tour_id: string; created_at: string; kind: string; client_id?: string | null; stop_index?: number | null; lat?: number | null; lng?: number | null; accuracy?: number | null; note?: string | null; photo_path?: string | null; author?: string | null };
export const EVENT_LABEL: Record<string, string> = { depart: "🚚 Départ", pause: "☕ Pause", reprise: "▶️ Reprise", arrive: "📍 Arrivé", livre: "✅ Livré", probleme: "⚠️ Problème", position: "📡 Position", prevenir: "📲 Client prévenu" };
const MILESTONES = new Set(["depart", "arrive", "livre"]);

export type Progress = {
  started: boolean; finished: boolean; paused: boolean;
  pos: number; phase: "start" | "arrived" | "done"; nextIndex: number | null;
  delivered: Set<string>; lastEvent: TourEvent | null; lastPos: { lat: number; lng: number; at: string; accuracy?: number | null } | null;
  live: Schedule | null; delayMin: number | null; etaOf: (stopIndex: number) => number | null;
};

/** Où en est le livreur, et nouvelles heures d'arrivée recalculées depuis son dernier événement. */
export function tourProgress(stops: Stop[], plan: Schedule, events: TourEvent[], deliveredIds: string[] = [], now = Date.now()): Progress {
  const ev = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const delivered = new Set<string>([...deliveredIds, ...ev.filter(e => e.kind === "livre" && e.client_id).map(e => String(e.client_id))]);
  const started = ev.some(e => e.kind === "depart" || e.kind === "arrive" || e.kind === "livre");
  let pos = 0, phase: Progress["phase"] = "start", milestone: TourEvent | null = null;
  for (const e of ev) {
    if (!MILESTONES.has(e.kind) || e.stop_index == null || !stops[e.stop_index]) continue;
    milestone = e; pos = e.stop_index;
    // arrivé chez un client : remise en cours ; arrivé au dépôt : chargement à faire ; départ / livré : étape faite
    phase = e.kind !== "arrive" ? "done" : stops[pos].kind === "depot" ? "start" : delivered.has(stops[pos].id) ? "done" : "arrived";
  }
  const finished = !!milestone && pos === stops.length - 1 && milestone.kind === "arrive";
  const lastP = [...ev].reverse().find(e => e.lat != null && e.lng != null);
  const lastPos = lastP ? { lat: Number(lastP.lat), lng: Number(lastP.lng), at: lastP.created_at, accuracy: lastP.accuracy } : null;
  const pz = [...ev].reverse().find(e => e.kind === "pause" || e.kind === "reprise");
  const paused = pz?.kind === "pause";
  let live: Schedule | null = null, delayMin: number | null = null; let nextIndex: number | null = null;
  // Prochaine étape : toujours après l'arrêt où se trouve le livreur (chez un client : l'étape suivante).
  for (let i = pos + 1; i < stops.length; i++) { const s = stops[i]; if (s.kind === "client" && delivered.has(s.id)) continue; if (s.kind === "depot" && !s.loaded && i < stops.length - 1) continue; nextIndex = i; break; }
  if (finished) nextIndex = null;
  if (started && milestone && !finished) {
    const mAbs = absFromDate(plan.date, milestone.created_at);
    const today = ev.filter(e => dayOf(absFromDate(plan.date, e.created_at)) === dayOf(mAbs) && e.kind !== "position");
    const first = today.length ? absFromDate(plan.date, today[0].created_at) : mAbs;
    const pauseToday = today.filter(e => e.kind === "pause");
    const lunchDone = (mAbs % 1440) > SCHEDULE_RULES.lunchTo || pauseToday.some(e => { const m = absFromDate(plan.date, e.created_at) % 1440; return m >= 11 * 60 + 30 && m <= 14 * 60; });
    live = buildSchedule(stops, { date: plan.date, startAbs: mAbs, fromIndex: pos, phase, workTodayMin: Math.max(0, (mAbs - first) * 0.85), lunchDone, skip: delivered });
    // En route et déjà en retard sur la nouvelle estimation : tout décale d'autant.
    const nowAbs = absFromDate(plan.date, now);
    const nx = live.etas.find(e => e.stopIndex !== pos);
    if (nx && nowAbs > nx.arrive && phase === "done") {
      const d = nowAbs - nx.arrive + (paused ? 10 : 0);
      live = { ...live, items: live.items.map(x => ({ ...x, start: x.start + d, end: x.end + d })), etas: live.etas.map(e => e.stopIndex === pos ? e : { ...e, arrive: e.arrive + d, leave: e.leave + d }), endAbs: live.endAbs + d };
    }
    const ref = nextIndex != null ? plan.etas.find(e => e.stopIndex === nextIndex) : null;
    const got = nextIndex != null ? live.etas.find(e => e.stopIndex === nextIndex) : null;
    if (ref && got) delayMin = Math.round(got.arrive - ref.arrive);
  } else if (!started) {
    const nowAbs = absFromDate(plan.date, now);
    if (nowAbs > plan.startAbs + 15) delayMin = Math.round(nowAbs - plan.startAbs);
  }
  const etaOf = (i: number) => (live?.etas.find(e => e.stopIndex === i) || (!started ? plan.etas.find(e => e.stopIndex === i) : null))?.arrive ?? null;
  return { started, finished, paused, pos, phase, nextIndex, delivered, lastEvent: ev[ev.length - 1] || null, lastPos, live, delayMin, etaOf };
}

/** Texte du retard (« 25 min de retard », « à l'heure », « 10 min d'avance »). */
export const delayTxt = (d: number | null) => d == null ? "" : Math.abs(d) <= 10 ? "à l'heure" : d > 0 ? `${durTxt(d)} de retard` : `${durTxt(-d)} d'avance`;

// ───────── Export agenda (.ics) ─────────
const icsEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsTime = (date: string, abs: number) => { const d = dayDate(date, dayOf(abs)).replace(/-/g, ""); const m = ((abs % 1440) + 1440) % 1440; return `${d}T${pad2(Math.floor(m / 60))}${pad2(m % 60)}00`; };
const fold = (l: string) => { const out: string[] = []; let s = l; while (s.length > 74) { out.push(s.slice(0, 74)); s = " " + s.slice(74); } out.push(s); return out.join("\r\n"); };

/** Fichier agenda (iPhone, Android, Outlook) : chaque étape, pause et nuit de la tournée. */
export function scheduleIcs(sched: Schedule, stops: Stop[], tourName: string, uidBase: string) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NeoDrive//Tournee//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEsc(tourName)}`,
    "BEGIN:VTIMEZONE", "TZID:Europe/Paris", "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "END:VTIMEZONE"];
  sched.items.forEach((it, n) => {
    if (it.kind === "end") return;
    const s = it.stopIndex != null ? stops[it.stopIndex] : null;
    const title = it.kind === "drive" ? `🚚 ${it.label}` : it.kind === "handover" ? `🚗 ${it.label}` : it.kind === "load" ? `📦 ${it.label}` : it.kind === "night" ? `🌙 ${it.label}` : it.kind === "wait" ? `⏳ ${it.label}` : `☕ ${it.label}`;
    const desc = [it.detail, s?.kind === "client" && s.phone ? `Tél. ${s.phone}` : "", s && (it.kind === "handover" || it.kind === "load") ? `Waze : https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes` : ""].filter(Boolean).join("\n");
    lines.push("BEGIN:VEVENT", `UID:${uidBase}-${n}@neodrive`, `DTSTAMP:${stamp}`, `DTSTART;TZID=Europe/Paris:${icsTime(sched.date, it.start)}`, `DTEND;TZID=Europe/Paris:${icsTime(sched.date, Math.max(it.end, it.start + 5))}`, `SUMMARY:${icsEsc(title)}`);
    if (desc) lines.push(`DESCRIPTION:${icsEsc(desc)}`);
    if (s && (it.kind === "handover" || it.kind === "load")) lines.push(`LOCATION:${icsEsc(s.kind === "client" ? s.label : s.name)}`, `GEO:${s.lat};${s.lng}`);
    if (it.kind === "handover") lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Prochaine livraison", "TRIGGER:-PT30M", "END:VALARM");
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
