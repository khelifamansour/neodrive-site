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
export type Stop = { kind: "depot" | "client"; id: string; name: string; label: string; lat: number; lng: number; load: number; loaded?: number; action: string; phone?: string };
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
  stops?: Stop[]; km?: number; hours?: number; precise?: boolean; costs?: Costs; params?: CostParams; warning?: string;
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

/**
 * Ordre de tournée avec stock : départ du hub choisi (chargé selon remorque et stock),
 * livraison du client le plus proche, recharge au hub ayant du stock qui coûte le moins de détour,
 * retour au hub de départ. Les clients non livrables (plus de stock) sont signalés.
 */
export function planRoute(hubs: Hub[], startId: string, trailer: number, clients: PlanClient[]) {
  const stock: Record<string, number> = Object.fromEntries(hubs.map(h => [h.id, Math.max(0, h.stock)]));
  const start = hubs.find(h => h.id === startId) || hubs[0];
  const stops: Stop[] = [];
  const left = [...clients];
  let pos: Point = start, load = 0;
  const take = (h: Hub) => { const n = Math.min(trailer - load, stock[h.id], left.length); stock[h.id] -= n; load += n; return n; };
  const first = take(start);
  stops.push({ kind: "depot", id: start.id, name: start.name, label: start.name, lat: start.lat, lng: start.lng, load, loaded: first, action: first ? `Charger ${first} voiture${first > 1 ? "s" : ""}` : "Départ (aucun stock ici)" });
  while (left.length) {
    if (load === 0) {
      let best: Hub | null = null, bestCost = Infinity;
      for (const h of hubs) {
        if (stock[h.id] <= 0) continue;
        const next = Math.min(...left.map(c => roadKm(h, c)));
        const cost = roadKm(pos, h) + next;
        if (cost < bestCost) { bestCost = cost; best = h; }
      }
      if (!best) break; // plus de stock nulle part
      const n = take(best);
      stops.push({ kind: "depot", id: best.id, name: best.name, label: best.name, lat: best.lat, lng: best.lng, load, loaded: n, action: `Recharger ${n} voiture${n > 1 ? "s" : ""}` });
      pos = best;
    }
    let bi = 0;
    for (let i = 1; i < left.length; i++) if (roadKm(pos, left[i]) < roadKm(pos, left[bi])) bi = i;
    const c = left.splice(bi, 1)[0];
    load -= 1;
    stops.push({ kind: "client", id: c.id, name: `${c.prenom} ${c.nom}`.trim(), label: `${c.adresse ? c.adresse + ", " : ""}${c.code_postal} ${c.ville}`, lat: c.lat, lng: c.lng, load, action: `Livrer ${c.modele || "NeoDrive"}`, phone: c.telephone });
    pos = c;
  }
  stops.push({ kind: "depot", id: start.id, name: start.name, label: start.name, lat: start.lat, lng: start.lng, load, action: "Retour au hub" });
  return { stops: improveRoute(stops), unserved: left, stockAfter: stock };
}

/** Améliore l'ordre des clients entre deux passages en hub (2-opt), sans changer les chargements. */
export function improveRoute(stops: Stop[]): Stop[] {
  const out = [...stops];
  let i = 0;
  while (i < out.length) {
    if (out[i].kind !== "depot") { i++; continue; }
    let j = i + 1; while (j < out.length && out[j].kind === "client") j++;
    // segment de clients : out[i+1 .. j-1], bornes out[i] et out[j]
    if (j < out.length && j - i - 1 >= 2) {
      let seg = out.slice(i + 1, j), better = true;
      const len = (s: Stop[]) => { let k = roadKm(out[i], s[0]) + roadKm(s[s.length - 1], out[j]); for (let q = 1; q < s.length; q++) k += roadKm(s[q - 1], s[q]); return k; };
      while (better) { better = false; for (let a = 0; a < seg.length - 1; a++) for (let z = a + 1; z < seg.length; z++) { const cand = [...seg.slice(0, a), ...seg.slice(a, z + 1).reverse(), ...seg.slice(z + 1)]; if (len(cand) < len(seg) - 0.5) { seg = cand; better = true; } } }
      let load = out[i].load; seg = seg.map(s => ({ ...s, load: --load }));
      out.splice(i + 1, seg.length, ...seg);
    }
    i = j;
  }
  return out;
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
