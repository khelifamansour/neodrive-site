/**
 * Missions transporteur vues depuis l'application NeoDrive (/app/transporteur). Serveur uniquement.
 * Reprend les tournées « transporteur » du planificateur. AUCUN montant ni coût n'est jamais renvoyé :
 * seuls la date, le point de chargement, les clients (nom, ville, créneau, étape) et le lien chauffeur sortent d'ici.
 * Fondateur : toutes les missions. Transporteur : celles de sa société. Chauffeur : celles qui lui sont confiées.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listJson, readJson, writeJson } from "./datastore";
import { PLAN_TOURS } from "./fleet";
import type { Carrier, PlanTour } from "./planif";
import { driverKey } from "./driver-link";
import { listEvents } from "./tour-live";
import { normalizePhone } from "./crm-agent";
import { AppError, type AppUser } from "./app-auth";

/** Transporteur d'une mission, avec le chauffeur choisi dans l'application. */
type AppCarrier = Carrier & { driverUserId?: number };
export type MissionStage = "a_venir" | "en_cours" | "terminee";
export type AppMission = {
  id: string; date: string; departTime: string; carrier: string; driverName: string | null; driverUserId: number | null;
  hub: { name: string; address: string }; stage: MissionStage; link: string | null;
  clients: { id: string; name: string; city: string; slot: string; status: string }[];
  done: number; total: number;
};

/** « Transports Rabouin » ≈ « transports rabouin » ≈ « Rabouin ». */
const norm = (s: unknown) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\b(transports?|sarl|sas|eurl|sa)\b/g, "").replace(/[^a-z0-9]/g, "");
export const sameCompany = (a: unknown, b: unknown) => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
const parisToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

/** La mission est-elle visible par cet utilisateur ? */
export function canSee(u: AppUser, t: PlanTour) {
  if (!t.transporteur) return false;
  if (u.role === "fondateur" || u.role === "equipe") return true;
  const c = (t.carrier || { name: t.driver }) as AppCarrier;
  if (u.role === "transporteur") return sameCompany(c.name, u.company);
  if (u.role === "chauffeur") {
    if (!sameCompany(c.name, u.company)) return false;
    if (c.driverUserId) return c.driverUserId === u.id;
    const p = normalizePhone(c.driverPhone);
    return (!!p && p === normalizePhone(u.phone)) || (!!c.driverName && c.driverName.trim().toLowerCase() === u.name.trim().toLowerCase());
  }
  return false;
}

export async function missionsFor(db: SupabaseClient, u: AppUser): Promise<AppMission[]> {
  const tours = (await listJson<PlanTour>(db, PLAN_TOURS)).filter(t => canSee(u, t)).sort((a, z) => z.date.localeCompare(a.date));
  if (!tours.length) return [];
  const events = await listEvents(db, tours.map(t => t.id));
  const today = parisToday();
  return tours.map(t => {
    const c = (t.carrier || { name: t.driver }) as AppCarrier;
    const hub = (t.stops || []).find(s => s.kind === "depot");
    const ev = events.filter(e => e.tour_id === t.id);
    const clients = (t.stops || []).filter(s => s.kind === "client").map(s => {
      const has = (k: string) => ev.some(e => e.client_id === s.id && e.kind === k);
      const status = has("livre") ? "livrée" : has("refus") ? "refus" : has("photo_client") ? "remise en cours" : has("arrive") ? "arrivé" : has("charge") ? "chargée" : "à charger";
      const city = s.address ? (s.address.split(",").pop() || "").replace(/\d{5}/, "").trim() : "";
      return { id: s.id, name: s.name, city, slot: s.slot || "", status };
    });
    const done = clients.filter(x => x.status === "livrée" || x.status === "refus").length;
    const started = ev.some(e => e.kind !== "position");
    const stage: MissionStage = t.status === "termine" || (clients.length > 0 && done === clients.length) ? "terminee" : started || t.date <= today ? "en_cours" : "a_venir";
    const k = driverKey(t.id);
    return {
      id: t.id, date: t.date, departTime: t.departTime || "08:00", carrier: c.name, driverName: c.driverName || null, driverUserId: c.driverUserId || null,
      hub: { name: hub?.name || t.hubId, address: hub?.address || "" }, stage, link: k ? `/chauffeur?k=${encodeURIComponent(k)}` : null,
      clients, done, total: clients.length,
    };
  });
}

/** Le transporteur (ou le fondateur) confie une mission à l'un de ses chauffeurs. */
export async function assignDriver(db: SupabaseClient, u: AppUser, tourId: string, driver: AppUser | null) {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(tourId)) throw new AppError("Mission introuvable.", 404);
  const t = await readJson<PlanTour>(db, `${PLAN_TOURS}/${tourId}.json`);
  if (!t || !canSee(u, t) || (u.role !== "fondateur" && u.role !== "transporteur")) throw new AppError("Mission introuvable.", 404);
  const c = { ...((t.carrier || { name: t.driver }) as AppCarrier) };
  if (driver) {
    if (driver.role !== "chauffeur" || !driver.active || !sameCompany(driver.company, c.name)) throw new AppError("Ce chauffeur n'appartient pas à ce transporteur.");
    c.driverUserId = driver.id; c.driverName = driver.name; if (driver.phone) c.driverPhone = driver.phone;
  } else { delete c.driverUserId; delete c.driverName; delete c.driverPhone; }
  t.carrier = c;
  await writeJson(db, `${PLAN_TOURS}/${t.id}.json`, t);
}
