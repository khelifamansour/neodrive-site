/** Planificateur de tournées NeoDrive : types, dépôts, optimisation et coûts. */

export type Point = { lat: number; lng: number };
export type Depot = Point & { id: string; name: string; label: string };
export type PlanClient = Point & {
  id: string; created_at: string; source: "reservation" | "manuel";
  prenom: string; nom: string; telephone: string; email: string;
  adresse: string; code_postal: string; ville: string;
  modele: string; couleur: string; total: number | null;
  status: "a_planifier" | "planifie" | "livre"; tour_id?: string | null; note?: string;
};
export type Stop = { kind: "depot" | "client"; id: string; name: string; label: string; lat: number; lng: number; load: number; action: string; phone?: string };
export type PlanTour = { id: string; created_at: string; date: string; driver: string; depotId: string; trailer: number; stops: Stop[]; km: number; hours: number; costs: Costs; params: CostParams; status: "brouillon" | "valide" | "termine" };
export type CostParams = { consumption: number; fuelPrice: number; tollPerKm: number; hourlyRate: number; mealPerDay: number; hotelPerNight: number; hoursPerDay: number; mode: "carte" | "remboursement" };
export type Costs = { liters: number; fuel: number; tolls: number; driver: number; days: number; meals: number; nights: number; hotel: number; total: number; payDriver: number };

export const DEPOTS: Depot[] = [
  { id: "lamasquere", name: "Lamasquère", label: "Stock Lamasquère (près de Muret, 31)", lat: 43.4836, lng: 1.2483 },
  { id: "boran", name: "Boran-sur-Oise", label: "Stock Boran-sur-Oise (60)", lat: 49.1686, lng: 2.3583 },
];
export const TRAILERS = [
  { value: 1, label: "Petite remorque (1 voiture)" },
  { value: 2, label: "Grande remorque (2 voitures)" },
  { value: 3, label: "Les deux remorques (3 voitures)" },
];
export const DEFAULT_PARAMS: CostParams = { consumption: 11, fuelPrice: 1.75, tollPerKm: 0.09, hourlyRate: 15, mealPerDay: 25, hotelPerNight: 70, hoursPerDay: 9, mode: "carte" };

export function haversineKm(a: Point, b: Point) {
  const R = 6371, toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Distance routière approximative (vol d'oiseau × 1,3). */
export const roadKm = (a: Point, b: Point) => haversineKm(a, b) * 1.3;

/**
 * Ordre de tournée : on part du dépôt chargé, on livre le client le plus proche,
 * et quand la remorque est vide on recharge au dépôt le plus proche. Retour au dépôt de départ.
 */
export function planRoute(start: Depot, trailer: number, clients: PlanClient[]): Stop[] {
  const stops: Stop[] = [];
  let pos: Point = start, load = trailer;
  const left = [...clients];
  stops.push({ kind: "depot", id: start.id, name: start.name, label: start.label, lat: start.lat, lng: start.lng, load, action: `Charger ${trailer} voiture${trailer > 1 ? "s" : ""}` });
  while (left.length) {
    if (load === 0) {
      // recharger au dépôt qui minimise (aller au dépôt + dépôt → client le plus proche)
      let best = DEPOTS[0], bestCost = Infinity;
      for (const d of DEPOTS) { const next = Math.min(...left.map(c => roadKm(d, c))); const cost = roadKm(pos, d) + next; if (cost < bestCost) { bestCost = cost; best = d; } }
      load = Math.min(trailer, left.length);
      stops.push({ kind: "depot", id: best.id, name: best.name, label: best.label, lat: best.lat, lng: best.lng, load, action: `Recharger ${load} voiture${load > 1 ? "s" : ""}` });
      pos = best;
    }
    let bi = 0;
    for (let i = 1; i < left.length; i++) if (roadKm(pos, left[i]) < roadKm(pos, left[bi])) bi = i;
    const c = left.splice(bi, 1)[0];
    load -= 1;
    stops.push({ kind: "client", id: c.id, name: `${c.prenom} ${c.nom}`.trim(), label: `${c.adresse}, ${c.code_postal} ${c.ville}`, lat: c.lat, lng: c.lng, load, action: `Livrer ${c.modele || "NeoDrive"}`, phone: c.telephone });
    pos = c;
  }
  stops.push({ kind: "depot", id: start.id, name: start.name, label: start.label, lat: start.lat, lng: start.lng, load, action: "Retour au dépôt" });
  return stops;
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
  // Carte entreprise : carburant et péages payés par NeoDrive. Remboursement : le livreur avance tout sur justificatifs.
  const payDriver = p.mode === "carte" ? driver + meals + hotel : total;
  return { liters, fuel, tolls, driver, days, meals, nights, hotel, total, payDriver };
}

export function mapsUrl(stops: Stop[]) {
  const pts = stops.map(s => `${s.lat},${s.lng}`);
  const origin = pts[0], destination = pts[pts.length - 1], way = pts.slice(1, -1).slice(0, 9);
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${way.length ? `&waypoints=${encodeURIComponent(way.join("|"))}` : ""}&travelmode=driving`;
}
