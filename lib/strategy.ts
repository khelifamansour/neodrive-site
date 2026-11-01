/** Stratégie commerciale NeoDrive : Leboncoin, montée en charge, points de vente, prix, stockage. */
import { addDays, iso, project, recommend, type Container, type Gestion } from "./gestion";

export type Strat = {
  adsStart: number; adsEnd: number; rampMonths: number; remonteePct: number;
  dealersStart: number; dealersPerMonth: number; dealersMax: number; commission: number; priceUp: boolean; organic: number;
};
export type LbcModel = { adCost2m: number; remonteeCost2m: number; refAds: number; refSales: number; max: number; remonteeBoost: number };
export type DealerModel = { baseSales: number; refCommission: number; motivation: number; firstMonthFactor: number; priceSensitivity: number };
export type PriceModel = { increase: number; directDrop: number };
export type StratData = { strat: Strat; lbc: LbcModel; dealer: DealerModel; price: PriceModel };

export const DEFAULT_STRAT: StratData = {
  strat: { adsStart: 70, adsEnd: 120, rampMonths: 6, remonteePct: 0.3, dealersStart: 0, dealersPerMonth: 1, dealersMax: 8, commission: 400, priceUp: false, organic: 2 },
  // calé sur ta réalité : ≈ 70 annonces publiées par an (60 € / 2 mois) → ≈ 18 ventes / mois
  lbc: { adCost2m: 60, remonteeCost2m: 60, refAds: 70, refSales: 16, max: 40, remonteeBoost: 1.25 },
  dealer: { baseSales: 1.5, refCommission: 300, motivation: 0.5, firstMonthFactor: 0.4, priceSensitivity: 0.5 },
  price: { increase: 500, directDrop: 0.12 },
};

/** Ventes Leboncoin : rendement décroissant, calé pour que refAds annonces donnent refSales ventes. */
export function lbcSales(m: LbcModel, ads: number, remPct: number) {
  const k = -m.refAds / Math.log(1 - Math.min(0.95, m.refSales / m.max));
  const eff = ads * (1 + (m.remonteeBoost - 1) * remPct);
  return m.max * (1 - Math.exp(-eff / k));
}
/** Coût mensuel : « ads » = annonces publiées par an, chacune 60 € (+60 € avec remontée). */
export const lbcCost = (m: LbcModel, ads: number, remPct: number) => (ads / 12) * (m.adCost2m + remPct * m.remonteeCost2m);
/** Ventes par point de vente selon la commission (plus elle est haute, plus ils poussent). */
export const dealerRate = (d: DealerModel, commission: number) => d.baseSales * Math.pow(Math.max(50, commission) / d.refCommission, d.motivation);

export type PlanMonth = { m: number; label: string; ads: number; adsCost: number; dealers: number; newDealers: number; direct: number; viaDealers: number; total: number; commissions: number; marketing: number };
export function buildPlan(sd: StratData, today = iso(new Date())): PlanMonth[] {
  const s = sd.strat, out: PlanMonth[] = [];
  const pf = s.priceUp ? 1 - sd.price.directDrop : 1, pfd = s.priceUp ? 1 - sd.price.directDrop * sd.dealer.priceSensitivity : 1;
  let prev = 0;
  for (let m = 0; m < 12; m++) {
    const ads = Math.round(s.adsStart + (s.adsEnd - s.adsStart) * Math.min(1, m / Math.max(1, s.rampMonths)));
    const dealers = Math.min(s.dealersMax, s.dealersStart + s.dealersPerMonth * m), nd = Math.max(0, dealers - prev); prev = dealers;
    const rate = dealerRate(sd.dealer, s.commission);
    const viaDealers = ((dealers - nd) * rate + nd * rate * sd.dealer.firstMonthFactor) * pfd;
    const direct = (s.organic + lbcSales(sd.lbc, ads, s.remonteePct)) * pf;
    const adsCost = lbcCost(sd.lbc, ads, s.remonteePct), commissions = viaDealers * s.commission;
    const d = new Date(today + "T12:00:00"); d.setDate(1); d.setMonth(d.getMonth() + m);
    out.push({ m, label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }), ads, adsCost, dealers, newDealers: nd, direct, viaDealers, total: direct + viaDealers, commissions, marketing: adsCost + commissions });
  }
  return out;
}

/** Applique le plan à la gestion : ventes mensuelles, marketing mensuel, voitures de démo, prix. */
export function runPlan(g: Gestion, sd: StratData, today = iso(new Date()), factor = 1, withRecommend = false) {
  const plan = buildPlan(sd, today);
  const g2: Gestion = { ...g, quarters: [], params: { ...g.params, maxPerMonth: Math.max(g.params.maxPerMonth, 8), forecast: plan.map(x => x.total), priceTtc: g.params.priceTtc + (sd.strat.priceUp ? sd.price.increase : 0) } };
  const ads = plan.map(x => x.marketing), demo = plan.map(x => x.newDealers);
  if (withRecommend) {
    const r = recommend(g2, today, ads, false);
    return { plan, g2, r, sel: [r.defav, r.probable, r.fav][factor < 1 ? 0 : factor > 1 ? 2 : 1] };
  }
  const pr = project(g2, today, true, factor, ads, { demoByMonth: demo });
  return { plan, g2, pr };
}

export function score(g: Gestion, sd: StratData, today = iso(new Date())) {
  const low = project({ ...g, quarters: [], params: { ...g.params, maxPerMonth: Math.max(g.params.maxPerMonth, 8), forecast: buildPlan(sd, today).map(x => x.total), priceTtc: g.params.priceTtc + (sd.strat.priceUp ? sd.price.increase : 0) } }, today, true, g.params.scenLow ?? 0.7, buildPlan(sd, today).map(x => x.marketing), { demoByMonth: buildPlan(sd, today).map(x => x.newDealers) });
  const { pr, plan } = runPlan(g, sd, today, 1) as { pr: ReturnType<typeof project>; plan: PlanMonth[] };
  return { end: pr.rows[pr.rows.length - 1].cash, min: pr.min.cash, minLow: low.min.cash, lost: pr.quarters.reduce((a, q) => a + q.lost, 0), sold: pr.quarters.reduce((a, q) => a + q.sold, 0), plan, pr };
}

/** Essaie de nombreuses combinaisons et garde celle qui laisse le plus de trésorerie dans 12 mois sans passer sous zéro en vente lente. */
export function optimizeStrategy(g: Gestion, sd: StratData, today = iso(new Date())) {
  let best: { sd: StratData; end: number; minLow: number; sold: number } | null = null; let tried = 0;
  for (const adsEnd of [70, 100, 150, 200])
    for (const dealersMax of [0, 4, 8, 12])
      for (const commission of [300, 400, 500])
        for (const priceUp of [false, true]) {
          const cand: StratData = { ...sd, strat: { ...sd.strat, adsEnd, dealersMax, commission, priceUp, dealersPerMonth: dealersMax ? Math.max(1, Math.ceil(dealersMax / 6)) : 0 } };
          const sc = score(g, cand, today); tried++;
          if (sc.minLow < 0) continue;
          if (!best || sc.end > best.end) best = { sd: cand, end: sc.end, minLow: sc.minLow, sold: sc.sold };
        }
  return { best, tried };
}

/** Économie d'un point de vente selon la commission. */
export function dealerTable(sd: StratData, unit: number, demoCost: number) {
  return [200, 300, 400, 500, 600].map(c => {
    const rate = dealerRate(sd.dealer, c), profit = rate * (unit - c);
    return { commission: c, rate, dealerEarns: rate * c, youEarn: profit, paybackMonths: profit > 0 ? demoCost / profit : Infinity };
  });
}

/** Stockage : coût par voiture au Nord (Boran) vs terrain près du Havre, selon le volume mensuel. */
export function storageTable(p: { transferPerCar: number; warehouseTransfer: number; unload: number; siteRent: number; siteUnloadPerContainer: number; extraKm: number; costPerKm: number; carsPerTrip: number; boranPerCarMonth: number }) {
  const viaBoran = p.transferPerCar + (p.warehouseTransfer + p.unload) / 9 + p.boranPerCarMonth;
  const varSite = p.siteUnloadPerContainer / 9 + (2 * p.extraKm * p.costPerKm) / Math.max(1, p.carsPerTrip);
  const saving = viaBoran - varSite, breakeven = saving > 0 ? p.siteRent / saving : Infinity;
  return { viaBoran, varSite, saving, breakeven, rows: [5, 10, 15, 20, 30, 40].map(n => ({ n, boran: n * viaBoran, site: p.siteRent + n * varSite })) };
}
export const nextMonday = (d = iso(new Date())) => addDays(d, ((8 - new Date(d + "T12:00:00").getDay()) % 7) || 7);
export type { Container };
