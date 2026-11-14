/** Journal des tournées (table tour_events) et livraison d'un véhicule. Serveur uniquement. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeJson } from "./datastore";
import { PLAN_CLIENTS, patchVehicle, readClient } from "./fleet";
import type { PlanTour } from "./planif";
import type { TourEvent } from "./schedule";

export const EVENT_KINDS = ["depart", "pause", "reprise", "arrive", "livre", "probleme", "position", "prevenir"] as const;
export type EventKind = typeof EVENT_KINDS[number];
export const isEventKind = (k: unknown): k is EventKind => EVENT_KINDS.includes(k as EventKind);
/** Durée de conservation des positions GPS. */
export const POSITION_RETENTION_DAYS = 90;

const num = (v: unknown, min: number, max: number) => { const n = Number(v); return v !== null && v !== "" && Number.isFinite(n) && n >= min && n <= max ? n : null; };
export const cleanGeo = (b: Record<string, unknown>) => {
  const lat = num(b.lat, -90, 90), lng = num(b.lng, -180, 180);
  return lat == null || lng == null ? { lat: null, lng: null, accuracy: null } : { lat, lng, accuracy: num(b.accuracy, 0, 100000) };
};

export async function addEvent(db: SupabaseClient, e: Omit<TourEvent, "created_at"> & { created_at?: string }) {
  const { data, error } = await db.from("tour_events").insert({ ...e, created_at: e.created_at || new Date().toISOString() }).select("*").single();
  if (error) throw new Error("Journal de tournée indisponible : " + error.message);
  return data as TourEvent;
}

/** Événements d'une tournée (positions : seulement la dernière, sauf `allPositions`). */
export async function listEvents(db: SupabaseClient, tourIds: string[], allPositions = false) {
  if (!tourIds.length) return [] as TourEvent[];
  const { data, error } = await db.from("tour_events").select("*").in("tour_id", tourIds).order("created_at", { ascending: true }).limit(5000);
  if (error) { console.error("[TOUR_EVENTS]", error.message); return []; }
  const rows = (data || []) as TourEvent[];
  if (allPositions) return rows;
  const lastPos = new Map<string, TourEvent>();
  for (const r of rows) if (r.kind === "position") lastPos.set(r.tour_id, r);
  return rows.filter(r => r.kind !== "position" || lastPos.get(r.tour_id) === r);
}

/** Vie privée : positions effacées après 90 jours, coordonnées retirées des autres événements. */
export async function purgeOldPositions(db: SupabaseClient) {
  const before = new Date(Date.now() - POSITION_RETENTION_DAYS * 86400000).toISOString();
  await db.from("tour_events").delete().eq("kind", "position").lt("created_at", before);
  await db.from("tour_events").update({ lat: null, lng: null, accuracy: null }).lt("created_at", before).not("lat", "is", null);
}

/** Index de l'arrêt du client dans la tournée (ou null). */
export const stopIndexOf = (t: PlanTour | null, clientId: string | null | undefined) => {
  if (!t?.stops || !clientId) return null; const i = t.stops.findIndex(s => s.kind === "client" && s.id === clientId); return i >= 0 ? i : null;
};

/**
 * Livraison d'un véhicule : shipment_vehicles « livrée », réservation du planificateur « livré »
 * avec l'heure de livraison. Renvoie le lien d'accusé de réception à faire signer, s'il manque.
 */
export async function deliverVehicle(db: SupabaseClient, v: { id: number; client_name?: string | null; client_id?: string | null }, o: { driver: string; photo?: string | null; plate?: string | null; note?: string }) {
  const at = new Date().toISOString();
  const patch: Record<string, unknown> = { status: "livrée", delivered_at: at };
  if (o.photo) patch.delivery_photo = o.photo;
  if (o.plate) patch.plate_photo = o.plate;
  await patchVehicle(db, v.id, patch, { stage: "livrée", by: o.driver, note: [v.client_name ? `livré à ${v.client_name}` : "", o.note || ""].filter(Boolean).join(" · ") });
  let reception: string | null = null;
  if (v.client_id) {
    const c = await readClient(db, v.client_id);
    if (c) {
      if (c.status !== "livre" || !c.delivered_at) { c.status = "livre"; c.delivered_at = c.delivered_at || at; await writeJson(db, `${PLAN_CLIENTS}/${c.id}.json`, c); }
      if (c.token && !c.received_at) reception = `/reception?id=${encodeURIComponent(c.id)}&t=${encodeURIComponent(c.token)}`;
    }
  }
  return { reception, at };
}
