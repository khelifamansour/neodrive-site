/**
 * Rentabilité NeoDrive (estimation de pilotage, pas une comptabilité officielle).
 * Calculs purs, utilisables côté serveur et côté navigateur (recalcul instantané quand on change une hypothèse).
 *
 * Tables Supabase (créées en SQL additif, RLS activé sans politique : accès serveur uniquement) :
 *   finance_settings (key text primary key, value jsonb, updated_at, updated_by) — ligne key = 'rentabilite'
 *   finance_expenses (id, month 'YYYY-MM', label, category, amount_ht, amount_ttc, note, created_by, created_at)
 */
import { REGISTRATION_PRICE, VEHICLES, deliveryPriceForDepartment, type VehicleKey } from "./neodrive-pricing";
import { vehicleStage, type Stage } from "./shipments";

/* ───────────── Hypothèses (modifiables sur la page) ───────────── */

export type Recurring = { label: string; amount: number; ttc: boolean };
export type ShipOverride = { freight_usd?: number | null; unit_price_usd?: number | null; other_eur?: number | null; duty_eur?: number | null };
export type VinOverride = { sale_ttc?: number | null; model?: VehicleKey | null };
export type Settings = {
  usd: number;               // 1 $ = x €
  dutyPct: number;           // droits de douane, % de la valeur CIF (usine + fret)
  forwarder: number;         // honoraires transitaire par conteneur (€ HT)
  unloading: number;         // dépotage par conteneur (€ HT)
  otherPerContainer: number; // autres frais par conteneur (port, transfert vers dépôt…) (€ HT)
  storage: number;           // stockage €/voiture/mois
  deliveryCost: number;      // coût réel d'une livraison sans données de tournée (€)
  registrationCost: number;  // coût réel de la carte grise (les 150 € facturés sont un service)
  tva: number;               // TVA %
  defaultUnitUsd: number;    // prix usine par voiture quand il n'est pas encore saisi ($)
  defaultModel: VehicleKey;  // modèle supposé pour une voiture pas encore vendue
  extrasOnCars: boolean;     // accessoires de la facture usine répartis sur les voitures (sinon : ignorés)
  partsMarginPct: number;    // marge pièces quand le prix d'achat n'est pas connu (% du prix de vente HT)
  startMonth: string;        // premier mois du tableau mensuel (charges habituelles comptées à partir de ce mois)
  recurring: Recurring[];    // charges habituelles comptées chaque mois
  ships: Record<string, ShipOverride>;
  vins: Record<string, VinOverride>;
};

export const DEFAULT_SETTINGS: Settings = {
  usd: 0.92, dutyPct: 10, forwarder: 175, unloading: 1350, otherPerContainer: 0, storage: 15,
  deliveryCost: 150, registrationCost: 0, tva: 20, defaultUnitUsd: 1771, defaultModel: "confort",
  extrasOnCars: true, partsMarginPct: 40, startMonth: "",
  recurring: [
    { label: "Loyer dépôt", amount: 200, ttc: false },
    { label: "Leboncoin (publicité)", amount: 1000, ttc: true },
    { label: "Équipe à distance", amount: 0, ttc: false },
  ],
  ships: {}, vins: {},
};

const fin = (v: unknown, d: number) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const optNum = (v: unknown) => v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
const isModel = (v: unknown): v is VehicleKey => typeof v === "string" && v in VEHICLES;

/** Nettoie des réglages reçus (navigateur ou base) en gardant les valeurs par défaut pour ce qui manque. */
export function cleanSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const D = DEFAULT_SETTINGS;
  const ships: Record<string, ShipOverride> = {};
  for (const [k, v] of Object.entries(r.ships && typeof r.ships === "object" ? r.ships : {})) {
    if (!/^\d{1,9}$/.test(k) || !v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    ships[k] = { freight_usd: optNum(o.freight_usd), unit_price_usd: optNum(o.unit_price_usd), other_eur: optNum(o.other_eur), duty_eur: optNum(o.duty_eur) };
  }
  const vins: Record<string, VinOverride> = {};
  for (const [k, v] of Object.entries(r.vins && typeof r.vins === "object" ? r.vins : {})) {
    if (!/^[A-Z0-9-]{1,40}$/.test(k) || !v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    vins[k] = { sale_ttc: optNum(o.sale_ttc), model: isModel(o.model) ? o.model : null };
  }
  return {
    usd: Math.max(0.01, fin(r.usd, D.usd)), dutyPct: Math.max(0, fin(r.dutyPct, D.dutyPct)),
    forwarder: Math.max(0, fin(r.forwarder, D.forwarder)), unloading: Math.max(0, fin(r.unloading, D.unloading)),
    otherPerContainer: Math.max(0, fin(r.otherPerContainer, D.otherPerContainer)), storage: Math.max(0, fin(r.storage, D.storage)),
    deliveryCost: Math.max(0, fin(r.deliveryCost, D.deliveryCost)), registrationCost: Math.max(0, fin(r.registrationCost, D.registrationCost)),
    tva: Math.min(100, Math.max(0, fin(r.tva, D.tva))), defaultUnitUsd: Math.max(0, fin(r.defaultUnitUsd, D.defaultUnitUsd)),
    defaultModel: isModel(r.defaultModel) ? r.defaultModel : D.defaultModel,
    extrasOnCars: typeof r.extrasOnCars === "boolean" ? r.extrasOnCars : D.extrasOnCars,
    partsMarginPct: Math.min(100, Math.max(0, fin(r.partsMarginPct, D.partsMarginPct))),
    startMonth: /^\d{4}-\d{2}$/.test(String(r.startMonth || "")) ? String(r.startMonth) : "",
    recurring: Array.isArray(r.recurring) ? r.recurring.slice(0, 30).map((x: any) => ({ label: String(x?.label || "").slice(0, 80), amount: Math.max(0, fin(x?.amount, 0)), ttc: !!x?.ttc })).filter((x: Recurring) => x.label) : D.recurring,
    ships, vins,
  };
}

/* ───────────── Données brutes (envoyées par l'API) ───────────── */

export type RawShip = { id: number; name: string; port: string | null; status: string | null; vehicles: number | null; unit_price: number | string | null; extra_lines: unknown; container_list: unknown; invoice_part: string | null; eta: string | null; arrived_at: string | null; loaded_at: string | null; depot: string | null; model: string | null };
export type RawDoc = { shipment_id: number; doc_type: string; version: string | null; created_at: string | null; ai_note: string | null; file_name: string | null };
export type RawVehicle = { id: number; shipment_id: number; vin: string; container: string | null; status: string | null; depot: string | null; client_id: string | null; client_name: string | null; depot_at: string | null; delivered_at: string | null; updated_at: string | null };
export type RawClient = { id: string; modele: string; code_postal: string; total: number | null; status: string; tour_id: string | null; name: string };
export type RawTour = { id: string; name: string; status: string; clients: number; cost: number | null };
export type RawPartsOrder = { created_at: string; updated_at: string | null; status: string; total_ht: number | string | null; shipping_ht: number | string | null; lines: unknown };
export type RawExpense = { id: number; month: string; label: string; category: string; amount_ht: number | string; amount_ttc: number | string | null; note: string | null; created_by: string | null; created_at: string };
export type RawData = { ships: RawShip[]; docs: RawDoc[]; vehicles: RawVehicle[]; clients: RawClient[]; tours: RawTour[]; partsOrders: RawPartsOrder[]; partsCost: Record<string, number>; expenses: RawExpense[] };

/* ───────────── Outils ───────────── */

/** Lit un montant en dollars dans une note (« Facture de fret … : 4 792 $ (O/F 3 850… »). Prend le premier montant suivi de $. */
export function parseUsd(note: string | null | undefined): number | null {
  const m = String(note || "").match(/(\d{1,3}(?:[   .,]\d{3})+|\d+)(?:,(\d{1,2}))?\s*(?:\$|USD)/);
  if (!m) return null;
  const n = Number(m[1].replace(/[   .,]/g, "") + (m[2] ? "." + m[2] : ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}
/** Total en dollars dans « … = USD 19,596.00 (invoice total …) ». */
export function parseInvoicePart(s: string | null | undefined): number | null {
  const m = String(s || "").match(/=\s*USD\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return null; const n = Number(m[1].replace(/,/g, "")); return Number.isFinite(n) && n > 0 ? n : null;
}
export const monthOf = (d: string | null | undefined) => d && /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : null;
export const monthKeyNow = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
export function nextMonth(m: string) { const [y, mo] = m.split("-").map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`; }
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const monthLabel = (m: string) => { const [y, mo] = m.split("-").map(Number); return `${MONTHS_FR[mo - 1] || "?"} ${y}`; };

/** Modèle d'après le libellé de la réservation (« NeoDrive Confort Plus »…). */
export function modelFromLabel(s: string | null | undefined): VehicleKey | null {
  const t = String(s || "").toLowerCase();
  if (/plus/.test(t)) return "confortPlus";
  if (/confort/.test(t)) return "confort";
  if (/essenti/.test(t)) return "essentielle";
  return null;
}

/* ───────────── Résultats ───────────── */

export type ShipCalc = {
  id: number; name: string; port: string; status: string; cars: number; containers: number; vinsKnown: number;
  unitUsd: number; unitEstimated: boolean; factoryUsd: number; extrasUsd: number; extrasCounted: number;
  freightUsd: number | null; freightSource: "manuel" | "document" | "manquant";
  factoryEur: number; freightEur: number; dutyEur: number; dutyManual: boolean; forwarderEur: number; unloadingEur: number; otherEur: number;
  total: number; perCar: number; warnings: string[];
};
export type CarCalc = {
  key: string; vin: string | null; shipId: number; shipName: string; container: string | null; stage: Stage; client: string | null;
  model: VehicleKey; modelSource: "réservation" | "manuel" | "par défaut"; landed: number; storageMonths: number; storage: number;
  saleTtc: number; saleHt: number; deliveryBilledTtc: number; deliveryBilledHt: number; deliveryCost: number; deliverySource: "tournée" | "par défaut" | "aucune";
  regBilledHt: number; regCost: number; revenueHt: number; costTotal: number; margin: number; delivered: boolean; deliveredMonth: string | null; sold: boolean;
};
export type MonthRow = {
  month: string; carsDelivered: number; carsRevenueHt: number; carsMargin: number;
  partsOrders: number; partsRevenueHt: number; partsMargin: number; partsEstimated: boolean;
  recurringHt: number; expensesHt: number; net: number; cumul: number;
};
export type Result = {
  settings: Settings; ships: ShipCalc[]; cars: CarCalc[]; months: MonthRow[];
  ytd: { year: string; carsDelivered: number; carsMargin: number; partsMargin: number; fixed: number; net: number };
  stock: { atDepot: number; atDepotCars: number; transit: number; transitCars: number; reservedCars: number; freeCars: number; expectedMargin: number };
  pendingParts: { count: number; ht: number };
  avgMarginPerCar: number; breakEvenCars: number; recurringMonthlyHt: number;
};

const ht = (ttc: number, tva: number) => ttc / (1 + tva / 100);

export function compute(raw: RawData, s: Settings, now = new Date()): Result {
  const nowMs = now.getTime();
  const clients = new Map(raw.clients.map(c => [c.id, c]));
  const tours = new Map(raw.tours.map(t => [t.id, t]));

  /* — Conteneurs — */
  const ships: ShipCalc[] = raw.ships.map(sh => {
    const o = s.ships[String(sh.id)] || {};
    const cars = Math.max(0, Number(sh.vehicles) || 0);
    const containers = Math.max(1, Array.isArray(sh.container_list) ? sh.container_list.length : 0);
    const warnings: string[] = [];
    const unitDb = optNum(sh.unit_price);
    const unitUsd = o.unit_price_usd ?? unitDb ?? s.defaultUnitUsd;
    const unitEstimated = o.unit_price_usd == null && unitDb == null;
    if (unitEstimated) warnings.push(`Prix usine non saisi : ${s.defaultUnitUsd} $ par voiture supposé.`);
    const extras = (Array.isArray(sh.extra_lines) ? sh.extra_lines : []) as { qty?: number; price?: number }[];
    const extrasUsd = extras.reduce((t, l) => t + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
    const extrasCounted = s.extrasOnCars ? extrasUsd : 0;
    const factoryUsd = unitUsd * cars + extrasCounted;
    const partTotal = parseInvoicePart(sh.invoice_part);
    if (partTotal && !unitEstimated && o.unit_price_usd == null && Math.abs(partTotal - (unitUsd * cars + extrasUsd)) > 1) warnings.push(`La facture indique ${partTotal} $, le calcul donne ${Math.round(unitUsd * cars + extrasUsd)} $ : à vérifier.`);
    if (/accessoire/i.test(sh.name) && !extrasUsd) warnings.push("Le nom du dossier parle d'accessoires mais aucun montant n'est saisi.");
    // Fret : saisi à la main, sinon lu dans la facture de transport (dernière version)
    const tDocs = raw.docs.filter(d => d.shipment_id === sh.id && d.doc_type === "transport").sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const tDoc = tDocs.find(d => d.version === "corrigée") || tDocs[0];
    const docFreight = tDoc ? parseUsd(tDoc.ai_note) : null;
    const freightUsd = o.freight_usd ?? docFreight;
    const freightSource: ShipCalc["freightSource"] = o.freight_usd != null ? "manuel" : docFreight != null ? "document" : "manquant";
    if (freightSource === "manquant") warnings.push("Fret inconnu (pas de facture de transport lisible) : comptez-le à la main.");
    const factoryEur = factoryUsd * s.usd;
    const freightEur = (freightUsd || 0) * s.usd;
    const dutyManual = o.duty_eur != null;
    const dutyEur = dutyManual ? Number(o.duty_eur) : (factoryEur + freightEur) * s.dutyPct / 100;
    const forwarderEur = s.forwarder * containers, unloadingEur = s.unloading * containers;
    const otherEur = s.otherPerContainer * containers + (o.other_eur || 0);
    const total = factoryEur + freightEur + dutyEur + forwarderEur + unloadingEur + otherEur;
    const vinsKnown = raw.vehicles.filter(v => v.shipment_id === sh.id).length;
    if (vinsKnown < cars) warnings.push(`${cars - vinsKnown} VIN pas encore saisi(s) : ces voitures sont comptées quand même.`);
    return { id: sh.id, name: sh.name, port: sh.port || "", status: sh.status || "", cars, containers, vinsKnown, unitUsd, unitEstimated, factoryUsd, extrasUsd, extrasCounted, freightUsd, freightSource, factoryEur, freightEur, dutyEur, dutyManual, forwarderEur, unloadingEur, otherEur, total, perCar: cars ? total / cars : 0, warnings };
  });

  /* — Voitures — */
  const cars: CarCalc[] = [];
  const carFrom = (sh: RawShip, calc: ShipCalc, v: RawVehicle | null, idx: number) => {
    const stage: Stage = v ? vehicleStage(v, sh) : vehicleStage({ status: null }, sh);
    const c = v?.client_id ? clients.get(v.client_id) : undefined;
    const ov = (v && s.vins[v.vin]) || {};
    const delivered = stage === "livrée";
    let model: VehicleKey = s.defaultModel; let modelSource: CarCalc["modelSource"] = "par défaut";
    if (ov.model) { model = ov.model; modelSource = "manuel"; }
    else { const m = c ? modelFromLabel(c.modele) : null; if (m) { model = m; modelSource = "réservation"; } }
    const deliveryBilledTtc = c ? (deliveryPriceForDepartment(String(c.code_postal || "").slice(0, 2)) || 0) : 0;
    let saleTtc: number = VEHICLES[model].price; let regTtc = 0;
    if (c?.total) {
      const rest = c.total - deliveryBilledTtc;
      if (rest - saleTtc >= REGISTRATION_PRICE - 1) regTtc = REGISTRATION_PRICE;
      if (modelSource === "par défaut") saleTtc = Math.max(0, rest - regTtc);
    }
    if (ov.sale_ttc != null) saleTtc = ov.sale_ttc;
    // Coût réel de livraison : part de la tournée (coût total ÷ nombre de clients), sinon forfait
    let deliveryCost = 0; let deliverySource: CarCalc["deliverySource"] = "aucune";
    if (c || delivered) {
      const t = c?.tour_id ? tours.get(c.tour_id) : undefined;
      if (t && t.cost != null && t.clients > 0) { deliveryCost = t.cost / t.clients; deliverySource = "tournée"; }
      else { deliveryCost = s.deliveryCost; deliverySource = "par défaut"; }
    }
    const regCost = regTtc ? s.registrationCost : 0;
    // Stockage : de l'arrivée au dépôt jusqu'à la livraison (ou aujourd'hui)
    const startD = v?.depot_at ? new Date(v.depot_at).getTime() : (stage === "au dépôt" || stage === "chargée" || stage === "livrée") && (sh.arrived_at || sh.eta) ? new Date(sh.arrived_at || sh.eta!).getTime() + 7 * 864e5 : null;
    const endD = delivered ? new Date(v?.delivered_at || v?.updated_at || now.toISOString()).getTime() : nowMs;
    const storageMonths = startD ? Math.max(0, (endD - startD) / (30 * 864e5)) : 0;
    const storage = storageMonths * s.storage;
    const saleHt = ht(saleTtc, s.tva), deliveryBilledHt = ht(deliveryBilledTtc, s.tva), regBilledHt = ht(regTtc, s.tva);
    const revenueHt = saleHt + deliveryBilledHt + regBilledHt;
    const costTotal = calc.perCar + storage + deliveryCost + regCost;
    cars.push({
      key: v ? `v${v.id}` : `s${sh.id}-${idx}`, vin: v?.vin || null, shipId: sh.id, shipName: sh.name, container: v?.container || null, stage, client: v?.client_name || null,
      model, modelSource, landed: calc.perCar, storageMonths, storage, saleTtc, saleHt, deliveryBilledTtc, deliveryBilledHt, deliveryCost, deliverySource,
      regBilledHt, regCost, revenueHt, costTotal, margin: revenueHt - costTotal, delivered,
      deliveredMonth: delivered ? monthOf(v?.delivered_at || v?.updated_at) : null, sold: !!v?.client_id || delivered,
    });
  };
  for (const sh of raw.ships) {
    const calc = ships.find(x => x.id === sh.id)!;
    const vs = raw.vehicles.filter(v => v.shipment_id === sh.id);
    vs.forEach((v, i) => carFrom(sh, calc, v, i));
    for (let i = vs.length; i < calc.cars; i++) carFrom(sh, calc, null, i);
  }

  /* — Pièces — */
  const partsOk = new Set(["payée", "préparée", "expédiée", "livrée"]);
  const partsByMonth = new Map<string, { n: number; ht: number; margin: number; est: boolean }>();
  let pendingCount = 0, pendingHt = 0;
  for (const o of raw.partsOrders) {
    const totalHt = Number(o.total_ht) || 0;
    if (o.status === "nouvelle" || o.status === "proforma envoyée") { pendingCount++; pendingHt += totalHt; continue; }
    if (!partsOk.has(o.status)) continue;
    const m = monthOf(o.created_at); if (!m) continue;
    const lines = (Array.isArray(o.lines) ? o.lines : []) as { sku?: string; qty?: number; unit_ht?: number }[];
    let margin = 0, est = false;
    for (const l of lines) {
      const sale = (Number(l.qty) || 0) * (Number(l.unit_ht) || 0);
      const buy = l.sku ? raw.partsCost[l.sku] : undefined;
      if (buy != null && buy > 0) margin += sale - (Number(l.qty) || 0) * buy; // prix d'achat supposé en € HT
      else { margin += sale * s.partsMarginPct / 100; est = true; }
    }
    const cur = partsByMonth.get(m) || { n: 0, ht: 0, margin: 0, est: false };
    cur.n++; cur.ht += totalHt; cur.margin += margin; cur.est = cur.est || est;
    partsByMonth.set(m, cur);
  }

  /* — Mois — */
  const recurringMonthlyHt = s.recurring.reduce((t, r) => t + (r.ttc ? ht(r.amount, s.tva) : r.amount), 0);
  const firstLoaded = raw.ships.map(x => monthOf(x.loaded_at)).filter(Boolean).sort()[0] as string | undefined;
  const nowM = monthKeyNow(now);
  const start = s.startMonth || firstLoaded || nowM;
  const allMonths = [start, nowM, ...raw.expenses.map(e => e.month), ...cars.map(c => c.deliveredMonth || ""), ...partsByMonth.keys()].filter(m => /^\d{4}-\d{2}$/.test(m));
  const first = allMonths.sort()[0]; const last = allMonths.sort().slice(-1)[0];
  const months: MonthRow[] = [];
  let cumul = 0;
  for (let m = first, guard = 0; m <= last && guard < 60; m = nextMonth(m), guard++) {
    const dc = cars.filter(c => c.deliveredMonth === m);
    const p = partsByMonth.get(m);
    const recurringHt = m >= start ? recurringMonthlyHt : 0;
    const expensesHt = raw.expenses.filter(e => e.month === m).reduce((t, e) => t + (Number(e.amount_ht) || 0), 0);
    const carsMargin = dc.reduce((t, c) => t + c.margin, 0);
    const net = carsMargin + (p?.margin || 0) - recurringHt - expensesHt;
    cumul += net;
    months.push({ month: m, carsDelivered: dc.length, carsRevenueHt: dc.reduce((t, c) => t + c.revenueHt, 0), carsMargin, partsOrders: p?.n || 0, partsRevenueHt: p?.ht || 0, partsMargin: p?.margin || 0, partsEstimated: !!p?.est, recurringHt, expensesHt, net, cumul });
  }
  const year = nowM.slice(0, 4);
  const ym = months.filter(r => r.month.startsWith(year) && r.month <= nowM);
  const ytd = { year, carsDelivered: ym.reduce((t, r) => t + r.carsDelivered, 0), carsMargin: ym.reduce((t, r) => t + r.carsMargin, 0), partsMargin: ym.reduce((t, r) => t + r.partsMargin, 0), fixed: ym.reduce((t, r) => t + r.recurringHt + r.expensesHt, 0), net: ym.reduce((t, r) => t + r.net, 0) };

  /* — Stock — */
  const notDelivered = cars.filter(c => !c.delivered);
  const atDepotL = notDelivered.filter(c => c.stage === "au dépôt" || c.stage === "chargée");
  const transitL = notDelivered.filter(c => c.stage === "en mer" || c.stage === "au port");
  const sum = (l: CarCalc[], f: (c: CarCalc) => number) => l.reduce((t, c) => t + f(c), 0);
  const stock = { atDepot: sum(atDepotL, c => c.landed + c.storage), atDepotCars: atDepotL.length, transit: sum(transitL, c => c.landed), transitCars: transitL.length, reservedCars: notDelivered.filter(c => c.sold).length, freeCars: notDelivered.filter(c => !c.sold).length, expectedMargin: sum(notDelivered, c => c.margin) };
  const avgMarginPerCar = cars.length ? sum(cars, c => c.margin) / cars.length : 0;
  return { settings: s, ships, cars, months, ytd, stock, pendingParts: { count: pendingCount, ht: pendingHt }, avgMarginPerCar, breakEvenCars: avgMarginPerCar > 0 ? recurringMonthlyHt / avgMarginPerCar : 0, recurringMonthlyHt };
}

/** Tableau mensuel en CSV (séparateur « ; », virgule décimale : s'ouvre directement dans Excel en français). */
export function monthsCsv(r: Result) {
  const f = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");
  const head = ["Mois", "Voitures livrées", "CA voitures HT", "Marge voitures", "Commandes pièces", "CA pièces HT", "Marge pièces", "Marge pièces estimée", "Charges habituelles HT", "Autres dépenses HT", "Résultat estimé", "Cumul"];
  const rows = r.months.map(m => [m.month, String(m.carsDelivered), f(m.carsRevenueHt), f(m.carsMargin), String(m.partsOrders), f(m.partsRevenueHt), f(m.partsMargin), m.partsEstimated ? "oui" : "non", f(m.recurringHt), f(m.expensesHt), f(m.net), f(m.cumul)]);
  return "﻿" + [head, ...rows].map(l => l.map(c => /[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(";")).join("\r\n");
}
