/** Business plan NeoDrive sur 3 ans : relie le Pilotage (coûts réels des voitures, trésorerie),
 *  les Tournées (coût de livraison par voiture) et le Sourcing (nouveaux produits).
 *  Vue mensuelle simplifiée : le détail semaine par semaine des conteneurs reste dans le Pilotage. */
import { unitMargin, type Params } from "./gestion";
import { businessPlan, type Hyp, type Product } from "./sourcing";

export type Pick = { productId: string; start: number; salesMonth?: number };
export type Filler = { id: string; qty: number };
export type PlanCfg = {
  vspPerMonth: [number, number, number];   // ventes de voitures / mois, en fin d'année 1, 2, 3
  accAttach: number; accPrice: number; accMargin: number; // % de clients qui prennent le pack accessoires, prix TTC et marge HT du pack
  fillers: Filler[];                       // produits glissés dans les conteneurs (par conteneur)
  picks: Pick[];                           // nouveaux produits ajoutés au plan (mois de départ 1–36)
  driverAt: number; driverCost: number;    // embauche d'un chauffeur au-delà de N livraisons / mois, coût chargé
  salesHireCost: number;                   // commercial B2B (si produits pros ou robots dans le plan)
  freeM3: number;                          // espace libre estimé par conteneur (dans et sous les voitures)
};
export const DEFAULT_PLAN: PlanCfg = {
  vspPerMonth: [22, 30, 38], accAttach: 0.5, accPrice: 149, accMargin: 80, fillers: [], picks: [],
  driverAt: 30, driverCost: 2900, salesHireCost: 3800, freeM3: 12,
};

/** Produits de remplissage : à glisser dans les voitures et autour, dans les conteneurs déjà payés.
 *  Prix = fourchettes trouvées en ligne (à confirmer par devis). */
export type FillerItem = { id: string; name: string; group: "A" | "B" | "C"; fobUsd: number; priceTtc: number; volM3: number; dutyPct: number; perCar: number; note: string; risk: string };
export const FILLERS: FillerItem[] = [
  { id: "housse", name: "Bâche / housse extérieure taillée au modèle", group: "A", fobUsd: 7, priceTtc: 29, volM3: 0.008, dutyPct: 6.3, perCar: 40, note: "Upsell naturel à la livraison (voiture garée dehors). FOB 5–9 $ (Accio).", risk: "Générique à 14,99 € chez Action : seule la version sur mesure se vend." },
  { id: "tapis", name: "Jeu de tapis sur mesure (fait par l’usine)", group: "A", fobUsd: 13, priceTtc: 49, volM3: 0.016, dutyPct: 4, perCar: 25, note: "Référence France : ≈ 49 € le jeu Aixam (Rakuten). Se range à plat au plancher.", risk: "Droit selon la matière (à vérifier TARIC)." },
  { id: "housses-sieges", name: "Housses de sièges sur mesure", group: "A", fobUsd: 20, priceTtc: 39, volM3: 0.006, dutyPct: 6.3, perCar: 60, note: "Seulement dans un pack confort sur mesure.", risk: "Génériques à 8–15 € en France : marge faible." },
  { id: "dashcam", name: "Dashcam sans lithium (supercondensateur)", group: "A", fobUsd: 26, priceTtc: 49, volM3: 0.001, dutyPct: 0, perCar: 200, note: "Option à la livraison, en petit nombre.", risk: "Électronique : adhésion DEEE obligatoire, CE. Lithium = marchandise dangereuse." },
  { id: "chariot-pliable", name: "Chariot de plage / camping pliable", group: "B", fobUsd: 17, priceTtc: 69, volM3: 0.095, dutyPct: 1.7, perCar: 6, note: "Autour des voitures plutôt que dedans. Leboncoin au printemps (Decathlon 50–135 €).", risk: "Saisonnier (avril–août), Vevor ≈ 87 €." },
  { id: "chaise", name: "Chaise de camping « moon chair » alu", group: "B", fobUsd: 5, priceTtc: 24, volM3: 0.02, dutyPct: 0, perCar: 30, note: "Revente en lots sur Leboncoin.", risk: "Quechua à 12 € : viser le milieu de gamme." },
  { id: "lampes", name: "Lampes solaires de jardin (exemple à ÉVITER)", group: "B", fobUsd: 2.7, priceTtc: 3.5, volM3: 0.001, dutyPct: 0, perCar: 300, note: "Action les vend ≈ 2 € : aucune marge.", risk: "DEEE + lithium." },
];
/** Règles pour charger des produits dans un conteneur de voitures (recherche du 2 novembre 2026). */
export const FILLER_RULES: string[] = [
  "Tout doit être sur la liste de colisage, la facture, le connaissement et la déclaration en douane (Chine ET France, une ligne par code douanier). Un écart bloque le dédouanement.",
  "Ton conteneur est DÉJÀ classé « marchandise dangereuse » (voitures électriques, UN3171). Ajouter du lithium non déclaré = fausse déclaration, pénalités de 15 000 à 35 000 $ par conteneur chez les armateurs, et risque d’incendie.",
  "Le plus simple : acheter les accessoires À L’USINE de la voiture (ou ses fournisseurs), sur la même facture et la même déclaration export. Yiwu = agent de consolidation (3–10 %) + camion jusqu’à l’usine.",
  "Caler et sangler les cartons dans l’habitacle, protéger les sièges, inclure la marchandise dans la valeur assurée.",
  "Tu deviens « importateur » : ton nom et ton adresse sur le produit (règlement sécurité des produits GPSR), et adhésion à un éco-organisme pour toute électronique (DEEE).",
  "À ÉVITER : pneus chinois (antidumping jusqu’à 45,3 % depuis juillet 2026), jantes acier, vaisselle céramique (≈ 79 %), vélos électriques, tout lithium, le « bazar » de Yiwu (trop de références à rendre conformes).",
  "Pièces SAV de tes voitures (feux, rétroviseurs, coques, essuie-glaces, homologués E) : pas pour la marge, mais pour ne plus immobiliser un client des semaines. Demande la liste et les prix à ton usine.",
];

export function fillerMargin(p: Params, f: FillerItem) {
  const cost = f.fobUsd * p.usd * (1 + f.dutyPct / 100);
  return f.priceTtc / 1.2 - cost;
}
export function fillerTotals(p: Params, cfg: PlanCfg, items: FillerItem[] = FILLERS) {
  let vol = 0, margin = 0, invest = 0, revenue = 0;
  for (const x of cfg.fillers) { const f = items.find(i => i.id === x.id); if (!f || !x.qty) continue; vol += f.volM3 * x.qty; margin += fillerMargin(p, f) * x.qty; revenue += f.priceTtc / 1.2 * x.qty; invest += f.fobUsd * p.usd * (1 + f.dutyPct / 100) * x.qty; }
  return { vol, margin, invest, revenue, full: vol > cfg.freeM3 };
}

const isPro = (x: Product) => ["chariot", "chantier", "robot_nettoyage", "robot_agri", "robot_logistique"].includes(x.cat);
/** Impôt sur les sociétés (taux réduit 15 % jusqu'à 42 500 €, puis 25 %). Approximation, à voir avec ton comptable. */
const corpTax = (r: number) => r <= 0 ? 0 : Math.min(r, 42500) * 0.15 + Math.max(0, r - 42500) * 0.25;

export function runPlan(p: Params, hyp: Hyp, products: Product[], cfg: PlanCfg, startCash: number) {
  // Marge par voiture = Pilotage (prix + livraison − coût d'arrivée − coût de livraison) − pub − stockage − SAV − équipement.
  const carMargin = unitMargin(p) - hyp.marketingPerSale - hyp.storagePerUnit - 100 - 50;
  // Besoin en fonds de roulement : ≈ 3 mois d'achats de voitures immobilisés (acompte, solde, fret, douane avant la vente).
  const wcPerCar = p.landedEstimate * 3;
  const carHt = (p.priceTtc + p.deliveryTtc) / 1.2;
  const fill = fillerTotals(p, cfg);
  const start = cfg.vspPerMonth[0] * 0.8;
  const target = (m: number) => { // montée progressive vers les objectifs de fin d'année
    const y = Math.floor(m / 12), k = (m % 12 + 1) / 12, from = y === 0 ? start : cfg.vspPerMonth[y - 1];
    return from + (cfg.vspPerMonth[y] - from) * k;
  };
  const picks = cfg.picks.map(pk => { const x = products.find(q => q.id === pk.productId); return x ? { pk, x, bp: businessPlan(p, hyp, x, startCash) } : null; }).filter(Boolean) as { pk: Pick; x: Product; bp: ReturnType<typeof businessPlan> }[];
  const months: { m: number; cars: number; ca: number; margin: number; fixed: number; hires: number; result: number; cash: number; deliveries: number; staff: string[]; lines: Record<string, number>; wc: number }[] = [];
  let cash = startCash, prevCars = start;
  for (let m = 0; m < 36; m++) {
    const cars = target(m), containers = cars / 9;
    const lines: Record<string, number> = {
      "Voitures sans permis": cars * carMargin,
      "Pack accessoires": cars * cfg.accAttach * cfg.accMargin,
      "Produits glissés dans les conteneurs": containers * fill.margin,
    };
    let ca = cars * carHt + cars * cfg.accAttach * cfg.accPrice / 1.2 + containers * fill.revenue;
    let deliveries = cars, pro = false, invest = containers * fill.invest * (m === 0 ? 2 : 0);
    for (const { pk, x, bp } of picks) {
      if (m + 1 < pk.start) continue;
      const age = m + 1 - pk.start, ramp = age < 2 ? 0.5 : 1, u = (pk.salesMonth ?? x.salesMonth) * ramp;
      lines[x.name] = (lines[x.name] || 0) + u * bp.margin + (bp.service ? Math.min(age, 12) * u * bp.service : 0);
      ca += u * x.priceTtc / 1.2;
      if (x.trailerFit > 0) deliveries += u;
      if (isPro(x)) pro = true;
      if (age === 0) invest += bp.cash; // 1er conteneur de stock à financer
    }
    const staff: string[] = [];
    let hires = 0;
    if (deliveries > cfg.driverAt) { hires += cfg.driverCost; staff.push("chauffeur"); }
    if (deliveries > cfg.driverAt * 2) { hires += cfg.driverCost; staff.push("2e chauffeur"); }
    if (pro) { hires += cfg.salesHireCost; staff.push("commercial pro"); }
    const margin = Object.values(lines).reduce((a, v) => a + v, 0), fixed = p.fixedMonthly + p.salaryMonthly;
    const result = margin - fixed - hires;
    const wc = (cars - prevCars) * wcPerCar; prevCars = cars;
    cash += result - invest - wc;
    months.push({ m, cars, ca, margin, fixed, hires, result, cash, deliveries, staff, lines, wc: wc + invest });
  }
  const years = [0, 1, 2].map(y => {
    const ms = months.slice(y * 12, y * 12 + 12), sum = (f: (x: typeof ms[0]) => number) => ms.reduce((a, x) => a + f(x), 0);
    const result = sum(x => x.result), tax = corpTax(result), lines: Record<string, number> = {};
    for (const x of ms) for (const [k, v] of Object.entries(x.lines)) lines[k] = (lines[k] || 0) + v;
    return { y: y + 1, wc: sum(x => x.wc), cars: sum(x => x.cars), ca: sum(x => x.ca), margin: sum(x => x.margin), fixed: sum(x => x.fixed), hires: sum(x => x.hires), result, tax, net: result - tax, cashEnd: ms[11].cash, cashMin: Math.min(...ms.map(x => x.cash)), staff: [...new Set(ms.flatMap(x => x.staff))], lines };
  });
  return { months, years, carMargin, wcPerCar, fill, picks };
}

/** Pourquoi la voiture sans permis marche : taille du marché × barrière à l'entrée × peu de concurrents.
 *  Notes de 1 à 5 (5 = très favorable pour NeoDrive). Appréciations, à corriger avec ton expérience. */
export type Moat = { cat: string; name: string; market: number; barrier: number; free: number; solo: number; why: string };
export const MOATS: Moat[] = [
  { cat: "vsp", name: "🚗 Voiture sans permis", market: 4, barrier: 4, free: 4, solo: 5, why: "25 000 ventes/an en France. Barrière : COC, carte grise, SAV — tu la maîtrises déjà. Peu d’importateurs directs à petit prix." },
  { cat: "utilitaire", name: "🛻 Utilitaire sans permis", market: 3, barrier: 4, free: 5, solo: 4, why: "Même barrière (COC) que la VSP, presque personne en direct, Aixam/Goupil très chers." },
  { cat: "golfette", name: "⛳ Golfette", market: 3, barrier: 3, free: 4, solo: 5, why: "Marché moyen (campings, golfs, domaines). Barrière moyenne : homologation pour la route, batteries. Peu d’importateurs." },
  { cat: "motoculture", name: "🌱 Débroussailleuse radiocommandée", market: 2, barrier: 3, free: 5, solo: 5, why: "Niche, mais barrière réelle (Stage V, bruit, CE) et aucun importateur chinois trouvé." },
  { cat: "quad", name: "🏍️ UTV électrique", market: 2, barrier: 4, free: 4, solo: 3, why: "Homologation et SAV exigeants, gros ticket ; 1 seul par remorque." },
  { cat: "acc", name: "🧰 Accessoires pour tes clients", market: 2, barrier: 1, free: 5, solo: 5, why: "Pas de barrière, MAIS tes clients sont déjà là : aucun coût pour les trouver." },
  { cat: "robot_nettoyage", name: "🧽 Robots de nettoyage", market: 3, barrier: 4, free: 3, solo: 1, why: "Barrière technique (installation, SAV) = protection… mais impossible seul." },
  { cat: "chariot", name: "🏗️ Chariot élévateur", market: 4, barrier: 3, free: 2, solo: 2, why: "Gros marché pro, mais marques déjà en réseau, trop lourd pour la remorque." },
  { cat: "chantier", name: "🚜 Mini-pelle", market: 4, barrier: 1, free: 1, solo: 4, why: "SATURÉE car AUCUNE barrière en pratique : chacun importe sans vérifier le Stage V → guerre des prix (4 000 €)." },
  { cat: "scooter", name: "🛵 Scooter", market: 4, barrier: 3, free: 1, solo: 4, why: "Gros marché mais marques à réseau (Yadea, NIU, Segway) : plus de place." },
  { cat: "agricole", name: "🌾 Micro-tracteur", market: 3, barrier: 5, free: 2, solo: 3, why: "Barrière TROP haute même pour toi (réception 167/2013) ; ceux qui l’ont passée vendent déjà au prix fort." },
];
export const moatScore = (x: Moat) => Math.round((x.market * 1.2 + x.barrier * 1.2 + x.free * 1.4 + x.solo) / (5 * 4.8) * 100);
