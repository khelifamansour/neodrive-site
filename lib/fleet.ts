import type { SupabaseClient } from "@supabase/supabase-js";
import { readJson } from "./datastore";
import type { PlanClient } from "./planif";
import { normVin, vehicleStage, vinDistance, vinValid } from "./shipments";

/** Outils serveur du suivi véhicule par véhicule (chauffeur + tableau de bord). */
export const PLAN_CLIENTS = "planificateur/clients";
export const PLAN_TOURS = "planificateur/tours";
export const PHOTO_BUCKET = "shipment-docs";

export const readClient = (db: SupabaseClient, id: string) => /^[A-Za-z0-9_-]{1,80}$/.test(id) ? readJson<PlanClient>(db, `${PLAN_CLIENTS}/${id}.json`) : Promise.resolve(null);
export const clientName = (c: Pick<PlanClient, "prenom" | "nom" | "ville">) => `${c.prenom || ""} ${c.nom || ""}`.trim() + (c.ville ? ` (${c.ville})` : "");

/** Ajoute une étape à l'historique du véhicule et met à jour la ligne. */
export async function patchVehicle(db: SupabaseClient, id: number, patch: Record<string, unknown>, event: { stage?: string; by: string; note?: string }) {
  const { data: cur } = await db.from("shipment_vehicles").select("history").eq("id", id).single();
  const history = [...(Array.isArray(cur?.history) ? cur.history : []), { at: new Date().toISOString(), ...event }].slice(-50);
  const { error } = await db.from("shipment_vehicles").update({ ...patch, history, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Retrouve un véhicule à partir d'un VIN lu (exact, sinon VIN proches à 1-2 caractères près). */
export async function matchVin(db: SupabaseClient, raw: string, extra: string[] = []) {
  const vin = normVin(raw);
  const { data: all } = await db.from("shipment_vehicles").select("id,vin,container,status,depot,client_id,client_name,tour_id,shipment_id,shipments(name,status,eta,arrived_at,depot)").limit(5000);
  const rows = (all || []) as any[];
  const view = (r: any) => ({ id: r.id, vin: r.vin, container: r.container, depot: r.depot || r.shipments?.depot || null, client_id: r.client_id, client_name: r.client_name, tour_id: r.tour_id, shipment: r.shipments?.name || "", stage: vehicleStage(r, r.shipments) });
  const tries = [vin, ...extra.map(normVin)].filter(v => v.length === 17);
  for (const t of tries) { const hit = rows.find(r => r.vin === t); if (hit) return { vin: t, valid: vinValid(t), vehicle: view(hit), suggestions: [] as ReturnType<typeof view>[] }; }
  const suggestions = vin.length === 17 ? rows.map(r => ({ r, d: Math.min(...tries.map(t => vinDistance(t, r.vin))) })).filter(x => x.d <= 2).sort((a, b) => a.d - b.d).slice(0, 4).map(x => view(x.r)) : [];
  return { vin, valid: vinValid(vin), vehicle: null, suggestions };
}
