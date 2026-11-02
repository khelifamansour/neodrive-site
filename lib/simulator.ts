/** Simulateur de décision NeoDrive (Monte-Carlo, 36 mois).
 *  Chaque simulation tire au hasard la demande, la tendance du marché et l'effet réel de chaque levier
 *  (entre un minimum et un maximum issus de la recherche). Elle gère le stock, les commandes de conteneurs
 *  (4 mois de délai), la trésorerie (on ne commande que si on peut payer) et la capacité de livraison. */
import { unitMargin, type Params } from "./gestion";

export type Tri = [number, number, number]; // [min, le plus probable, max]
export type Lever = {
  id: string; name: string; group: "ventes" | "marge" | "capacite" | "argent" | "produit";
  what: string; evidence: string[]; difficulty: number; // 1 facile … 5 très dur seul
  delay: number; ramp: number;            // mois avant effet, mois pour atteindre l'effet plein
  demandPct?: Tri;                        // effet sur la demande de voitures (+0,2 = +20 %)
  demandAbs?: Tri;                        // voitures en plus par mois
  marginDelta?: number;                   // € HT de plus (ou de moins) sur chaque voiture
  feePct?: number;                        // frais en % du prix HT sur les ventes (ex. paiement en 4×)
  perExtraCar?: number;                   // coût par voiture apportée par ce levier (commission)
  fixed?: number;                         // € / mois
  invest?: number;                        // € une fois, au démarrage
  line?: { units: Tri; margin: number; stock: number; label: string }; // nouvelle activité (unités/mois, marge HT/unité, stock à financer)
  credit?: number; ratePct?: number;      // ligne de financement du stock (€) et taux annuel
  capacity?: number;                      // livraisons / mois en plus
};
export type SimCfg = {
  levers: string[]; baseDemand: number; trend: Tri; stock: number; soloCapacity: number;
  minCash: number; runs: number; leadMonths: number; season: number[];
};
export const DEFAULT_SIM: SimCfg = {
  levers: [], baseDemand: 18, trend: [-0.1, 0, 0.08], stock: 20, soloCapacity: 24, minCash: 10000, runs: 400, leadMonths: 4,
  season: [0.85, 0.9, 1.05, 1.05, 1.05, 1, 0.85, 0.8, 1.2, 1.1, 1, 1.05],
};

/** Leviers : effets min / probable / max issus de la recherche (sources dans « evidence »). Complétés après la recherche. */
export const LEVERS: Lever[] = [];

// ── Hasard reproductible
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function tri(r: () => number, [a, m, b]: Tri) { if (b <= a) return m; const u = r(), c = (m - a) / (b - a); return u < c ? a + Math.sqrt(u * (b - a) * (m - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - m)); }
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))]; };
const ramp = (L: Lever, m: number) => m < L.delay ? 0 : Math.min(1, (m - L.delay + 1) / Math.max(1, L.ramp));
const corpTax = (r: number) => r <= 0 ? 0 : Math.min(r, 42500) * 0.15 + Math.max(0, r - 42500) * 0.25;

export function simulate(p: Params, cfg: SimCfg, levers: Lever[] = LEVERS, startCash = p.bank + p.cashOnHand, seed = 7) {
  const act = levers.filter(l => cfg.levers.includes(l.id));
  const carHt = (p.priceTtc + p.deliveryTtc) / 1.2, landed = p.landedEstimate;
  const baseMargin = unitMargin(p) - 150 - 50 - 100 - 50; // pub, stockage, SAV, équipement (comme le business plan)
  const N = 36, R = Math.max(50, cfg.runs);
  const out = { profit: [] as number[], cashMin: [] as number[], sales36: [] as number[], salesTot: [] as number[], lostPct: [] as number[], broke: 0,
    salesM: Array.from({ length: N }, () => [] as number[]), cashM: Array.from({ length: N }, () => [] as number[]), lostStock: 0, lostCap: 0 };
  for (let k = 0; k < R; k++) {
    const r = rng(seed + k * 9973);
    const trend = tri(r, cfg.trend);
    const eff = act.map(L => ({ L, pct: L.demandPct ? tri(r, L.demandPct) : 0, abs: L.demandAbs ? tri(r, L.demandAbs) : 0, units: L.line ? tri(r, L.line.units) : 0 }));
    const credit = act.reduce((a, L) => a + (L.credit || 0), 0), rate = Math.max(0, ...act.map(L => L.ratePct || 0)) / 100;
    const marginDelta = act.reduce((a, L) => a + (L.marginDelta || 0), 0), fee = act.reduce((a, L) => a + (L.feePct || 0), 0) / 100;
    const fixed = p.fixedMonthly + p.salaryMonthly + act.reduce((a, L) => a + (L.fixed || 0), 0);
    let cash = startCash - act.reduce((a, L) => a + (L.invest || 0) + (L.line ? L.line.stock : 0), 0);
    let stock = cfg.stock, minC = cash, yearRes = 0, profit = 0, sold = 0, lost = 0, dem = 0;
    const arrivals = new Array(N + cfg.leadMonths + 1).fill(0), due = new Array(N + cfg.leadMonths + 1).fill(0);
    for (let m = 0; m < cfg.leadMonths; m++) arrivals[m] = Math.round(cfg.baseDemand); // conteneurs déjà en route
    const demandAt = (m: number, noise = 1) => {
      let d = cfg.baseDemand * Math.pow(1 + trend, m / 12) * cfg.season[m % 12] * noise;
      let extra = 0;
      for (const e of eff) { const w = ramp(e.L, m); d *= 1 + e.pct * w; extra += e.abs * w; }
      return { d: d + extra, extra };
    };
    for (let m = 0; m < N; m++) {
      const noise = Math.exp((r() - 0.5) * 0.3);
      const { d, extra } = demandAt(m, noise);
      const cap = cfg.soloCapacity + act.reduce((a, L) => a + (L.capacity || 0) * ramp(L, m), 0);
      stock += arrivals[m];
      const sales = Math.max(0, Math.min(d, stock, cap));
      if (d > sales) { lost += d - sales; if (stock <= cap) out.lostStock += d - sales; else out.lostCap += d - sales; }
      dem += d; stock -= sales; sold += sales;
      const extraShare = d > 0 ? Math.min(1, extra / d) : 0;
      const carCash = sales * (baseMargin + marginDelta + landed - fee * carHt) - sales * extraShare * act.reduce((a, L) => a + (L.perExtraCar || 0), 0);
      let lines = 0;
      for (const e of eff) if (e.L.line) lines += e.units * ramp(e.L, m) * e.L.line.margin;
      const interest = cash < 0 ? -cash * rate / 12 : 0;
      cash += carCash + lines - fixed - due[m] - interest;
      // Résultat comptable du mois (marge sur ventes, hors achats de stock)
      const res = sales * (baseMargin + marginDelta - fee * carHt) - sales * extraShare * act.reduce((a, L) => a + (L.perExtraCar || 0), 0) + lines - fixed - interest;
      yearRes += res;
      if (m % 12 === 11) { const t = corpTax(yearRes); cash -= t; profit += yearRes - t; yearRes = 0; }
      // Commande : couvrir la demande prévue à l'arrivée (+ 1 mois de sécurité), par conteneurs de 9, si la trésorerie le permet
      const a = m + cfg.leadMonths;
      if (a < N + cfg.leadMonths) {
        let pipe = stock; for (let j = m + 1; j < a; j++) pipe += arrivals[j] - demandAt(j).d;
        const need = demandAt(a).d * 2 - pipe - arrivals[a];
        let qn = Math.max(0, Math.ceil(need / 9) * 9);
        const committed = due.slice(m + 1).reduce((x, y) => x + y, 0);
        // Argent attendu d'ici l'arrivée (ventes prudentes à 80 %) moins les charges fixes
        let expectedIn = 0; for (let j = m + 1; j <= a && j < N; j++) expectedIn += Math.min(demandAt(j).d, cap) * 0.8 * (baseMargin + landed) - fixed;
        while (qn > 0 && cash - 0.3 * landed * qn - committed - 0.7 * landed * qn + expectedIn < cfg.minCash - credit) qn -= 9;
        if (qn > 0) { cash -= 0.3 * landed * qn; due[a] += 0.7 * landed * qn; arrivals[a] += qn; }
      }
      minC = Math.min(minC, cash);
      out.salesM[m].push(sales); out.cashM[m].push(cash);
    }
    out.profit.push(profit); out.cashMin.push(minC); out.sales36.push(out.salesM[N - 1][k]); out.salesTot.push(sold); out.lostPct.push(dem > 0 ? lost / dem : 0);
    if (minC < -credit) out.broke++;
  }
  const band = (xs: number[][]) => xs.map(v => ({ p10: q(v, 0.1), p50: q(v, 0.5), p90: q(v, 0.9) }));
  return {
    profit: { p10: q(out.profit, 0.1), p50: q(out.profit, 0.5), p90: q(out.profit, 0.9) },
    cashMin: { p10: q(out.cashMin, 0.1), p50: q(out.cashMin, 0.5) },
    sales36: q(out.sales36, 0.5), salesTot: q(out.salesTot, 0.5), lostPct: q(out.lostPct, 0.5),
    pBroke: out.broke / R, lostWhy: out.lostStock >= out.lostCap ? "stock (trésorerie)" : "livraison (capacité)",
    salesBand: band(out.salesM), cashBand: band(out.cashM),
    invest: act.reduce((a, L) => a + (L.invest || 0) + (L.line ? L.line.stock : 0), 0),
  };
}
export type SimResult = ReturnType<typeof simulate>;

/** Apport de chaque levier : profit médian avec tous les leviers choisis, moins sans ce levier. */
export function contributions(p: Params, cfg: SimCfg, levers: Lever[] = LEVERS) {
  const runs = Math.min(cfg.runs, 200), all = simulate(p, { ...cfg, runs }, levers).profit.p50;
  return cfg.levers.map(id => ({ id, gain: all - simulate(p, { ...cfg, runs, levers: cfg.levers.filter(x => x !== id) }, levers).profit.p50 })).sort((a, b) => b.gain - a.gain);
}
/** Recherche automatique : ajoute un par un les leviers qui augmentent le plus le profit médian,
 *  tant que le risque de manquer d'argent reste sous le seuil. */
export function optimizeLevers(p: Params, cfg: SimCfg, levers: Lever[] = LEVERS, maxRisk = 0.1, maxDifficulty = 5) {
  const runs = 150; let cur: string[] = []; let best = simulate(p, { ...cfg, runs, levers: cur }, levers);
  const pool = levers.filter(l => l.difficulty <= maxDifficulty).map(l => l.id);
  for (;;) {
    let pick: { id: string; r: SimResult } | null = null;
    for (const id of pool) {
      if (cur.includes(id)) continue;
      const r = simulate(p, { ...cfg, runs, levers: [...cur, id] }, levers);
      if (r.pBroke <= maxRisk && r.profit.p50 > (pick?.r.profit.p50 ?? best.profit.p50) + 2000) pick = { id, r };
    }
    if (!pick) break;
    cur = [...cur, pick.id]; best = pick.r;
  }
  return { levers: cur, result: best };
}
