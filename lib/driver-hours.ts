/** Heures et frais du chauffeur indépendant : calcul à partir du journal de tournée (client et serveur). */
import type { PlanTour } from "./planif";
import { plannedSchedule, type TourEvent } from "./schedule";

export const DEFAULT_DRIVER_RATE = 25;
export const HOTEL_CAP = 70;
export const MEAL_CAP = 30;
export const EXPENSE_TYPES = [
  { id: "hotel", label: "🛏️ Hôtel", refund: true },
  { id: "repas", label: "🍽️ Repas", refund: true },
  { id: "carburant", label: "⛽ Carburant (carte NeoDrive)", refund: false },
  { id: "peage", label: "🛣️ Péage (carte NeoDrive)", refund: false },
  { id: "autre", label: "📎 Autre (à valider)", refund: false },
] as const;
export type ExpenseType = typeof EXPENSE_TYPES[number]["id"];
export const isExpenseType = (v: unknown): v is ExpenseType => EXPENSE_TYPES.some(x => x.id === v);
export const expenseLabel = (t: string) => EXPENSE_TYPES.find(x => x.id === t)?.label || t;

/** Jour (AAAA-MM-JJ) à l'heure de Paris. */
export const parisDay = (iso: string | number | Date) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
export const parisTime = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
export const hm = (min: number) => { const m = Math.round(Math.abs(min)); return `${min < 0 ? "−" : ""}${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`; };
export const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
export const dayTxt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

type Data = { type?: string; amount?: number; date?: string; minutes?: number };
const dataOf = (e: TourEvent) => ((e as TourEvent & { data?: Data | null }).data || {}) as Data;

export type Expense = { id?: number; at: string; date: string; type: string; amount: number; photo: string | null; note: string | null };
export type DayHours = {
  date: string; start: string | null; end: string | null;
  grossMin: number; pauseMin: number; correctionMin: number; workedMin: number;
  open: boolean; flags: string[]; corrections: { minutes: number; note: string }[];
  expenses: Expense[]; hotel: number; meals: number; hotelPaid: number; mealsPaid: number; info: number;
};
export type HoursSummary = { days: DayHours[]; workedMin: number; amount: number; refund: number; info: number; total: number; overCap: boolean; rate: number };

const WORK_KINDS = new Set(["debut_jour", "fin_jour", "pause", "reprise"]);

/** Heures comptées = du « Début de journée » à la « Fin de journée », moins les pauses, plus les corrections. */
export function computeHours(events: TourEvent[], rate = DEFAULT_DRIVER_RATE, now = Date.now()): HoursSummary {
  const ev = events.filter(e => e.kind !== "position").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const days = new Map<string, DayHours>();
  const day = (d: string) => { let x = days.get(d); if (!x) { x = { date: d, start: null, end: null, grossMin: 0, pauseMin: 0, correctionMin: 0, workedMin: 0, open: false, flags: [], corrections: [], expenses: [], hotel: 0, meals: 0, hotelPaid: 0, mealsPaid: 0, info: 0 }; days.set(d, x); } return x; };
  const byDay = new Map<string, TourEvent[]>();
  for (const e of ev) {
    const d = dataOf(e);
    if (e.kind === "correction") { const x = day(d.date || parisDay(e.created_at)); const m = Math.round(Number(d.minutes) || 0); x.correctionMin += m; x.corrections.push({ minutes: m, note: e.note || "" }); continue; }
    if (e.kind === "frais") { const x = day(d.date || parisDay(e.created_at)); x.expenses.push({ id: e.id, at: e.created_at, date: x.date, type: String(d.type || "autre"), amount: Math.max(0, Number(d.amount) || 0), photo: e.photo_path || null, note: e.note || null }); continue; }
    const k = parisDay(e.created_at); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k)!.push(e);
  }
  const today = parisDay(now);
  for (const [d, list] of byDay) {
    const x = day(d); const t = (e: TourEvent) => Date.parse(e.created_at);
    const work = list.filter(e => WORK_KINDS.has(e.kind));
    if (!work.length) { x.flags.push("Journée de tournée sans « Début de journée » : heures non comptées (ajoutez une correction)."); continue; }
    let working = false, paused = false, segStart = 0, pauseStart = 0, last = 0;
    const startNoted = list.some(e => e.kind === "debut_jour");
    if (!startNoted) { working = true; segStart = t(list[0]); x.start = list[0].created_at; x.flags.push("« Début de journée » non noté : compté depuis le premier bouton."); }
    for (const e of list) {
      const at = t(e); last = at;
      if (e.kind === "debut_jour") { if (!working) { working = true; paused = false; segStart = at; if (!x.start) x.start = e.created_at; } }
      else if (e.kind === "pause") { if (working && !paused) { paused = true; pauseStart = at; } }
      else if (e.kind === "reprise") { if (paused) { x.pauseMin += (at - pauseStart) / 60000; paused = false; } }
      else if (e.kind === "fin_jour") { if (working) { if (paused) { x.pauseMin += (at - pauseStart) / 60000; paused = false; } x.grossMin += (at - segStart) / 60000; working = false; x.end = e.created_at; } }
    }
    if (working) {
      const ongoing = d === today; const until = ongoing ? Math.max(last, now) : last;
      if (paused) x.pauseMin += (until - pauseStart) / 60000;
      x.grossMin += (until - segStart) / 60000;
      if (ongoing) x.open = true; else x.flags.push("« Fin de journée » oubliée : compté jusqu'au dernier bouton de la journée.");
    }
  }
  let workedMin = 0, refund = 0, info = 0, overCap = false;
  for (const x of days.values()) {
    x.workedMin = Math.max(0, x.grossMin - x.pauseMin + x.correctionMin); workedMin += x.workedMin;
    for (const p of x.expenses) { if (p.type === "hotel") x.hotel += p.amount; else if (p.type === "repas") x.meals += p.amount; else x.info += p.amount; }
    x.hotelPaid = Math.min(x.hotel, HOTEL_CAP); x.mealsPaid = Math.min(x.meals, MEAL_CAP);
    if (x.hotel > HOTEL_CAP) { x.flags.push(`Hôtel au-dessus du plafond (${eur(x.hotel)} pour ${eur(HOTEL_CAP)} remboursés).`); overCap = true; }
    if (x.meals > MEAL_CAP) { x.flags.push(`Repas au-dessus du plafond (${eur(x.meals)} pour ${eur(MEAL_CAP)} remboursés).`); overCap = true; }
    if (x.expenses.some(p => p.type === "hotel" || p.type === "repas") && x.expenses.some(p => (p.type === "hotel" || p.type === "repas") && !p.photo)) x.flags.push("Ticket sans photo.");
    refund += x.hotelPaid + x.mealsPaid; info += x.info;
  }
  const amount = Math.round(workedMin / 60 * rate * 100) / 100;
  return { days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)), workedMin, amount, refund, info, total: Math.round((amount + refund) * 100) / 100, overCap, rate };
}

/** Heures prévues : planning du planificateur, sinon km/75 + 45 min par livraison + 30 min par rechargement. */
export function estimateHours(t: Pick<PlanTour, "stops" | "date" | "departTime" | "hours" | "km">): number {
  const stops = t.stops || [];
  if (stops.length) {
    try { const p = plannedSchedule(stops, t.date, t.departTime); if (p.workMin > 0) return p.workMin / 60; } catch { /* repli */ }
  }
  if (t.hours) return t.hours;
  const clients = stops.filter(s => s.kind === "client").length, reloads = stops.filter((s, i) => s.kind === "depot" && i > 0 && s.loaded).length;
  return (t.km || 0) / 75 + clients * 0.75 + reloads * 0.5;
}

/** Récapitulatif texte, à copier pour faire la facture. */
export function recapText(tourName: string, driver: string, s: HoursSummary, estH?: number) {
  const L: string[] = [`Récapitulatif chauffeur · ${tourName}${driver ? " · " + driver : ""}`, ""];
  for (const d of s.days) {
    const parts = [`${dayTxt(d.date)} : ${hm(d.workedMin)}`];
    if (d.start) parts.push(`(${parisTime(d.start)} → ${d.end ? parisTime(d.end) : d.open ? "en cours" : "?"}, pauses ${hm(d.pauseMin)}${d.correctionMin ? `, correction ${d.correctionMin > 0 ? "+" : ""}${hm(d.correctionMin)}` : ""})`);
    if (d.hotelPaid) parts.push(`hôtel ${eur(d.hotelPaid)}`);
    if (d.mealsPaid) parts.push(`repas ${eur(d.mealsPaid)}`);
    L.push(parts.join(" "));
  }
  L.push("", `Total heures : ${hm(s.workedMin)}${estH ? ` (prévu ${hm(estH * 60)})` : ""}`, `Heures × ${eur(s.rate)} : ${eur(s.amount)}`, `Frais remboursés (hôtel ≤ ${HOTEL_CAP} €/nuit, repas ≤ ${MEAL_CAP} €/jour) : ${eur(s.refund)}`, `TOTAL À FACTURER : ${eur(s.total)} (TVA non applicable, art. 293 B du CGI)`);
  if (s.info) L.push(`Pour information, payé avec la carte NeoDrive (non refacturé) : ${eur(s.info)}`);
  return L.join("\n");
}
