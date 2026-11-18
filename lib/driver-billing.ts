/** Fin de tournée du livreur : journées, livraisons, dépenses carte, contrôle prévu / réel. Serveur uniquement. */
import { crmDatabase } from "./crm-agent";
import { listJson } from "./datastore";
import { PLAN_CLIENTS } from "./fleet";
import { computeHours, DEFAULT_DRIVER_RATE, estimateHours, HOTEL_CAP, MEAL_CAP, parisDay, parisTime, type HoursSummary } from "./driver-hours";
import { listEvents } from "./tour-live";
import { dayWorked, toMin, type Control, type InvDay, type InvDelivery } from "./driver-invoice";
import type { PlanClient, PlanTour } from "./planif";

type DB = ReturnType<typeof crmDatabase>;
export type Dlv = InvDelivery & { delivered: boolean };

/** Journées proposées depuis le journal (début, pauses, fin), dépenses du journal, livraisons. */
export async function tourBillingBase(db: DB, t: PlanTour) {
  const rate = t.driverRate || DEFAULT_DRIVER_RATE;
  const events = await listEvents(db, [t.id]);
  const sum = computeHours(events, rate);
  const hub = (t.stops || [])[0];
  const departDefault = hub && hub.kind !== "client" ? hub.name : "Muret";
  let days: InvDay[] = sum.days.filter(d => d.start || d.workedMin).map(d => ({ date: d.date, depart: departDefault, start: d.start ? parisTime(d.start) : "", end: d.end ? parisTime(d.end) : "", pause_min: Math.round(d.pauseMin), worked_min: Math.round(d.workedMin) }));
  if (!days.length && t.date) {
    const n = Math.max(1, Math.ceil(estimateHours(t) / 9));
    days = Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse(t.date + "T12:00:00Z") + i * 86400e3).toISOString().slice(0, 10), depart: i ? "" : departDefault, start: i ? "" : (t.departTime || ""), end: "", pause_min: 0, worked_min: 0 }));
  }
  const expenses = sum.days.flatMap(d => d.expenses.map(p => ({ date: d.date, type: p.type, amount: p.amount, photo: !!p.photo, paid: p.paid, created: parisDay(p.at) })));
  const deliveries = await tourDeliveries(db, t);
  return { rate, sum, days, expenses, deliveries, planned_h: Math.round(estimateHours(t) * 10) / 10, planned_km: t.km || 0, planned_stops: t.clientIds.length };
}

/** Livraisons de la tournée : client prévu → véhicule livré (VIN) et accusé de réception. */
export async function tourDeliveries(db: DB, t: PlanTour): Promise<Dlv[]> {
  const ids = t.clientIds || [];
  if (!ids.length) return [];
  const [clients, { data: veh }, { data: res }] = await Promise.all([
    listJson<PlanClient>(db, PLAN_CLIENTS),
    db.from("shipment_vehicles").select("vin,status,client_id,client_name,delivered_at").in("client_id", ids),
    db.from("reservations").select("plan_client_id,prenom,nom,vin,livre_at,accuse_token").in("plan_client_id", ids),
  ]);
  const byId = new Map(clients.map(c => [c.id, c]));
  return ids.map(id => {
    const c = byId.get(id); const v = (veh || []).find(x => x.client_id === id && x.status === "livrée") || (veh || []).find(x => x.client_id === id);
    const r = (res || []).find(x => x.plan_client_id === id);
    const delivered = v?.status === "livrée" || !!r?.livre_at || c?.status === "livre";
    return { client: c ? `${c.prenom || ""} ${c.nom || ""}`.trim() : r ? `${r.prenom || ""} ${r.nom || ""}`.trim() : v?.client_name || id, vin: r?.vin || v?.vin || "", date: v?.delivered_at || r?.livre_at || null, accuse: !!r?.accuse_token, delivered };
  });
}

/** Journées saisies par le livreur (lieu de départ, début, pauses, fin) → journées facturées. */
export function cleanDays(input: unknown) {
  const arr = Array.isArray(input) ? input.slice(0, 14) : [];
  const days: InvDay[] = []; const errors: string[] = [];
  for (const x of arr as Record<string, unknown>[]) {
    const date = String(x.date || ""); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const start = String(x.start || "").trim().replace("h", ":"), end = String(x.end || "").trim().replace("h", ":");
    const pause = Math.max(0, Math.min(600, Math.round(Number(x.pause_min) || 0)));
    if (toMin(start) == null || toMin(end) == null) { errors.push(`${date} : heure de départ et heure de fin obligatoires (ex. 08:00 et 18:30).`); continue; }
    const worked = dayWorked(start, end, pause);
    if (worked > 16 * 60) errors.push(`${date} : plus de 16 h de travail, vérifiez les heures.`);
    days.push({ date, depart: String(x.depart || "").replace(/[<>]/g, "").trim().slice(0, 60), start, end, pause_min: pause, worked_min: worked });
  }
  if (!days.length && !errors.length) errors.push("Ajoutez au moins une journée.");
  if (new Set(days.map(d => d.date)).size !== days.length) errors.push("Deux lignes pour le même jour : regroupez-les.");
  days.sort((a, z) => a.date.localeCompare(z.date));
  return { days, errors };
}

/** Facture = heures × taux, rien d'autre (les dépenses sont payées avec la carte société). */
export const invoiceTotal = (days: InvDay[], rate: number) => { const worked_min = days.reduce((a, d) => a + d.worked_min, 0); return { worked_min, total: Math.round(worked_min / 60 * rate * 100) / 100 }; };

export function control(base: { planned_h: number; planned_km: number; planned_stops: number; sum: HoursSummary }, days: InvDay[], worked_min: number, deliveries: Dlv[]): Control {
  const real_h = Math.round(worked_min / 6) / 10;
  const done = deliveries.filter(d => d.delivered);
  const withTickets = new Set(base.sum.days.filter(d => d.expenses.length).map(d => d.date));
  return {
    planned_h: base.planned_h, real_h, gap_h: Math.round((real_h - base.planned_h) * 10) / 10, planned_km: base.planned_km, planned_stops: base.planned_stops, delivered: done.length,
    missing: deliveries.filter(d => !d.delivered).map(d => d.client),
    no_vin: done.filter(d => !d.vin).map(d => d.client),
    no_receipt: done.filter(d => !d.accuse).map(d => d.client),
    card_total: base.sum.card, perso_total: base.sum.refund, tickets: base.sum.days.reduce((a, d) => a + d.expenses.length, 0),
    days_without_receipt: days.filter(d => d.worked_min > 0 && !withTickets.has(d.date)).map(d => d.date),
    cap_alerts: base.sum.days.flatMap(d => [d.hotel > HOTEL_CAP ? `${d.date} hôtel ${d.hotel} €` : "", d.meals > MEAL_CAP ? `${d.date} repas ${d.meals} €` : ""]).filter(Boolean),
    tickets_no_photo: base.sum.days.reduce((a, d) => a + d.expenses.filter(p => !p.photo).length, 0),
  };
}

/** Initiales pour le numéro de facture : « Serge Dupont » → SD. */
export const initials = (name: string) => (String(name || "").replace(/\(.*?\)/g, "").trim().split(/\s+/).map(w => w[0] || "").join("").toUpperCase().replace(/[^A-Z]/g, "") || "LIV").slice(0, 3);
export const today = () => parisDay(Date.now());
