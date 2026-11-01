/** Pilotage NeoDrive : coût rendu par route, programme de commandes et trésorerie prévisionnelle. */

export type HubKey = "lamasquere" | "boran";
export const HUB_LABEL: Record<HubKey, string> = { lamasquere: "Lamasquère (Sud)", boran: "Boran-sur-Oise (Nord)" };

export type Route = { id: string; label: string; port: "havre" | "fos"; hub: HubKey; unload: number; transfer: number; note?: string };
export type Container = { id: string; label: string; routeId: string; cars: number; orderMonth: string; arrivalMonth: string; status: "commande" | "en_mer" | "arrive" };

export type Params = {
  usd: number; factory: number; perContainer: number; dutyPct: number; customs: number;
  freightUsd: { havre: number; fos: number };
  storage: number; delivery: number; ads: number; gear: number; sav: number;
  priceTtc: number; deliveryTtc: number;
  supplierDepositPct: number; leadMonths: number; shipAfterMonths: number;
  fixedMonthly: number; cash: number; safety: number;
  stock: Record<HubKey, number>; sudPct: number;
  forecast: number[]; // ventes prévues par mois (12 mois)
  clientDeposit: number; // acompte demandé sur les voitures pas encore arrivées (€ par voiture)
};

export type Pilotage = { params: Params; routes: Route[]; containers: Container[]; updated_at?: string };

export const DEFAULT_ROUTES: Route[] = [
  { id: "havre-boran", label: "Le Havre → Boran (prestataire au Havre)", port: "havre", hub: "boran", unload: 1300, transfer: 1350, note: "Dépotage 1 300 € + transfert 150 €/voiture" },
  { id: "havre-lama", label: "Le Havre → Lamasquère (prestataire au Havre)", port: "havre", hub: "lamasquere", unload: 1300, transfer: 2700, note: "Dépotage 1 300 € + transfert 300 €/voiture" },
  { id: "fos-lama-cariste", label: "Fos → Lamasquère (conteneur entier + cariste loué)", port: "fos", hub: "lamasquere", unload: 600, transfer: 1350, note: "Camion 1 350 € + chariot avec cariste et remorque sur place ≈ 600 €" },
  { id: "fos-lama-entrepot", label: "Fos → entrepôt près de Toulouse (à chiffrer)", port: "fos", hub: "lamasquere", unload: 900, transfer: 1350, note: "Mettre le vrai devis de l’entrepôt" },
];

export function defaultPilotage(now = new Date()): Pilotage {
  return {
    params: {
      usd: 0.86, factory: 1500, perContainer: 9, dutyPct: 10, customs: 200,
      freightUsd: { havre: 5000, fos: 6000 },
      storage: 50, delivery: 390, ads: 150, gear: 50, sav: 100,
      priceTtc: 4990, deliveryTtc: 690,
      supplierDepositPct: 30, leadMonths: 4, shipAfterMonths: 1,
      fixedMonthly: 1500, cash: 50000, safety: 4,
      stock: { lamasquere: 10, boran: 8 }, sudPct: 55,
      forecast: Array(12).fill(10), clientDeposit: 0,
    },
    routes: DEFAULT_ROUTES,
    containers: [],
    updated_at: now.toISOString(),
  };
}

// ── Mois "AAAA-MM"
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const addMonths = (m: string, n: number) => { const [y, mo] = m.split("-").map(Number); return monthKey(new Date(y, mo - 1 + n, 1)); };
export const monthLabel = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }); };

// ── Coûts
export type RouteCost = { route: Route; freight: number; duty: number; perCar: { factory: number; freight: number; duty: number; customs: number; unload: number; transfer: number; landed: number }; containerCash: number; importVat: number; marginPerCar: number };
export function routeCost(p: Params, r: Route, cars = p.perContainer): RouteCost {
  const goods = cars * p.factory;
  const freight = p.freightUsd[r.port] * p.usd;
  const duty = (goods + freight) * p.dutyPct / 100;
  const importVat = (goods + freight + duty) * 0.2;
  const c = Math.max(1, cars);
  const perCar = { factory: p.factory, freight: freight / c, duty: duty / c, customs: p.customs / c, unload: r.unload / c, transfer: r.transfer / c, landed: 0 };
  perCar.landed = perCar.factory + perCar.freight + perCar.duty + perCar.customs + perCar.unload + perCar.transfer;
  const marginPerCar = (p.priceTtc + p.deliveryTtc) / 1.2 - perCar.landed - p.storage - p.delivery - p.ads - p.gear - p.sav;
  return { route: r, freight, duty, perCar, containerCash: goods + freight + duty + importVat + p.customs + r.unload + r.transfer, importVat, marginPerCar };
}
export function bestRoute(p: Params, routes: Route[], hub: HubKey) {
  return routes.filter(r => r.hub === hub).map(r => routeCost(p, r)).sort((a, b) => a.perCar.landed - b.perCar.landed)[0] || null;
}

// ── Projection
export type MonthRow = {
  m: string; arrivals: Record<HubKey, number>; demand: Record<HubKey, number>; sold: Record<HubKey, number>; lost: number; stockEnd: Record<HubKey, number>;
  cashIn: number; cashOut: number; detail: Record<string, number>; cashEnd: number;
};
export type Suggestion = Container & { suggested: true; hub: HubKey; reason: string };

function payments(p: Params, routes: Route[], c: Container) {
  const r = routes.find(x => x.id === c.routeId); if (!r) return [] as { m: string; k: string; v: number }[];
  const goods = c.cars * p.factory, freight = p.freightUsd[r.port] * p.usd, duty = (goods + freight) * p.dutyPct / 100, vat = (goods + freight + duty) * 0.2;
  const ship = addMonths(c.orderMonth, p.shipAfterMonths);
  const out: { m: string; k: string; v: number }[] = [];
  if (c.status === "commande") out.push({ m: c.orderMonth, k: "Acompte usine", v: -goods * p.supplierDepositPct / 100 });
  if (c.status === "commande") out.push({ m: ship, k: "Solde usine", v: -goods * (1 - p.supplierDepositPct / 100) }, { m: ship, k: "Fret maritime", v: -freight });
  if (c.status !== "arrive") {
    out.push({ m: c.arrivalMonth, k: "Douane + dédouanement", v: -(duty + p.customs) }, { m: c.arrivalMonth, k: "TVA import (avancée)", v: -vat },
      { m: c.arrivalMonth, k: "Dépotage + transfert", v: -(r.unload + r.transfer) }, { m: addMonths(c.arrivalMonth, 1), k: "TVA import récupérée", v: vat });
  }
  return out;
}

const split = (p: Params, i: number, h: HubKey) => { const tot = p.forecast[i] || 0, sud = Math.round(tot * p.sudPct / 100); return h === "lamasquere" ? sud : tot - sud; };

export function project(pil: Pilotage, start: string, withSuggestions = true) {
  const p = pil.params, H: HubKey[] = ["lamasquere", "boran"];
  const months = Array.from({ length: 12 }, (_, i) => addMonths(start, i));
  const suggestions: Suggestion[] = [];
  const all = (): (Container & { hub?: HubKey })[] => [...pil.containers, ...suggestions];
  const hubOf = (c: Container) => pil.routes.find(r => r.id === c.routeId)?.hub;

  // Stock simulé pour placer les commandes suggérées (au plus tôt : ce mois-ci)
  if (withSuggestions) {
    const skip = new Set<string>();
    for (let guard = 0; guard < 40; guard++) {
      const stock = { ...p.stock }; let need: { hub: HubKey; i: number } | null = null;
      for (let i = 0; i < months.length && !need; i++) {
        for (const h of H) {
          stock[h] += all().filter(c => c.arrivalMonth === months[i] && hubOf(c) === h).reduce((a, c) => a + c.cars, 0);
          stock[h] = Math.max(0, stock[h] - split(p, i, h));
          // une commande passée aujourd'hui n'arrive qu'après le délai : on ne corrige que les mois atteignables
          if (stock[h] < p.safety && !need && i >= p.leadMonths && !skip.has(`${h}-${i}`)) need = { hub: h, i };
        }
      }
      if (!need) break;
      const orderI = need.i - p.leadMonths;
      const best = bestRoute(p, pil.routes, need.hub); if (!best) break;
      const om = months[orderI], am = months[need.i];
      if (suggestions.filter(x => x.hub === need!.hub && x.arrivalMonth === am).length >= 3) { skip.add(`${need.hub}-${need.i}`); continue; }
      suggestions.push({ id: `S-${guard}`, label: `Commande suggérée ${HUB_LABEL[need.hub]}`, routeId: best.route.id, cars: p.perContainer, orderMonth: om, arrivalMonth: am, status: "commande", suggested: true, hub: need.hub,
        reason: orderI === 0 ? `Sinon rupture en ${monthLabel(am)} : à commander ce mois-ci` : `Pour garder du stock en ${monthLabel(am)}` });
    }
  }

  // Projection complète
  const pay: Record<string, Record<string, number>> = {};
  for (const c of all()) for (const x of payments(p, pil.routes, c)) { (pay[x.m] ||= {})[x.k] = ((pay[x.m] ||= {})[x.k] || 0) + x.v; }
  const stock = { ...p.stock }; let cash = p.cash; let vatDue = 0;
  const rows: MonthRow[] = months.map((m, i) => {
    const arrivals = { lamasquere: 0, boran: 0 }, demand = { lamasquere: 0, boran: 0 }, sold = { lamasquere: 0, boran: 0 };
    for (const c of all()) if (c.arrivalMonth === m) { const h = hubOf(c); if (h) arrivals[h] += c.cars; }
    let lost = 0;
    for (const h of H) {
      stock[h] += arrivals[h];
      demand[h] = split(p, i, h);
      sold[h] = Math.min(stock[h], demand[h]); lost += demand[h] - sold[h]; stock[h] -= sold[h];
    }
    const n = sold.lamasquere + sold.boran, ttc = n * (p.priceTtc + p.deliveryTtc);
    const detail: Record<string, number> = { ...(pay[m] || {}) };
    detail["Ventes encaissées (TTC)"] = ttc;
    if (vatDue) detail["TVA collectée reversée"] = -vatDue;
    vatDue = ttc / 6;
    detail["Livraisons clients"] = -n * p.delivery;
    detail["Stockage"] = -n * p.storage;
    detail["Publicité"] = -n * p.ads;
    detail["Matériel / Duster"] = -n * p.gear;
    detail["Charges fixes"] = -p.fixedMonthly;
    const cashIn = Object.values(detail).filter(v => v > 0).reduce((a, v) => a + v, 0);
    const cashOut = Object.values(detail).filter(v => v < 0).reduce((a, v) => a + v, 0);
    cash += cashIn + cashOut;
    return { m, arrivals, demand, sold, lost, stockEnd: { ...stock }, cashIn, cashOut, detail, cashEnd: cash };
  });
  const unavoidable = rows.slice(0, p.leadMonths).reduce((a, r) => a + r.lost, 0);
  const minCash = Math.min(...rows.map(r => r.cashEnd));
  const immobilise = pil.containers.filter(c => c.status !== "arrive").reduce((a, c) => { const r = pil.routes.find(x => x.id === c.routeId); return a + (r ? routeCost(p, r, c.cars).containerCash : 0); }, 0);
  return { months, rows, suggestions, unavoidable, minCash, minMonth: rows.find(r => r.cashEnd === minCash)?.m || start, immobilise };
}
