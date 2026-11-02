/** Simulateur de décision NeoDrive (Monte-Carlo, 36 mois).
 *  Chaque simulation tire au hasard la demande, la tendance du marché et l'effet réel de chaque levier
 *  (entre un minimum et un maximum issus de la recherche). Elle gère le stock, les commandes de conteneurs
 *  (4 mois de délai), la trésorerie (on ne commande que si on peut payer) et la capacité de livraison. */
import { unitMargin, type Params } from "./gestion";

export type Tri = [number, number, number]; // [min, le plus probable, max]
export type Lever = {
  id: string; name: string; group: "ventes" | "marge" | "capacite" | "argent" | "produit" | "risque";
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
  levers: [], baseDemand: 18, trend: [-0.15, 0, 0.1], stock: 20, soloCapacity: 24, minCash: 10000, runs: 400, leadMonths: 4,
  season: [0.85, 0.9, 1.05, 1.05, 1.05, 1, 0.85, 0.8, 1.2, 1.1, 1, 1.05],
};

/** Leviers : effets min / probable / max issus de la recherche (sources dans « evidence »). Complétés après la recherche. */
export const LEVERS: Lever[] = [
  // ── Vendre plus
  { id: "pay10x", name: "Paiement en 10×/12× (frais payés par le client)", group: "ventes", difficulty: 1, delay: 1, ramp: 1, demandPct: [0.05, 0.12, 0.2], feePct: 1,
    what: "Afficher « dès 499 €/mois » sur chaque annonce et proposer Oney/Alma. Les parents qui n’ont pas 5 500 € comptant peuvent acheter. Tu es payé tout de suite, l’organisme porte le risque d’impayé.",
    evidence: ["Aixam : ≈ 30 % de ses ventes financées (Sofinco), leasing = 20 % du CA — journalauto.com, largus.fr", "Oney : 0,11 € + 1 % pour le marchand si le client paie les frais (sinon 6,99 % en 10×) — docs.adyen.com/payment-methods/oney", "Alma annonce +10 % de conversion, +20 % de CA (chiffres marketing) — journaldunet.com", "Plafond par défaut souvent 2 000 € : à négocier jusqu’à 6 000 € — leptidigital.fr", "Déjà amorcé sur ton site (page /financement)"] },
  { id: "credit", name: "Crédit affecté / LOA (statut IOBSP, ORIAS)", group: "ventes", difficulty: 2, delay: 3, ramp: 2, demandPct: [0.08, 0.18, 0.3], invest: 1500,
    what: "Devenir intermédiaire en crédit (formation + inscription ORIAS) et signer avec Sofinco, Cetelem ou Franfinance : mensualités sur 24–60 mois, le parent souscrit. C’est ce qui fait vendre Aixam.",
    evidence: ["Aixam ≈ 30 % de ventes financées — journalauto.com", "Formation IOBSP 28 h (activité accessoire) à 80 h (mandataire) — juriscampus.fr, orias.fr", "Un mineur ne peut pas signer : c’est le parent — aramisauto.com", "La commission versée au vendeur par l’organisme n’est pas publique : à négocier (non comptée ici)"] },
  { id: "reprise", name: "Reprise de l’ancienne VSP + occasion / dépôt-vente", group: "ventes", difficulty: 3, delay: 1, ramp: 2, demandPct: [0.05, 0.12, 0.2], line: { units: [1, 2.5, 5], margin: 800, stock: 10000, label: "occasions revendues" },
    what: "Reprendre la vieille Aixam/Ligier diesel du client pour lui vendre une neuve, puis la revendre (ou dépôt-vente sans stock). Le contrôle technique obligatoire depuis 2024 pousse les propriétaires à changer.",
    evidence: ["Décote VSP : −20 % la 1re année puis −5 %/an (Ligier) — mister-auto.com", "Occasions 3 000 à 14 000 € — iautos.fr, capcar.fr", "Dépôt-vente : 5 à 15 % de commission — autocopilot.fr", "CT obligatoire des VSP depuis le 15/04/2024, les plus recalées des véhicules L — mondial.paris"] },
  { id: "agents", name: "3 garages agents avec une voiture d’exposition", group: "ventes", difficulty: 3, delay: 3, ramp: 3, demandAbs: [1.5, 4, 9], perExtraCar: 550, invest: 12000,
    what: "Placer une voiture chez 3 garages/motoculteurs dans des zones loin de tes hubs. Ils vendent avec ton code vendeur, tu livres. C’est le modèle d’Aixam (≈ 230 points de vente).",
    evidence: ["Aixam : ≈ 230 points de vente, ≈ 150 concessionnaires — lejournaldesentreprises.com, aixam.com", "Aixam + Ligier > 70 % du marché grâce aux réseaux — inovev.com", "Linktour arrive en juin 2026 via des revendeurs régionaux — journalauto.com", "Hypothèse : 0,5 à 3 ventes/mois par point, commission ≈ 550 €"] },
  { id: "webads", name: "Google + Meta/TikTok (1 000 €/mois) + site avec mensualités", group: "ventes", difficulty: 2, delay: 1, ramp: 2, demandAbs: [1, 3, 5], fixed: 1000, invest: 2000,
    what: "Sortir de la dépendance à Leboncoin : recherche « voiture sans permis », vidéos ciblant les parents d’ados de 13–14 ans, prise de rendez-vous d’essai.",
    evidence: ["Lead Facebook en France : 15 à 45 € — lafabriquedunet.fr", "Google Ads auto : conversion ≈ 7,8 %, lead ≈ 39 $ (USA) — webtonic.io", "14–18 ans et jeunes adultes = 40–50 % des clients (Ligier) — slate.fr", "Hypothèse : 30 €/lead × 10 % de conversion → ≈ 3 ventes pour 1 000 €"] },
  { id: "b2b", name: "Lots B2B : campings, loueurs d’îles, collectivités", group: "ventes", difficulty: 3, delay: 5, ramp: 3, demandAbs: [0.3, 0.8, 1.5], perExtraCar: 700, invest: 2000,
    what: "Vendre par lots de 3 à 10 avant la saison, avec une remise de 10–15 %.",
    evidence: ["Free2Move a mis 100 Ami en autopartage à Paris (2021) — free2move.com", "Location VSP ≈ 40 €/jour — lelynx.fr", "Volumes B2B non trouvés : hypothèse 1 à 3 lots par an"] },
  { id: "export", name: "Export UE en ligne (Belgique, Italie)", group: "ventes", difficulty: 4, delay: 3, ramp: 3, demandAbs: [0.5, 1.5, 3], perExtraCar: 550, invest: 4000,
    what: "L’homologation L6e est valable dans toute l’UE. L’Italie est le 2e marché d’Europe.",
    evidence: ["Italie : 21 442 quadricycles en 2024 (+25,8 %), mais −16,5 % en 2025 — sicurauto.it, JATO", "Europe ≈ 60 000 quadricycles en 2025, moitié en France — theshiftproject.org", "Limite : livraison en remorque, SAV à distance, TVA intracom."] },
  { id: "lld", name: "Location longue durée via un partenaire (≈ 89–99 €/mois)", group: "ventes", difficulty: 3, delay: 3, ramp: 3, demandPct: [0.1, 0.25, 0.45], marginDelta: -150,
    what: "Ta vraie concurrence est la location Stellantis à 59–79 €/mois (80 % des Topolino sont louées). Un loueur partenaire (ou une banque en LOA) rachète la voiture et la loue au client : tu vends comptant, le client paie au mois.",
    evidence: ["Topolino : 80 % des immatriculations 2025 en location — journalauto.com", "Ami LLD 69–79 €/mois, Topolino 59 €/mois — automobile-propre.com, dealabs.com", "Aixam : leasing = 20 % du CA — largus.fr", "Hypothèse : remise/frais au partenaire ≈ 150 € par voiture"] },
  // ── Gagner plus par vente
  { id: "price500", name: "Monter la gamme : lithium / Confort Longo +500 €", group: "marge", difficulty: 1, delay: 1, ramp: 1, marginDelta: 330, demandPct: [-0.15, -0.07, 0],
    what: "Pousser la version mieux équipée (+500 € TTC). Une partie des clients achète moins cher ou part.",
    evidence: ["Les aides à l’achat de VSP électriques excluent la batterie plomb : argument pour le lithium — automobile-propre.com", "+500 € TTC = +417 € HT, moins le surcoût d’achat estimé (≈ 90 €)"] },
  // ── Livrer plus
  { id: "driver", name: "Chauffeur-livreur + 2e remorque", group: "capacite", difficulty: 2, delay: 1, ramp: 1, capacity: 30, fixed: 2900,
    what: "Seul, tu plafonnes vers 24 livraisons par mois. Un chauffeur double la capacité et te libère pour vendre.",
    evidence: ["Coût chargé estimé 2 900 €/mois (salaire + véhicule partagé) — hypothèse", "Simulation des tournées : 2 voitures par voyage — outil Tournées"] },
  // ── Financer la croissance
  { id: "fidoc", name: "Financer les achats (Fidoc / crédit documentaire, 40 000 €)", group: "argent", difficulty: 2, delay: 2, ramp: 1, credit: 40000, ratePct: 6, marginDelta: -100,
    what: "La banque paie l’usine, tu rembourses 30 à 90 jours plus tard. Permet de commander plus quand la demande dépasse ce que ta trésorerie peut payer.",
    evidence: ["Fidoc CIC : paiement différé de 30 jours ou plus après expédition — cic.fr", "Crédit documentaire : 1 à 3 % du montant, garantie 10–30 % — eurofiscalis.com, trade.gov", "Prêt Croissance TPE Bpifrance : réservé aux entreprises de 3 salariés et plus → probablement pas pour toi — les-aides.fr"] },
  // ── Nouvelles activités
  { id: "parts", name: "Pièces & SAV en ligne pour VSP chinoises", group: "produit", difficulty: 3, delay: 5, ramp: 4, demandPct: [0, 0.03, 0.06], line: { units: [10, 25, 50], margin: 40, stock: 8000, label: "commandes de pièces" },
    what: "Vendre les pièces de tes modèles à toute la France (parc existant), avec tutoriels. Rassure aussi les acheteurs de neuf.",
    evidence: ["Voitures chinoises difficiles à assurer faute de pièces — actu-automobile.com", "Délais de pièces jusqu’à 200 jours — caradisiac.com", "Parc VSP annoncé ≈ 282 560 véhicules (non sourcé) — sudradio.fr", "Déjà amorcé sur ton site (page /pieces)"] },
  { id: "golf", name: "Golfettes pour campings et domaines", group: "produit", difficulty: 2, delay: 5, ramp: 3, line: { units: [1, 2.5, 4], margin: 1400, stock: 9000, label: "golfettes" },
    what: "Même sourcing, même remorque. ≈ 7 400 campings et 600–730 golfs en France.",
    evidence: ["Campings : ≈ 7 360–7 460 en 2024 — lechotouristique.com", "Golfettes neuves 7 500 € HT (2 places) à 25 000 € (route) — hellopro.fr", "Marché européen +5 à 7 %/an — marketdataforecast.com, credenceresearch.com"] },
  { id: "mower", name: "Débroussailleuses radiocommandées (vente + location saisonnière)", group: "produit", difficulty: 3, delay: 5, ramp: 3, line: { units: [0.5, 1.5, 3], margin: 1450, stock: 6000, label: "débroussailleuses" },
    what: "Écart de prix 3 à 5× avec les marques européennes. Zone de débroussaillement obligatoire en extension.",
    evidence: ["OLD : 52 départements depuis l’arrêté du 13/04/2026 (48 avant), ≈ 7 400 communes — ecologie.gouv.fr", "Marché +7 à 9 %/an (études peu fiables) — pmarketresearch.com", "Vigorun ≈ 2 850 $ FOB vs 9 800–15 000 € en marque UE — sourcing"] },
  { id: "utility", name: "Utilitaire sans permis L6e (artisans, campings)", group: "produit", difficulty: 3, delay: 5, ramp: 3, line: { units: [0.5, 1.5, 3], margin: 1600, stock: 9000, label: "utilitaires" },
    what: "Aixam Pro / Goupil coûtent 17 000 à 20 000 € HT. Marchés publics verrouillés (UGAP : Ligier et Goupil) → viser les clients privés.",
    evidence: ["Goupil : 3 600 véhicules en 2023, objectif 5 000/an — lejournaldesentreprises.com", "UGAP : seulement Ligier et Goupil (sept. 2025) — journalauto.com", "Yunlong L6e cargo 4 000–4 500 $ FOB — sourcing"] },
  { id: "rental", name: "Location mensuelle (flotte de 5 VSP)", group: "produit", difficulty: 4, delay: 2, ramp: 3, line: { units: [3, 4, 4.8], margin: 160, stock: 20000, label: "voitures louées" },
    what: "Louer au mois à des parents (150–250 €/mois), revendre en occasion après 2–3 ans. Revenu récurrent, mais bloque de la trésorerie.",
    evidence: ["LLD Aixam : 120 €/mois après 1 000 € — largus.fr", "LLD Ami : 69 €/mois — dealabs.com", "445 accidents corporels de VSP en 2024 (ONISR) : risque de casse — lautomobiliste.fr"] },
  { id: "retrofit", name: "Conversion batterie plomb → lithium", group: "produit", difficulty: 4, delay: 5, ramp: 4, line: { units: [0, 2, 5], margin: 900, stock: 6000, label: "conversions" },
    what: "Pack LiFePO4 importé avec les voitures, posé chez le client. Niche sans concurrent visible, mais sécurité et homologation à valider.",
    evidence: ["Pack 72 V 40 Ah ≈ 360–385 $ (Alibaba) ; 72 V 60 Ah vendu 1 549 € en détail — kaufland.fr", "Aucune offre française trouvée — demande non prouvée", "Une modification peut exiger une réception à titre isolé (300–1 000 €)"] },
  // ── Risques à tester (cocher pour voir l’impact)
  { id: "riskAid", name: "⚠️ Aide 2027 pour les VSP européennes", group: "risque", difficulty: 1, delay: 2, ramp: 3, demandPct: [-0.25, -0.12, -0.03],
    what: "Si l’aide réservée aux modèles assemblés en Europe rapproche les marques de ton prix.", evidence: ["Aide au 1er janvier 2027, décrets à paraître — selectra.info"] },
  { id: "riskSiv", name: "⚠️ Perte de l’accès direct au SIV (seuil 200/an)", group: "risque", difficulty: 1, delay: 0, ramp: 1, marginDelta: -60,
    what: "Passer par un prestataire pour chaque carte grise (≈ 30–60 € + délai).", evidence: ["Seuil de 200 opérations/an au 1/10/2026 — journalauto.com, eplaque.fr"] },
  { id: "riskAM", name: "⚠️ Durcissement du permis AM", group: "risque", difficulty: 1, delay: 6, ramp: 6, demandPct: [-0.3, -0.12, 0],
    what: "Moins d’acheteurs de 14–17 ans (≈ 25 % des ventes Aixam).", evidence: ["Débat après 445 accidents corporels en 2024 — lessentieldeleco.fr"] },
];

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
  const pool = levers.filter(l => l.difficulty <= maxDifficulty && l.group !== "risque").map(l => l.id);
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
