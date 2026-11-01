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
  havreSiteRent: number; havreSiteUnload: number; maxPerMonth: number; landedEstimate: number;
};
export type Gestion = { params: Params; hubs: Hub[]; lots: Lot[]; containers: Container[]; payments: Payment[]; quarters: Quarter[]; updated_at?: string };

// ── Dates
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
export const mondayOf = (s: string) => { const d = new Date(s + "T12:00:00"); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return iso(d); };
export const fr = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
export const monthOf = (s: string) => s.slice(0, 7);
const MOIS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
/** Périodes de 3 mois glissantes à partir du mois en cours (P1 = ce mois + 2 suivants). */
export function periodOf(s: string, today = iso(new Date())) {
  const [y0, m0] = today.split("-").map(Number), [y, m] = s.split("-").map(Number);
  const k = Math.max(0, Math.floor(((y - y0) * 12 + (m - m0)) / 3));
  const a = (m0 - 1 + 3 * k) % 12, b = (a + 2) % 12, ya = y0 + Math.floor((m0 - 1 + 3 * k) / 12);
  return `P${k + 1} · ${MOIS[a]} → ${MOIS[b]} ${String(ya + (b < a ? 1 : 0)).slice(2)}`;
}
export const quarterOf = (s: string) => periodOf(s);

/** Situation transmise le 1er novembre 2026 (modifiable dans l'outil). */
export function situationContainers(): Container[] {
  const C = (id: string, label: string, cars: number, port: Port, hubId: string, orderDate: string, etaHub: string | undefined, dp: boolean, bp: boolean, fp: boolean): Container =>
    ({ id, label, cars, port, hubId, orderDate, etaHub, depositPaid: dp, balancePaid: bp, freightPaid: fp, arrivalPaid: false });
  return [
    C("nov-h1", "Novembre · Le Havre 1", 9, "havre", "boran", "2026-07-01", "2026-11-20", true, true, true),
    C("nov-h2", "Novembre · Le Havre 2", 9, "havre", "boran", "2026-07-01", "2026-11-20", true, true, true),
    C("nov-f1", "Novembre · Fos", 9, "fos", "lamasquere", "2026-07-01", "2026-11-25", true, true, true),
    C("dec-h1", "Décembre · Le Havre 1", 9, "havre", "boran", "2026-08-01", "2026-12-15", true, true, false),
    C("dec-h2", "Décembre · Le Havre 2", 9, "havre", "boran", "2026-08-01", "2026-12-15", true, true, false),
    C("prod24-1", "Production 24 · lot 1 (+ 3 tricycles, 2 scooters)", 8, "havre", "boran", "2026-09-25", undefined, true, false, false),
    C("prod24-2", "Production 24 · lot 2", 8, "havre", "boran", "2026-09-25", undefined, true, false, false),
    C("prod24-3", "Production 24 · lot 3", 8, "fos", "lamasquere", "2026-09-25", undefined, true, false, false),
    C("prod9", "Production 9 (prêtes courant novembre)", 9, "havre", "boran", "2026-10-01", undefined, true, false, false),
    C("prod27-1", "Production 27 · lot 1", 9, "havre", "boran", "2026-10-20", undefined, true, false, false),
    C("prod27-2", "Production 27 · lot 2", 9, "havre", "boran", "2026-10-20", undefined, true, false, false),
    C("prod27-3", "Production 27 · lot 3", 9, "fos", "lamasquere", "2026-10-20", undefined, true, false, false),
  ];
}
export function situationLots(): Lot[] {
  return [
    { id: "ancien", label: "Ancien stock (à déstocker)", qty: 10, hubId: "lamasquere", status: "ancien", priceTtc: 4290 },
    { id: "vendues", label: "Vendues, pas encore livrées (mets le nombre)", qty: 0, hubId: "lamasquere", status: "vendu", priceTtc: 4990, deliveryDate: addDays(iso(new Date()), 7) },
    { id: "dispo", label: "Disponibles en stock (mets le nombre)", qty: 0, hubId: "boran", status: "dispo", priceTtc: 4990 },
  ];
}

export function defaultGestion(today = iso(new Date())): Gestion {
  const q = (n: number) => { const d = new Date(today + "T12:00:00"); d.setMonth(d.getMonth() + 3 * n); return periodOf(iso(d), today); };
  return {
    params: {
      bank: 18000, cashOnHand: 25000, fixedMonthly: 2000, salaryMonthly: 0,
      factory: 1540, deposit: 500, usd: 0.86, dutyPct: 10, agent: 200, freightUsd: { havre: 5000, fos: 6000 },
      warehouseTransfer: 400, unload: 830, fosToMuret: 1350,
      prodDays: 45, toPortDays: 10, seaDays: 54, customsDays: 2, transferDays: 10,
      priceTtc: 4990, deliveryTtc: 690, deliveryCost: 390, costPerKm: 0.65, carsPerTrip: 2,
      forecast: Array(12).fill(17), safety: 6, oldPerWeek: 3, adsDefault: 325, truckCost: 1800, truckCars: 13,
      havreSiteRent: 600, havreSiteUnload: 300, maxPerMonth: 3, landedEstimate: 2500,
    },
    hubs: [
      { id: "boran", name: "Boran-sur-Oise (Nord)", rentMonthly: 0, perCarMonthly: 25, capacity: 20, transferPerCar: 150, avgDeliveryKm: 250 },
      { id: "lamasquere", name: "Lamasquère (Sud)", rentMonthly: 200, perCarMonthly: 0, capacity: 18, transferPerCar: 300, avgDeliveryKm: 300 },
    ],
    lots: situationLots(), containers: situationContainers(), payments: [
      { id: "camions", label: "Solde petits camions (montant à compléter)", date: addDays(today, 14), amount: 0, done: false },
    ],
    quarters: [0, 1, 2, 3].map(i => ({ id: q(i), label: q(i), salesTarget: [51, 54, 60, 66][i], adsMonthly: [800, 1300, 1300, 1600][i], actualSales: 0 })),
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
export function project(g: Gestion, today = iso(new Date()), withSuggestions = true, factor = 1) {
  const p = g.params, W = 52, start = mondayOf(today);
  const weeks = Array.from({ length: W }, (_, i) => addDays(start, i * 7));
  const idx = (d: string) => { if (d < start) return 0; const i = Math.floor((new Date(d + "T12:00:00").getTime() - new Date(start + "T12:00:00").getTime()) / (7 * 864e5)); return i < W ? i : -1; };
  const suggestions: Container[] = [];
  const leadDays = p.prodDays + p.toPortDays + p.seaDays + p.customsDays + p.transferDays;
  const dispo0 = g.lots.filter(l => l.status === "dispo").reduce((a, l) => a + l.qty, 0);
  const forecastWeek = (i: number) => { const m = new Date(weeks[i] + "T12:00:00"); const k = (m.getFullYear() - new Date(start).getFullYear()) * 12 + m.getMonth() - new Date(start + "T12:00:00").getMonth(); return (p.forecast[Math.max(0, Math.min(11, k))] || 0) * factor * 12 / 52; };
  const arrivalsOf = (list: Container[]) => { const a = Array(W).fill(0); for (const c of list) { const i = idx(c.suggested ? addDays(c.orderDate, leadDays) : containerDates(p, c).hub); if (i >= 0) a[i] += c.cars; } return a; };

  // Commandes suggérées : maintenir le stock de sécurité au-delà du délai d'approvisionnement
  if (withSuggestions) {
    const leadW = Math.ceil(leadDays / 7);
    for (let guard = 0; guard < 30; guard++) {
      const arr = arrivalsOf([...g.containers, ...suggestions]); let st = dispo0, carry = 0, need = -1;
      for (let i = 0; i < W; i++) { st += arr[i]; carry += forecastWeek(i); const want = Math.floor(carry); const s = Math.min(st, want); carry -= want; st -= s; if (i >= leadW && st < p.safety) { need = i; break; } }
      if (need < 0) break;
      const sud = g.hubs.find(h => h.id === "lamasquere"), port: Port = suggestions.length % 2 === 1 && sud ? "fos" : "havre";
      let order = addDays(weeks[need], -leadDays); if (order < today) order = today;
      // pas plus de N conteneurs commandés le même mois
      while (suggestions.filter(x => monthOf(x.orderDate) === monthOf(order)).length >= p.maxPerMonth) order = addDays(order.slice(0, 7) + "-01", 32).slice(0, 7) + "-01";
      if (idx(addDays(order, leadDays)) < 0) break;
      suggestions.push({ id: `S${guard}`, label: `Commande suggérée ${guard + 1}`, cars: 9, port, hubId: port === "fos" ? "lamasquere" : "boran", orderDate: order, depositPaid: false, balancePaid: false, freightPaid: false, arrivalPaid: false, suggested: true });
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
      const q = g.quarters.find(x => x.id === periodOf(wk, today));
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
    rows.push({ start: wk, month, quarter: periodOf(wk, today), arrivals: arr[i], soldForecast: s, soldOld: so, delivered, lost, stock, inflow, outflow, cash, lines });
  }
  const min = rows.reduce((a, r) => r.cash < a.cash ? r : a, rows[0]);
  const quarters = Array.from(new Set(rows.map(r => r.quarter))).map(qid => {
    const rr = rows.filter(r => r.quarter === qid);
    return { id: qid, sold: rr.reduce((a, r) => a + r.delivered, 0), arrivals: rr.reduce((a, r) => a + r.arrivals, 0), inflow: rr.reduce((a, r) => a + r.inflow, 0), outflow: rr.reduce((a, r) => a + r.outflow, 0), endCash: rr[rr.length - 1].cash, minCash: Math.min(...rr.map(r => r.cash)), lost: rr.reduce((a, r) => a + r.lost, 0), orders: suggestions.filter(s => periodOf(s.orderDate, today) === qid).length + g.containers.filter(c => periodOf(c.orderDate, today) === qid && c.orderDate >= today).length, orderList: [...suggestions, ...g.containers.filter(c => c.orderDate >= today)].filter(s => periodOf(s.orderDate, today) === qid) };
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
