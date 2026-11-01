/** Planificateur de tournées NeoDrive : hubs, tournées, optimisation et coûts. */

export type Point = { lat: number; lng: number };
export type Hub = Point & { id: string; name: string; stock: number };
export type PlanClient = Point & {
  id: string; created_at: string; source: "reservation" | "manuel";
  prenom: string; nom: string; telephone: string; email: string;
  adresse: string; code_postal: string; ville: string;
  modele: string; couleur: string; total: number | null;
  status: "a_planifier" | "planifie" | "livre"; tour_id?: string | null; note?: string;
  token?: string; received_at?: string; received_by?: string; reception_note?: string;
};
export type Stop = { kind: "depot" | "client"; id: string; name: string; label: string; lat: number; lng: number; load: number; loaded?: number; action: string; phone?: string; address?: string; legKm?: number; legH?: number };
export type Fuel = "gazole" | "e10" | "sp95" | "e85" | "gpl";
export const FUELS: { id: Fuel; label: string; conso: number; price: number }[] = [
  { id: "gazole", label: "Gazole (Duster dCi)", conso: 13, price: 1.65 },
  { id: "e10", label: "Essence SP95-E10", conso: 15, price: 1.75 },
  { id: "sp95", label: "Essence SP95", conso: 15, price: 1.8 },
  { id: "e85", label: "Éthanol E85", conso: 19, price: 0.85 },
  { id: "gpl", label: "GPL (Duster Eco-G)", conso: 18, price: 1.0 },
];
export type CostParams = { fuel: Fuel; consumption: number; fuelPrice: number; tollPerKm: number; hourlyRate: number; mealPerDay: number; hotelPerNight: number; hoursPerDay: number; mode: "carte" | "remboursement" };
export type Costs = { liters: number; fuel: number; tolls: number; driver: number; days: number; meals: number; nights: number; hotel: number; total: number; payDriver: number };
export type PlanTour = {
  id: string; name: string; created_at: string; date: string; driver: string;
  hubId: string; trailer: number; clientIds: string[];
  status: "brouillon" | "valide" | "termine";
  stops?: Stop[]; path?: [number, number][]; km?: number; hours?: number; precise?: boolean; costs?: Costs; params?: CostParams; warning?: string;
};

export const DEFAULT_HUBS: Hub[] = [
  { id: "lamasquere", name: "Lamasquère (Muret)", lat: 43.4836, lng: 1.2483, stock: 0 },
  { id: "boran", name: "Boran-sur-Oise", lat: 49.1686, lng: 2.3583, stock: 0 },
];
export const TRAILERS = [
  { value: 1, label: "Petite remorque (1 voiture)" },
  { value: 2, label: "Grande remorque (2 voitures)" },
  { value: 3, label: "Les deux remorques (3 voitures)" },
];
export const DEFAULT_PARAMS: CostParams = { fuel: "gazole", consumption: 13, fuelPrice: 1.65, tollPerKm: 0.09, hourlyRate: 15, mealPerDay: 25, hotelPerNight: 70, hoursPerDay: 9, mode: "carte" };

export function haversineKm(a: Point, b: Point) {
  const R = 6371, toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Distance routière approximative (vol d'oiseau × 1,3). */
export const roadKm = (a: Point, b: Point) => haversineKm(a, b) * 1.3;

/** Transforme un ordre de clients en tournée : recharge au hub le plus avantageux quand la remorque est vide. */
function decode(hubs: Hub[], start: Hub, trailer: number, seq: PlanClient[]) {
  const stock: Record<string, number> = Object.fromEntries(hubs.map(h => [h.id, Math.max(0, h.stock)]));
  const stops: Stop[] = [];
  let pos: Point = start, load = 0, km = 0, i = 0;
  const take = (h: Hub) => { const n = Math.min(trailer - load, stock[h.id], seq.length - i); stock[h.id] -= n; load += n; return n; };
  const first = take(start);
  stops.push({ kind: "depot", id: start.id, name: start.name, label: start.name, lat: start.lat, lng: start.lng, load, loaded: first, action: first ? `Charger ${first} voiture${first > 1 ? "s" : ""}` : "Départ (aucun stock ici)" });
  while (i < seq.length) {
    const c = seq[i];
    if (load === 0) {
      let best: Hub | null = null, bestCost = Infinity;
      for (const h of hubs) { if (stock[h.id] <= 0) continue; const cost = roadKm(pos, h) + roadKm(h, c); if (cost < bestCost) { bestCost = cost; best = h; } }
      if (!best) break;
      const n = take(best); km += roadKm(pos, best); pos = best;
      stops.push({ kind: "depot", id: best.id, name: best.name, label: best.name, lat: best.lat, lng: best.lng, load, loaded: n, action: `Recharger ${n} voiture${n > 1 ? "s" : ""}` });
    }
    load -= 1; km += roadKm(pos, c); pos = c; i++;
    stops.push({ kind: "client", id: c.id, name: `${c.prenom} ${c.nom}`.trim(), label: `${c.adresse ? c.adresse + ", " : ""}${c.code_postal} ${c.ville}`, address: `${c.adresse ? c.adresse + ", " : ""}${c.code_postal} ${c.ville}`, lat: c.lat, lng: c.lng, load, action: `Livrer ${c.modele || "NeoDrive"}${c.couleur ? " " + c.couleur : ""}`, phone: c.telephone });
  }
  km += roadKm(pos, start);
  stops.push({ kind: "depot", id: start.id, name: start.name, label: start.name, lat: start.lat, lng: start.lng, load, action: "Retour au hub" });
  return { stops, km, unserved: seq.slice(i), stock };
}

/**
 * Tournée optimisée avec stock : départ du hub choisi, recharges au hub le plus avantageux
 * (retour au hub ou autre hub), retour au départ. Teste de nombreux ordres (inversions + déplacements)
 * et garde le plus court. Les clients non livrables (plus de stock) sont signalés.
 */
export function planRoute(hubs: Hub[], startId: string, trailer: number, clients: PlanClient[]) {
  const start = hubs.find(h => h.id === startId) || hubs[0];
  const left = [...clients]; let seq: PlanClient[] = []; let pos: Point = start;
  while (left.length) { let bi = 0; for (let k = 1; k < left.length; k++) if (roadKm(pos, left[k]) < roadKm(pos, left[bi])) bi = k; pos = left[bi]; seq.push(left.splice(bi, 1)[0]); }
  const score = (s: PlanClient[]) => { const d = decode(hubs, start, trailer, s); return d.km + d.unserved.length * 1e6; };
  let best = score(seq), improved = true, guard = 0;
  while (improved && guard++ < 200) {
    improved = false;
    for (let a = 0; a < seq.length - 1; a++) for (let z = a + 1; z < seq.length; z++) {
      const rev = [...seq.slice(0, a), ...seq.slice(a, z + 1).reverse(), ...seq.slice(z + 1)];
      const sr = score(rev); if (sr < best - 0.5) { seq = rev; best = sr; improved = true; continue; }
      const mv = [...seq]; const [x] = mv.splice(a, 1); mv.splice(z, 0, x);
      const sm = score(mv); if (sm < best - 0.5) { seq = mv; best = sm; improved = true; }
    }
  }
  // quelques départs différents pour éviter un mauvais choix local
  if (seq.length >= 4 && seq.length <= 30) {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let r = 0; r < 12; r++) {
      let s = [...seq].sort(() => rnd() - 0.5), sb = score(s), imp = true, g = 0;
      while (imp && g++ < 100) { imp = false; for (let a = 0; a < s.length - 1; a++) for (let z = a + 1; z < s.length; z++) {
        const rev = [...s.slice(0, a), ...s.slice(a, z + 1).reverse(), ...s.slice(z + 1)]; const sr = score(rev); if (sr < sb - 0.5) { s = rev; sb = sr; imp = true; continue; }
        const mv = [...s]; const [x] = mv.splice(a, 1); mv.splice(z, 0, x); const sm = score(mv); if (sm < sb - 0.5) { s = mv; sb = sm; imp = true; } } }
      if (sb < best - 0.5) { seq = s; best = sb; }
    }
  }
  const d = decode(hubs, start, trailer, seq);
  return { stops: d.stops, unserved: d.unserved, stockAfter: d.stock };
}

/** Découpe la tournée en voyages : un chargement au hub puis les livraisons qui suivent. */
export type Trip = { n: number; color: string; hub: Stop; clients: Stop[]; next: Stop | null; km: number; emptyKm: number };
export const TRIP_COLORS = ["#e8592a", "#2563eb", "#16a34a", "#9333ea", "#db2777", "#0891b2", "#ca8a04", "#4b5563"];
export function splitTrips(stops: Stop[]): Trip[] {
  const trips: Trip[] = [];
  stops.forEach((s, i) => {
    const leg = i > 0 ? (s.legKm ?? roadKm(stops[i - 1], s)) : 0;
    const cur = trips[trips.length - 1];
    if (s.kind === "client") { if (cur) { cur.clients.push(s); cur.km += leg; } return; }
    if (cur) { cur.next = s; cur.km += leg; cur.emptyKm += leg; }
    if (i < stops.length - 1) trips.push({ n: trips.length + 1, color: TRIP_COLORS[trips.length % TRIP_COLORS.length], hub: s, clients: [], next: null, km: 0, emptyKm: 0 });
  });
  return trips;
}

export function estimateKm(stops: Stop[]) {
  let km = 0;
  for (let i = 1; i < stops.length; i++) km += roadKm(stops[i - 1], stops[i]);
  return km;
}

/** Coûts : carburant, péages, temps livreur, repas et nuits. */
export function computeCosts(km: number, hours: number, p: CostParams): Costs {
  const liters = (km / 100) * p.consumption;
  const fuel = liters * p.fuelPrice;
  const tolls = km * p.tollPerKm;
  const driver = hours * p.hourlyRate;
  const days = Math.max(1, Math.ceil(hours / p.hoursPerDay));
  const meals = days * p.mealPerDay;
  const nights = days - 1;
  const hotel = nights * p.hotelPerNight;
  const total = fuel + tolls + driver + meals + hotel;
  const payDriver = p.mode === "carte" ? driver + meals + hotel : total;
  return { liters, fuel, tolls, driver, days, meals, nights, hotel, total, payDriver };
}

export function mapsUrl(stops: Stop[]) {
  const pts = stops.map(s => `${s.lat},${s.lng}`);
  const origin = pts[0], destination = pts[pts.length - 1], way = pts.slice(1, -1).slice(0, 9);
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${way.length ? `&waypoints=${encodeURIComponent(way.join("|"))}` : ""}&travelmode=driving`;
}
