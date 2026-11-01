/** Gestion NeoDrive : stock, conteneurs, paiements, trésorerie semaine par semaine, plan trimestriel, distribution. */

export type Port = "havre" | "fos";
export type Hub = { id: string; name: string; rentMonthly: number; perCarMonthly: number; capacity: number; transferPerCar: number; avgDeliveryKm: number };
export type Lot = { id: string; label: string; qty: number; hubId: string; status: "dispo" | "vendu" | "ancien"; priceTtc: number; client?: string; deliveryDate?: string; paid?: boolean };
export type Container = {
  id: string; label: string; cars: number; port: Port; hubId: string; orderDate: string; etaHub?: string;
  depositPaid: boolean; balancePaid: boolean; freightPaid: boolean; arrivalPaid: boolean; note?: string; suggested?: boolean;
};
export type Payment = { id: string; label: string; date: string; amount: number; done: boolean };
export type Quarter = { id: string; label: string; salesTarget: number; adsMonthly: number; actualSales: number };
export type Params = {
  bank: number; cashOnHand: number; fixedMonthly: number; salaryMonthly: number;
  factory: number; deposit: number; usd: number; dutyPct: number; agent: number; freightUsd: Record<Port, number>;
  warehouseTransfer: number; unload: number; fosToMuret: number;
  prodDays: number; toPortDays: number; seaDays: number; customsDays: number; transferDays: number;
  priceTtc: number; deliveryTtc: number; deliveryCost: number; costPerKm: number; carsPerTrip: number;
  forecast: number[]; safety: number; oldPerWeek: number; adsDefault: number; truckCost: number; truckCars: number;
  havreSiteRent: number; havreSiteUnload: number;
};
export type Gestion = { params: Params; hubs: Hub[]; lots: Lot[]; containers: Container[]; payments: Payment[]; quarters: Quarter[]; updated_at?: string };

// ── Dates
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
export const mondayOf = (s: string) => { const d = new Date(s + "T12:00:00"); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return iso(d); };
export const fr = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
export const monthOf = (s: string) => s.slice(0, 7);
export const quarterOf = (s: string) => { const [y, m] = s.split("-").map(Number); return `T${Math.floor((m - 1) / 3) + 1} ${y}`; };

export function defaultGestion(today = iso(new Date())): Gestion {
  const q = (n: number) => { const d = new Date(today + "T12:00:00"); d.setMonth(d.getMonth() + 3 * n); return quarterOf(iso(d)); };
  return {
    params: {
      bank: 18000, cashOnHand: 25000, fixedMonthly: 2000, salaryMonthly: 0,
      factory: 1540, deposit: 500, usd: 0.86, dutyPct: 10, agent: 200, freightUsd: { havre: 5000, fos: 6000 },
      warehouseTransfer: 400, unload: 830, fosToMuret: 1350,
      prodDays: 45, toPortDays: 10, seaDays: 54, customsDays: 2, transferDays: 10,
      priceTtc: 4990, deliveryTtc: 690, deliveryCost: 390, costPerKm: 0.65, carsPerTrip: 2,
      forecast: Array(12).fill(17), safety: 6, oldPerWeek: 3, adsDefault: 325, truckCost: 1800, truckCars: 13,
      havreSiteRent: 600, havreSiteUnload: 300,
    },
    hubs: [
      { id: "boran", name: "Boran-sur-Oise (Nord)", rentMonthly: 0, perCarMonthly: 25, capacity: 20, transferPerCar: 150, avgDeliveryKm: 250 },
      { id: "lamasquere", name: "Lamasquère (Sud)", rentMonthly: 200, perCarMonthly: 0, capacity: 18, transferPerCar: 300, avgDeliveryKm: 300 },
    ],
    lots: [], containers: [], payments: [],
    quarters: [0, 1, 2, 3].map(i => ({ id: q(i), label: q(i), salesTarget: 51 + i * 6, adsMonthly: [800, 1300, 1300, 1600][i], actualSales: 0 })),
    updated_at: new Date().toISOString(),
  };
}

// ── Conteneurs : calendrier et paiements
export function containerDates(p: Params, c: Container) {
  const prodEnd = addDays(c.orderDate, p.prodDays);
  const departure = addDays(prodEnd, p.toPortDays);
  let portArrival = addDays(departure, p.seaDays);
  let hub = addDays(portArrival, p.customsDays + p.transferDays);
  if (c.etaHub) { hub = c.etaHub; portArrival = addDays(hub, -(p.customsDays + p.transferDays)); }
  return { prodEnd, departure, portArrival, freightDue: addDays(portArrival, -30), arrivalPay: addDays(portArrival, p.customsDays), hub, vatBack: addDays(portArrival, 35) };
}
export function logistics(p: Params, hubs: Hub[], c: { cars: number; port: Port; hubId: string }) {
  if (c.port === "fos") return p.fosToMuret + p.unload;
  const h = hubs.find(x => x.id === c.hubId);
  return p.warehouseTransfer + p.unload + c.cars * (h?.transferPerCar ?? 150);
}
export function containerCosts(p: Params, hubs: Hub[], c: Container) {
  const goods = c.cars * p.factory, freight = p.freightUsd[c.port] * p.usd, duty = (goods + freight) * p.dutyPct / 100;
  const vat = (goods + freight + duty) * 0.2, log = logistics(p, hubs, c);
  const landedPerCar = (goods + freight + duty + p.agent + log) / Math.max(1, c.cars);
  return { goods, freight, duty, vat, log, landedPerCar, deposit: c.cars * p.deposit, balance: c.cars * (p.factory - p.deposit), arrival: duty + p.agent + vat + log };
}

// ── Projection hebdomadaire (52 semaines)
export type Week = {
  start: string; month: string; quarter: string; arrivals: number; soldForecast: number; soldOld: number; delivered: number; lost: number; stock: number;
  inflow: number; outflow: number; cash: number; lines: Record<string, number>;
};
export function project(g: Gestion, today = iso(new Date()), withSuggestions = true) {
  const p = g.params, W = 52, start = mondayOf(today);
  const weeks = Array.from({ length: W }, (_, i) => addDays(start, i * 7));
  const idx = (d: string) => { if (d < start) return 0; const i = Math.floor((new Date(d + "T12:00:00").getTime() - new Date(start + "T12:00:00").getTime()) / (7 * 864e5)); return i < W ? i : -1; };
  const suggestions: Container[] = [];
  const leadDays = p.prodDays + p.toPortDays + p.seaDays + p.customsDays + p.transferDays;
  const dispo0 = g.lots.filter(l => l.status === "dispo").reduce((a, l) => a + l.qty, 0);
  const forecastWeek = (i: number) => { const m = new Date(weeks[i] + "T12:00:00"); const k = (m.getFullYear() - new Date(start).getFullYear()) * 12 + m.getMonth() - new Date(start + "T12:00:00").getMonth(); return (p.forecast[Math.max(0, Math.min(11, k))] || 0) * 12 / 52; };
  const arrivalsOf = (list: Container[]) => { const a = Array(W).fill(0); for (const c of list) { const i = idx(containerDates(p, c).hub); if (i >= 0) a[i] += c.cars; } return a; };

  // Commandes suggérées : maintenir le stock de sécurité au-delà du délai d'approvisionnement
  if (withSuggestions) {
    const leadW = Math.ceil(leadDays / 7);
    for (let guard = 0; guard < 30; guard++) {
      const arr = arrivalsOf([...g.containers, ...suggestions]); let st = dispo0, carry = 0, need = -1;
      for (let i = 0; i < W; i++) { st += arr[i]; carry += forecastWeek(i); const s = Math.min(st, Math.floor(carry)); carry -= s; st -= s; if (i >= leadW && st < p.safety) { need = i; break; } }
      if (need < 0) break;
      const sud = g.hubs.find(h => h.id === "lamasquere"), port: Port = suggestions.length % 2 === 1 && sud ? "fos" : "havre";
      const order = addDays(weeks[need], -leadDays);
      suggestions.push({ id: `S${guard}`, label: `Commande suggérée ${guard + 1}`, cars: 9, port, hubId: port === "fos" ? "lamasquere" : "boran", orderDate: order < today ? today : order, depositPaid: false, balancePaid: false, freightPaid: false, arrivalPaid: false, suggested: true });
    }
  }

  const all = [...g.containers, ...suggestions];
  const ev: Record<string, number>[] = Array.from({ length: W }, () => ({}));
  const add = (d: string, k: string, v: number) => { const i = idx(d); if (i >= 0 && v) ev[i][k] = (ev[i][k] || 0) + v; };
  const importVat = Array(W).fill(0);
  for (const c of all) {
    const d = containerDates(p, c), k = containerCosts(p, g.hubs, c), tag = c.suggested ? " (suggérées)" : "";
    if (!c.depositPaid) add(c.orderDate, "Acomptes usine" + tag, -k.deposit);
    if (!c.balancePaid) add(d.prodEnd, "Soldes usine" + tag, -k.balance);
    if (!c.freightPaid) add(d.freightDue, "Fret maritime" + tag, -k.freight);
    if (!c.arrivalPaid) {
      add(d.arrivalPay, "Douane + agent", -(k.duty + p.agent)); add(d.arrivalPay, "TVA import (avancée)", -k.vat); add(d.arrivalPay, "Dépotage + transferts", -k.log);
      const i = idx(d.arrivalPay); if (i >= 0) importVat[i] += k.vat;
    }
  }
  for (const x of g.payments) if (!x.done) add(x.date, x.label, x.amount);
  for (const l of g.lots) if (l.status === "vendu" && !l.paid) add(l.deliveryDate || addDays(today, 7), "Voitures vendues, livrées et encaissées", l.qty * (l.priceTtc + p.deliveryTtc));

  const arr = arrivalsOf(all);
  let stock = dispo0, old = g.lots.filter(l => l.status === "ancien").reduce((a, l) => a + l.qty, 0);
  const oldPrice = (() => { const o = g.lots.filter(l => l.status === "ancien"); const n = o.reduce((a, l) => a + l.qty, 0); return n ? o.reduce((a, l) => a + l.qty * l.priceTtc, 0) / n : 0; })();
  let cash = p.bank + p.cashOnHand, carry = 0, vatMonth = 0, vatCredit = 0, prevMonth = monthOf(weeks[0]);
  const rows: Week[] = [];
  const soldDelivered = (i: number) => g.lots.filter(l => l.status === "vendu").reduce((a, l) => a + (idx(l.deliveryDate || addDays(today, 7)) === i ? l.qty : 0), 0);
  for (let i = 0; i < W; i++) {
    const wk = weeks[i], month = monthOf(wk), lines = { ...ev[i] };
    if (month !== prevMonth || i === 0) {
      // début de mois : charges, pub, stockage, TVA du mois précédent
      const q = g.quarters.find(x => x.id === quarterOf(wk));
      lines["Charges fixes"] = -(p.fixedMonthly); if (p.salaryMonthly) lines["Ton salaire"] = -p.salaryMonthly;
      lines["Publicité"] = -(q?.adsMonthly ?? p.adsDefault);
      lines["Stockage hubs"] = -(g.hubs.reduce((a, h) => a + h.rentMonthly, 0) + stock * (g.hubs.reduce((a, h) => a + h.perCarMonthly, 0) / Math.max(1, g.hubs.length)));
      if (i > 0) { const net = vatMonth - vatCredit; if (net > 0) { lines["TVA à reverser"] = -net; vatCredit = 0; } else vatCredit = -net; vatMonth = 0; }
      prevMonth = month;
    }
    stock += arr[i];
    carry += forecastWeek(i); const s = Math.min(stock, Math.floor(carry)); const lost = Math.floor(carry) - s; carry -= Math.floor(carry); stock -= s;
    const so = Math.min(old, p.oldPerWeek); old -= so;
    if (s) lines["Ventes (TTC)"] = (lines["Ventes (TTC)"] || 0) + s * (p.priceTtc + p.deliveryTtc);
    if (so) lines["Déstockage ancien stock"] = so * (oldPrice + p.deliveryTtc);
    const delivered = s + so + soldDelivered(i);
    if (delivered) lines["Livraisons clients"] = -delivered * p.deliveryCost;
    const salesTtc = Object.entries(lines).filter(([k, v]) => v > 0 && /Ventes|Déstockage|vendues/.test(k)).reduce((a, [, v]) => a + v, 0);
    vatMonth += salesTtc / 6 - importVat[i];
    const inflow = Object.values(lines).filter(v => v > 0).reduce((a, v) => a + v, 0), outflow = Object.values(lines).filter(v => v < 0).reduce((a, v) => a + v, 0);
    cash += inflow + outflow;
    rows.push({ start: wk, month, quarter: quarterOf(wk), arrivals: arr[i], soldForecast: s, soldOld: so, delivered, lost, stock, inflow, outflow, cash, lines });
  }
  const min = rows.reduce((a, r) => r.cash < a.cash ? r : a, rows[0]);
  const quarters = Array.from(new Set(rows.map(r => r.quarter))).map(qid => {
    const rr = rows.filter(r => r.quarter === qid);
    return { id: qid, sold: rr.reduce((a, r) => a + r.delivered, 0), arrivals: rr.reduce((a, r) => a + r.arrivals, 0), inflow: rr.reduce((a, r) => a + r.inflow, 0), outflow: rr.reduce((a, r) => a + r.outflow, 0), endCash: rr[rr.length - 1].cash, minCash: Math.min(...rr.map(r => r.cash)), lost: rr.reduce((a, r) => a + r.lost, 0), orders: suggestions.filter(s => quarterOf(s.orderDate) === qid).length + g.containers.filter(c => quarterOf(c.orderDate) === qid && c.orderDate >= today).length };
  });
  return { rows, min, quarters, suggestions, leadDays };
}

// ── Distribution : coût logistique par voiture selon l'option
export function distributionOptions(p: Params, hubs: Hub[]) {
  const freightH = p.freightUsd.havre * p.usd, freightF = p.freightUsd.fos * p.usd, n = 9;
  const base = (fr: number) => { const goods = n * p.factory; const duty = (goods + fr) * p.dutyPct / 100; return (fr + duty + p.agent) / n; };
  const tripCost = (h: Hub) => (2 * h.avgDeliveryKm * p.costPerKm + 60) / Math.max(1, p.carsPerTrip);
  const boran = hubs.find(h => h.id === "boran") || hubs[0], sud = hubs.find(h => h.id === "lamasquere") || hubs[hubs.length - 1];
  return [
    { id: "havre-boran", label: "Le Havre → dépotage → Boran (voiture par voiture)", perCar: base(freightH) + (p.warehouseTransfer + p.unload) / n + boran.transferPerCar, delivery: tripCost(boran), storage: boran.perCarMonthly + boran.rentMonthly / Math.max(1, boran.capacity) },
    { id: "havre-camion", label: `Le Havre → dépotage → camion porte-voitures complet (${p.truckCars} voitures) → hub`, perCar: base(freightH) + (p.warehouseTransfer + p.unload) / n + p.truckCost / Math.max(1, p.truckCars), delivery: tripCost(boran), storage: boran.perCarMonthly },
    { id: "havre-site", label: "Terrain près du Havre (conteneur dépoté sur place, pas de transfert)", perCar: base(freightH) + p.havreSiteUnload / n + p.havreSiteRent / 18, delivery: (2 * (boran.avgDeliveryKm + 120) * p.costPerKm + 60) / Math.max(1, p.carsPerTrip), storage: 0 },
    { id: "havre-sud", label: "Le Havre → dépotage → Lamasquère (voiture par voiture)", perCar: base(freightH) + (p.warehouseTransfer + p.unload) / n + sud.transferPerCar, delivery: tripCost(sud), storage: sud.rentMonthly / Math.max(1, sud.capacity) },
    { id: "fos-sud", label: "Fos → conteneur entier jusqu'à Muret", perCar: base(freightF) + (p.fosToMuret + p.unload) / n, delivery: tripCost(sud), storage: sud.rentMonthly / Math.max(1, sud.capacity) },
  ].map(o => ({ ...o, total: o.perCar + o.delivery + o.storage }));
}
