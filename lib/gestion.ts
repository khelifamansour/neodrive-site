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
  havreSiteRent: number; havreSiteUnload: number; maxPerMonth: number; landedEstimate: number; scenLow: number; scenHigh: number; minCash: number; adsBase: number; salesBase: number; adsElasticity: number; freightInlandUsd: number;
};
export type Channel = { id: string; name: string; budget: number; cpa: number; max: number; fixed: number; note: string };
export type Dealers = { count: number; salesPerDealer: number; commission: number; max: number };
export type Gestion = { params: Params; hubs: Hub[]; lots: Lot[]; containers: Container[]; payments: Payment[]; quarters: Quarter[]; channels?: Channel[]; dealers?: Dealers; organic?: number; updated_at?: string };

/** Canaux de vente : hypothèses de départ à recaler avec les vrais chiffres (fichier Leboncoin, statistiques TikTok/Meta). */
export const DEFAULT_CHANNELS: Channel[] = [
  { id: "lbc", name: "Leboncoin (annonces + remontées)", budget: 325, cpa: 27, max: 35, fixed: 0, note: "60 € l’annonce 2 mois, 120 € avec remontée" },
  { id: "meta", name: "Facebook / Instagram (pubs)", budget: 0, cpa: 180, max: 20, fixed: 0, note: "Parents d’ados, 35-55 ans, rayon 150 km autour des hubs" },
  { id: "tiktok", name: "TikTok (vidéos + Spark Ads)", budget: 0, cpa: 150, max: 15, fixed: 0, note: "Vidéos de livraison et d’essai, ados 15-18 ans" },
  { id: "google", name: "Google Ads (recherche)", budget: 0, cpa: 200, max: 12, fixed: 0, note: "« voiture sans permis pas cher », « voiture sans permis neuve »" },
  { id: "presse", name: "Presse locale / radio", budget: 0, cpa: 400, max: 4, fixed: 0, note: "Articles et encarts autour des hubs" },
];
export const DEFAULT_DEALERS: Dealers = { count: 0, salesPerDealer: 1.5, commission: 300, max: 20 };

export function channelSales(c: Channel) { return c.budget <= 0 ? 0 : c.max * (1 - Math.exp(-c.budget / (c.cpa * c.max))); }
export function salesModel(g: Gestion) {
  const ch = (g.channels || DEFAULT_CHANNELS).map(c => ({ ...c, sales: channelSales(c), cost: c.budget > 0 ? c.budget + c.fixed : 0 }));
  const dl = g.dealers || DEFAULT_DEALERS, dealerSales = dl.count * dl.salesPerDealer;
  const organic = g.organic ?? 5;
  const total = organic + ch.reduce((a, c) => a + c.sales, 0) + dealerSales;
  const adsCost = ch.reduce((a, c) => a + c.cost, 0), dealerCost = dealerSales * dl.commission;
  return { ch, organic, dealerSales, total, adsCost, dealerCost, marketingCost: adsCost + dealerCost };
}

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
    C("nov-h1", "Novembre · Le Havre 1 (fret payé, reste douane + dépotage + transferts)", 9, "havre", "boran", "2026-07-01", "2026-11-14", true, true, true),
    C("nov-h2", "Novembre · Le Havre 2 (fret payé, reste douane + dépotage + transferts)", 9, "havre", "boran", "2026-07-01", "2026-11-24", true, true, true),
    C("nov-f1", "Novembre · Fos (fret payé, reste douane + dépotage + transport)", 9, "fos", "lamasquere", "2026-07-01", "2026-11-28", true, true, true),
    C("dec-h1", "Décembre · Le Havre 1 (voitures payées, reste fret + douane + dépotage)", 9, "havre", "boran", "2026-08-01", "2026-12-08", true, true, false),
    C("dec-h2", "Décembre · Le Havre 2 (voitures payées, reste fret + douane + dépotage)", 9, "havre", "boran", "2026-08-01", "2026-12-20", true, true, false),
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
    { id: "stock7a", label: "En stock, à livrer (≈ 5 500 € TTC livrée) — 1re vague", qty: 4, hubId: "lamasquere", status: "vendu", priceTtc: 4810, deliveryDate: "2026-11-09" },
    { id: "stock7b", label: "En stock, à livrer (≈ 5 500 € TTC livrée) — 2e vague", qty: 3, hubId: "boran", status: "vendu", priceTtc: 4810, deliveryDate: "2026-11-16" },
    { id: "dispo", label: "Disponibles en stock (mets le nombre)", qty: 0, hubId: "boran", status: "dispo", priceTtc: 4990 },
  ];
}

export function defaultGestion(today = iso(new Date())): Gestion {
  const q = (n: number) => { const d = new Date(today + "T12:00:00"); d.setMonth(d.getMonth() + 3 * n); return periodOf(iso(d), today); };
  return {
    params: {
      bank: 18000, cashOnHand: 27000, fixedMonthly: 2000, salaryMonthly: 0,
      factory: 1540, deposit: 500, usd: 0.86, dutyPct: 10, agent: 200, freightUsd: { havre: 5000, fos: 6000 },
      warehouseTransfer: 400, unload: 830, fosToMuret: 1350,
      prodDays: 45, toPortDays: 10, seaDays: 54, customsDays: 2, transferDays: 10,
      priceTtc: 4990, deliveryTtc: 690, deliveryCost: 390, costPerKm: 0.65, carsPerTrip: 2,
      forecast: Array(12).fill(17), safety: 6, oldPerWeek: 3, adsDefault: 325, truckCost: 1800, truckCars: 13,
      havreSiteRent: 600, havreSiteUnload: 300, maxPerMonth: 3, landedEstimate: 2500, scenLow: 0.7, scenHigh: 1.3, minCash: 10000, adsBase: 325, salesBase: 17, adsElasticity: 0.5, freightInlandUsd: 800,
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
/** Détail des frais d'arrivée d'un conteneur (hors douane). */
export function logisticsDetail(p: Params, hubs: Hub[], c: { cars: number; port: Port; hubId: string }): [string, number][] {
  if (c.port === "fos") return [["Transport du conteneur Fos → Muret", p.fosToMuret], ["Dépotage", p.unload]];
  const h = hubs.find(x => x.id === c.hubId);
  return [["Transfert du conteneur vers l’entrepôt de dépotage", p.warehouseTransfer], ["Dépotage", p.unload], [`Transfert des voitures vers ${h?.name.split(" (")[0] || "le hub"}`, c.cars * (h?.transferPerCar ?? 150)]];
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
  return { goods, freight, duty, vat, log, landedPerCar, deposit: c.cars * p.deposit, balance: c.cars * (p.factory - p.deposit), arrival: duty + p.agent + log };
}

// ── Projection hebdomadaire (52 semaines)
export type Week = {
  start: string; month: string; quarter: string; arrivals: number; soldForecast: number; soldOld: number; delivered: number; lost: number; stock: number;
  inflow: number; outflow: number; cash: number; lines: Record<string, number>;
};
/** Effet du budget pub sur les ventes : rendement décroissant (doubler la pub ne double pas les ventes). */
export function adsFactor(p: Params, adsMonthly: number) {
  if (!p.adsBase || adsMonthly <= 0) return adsMonthly <= 0 ? 0.6 : 1;
  return Math.pow(adsMonthly / p.adsBase, p.adsElasticity ?? 0.5);
}
export function project(g: Gestion, today = iso(new Date()), withSuggestions = true, factor = 1, adsOverride?: number) {
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
    const d = containerDates(p, c), k = containerCosts(p, g.hubs, c), name = c.suggested ? "nouvelle commande conseillée" : c.label.replace(/\s*\(.*\)$/, "");
    if (!c.depositPaid) add(c.orderDate, `Acompte usine · ${name}`, -k.deposit);
    if (!c.balancePaid) add(d.prodEnd, `Solde usine · ${name}`, -k.balance);
    if (!c.freightPaid) add(d.freightDue, `Fret maritime · ${name}`, -k.freight);
    if (!c.arrivalPaid) {
      // TVA à l'importation : autoliquidée (déclarée et déduite sur la même déclaration) → aucun décaissement
      add(d.arrivalPay, `Douane + agent · ${name}`, -(k.duty + p.agent));
      add(d.arrivalPay, `Dépotage + transport routier · ${name}`, -k.log);
    }
  }
  for (const x of g.payments) if (!x.done) add(x.date, x.label, x.amount);
  for (const l of g.lots) if (l.status === "vendu" && !l.paid) add(l.deliveryDate || addDays(today, 7), `Livraison et encaissement · ${l.qty} voiture${l.qty > 1 ? "s" : ""}${l.client ? " (" + l.client + ")" : ""}`, l.qty * (l.priceTtc + p.deliveryTtc));

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
      lines["Publicité"] = -(adsOverride ?? q?.adsMonthly ?? p.adsDefault);
      lines["Stockage hubs"] = -(g.hubs.reduce((a, h) => a + h.rentMonthly, 0) + stock * (g.hubs.reduce((a, h) => a + h.perCarMonthly, 0) / Math.max(1, g.hubs.length)));
      if (i > 0) { const net = vatMonth - vatCredit; if (net > 0) { lines["TVA collectée sur les ventes, reversée"] = -net; vatCredit = 0; } else vatCredit = -net; vatMonth = 0; }
      prevMonth = month;
    }
    stock += arr[i];
    carry += forecastWeek(i); const s = Math.min(stock, Math.floor(carry)); const lost = Math.floor(carry) - s; carry -= Math.floor(carry); stock -= s;
    const so = Math.min(old, p.oldPerWeek); old -= so;
    if (s) lines["Ventes (TTC)"] = (lines["Ventes (TTC)"] || 0) + s * (p.priceTtc + p.deliveryTtc);
    if (so) lines["Déstockage ancien stock"] = so * (oldPrice + p.deliveryTtc);
    const delivered = s + so + soldDelivered(i);
    if (delivered) lines["Livraisons clients"] = -delivered * p.deliveryCost;
    const salesTtc = Object.entries(lines).filter(([k, v]) => v > 0 && /Ventes|Déstockage|encaissement/.test(k)).reduce((a, [, v]) => a + v, 0);
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

// ── Recommandations : combien de stock injecter sans mettre la trésorerie en danger
export const MARKET = { newPerYear: 24977, usedPerYear: 42000, leaderPerYear: 7408, leader: "Citroën Ami" };
export function recommend(g: Gestion, today = iso(new Date()), ads?: number, adsModel = true) {
  const p = g.params, af = ads == null || !adsModel ? 1 : adsFactor(p, ads), low = (p.scenLow || 0.7) * af, high = (p.scenHigh || 1.3) * af, mid = af;
  const prob = project(g, today, true, mid, ads);
  const S = prob.suggestions.map(s => ({ ...s, suggested: false, label: s.label.replace("suggérée", "conseillée") }));
  // on garde le plus de commandes possible tant que le scénario défavorable reste au-dessus du seuil de trésorerie
  // seuil : la réserve voulue, ou le point bas qui existe déjà sans nouvelle commande s'il est plus bas
  const floor = Math.min(p.minCash, project(g, today, false, low, ads).min.cash) - 1;
  // on ajoute les commandes une par une, dans l'ordre : chacune est gardée si la trésorerie tient en vente lente
  const kept: Container[] = [], dropped: Container[] = [];
  for (const c of S) { const tryG = { ...g, containers: [...g.containers, ...kept, c] }; if (project(tryG, today, false, low, ads).min.cash >= floor) kept.push(c); else dropped.push(c); }
  const k = kept.length;
  const plan = { ...g, containers: [...g.containers, ...kept] };
  const defav = project(plan, today, false, low, ads), probable = project(plan, today, false, mid, ads), fav = project(plan, today, false, high, ads);
  const sum = (r: ReturnType<typeof project>, f: "sold" | "lost") => r.quarters.reduce((a, q) => a + q[f], 0);
  const soldYear = sum(probable, "sold");
  const recos: { level: "ok" | "warn" | "bad"; text: string }[] = [];
  const firstMin = defav.min;
  if (defav.min.cash < 0) recos.push({ level: "bad", text: `Même sans nouvelle commande, en vente lente la trésorerie passe à ${Math.round(defav.min.cash).toLocaleString("fr-FR")} € la semaine du ${fr(firstMin.start)}. Priorité : déstocker l’ancien stock, livrer les voitures vendues, négocier un délai sur un solde usine.` });
  else if (defav.min.cash < p.minCash * 2) recos.push({ level: "warn", text: `Point bas en vente lente : ${Math.round(defav.min.cash).toLocaleString("fr-FR")} € (semaine du ${fr(firstMin.start)}). Garde une réserve : ne commande pas plus que le plan ci-dessous avant cette date.` });
  else recos.push({ level: "ok", text: `Même en vente lente, la trésorerie ne descend pas sous ${Math.round(defav.min.cash).toLocaleString("fr-FR")} €. Tu peux suivre le plan de commandes sans risque.` });
  recos.push({ level: k < S.length ? "warn" : "ok", text: k < S.length ? `Plan prudent : ${k} conteneur(s) au lieu de ${S.length}. Les ${S.length - k} autres ne passent qu’avec plus de trésorerie (déstockage, acomptes clients ou financement).` : `Les ${k} commandes conseillées passent même en vente lente.` });
  const lostFav = sum(fav, "lost");
  if (lostFav > 0) recos.push({ level: "warn", text: `Si les ventes sont bonnes (+${Math.round((high - 1) * 100)} %), tu manqueras environ ${lostFav} voitures sur 12 mois : prends des réservations avec acompte sur les prochains arrivages, ou ajoute un conteneur dès que la trésorerie le permet.` });
  const lostProb = sum(probable, "lost");
  if (lostProb > 0) recos.push({ level: "warn", text: `Scénario probable : ${lostProb} ventes perdues faute de stock (surtout au début, délai de 4 mois). Vends en réservation avec acompte les voitures des conteneurs en route.` });
  const adsYear = (ads ?? g.quarters.reduce((a, q) => a + q.adsMonthly, 0) / Math.max(1, g.quarters.length)) * 12;
  const cps = adsYear / Math.max(1, soldYear);
  recos.push({ level: cps < 150 ? "ok" : "warn", text: cps < 150 ? `La pub coûte ≈ ${Math.round(cps)} € par vente : c’est très bas. Augmente les annonces Leboncoin (avec remontée) tant que ce coût reste sous 150 €.` : `La pub coûte ≈ ${Math.round(cps)} € par vente : vérifie quelles annonces vendent vraiment avant d’augmenter.` });
  const old = g.lots.filter(l => l.status === "ancien").reduce((a, l) => a + l.qty, 0);
  if (old) recos.push({ level: "warn", text: `${old} voitures d’ancien stock : les vendre en 3-4 semaines (4 290–4 490 € TTC, « disponible immédiatement ») apporte ≈ ${Math.round(old * 4300 / 1000)} 000 € au moment le plus tendu.` });
  const share = (soldYear * 12 / 12) / MARKET.newPerYear * 100, shareAll = soldYear / (MARKET.newPerYear + MARKET.usedPerYear) * 100;
  const unit = (p.priceTtc + p.deliveryTtc) / 1.2 - p.landedEstimate - p.deliveryCost;
  const salesMonth = soldYear / 12, marginMonth = salesMonth * unit - (ads ?? p.adsDefault) - p.fixedMonthly - p.salaryMonthly;
  return { salesMonth, marginMonth, unit, cps, adsFactor: af, plan: kept, dropped, defav, probable, fav, recos, soldYear, share, shareAll, lostFav, k, total: S.length };
}

// ── Outil de décision : scénarios fret × ventes, canaux marketing, points de vente, résumés et tâches
export const FREIGHT_SCEN: [string, number, string][] = [["Fret bas", 0.75, "partie maritime −25 % (creux 2026 : 2 400–2 800 $ spot Shanghai–Rotterdam) · usine → port Chine inchangé"], ["Fret normal", 1, "ton prix actuel : usine → port Chine ≈ 800 $ + maritime ≈ 4 200 $"], ["Fret haut", 1.5, "partie maritime +50 % (pic de juillet 2026 : 4 900 $ spot) · usine → port Chine inchangé"]];

export function scenarioGestion(g: Gestion, freightF = 1, salesOverride?: number): Gestion {
  const sm = salesModel(g), p = g.params;
  return { ...g, quarters: [], params: { ...p, forecast: Array(12).fill(salesOverride ?? sm.total), freightUsd: { havre: (p.freightInlandUsd ?? 800) + (p.freightUsd.havre - (p.freightInlandUsd ?? 800)) * freightF, fos: (p.freightInlandUsd ?? 800) + (p.freightUsd.fos - (p.freightInlandUsd ?? 800)) * freightF }, adsDefault: sm.marketingCost } };
}
export function unitMargin(p: Params, freightF = 1) {
  const extraFreight = (freightF - 1) * (p.freightUsd.havre - (p.freightInlandUsd ?? 800)) * p.usd / 9 * (1 + p.dutyPct / 100);
  return (p.priceTtc + p.deliveryTtc) / 1.2 - (p.landedEstimate + extraFreight) - p.deliveryCost;
}

type Proj = ReturnType<typeof project>;
function summarize(r: Proj, plan: Container[], real: Container[], p: Params, from: string, to: string, marketingMonthly: number, unit: number, initialCash: number) {
  const rows = r.rows.filter(x => x.start >= from && x.start < to), before = r.rows.filter(x => x.start < from);
  const months = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / (30.4 * 864e5)));
  const all = [...real, ...plan];
  const orders = all.filter(c => c.orderDate >= from && c.orderDate < to && c.orderDate >= iso(new Date(Date.now() - 864e5)));
  const enCours = all.filter(c => c.orderDate < to && containerDates(p, c).hub >= to);
  const sold = rows.reduce((a, x) => a + x.delivered, 0);
  type Task = { date: string; kind: "payer" | "recevoir" | "livrer" | "commander" | "vendre"; text: string; amount?: number };
  const tasks: Task[] = [];
  for (const x of rows) for (const [k, v] of Object.entries(x.lines)) {
    if (v < 0 && /usine|Fret|Douane|Dépotage/.test(k) && !/conseillée/.test(k)) tasks.push({ date: x.start, kind: "payer", text: k, amount: v });
    if (v > 0 && /encaissement/.test(k)) tasks.push({ date: x.start, kind: "livrer", text: k, amount: v });
    if (v > 0 && /Déstockage/.test(k)) tasks.push({ date: x.start, kind: "vendre", text: "Vendre l’ancien stock (déstockage)", amount: v });
  }
  for (const o of orders) tasks.push({ date: o.orderDate, kind: "commander", text: `Commander ${o.cars} voitures — ${o.port === "fos" ? "port de Fos, pour le Sud" : "port du Havre, pour le Nord"}`, amount: -o.cars * p.deposit });
  for (const c of all) { const h = containerDates(p, c).hub; if (h >= from && h < to) tasks.push({ date: h, kind: "recevoir", text: `Arrivée au hub : ${c.suggested ? "commande conseillée" : c.label.replace(/\s*\(.*\)$/, "")} (${c.cars} voitures) — prévenir les clients en attente` }); }
  tasks.sort((a, b) => a.date.localeCompare(b.date));
  return {
    from, to, months, orders, enCours, sold, arrivals: rows.reduce((a, x) => a + x.arrivals, 0), lost: rows.reduce((a, x) => a + x.lost, 0),
    cashStart: before.length ? before[before.length - 1].cash : initialCash, cashEnd: rows.length ? rows[rows.length - 1].cash : initialCash, cashMin: rows.length ? Math.min(...rows.map(x => x.cash)) : initialCash,
    marketing: marketingMonthly * months, margin: sold * unit - marketingMonthly * months - (p.fixedMonthly + p.salaryMonthly) * months, tasks,
  };
}

export function decide(g: Gestion, today = iso(new Date()), freightF = 1, scen = 1) {
  const sm = salesModel(g), g2 = scenarioGestion(g, freightF), p = g2.params;
  const r = recommend(g2, today, sm.marketingCost, false);
  const sel = [r.defav, r.probable, r.fav][scen], f = [p.scenLow ?? 0.7, 1, p.scenHigh ?? 1.3][scen];
  const unit = unitMargin(g.params, freightF);
  const addM = (n: number) => { const d = new Date(today + "T12:00:00"); d.setDate(1); d.setMonth(d.getMonth() + n); return iso(d); };
  const S = (from: string, to: string) => summarize(sel, r.plan, g.containers, p, from, to, sm.marketingCost, unit, p.bank + p.cashOnHand);
  return {
    sm, r, sel, unit, salesMonth: sm.total * f,
    month: S(addM(0), addM(1)), quarter: S(addM(1), addM(4)), year: S(addM(0), addM(12)),
    profitMonth: sm.total * f * unit - sm.marketingCost - p.fixedMonthly - p.salaryMonthly,
  };
}

/** Cherche la meilleure répartition du budget marketing et le nombre de points de vente, dans la limite du stock que la trésorerie peut financer. */
export function optimize(g: Gestion, today = iso(new Date()), freightF = 1) {
  const unit = unitMargin(g.params, freightF);
  // 1) capacité : ventes mensuelles finançables sans rupture ni passage sous le seuil en vente lente
  const mk = salesModel(g).marketingCost;
  const ok = (s: number) => { const r = recommend(scenarioGestion(g, freightF, s), today, mk, false); const sold = r.probable.quarters.reduce((a, q) => a + q.sold, 0), lost = r.probable.quarters.reduce((a, q) => a + q.lost, 0); return lost <= Math.max(6, 0.08 * sold); };
  let lo = 5, hi = 90; if (!ok(lo)) hi = lo; while (hi - lo > 1) { const m = Math.floor((lo + hi) / 2); if (ok(m)) lo = m; else hi = m; }
  const cap = lo;
  // 2) allocation gloutonne : à chaque pas, l'action qui rapporte le plus
  const ch = (g.channels || DEFAULT_CHANNELS).map(c => ({ ...c, budget: 0 })), dl = { ...(g.dealers || DEFAULT_DEALERS), count: 0 };
  const organic = g.organic ?? 5, step = 50;
  const total = () => organic + ch.reduce((a, c) => a + channelSales(c), 0) + dl.count * dl.salesPerDealer;
  for (let guard = 0; guard < 400; guard++) {
    if (total() >= cap) break;
    let best: { gain: number; act: () => void } | null = null;
    for (const c of ch) { const before = channelSales(c); const after = channelSales({ ...c, budget: c.budget + step }); const gain = (after - before) * unit - step - (c.budget === 0 ? c.fixed : 0); if (!best || gain > best.gain) best = { gain, act: () => { c.budget += step; } }; }
    if (dl.count < dl.max) { const gain = dl.salesPerDealer * (unit - dl.commission); if (!best || gain > best.gain) best = { gain, act: () => { dl.count += 1; } }; }
    if (!best || best.gain <= 0) break;
    best.act();
  }
  return { channels: ch, dealers: dl, cap, sales: Math.min(total(), cap) };
}
