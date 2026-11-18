/**
 * Tournée de démonstration pour tester l'espace livreur (compte « Serge (test) »).
 * Tout est marqué test : réservations source = 'test', tournée et clients d'id « test-… ».
 * createDemoTour crée (ou recrée) la tournée ; deleteTestData supprime tout ce qui est test.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listJson, removeJson, writeJson } from "./datastore";
import { PLAN_CLIENTS, PLAN_TOURS } from "./fleet";
import type { PlanClient, PlanTour, Stop } from "./planif";

export const DEMO_TOUR_ID = "test-demo-serge";
/** VIN fictifs (clé de contrôle valide) déjà chargés pour « Client TEST 1 » et « Client TEST 3 » : livraison et accusé testables sans voiture. */
export const DEMO_VIN = "LTESTDEM700000001";
export const DEMO_VIN_3 = "LTESTDEM900000002";
const TEST_SHIPMENT = "TEST – démo Serge (véhicule fictif)";
const HUB = { id: "lamasquere", name: "Lamasquère (Muret)", address: "1021 Route de Moundas, 31600 Lamasquère", lat: 43.4836, lng: 1.2483 };
const CLIENTS = [
  { id: "test-client-1", prenom: "Client", nom: "TEST 1", adresse: "Mairie de Muret, Place Léon Blum", code_postal: "31600", ville: "Muret", lat: 43.4617, lng: 1.3265 },
  { id: "test-client-2", prenom: "Client", nom: "TEST 2", adresse: "Mairie de Seysses, Place de la Libération", code_postal: "31600", ville: "Seysses", lat: 43.4983, lng: 1.3114 },
  { id: "test-client-3", prenom: "Client", nom: "TEST 3", adresse: "Mairie de Lamasquère, Place de la Mairie", code_postal: "31600", ville: "Lamasquère", lat: 43.4864, lng: 1.2414 },
];
/** Véhicules fictifs déjà chargés : client (index dans CLIENTS) → VIN. Client TEST 2 reste sans VIN (on scanne ou saisit la vraie voiture). */
const LOADED: [number, string][] = [[0, DEMO_VIN], [2, DEMO_VIN_3]];
const PHONE = "0689781710";
const EMAIL = "khelifamansour@hotmail.fr";

export async function createDemoTour(db: SupabaseClient, date = "2026-11-19") {
  await deleteTestData(db, { keepHoursAndInvoices: true });
  const now = new Date().toISOString();
  const resIds: number[] = [];
  for (const c of CLIENTS) {
    const { data, error } = await db.from("reservations").insert({
      source: "test", nom: c.nom, prenom: c.prenom, telephone: PHONE, email: EMAIL, adresse: c.adresse, code_postal: c.code_postal, ville: c.ville, departement: "31",
      modele: "NeoDrive Confort", couleur: "Rouge", quantite: 1, total: 5490, statut: "Planifiée", date_promise: date, notes: "TEST – à supprimer", plan_client_id: c.id,
    }).select("id").single();
    if (error) throw new Error("Réservation de test : " + error.message);
    resIds.push(data.id);
    const pc: PlanClient = { id: c.id, created_at: now, source: "reservation", prenom: c.prenom, nom: c.nom, telephone: PHONE, email: EMAIL, adresse: c.adresse, code_postal: c.code_postal, ville: c.ville, modele: "NeoDrive Confort", couleur: "Rouge", total: 5490, status: "planifie", tour_id: DEMO_TOUR_ID, note: "TEST – à supprimer", lat: c.lat, lng: c.lng };
    await writeJson(db, `${PLAN_CLIENTS}/${c.id}.json`, pc);
  }
  const stops: Stop[] = [
    { kind: "depot", id: HUB.id, name: HUB.name, label: "Départ", lat: HUB.lat, lng: HUB.lng, load: 3, loaded: 3, action: "Charger 3 voitures", address: HUB.address },
    ...CLIENTS.map((c, i): Stop => ({ kind: "client", id: c.id, name: `${c.prenom} ${c.nom}`, label: String(i + 1), lat: c.lat, lng: c.lng, load: -1, action: "Livrer 1 voiture", phone: PHONE, address: `${c.adresse}, ${c.code_postal} ${c.ville}`, legKm: i ? 6 : 7, legH: i ? 0.18 : 0.2 })),
  ];
  const tour: PlanTour = {
    id: DEMO_TOUR_ID, name: "Tournée TEST – démo Serge", created_at: now, date, driver: "Serge", hubId: HUB.id, trailer: 2,
    clientIds: CLIENTS.map(c => c.id), status: "valide", stops, km: 32, hours: 3, departTime: "08:00", driverRate: 25, closed_at: null, en_route: [],
    warning: "Tournée de test : à supprimer après la démo.",
  };
  await writeJson(db, `${PLAN_TOURS}/${DEMO_TOUR_ID}.json`, tour);
  // Véhicules fictifs déjà chargés (TEST 1 et TEST 3) ; Client TEST 2 reste sans VIN : on scanne ou saisit la vraie voiture.
  const sh = await db.from("shipments").insert({ name: TEST_SHIPMENT, status: "dédouané", pipeline: "en stock", auto_send: false, arrived_at: now, notes: "TEST – à supprimer (démo livreur)" }).select("id").single();
  if (sh.error) throw new Error("Conteneur de test : " + sh.error.message);
  for (const [i, vin] of LOADED) {
    const c = CLIENTS[i];
    const veh = await db.from("shipment_vehicles").insert({ shipment_id: sh.data.id, vin, status: "chargée", depot: "lamasquere", depot_at: now, picked_at: now, tour_id: DEMO_TOUR_ID, driver: "Serge", client_id: c.id, client_name: `${c.prenom} ${c.nom}`, note: "TEST – véhicule fictif de démonstration", history: [{ at: now, stage: "chargée", by: "démo", note: "véhicule fictif de test" }] }).select("id").single();
    if (veh.error) throw new Error("Véhicule de test : " + veh.error.message);
    await db.from("reservations").update({ vin }).eq("id", resIds[i]);
  }
  return { tour: DEMO_TOUR_ID, reservations: resIds, clients: CLIENTS.map(c => c.id) };
}

/** Supprime la tournée de test, ses clients, les réservations de test, et (sauf option) les heures et factures du compte de test. */
export async function deleteTestData(db: SupabaseClient, opt: { keepHoursAndInvoices?: boolean } = {}) {
  const tours = (await listJson<PlanTour>(db, PLAN_TOURS)).filter(t => t.id.startsWith("test-"));
  const clients = (await listJson<PlanClient>(db, PLAN_CLIENTS)).filter(c => c.id.startsWith("test-"));
  const paths = [...tours.map(t => `${PLAN_TOURS}/${t.id}.json`), ...clients.map(c => `${PLAN_CLIENTS}/${c.id}.json`)];
  if (paths.length) await removeJson(db, paths);
  const { data: res } = await db.from("reservations").delete().eq("source", "test").select("id");
  // Véhicules : le fictif est supprimé ; un vrai véhicule chargé ou « livré » à un client test revient au dépôt, sans client.
  const { data: tsh } = await db.from("shipments").select("id").like("name", "TEST –%");
  const tshIds = (tsh || []).map(x => x.id);
  if (tshIds.length) { await db.from("shipment_vehicles").delete().in("shipment_id", tshIds); await db.from("shipments").delete().in("id", tshIds); }
  await db.from("shipment_vehicles").delete().like("note", "TEST –%");
  await db.from("shipment_vehicles").update({ status: "au dépôt", client_id: null, client_name: null, tour_id: null, picked_at: null, delivered_at: null, delivery_photo: null, updated_at: new Date().toISOString() }).like("client_id", "test-%");
  let hours = 0, invoices = 0;
  if (!opt.keepHoursAndInvoices) {
    const { data: testers } = await db.from("team_members").select("id").eq("is_test", true);
    const ids = (testers || []).map(x => x.id);
    if (ids.length) {
      const h = await db.from("driver_hours").delete().in("member_id", ids).select("id"); hours = h.data?.length || 0;
      const inv = await db.from("driver_invoices").delete().in("member_id", ids).select("id"); invoices = inv.data?.length || 0;
    }
    if (tours.length) await db.from("tour_events").delete().in("tour_id", tours.map(t => t.id));
  }
  return { tours: tours.length, clients: clients.length, reservations: res?.length || 0, hours, invoices };
}
