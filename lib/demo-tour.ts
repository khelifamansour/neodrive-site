/**
 * Tournée de démonstration pour tester l'espace livreur (compte « Serge (test) »).
 * Tout est marqué test : réservations source = 'test', tournée et clients d'id « test-… ».
 * createDemoTour crée (ou recrée) la tournée ; deleteTestData supprime tout ce qui est test.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listJson, removeJson, writeJson } from "./datastore";
import { PLAN_CLIENTS, PLAN_TOURS } from "./fleet";
import type { PlanClient, PlanTour, Stop } from "./planif";
import { vinValid } from "./shipments";

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

// ── Tournée « Simulation » (copie d'une vraie tournée, au numéro et à l'e-mail du fondateur) et vraie tournée Meyer + Benoist

export const SIM_TOUR_ID = "test-simulation-mansour";
export const REAL_TOUR_ID = "t-20261120-meyer-benoist";
const ROUTE = [
  { resId: 63, id: "res-63-meyer", lat: 43.7016, lng: -0.2627, legKm: 170, legH: 2.1, slot: "9 h 30 – 12 h" },
  { resId: 14, id: "", lat: 44.9846, lng: -0.6036, legKm: 190, legH: 2.2, slot: "13 h 30 – 17 h" },
];
const BACK = { km: 275, h: 2.8 };

/** VIN fictif avec une clé de contrôle valide (préfixe LTESTSMU, jamais un vrai véhicule). */
function fakeVin(n: number) {
  const tail = "R" + String(n).padStart(7, "0");
  for (const c of "0123456789X") { const v = `LTESTSMU${c}${tail}`; if (vinValid(v)) return v; }
  throw new Error("VIN fictif impossible");
}

type Res = { id: number; prenom: string; nom: string; telephone: string; email: string; adresse: string; code_postal: string; ville: string; modele: string; couleur: string; total: number | null; plan_client_id: string | null };

async function routeClients(db: SupabaseClient) {
  const { data, error } = await db.from("reservations").select("id,prenom,nom,telephone,email,adresse,code_postal,ville,modele,couleur,total,plan_client_id").in("id", ROUTE.map(r => r.resId));
  if (error) throw new Error(error.message);
  return ROUTE.map(r => { const x = (data || []).find(d => d.id === r.resId) as Res | undefined; if (!x) throw new Error(`Réservation ${r.resId} introuvable`); return { ...r, res: x }; });
}

function buildTour(id: string, name: string, date: string, stops: Stop[], clientIds: string[], warning?: string): PlanTour {
  const km = ROUTE.reduce((s, r) => s + r.legKm, 0) + BACK.km;
  const hours = Math.round((ROUTE.reduce((s, r) => s + r.legH, 0) + BACK.h + ROUTE.length * 0.75) * 10) / 10;
  return { id, name, created_at: new Date().toISOString(), date, driver: "Mansour", hubId: HUB.id, trailer: 2, clientIds, status: "valide", stops, km, hours, departTime: "06:45", driverRate: 25, closed_at: null, en_route: [], ...(warning ? { warning } : {}) };
}
const depotStop = (label: string, load: number, action: string, legKm?: number, legH?: number): Stop => ({ kind: "depot", id: HUB.id, name: HUB.name, label, lat: HUB.lat, lng: HUB.lng, load, loaded: Math.max(load, 0), action, address: HUB.address, ...(legKm ? { legKm, legH } : {}) });

/** Vraie tournée du 20/11 : Mme Meyer (Aire-sur-l'Adour) puis Mme Benoist (Ludon-Médoc), livreur Mansour. */
export async function createRealTour(db: SupabaseClient, date = "2026-11-20") {
  const rows = await routeClients(db);
  const now = new Date().toISOString();
  const ids: string[] = []; const stops: Stop[] = [depotStop("Départ", 2, "Charger 2 voitures (rouges)")];
  for (const [i, r] of rows.entries()) {
    const x = r.res; const cid = x.plan_client_id || r.id;
    const prev = (await listJson<PlanClient>(db, PLAN_CLIENTS)).find(c => c.id === cid);
    const pc: PlanClient = { ...(prev || {}), id: cid, created_at: prev?.created_at || now, source: "reservation", prenom: x.prenom, nom: x.nom, telephone: x.telephone, email: x.email || "", adresse: x.adresse, code_postal: x.code_postal, ville: x.ville, modele: x.modele || "NeoDrive Confort", couleur: x.couleur || "Rouge", total: x.total != null ? Number(x.total) : null, status: "planifie", tour_id: REAL_TOUR_ID, lat: r.lat, lng: r.lng, note: `Créneau ${r.slot} · paiement par virement instantané à la livraison` };
    await writeJson(db, `${PLAN_CLIENTS}/${cid}.json`, pc);
    await db.from("reservations").update({ plan_client_id: cid, statut: "Planifiée", date_promise: date, ...(x.couleur ? {} : { couleur: "Rouge" }) }).eq("id", x.id);
    ids.push(cid);
    stops.push({ kind: "client", id: cid, name: `${x.prenom} ${x.nom}`.trim(), label: String(i + 1), lat: r.lat, lng: r.lng, load: -1, action: `Livrer 1 voiture (${r.slot})`, phone: x.telephone, address: `${x.adresse}, ${x.code_postal} ${x.ville}`, legKm: r.legKm, legH: r.legH });
  }
  stops.push(depotStop("Retour", 0, "Retour au dépôt", BACK.km, BACK.h));
  await writeJson(db, `${PLAN_TOURS}/${REAL_TOUR_ID}.json`, buildTour(REAL_TOUR_ID, "Meyer + Benoist (sud-ouest)", date, stops, ids));
  return { tour: REAL_TOUR_ID, clients: ids };
}

/** Copie « Simulation » : mêmes étapes, mais téléphone et e-mail du fondateur, VIN fictifs déjà chargés. Tout est test (supprimé par deleteTestData). */
export async function createSimulationTour(db: SupabaseClient, date = "2026-11-19") {
  const rows = await routeClients(db);
  // Recrée proprement : supprime l'ancienne simulation seulement
  await removeJson(db, [`${PLAN_TOURS}/${SIM_TOUR_ID}.json`, ...rows.map((_, i) => `${PLAN_CLIENTS}/test-sim-${i + 1}.json`)]).catch(() => null);
  await db.from("reservations").delete().eq("source", "test").like("notes", "SIMULATION%");
  await db.from("shipment_vehicles").delete().eq("tour_id", SIM_TOUR_ID);
  const now = new Date().toISOString();
  let { data: sh } = await db.from("shipments").select("id").eq("name", TEST_SHIPMENT).maybeSingle();
  if (!sh) { const ins = await db.from("shipments").insert({ name: TEST_SHIPMENT, status: "dédouané", pipeline: "en stock", auto_send: false, arrived_at: now, notes: "TEST – à supprimer (démo livreur)" }).select("id").single(); if (ins.error) throw new Error(ins.error.message); sh = ins.data; }
  const ids: string[] = []; const stops: Stop[] = [depotStop("Départ", 2, "Charger 2 voitures (SIMULATION)")];
  for (const [i, r] of rows.entries()) {
    const x = r.res; const cid = `test-sim-${i + 1}`; const vin = fakeVin(i + 1);
    const nom = `${x.nom} (SIMULATION)`;
    const { error } = await db.from("reservations").insert({ source: "test", nom, prenom: x.prenom, telephone: PHONE, email: EMAIL, adresse: x.adresse, code_postal: x.code_postal, ville: x.ville, departement: x.code_postal.slice(0, 2), modele: x.modele || "NeoDrive Confort", couleur: x.couleur || "Rouge", quantite: 1, total: x.total != null ? Number(x.total) : 5690, statut: "Planifiée", date_promise: date, notes: "SIMULATION – copie de test, à supprimer", plan_client_id: cid, vin }).select("id").single();
    if (error) throw new Error("Réservation simulation : " + error.message);
    const pc: PlanClient = { id: cid, created_at: now, source: "reservation", prenom: x.prenom, nom, telephone: PHONE, email: EMAIL, adresse: x.adresse, code_postal: x.code_postal, ville: x.ville, modele: x.modele || "NeoDrive Confort", couleur: x.couleur || "Rouge", total: null, status: "planifie", tour_id: SIM_TOUR_ID, note: "SIMULATION – SMS et e-mails envoyés au fondateur", lat: r.lat, lng: r.lng };
    await writeJson(db, `${PLAN_CLIENTS}/${cid}.json`, pc);
    const veh = await db.from("shipment_vehicles").insert({ shipment_id: sh!.id, vin, status: "chargée", depot: "lamasquere", depot_at: now, picked_at: now, tour_id: SIM_TOUR_ID, driver: "Mansour", client_id: cid, client_name: `${x.prenom} ${nom}`, note: "TEST – véhicule fictif (simulation)", history: [{ at: now, stage: "chargée", by: "simulation", note: "véhicule fictif" }] });
    if (veh.error) throw new Error("Véhicule simulation : " + veh.error.message);
    ids.push(cid);
    stops.push({ kind: "client", id: cid, name: `${x.prenom} ${nom}`, label: String(i + 1), lat: r.lat, lng: r.lng, load: -1, action: `Livrer 1 voiture (${r.slot})`, phone: PHONE, address: `${x.adresse}, ${x.code_postal} ${x.ville}`, legKm: r.legKm, legH: r.legH });
  }
  stops.push(depotStop("Retour", 0, "Retour au dépôt", BACK.km, BACK.h));
  await writeJson(db, `${PLAN_TOURS}/${SIM_TOUR_ID}.json`, buildTour(SIM_TOUR_ID, "SIMULATION – Meyer + Benoist", date, stops, ids, "Simulation : SMS et e-mails envoyés au fondateur, VIN fictifs. À supprimer après le test."));
  return { tour: SIM_TOUR_ID, clients: ids };
}
