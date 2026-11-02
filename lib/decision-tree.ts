/** Arbre de décision NeoDrive (sur 3 ans).
 *  Pour chaque opportunité, 3 décisions :
 *   A. Ne rien faire (0 €)
 *   B. Lancer en grand tout de suite
 *   C. Tester petit (1 lot), regarder le résultat, puis lancer en grand OU arrêter
 *  Hasards : homologation/conformité obtenue ? → demande faible / moyenne / forte → guerre des prix ?
 *  Les probabilités et chiffres viennent de la recherche (sources dans « evidence ») et se modifient. */
export type Level = { p: number; share: number };              // probabilité, part de marché à maturité
export type TreeOpp = {
  id: string; name: string; marketUnits: number; marketSrc: string;
  price: number; cost: number;                                   // prix de vente HT, coût complet par unité (rendu + livraison + SAV + pub)
  fixedMonth: number;                                            // charges en plus / mois (démo, salon, commercial…)
  fullInvest: number; testInvest: number;                        // stock + mise en place
  pOk: number;                                                   // probabilité d'avoir un produit conforme et homologué qui tient
  demand: { low: Level; mid: Level; high: Level };
  pWar: number; warCut: number;                                  // probabilité que les leaders baissent leurs prix, baisse de marge
  pAD?: number;                                                  // probabilité de droits antidumping dans les 3 ans (défense commerciale)
  adCut?: number;                                                // part de la marge perdue après les droits (sur la moitié de la période)
  salvage: number;                                               // part du stock récupérée si on arrête (revente à prix cassé)
  salvageFail?: number;                                          // part récupérée si le produit est NON conforme (bloqué) — 0,3 par défaut
  signal: number;                                                // fiabilité du test (0,5 = n'apprend rien, 1 = parfait)
  delayMonths: number;                                           // retard d'un lancement après test
  evidence: string[];
};

const Y = 3;
function profitIfOk(o: TreeOpp, share: number, war: boolean, monthsLost = 0) {
  const units = o.marketUnits * share * (Y * 12 - monthsLost) / 12 * 0.8; // 0,8 = montée en puissance
  const m = (o.price - o.cost) * (war ? 1 - o.warCut : 1);
  return units * m - o.fixedMonth * (Y * 12 - monthsLost);
}
const lv = ["low", "mid", "high"] as const;
/** Toutes les feuilles de l'arbre avec leur probabilité cumulée. */
export function leaves(n: Node, p = 1): { p: number; v: number }[] {
  if (!n.children || !n.children.length) return [{ p, v: n.value }];
  return n.children.flatMap(c => leaves(c, p * (c.p ?? 1)));
}
type Node = { label: string; p?: number; value: number; children?: Node[] };

/** Valeur d'une branche « lancé » (homologation OK), espérance sur demande × guerre des prix. */
function launched(o: TreeOpp, monthsLost: number, levels: (typeof lv)[number][] = [...lv]): Node {
  const tot = levels.reduce((a, k) => a + o.demand[k].p, 0) || 1;
  const kids = levels.map(k => {
    const d = o.demand[k], p = d.p / tot;
    const ad = 1 - (o.pAD ?? 0) * (o.adCut ?? 0.6) * 0.5; // droits antidumping éventuels en milieu de période
    const peace = profitIfOk(o, d.share, false, monthsLost) * (profitIfOk(o, d.share, false, monthsLost) > 0 ? ad : 1), war = profitIfOk(o, d.share, true, monthsLost) * (profitIfOk(o, d.share, true, monthsLost) > 0 ? ad : 1);
    const stockLoss = k === "low" ? o.fullInvest * 0.2 : 0; // stock qui tourne mal
    const v = (1 - o.pWar) * peace + o.pWar * war - stockLoss;
    return { label: `Demande ${k === "low" ? "faible" : k === "mid" ? "moyenne" : "forte"} (part ${(d.share * 100).toFixed(2)} %)`, p, value: v,
      children: [{ label: "Pas de guerre des prix", p: 1 - o.pWar, value: peace - stockLoss }, { label: `Les leaders baissent leurs prix (−${Math.round(o.warCut * 100)} % de marge)`, p: o.pWar, value: war - stockLoss }] };
  });
  return { label: "Produit conforme", value: kids.reduce((a, c) => a + (c.p || 0) * c.value, 0), children: kids };
}

export function evaluate(o: TreeOpp) {
  // B. Lancer en grand
  const sf = o.salvageFail ?? 0.3;
  const okB = launched(o, 0), failB = -o.fullInvest * (1 - sf);
  const B: Node = { label: "B. Lancer en grand", value: o.pOk * okB.value + (1 - o.pOk) * failB,
    children: [{ ...okB, p: o.pOk }, { label: "Non conforme / bloqué (homologation, douane, qualité)", p: 1 - o.pOk, value: failB }] };
  // C. Tester petit puis décider (le test révèle la demande avec une fiabilité « signal »)
  const failC = -o.testInvest * (1 - sf);
  const sig = o.signal, pd = o.demand;
  // Probabilité d'un « bon » test : vraie demande moyenne/forte détectée, ou faible mal détectée
  const pGood = (pd.mid.p + pd.high.p) * sig + pd.low.p * (1 - sig);
  // Si bon test : demande a posteriori
  const post = { low: pd.low.p * (1 - sig) / (pGood || 1), mid: pd.mid.p * sig / (pGood || 1), high: pd.high.p * sig / (pGood || 1) };
  const oGood: TreeOpp = { ...o, demand: { low: { ...pd.low, p: post.low }, mid: { ...pd.mid, p: post.mid }, high: { ...pd.high, p: post.high } } };
  const scale = launched(oGood, o.delayMonths), scaleV = scale.value + o.testInvest * o.salvage * 0; // le lot test est vendu dans la foulée
  const goodV = Math.max(scaleV, -o.testInvest * 0.1);
  const badV = -o.testInvest * 0.25; // on arrête : le petit lot se vend mal
  const okC: Node = { label: "Produit conforme → test", value: pGood * goodV + (1 - pGood) * badV, children: [
    { label: `Le test marche → ${scaleV > 0 ? "on passe en grand" : "on arrête quand même"}`, p: pGood, value: goodV, children: scaleV > 0 ? scale.children : undefined },
    { label: "Le test ne marche pas → on arrête", p: 1 - pGood, value: badV }] };
  const C: Node = { label: "C. Tester petit puis décider", value: o.pOk * okC.value + (1 - o.pOk) * failC,
    children: [{ ...okC, p: o.pOk }, { label: "Non conforme → on arrête tôt", p: 1 - o.pOk, value: failC }] };
  const A: Node = { label: "A. Ne rien faire", value: 0 };
  const best = [A, B, C].sort((a, b) => b.value - a.value)[0];
  // Équivalent certain (aversion au risque) : une perte qui menace ta trésorerie pèse plus lourd qu'un gain du même montant.
  const ce = (n: Node, R: number) => { const lf = leaves(n); return -R * Math.log(lf.reduce((a, x) => a + x.p * Math.exp(-x.v / R), 0)); };
  const pLoss = (n: Node) => leaves(n).filter(x => x.v < 0).reduce((a, x) => a + x.p, 0);
  // Pire cas réaliste (perte max)
  const worstB = Math.min(failB, ...okB.children!.map(c => c.value)), worstC = Math.min(failC, badV);
  return { A, B, C, best, worstB, worstC, voi: C.value - Math.max(A.value, B.value), ce, pLoss };
}
export type Evaluated = ReturnType<typeof evaluate>;
export type { Node };

const L = (p: number, share: number): Level => ({ p, share });
/** Opportunités chiffrées (première calibration ; à affiner avec la recherche et tes devis). */
export const TREE_OPPS: TreeOpp[] = [
  { id: "utility", pAD: 0.1, name: "🛻 Utilitaire électrique L7e « anti-Goupil »", marketUnits: 2000, marketSrc: "≈ 2 000 / an en France (Goupil ≈ 750, Aixam Pro ≈ 500, Ligier Pro ≈ 300, autres) — estimation",
    price: 14500, cost: 9500, fixedMonth: 300, fullInvest: 45000, testInvest: 16000, pOk: 0.6,
    demand: { low: L(0.5, 0.005), mid: L(0.35, 0.015), high: L(0.15, 0.03) }, pWar: 0.3, warCut: 0.25, salvage: 0.7, signal: 0.75, delayMonths: 6,
    evidence: ["Goupil : ≈ 93 M€ de CA, ≈ 3 000 véhicules/an à ≈ 30 k€ (Pappers, presse)", "UGAP verrouillé (Ligier + Goupil) → clients privés et petites communes", "pOk 65 % : COC L7e-CU de la version cargo souvent mal documenté"] },
  { id: "autoportee", pAD: 0.15, name: "🚜 Tondeuse autoportée sur batterie", marketUnits: 135000, marketSrc: "≈ 135 000 autoportées / an (estimation NielsenIQ-GfK)",
    price: 2100, cost: 1500, fixedMonth: 200, fullInvest: 35000, testInvest: 9000, pOk: 0.75,
    demand: { low: L(0.5, 0.0005), mid: L(0.35, 0.0015), high: L(0.15, 0.004) }, pWar: 0.4, warCut: 0.3, salvage: 0.75, signal: 0.7, delayMonths: 12,
    evidence: ["Marques électriques 3 400–5 800 € ; usine ≈ 1 450 $", "CE machines + bruit + batterie : conformité accessible", "Saison mars–juillet : un test raté coûte une saison (12 mois de retard)"] },
  { id: "remorques", pAD: 0.05, name: "🛞 Remorques légères homologuées", marketUnits: 95000, marketSrc: "≈ 95 000 / an (estimation SDES)",
    price: 1500, cost: 1150, fixedMonth: 100, fullInvest: 25000, testInvest: 8000, pOk: 0.45,
    demand: { low: L(0.55, 0.0005), mid: L(0.35, 0.0015), high: L(0.1, 0.003) }, pWar: 0.3, warCut: 0.25, salvage: 0.8, signal: 0.7, delayMonths: 6,
    evidence: ["Homologation O1/O2 obligatoire (coût du service technique à chiffrer)", "Écart ×1,8 seulement face aux Polonais"] },
  { id: "golf", pAD: 0.3, name: "⛳ Golfettes (campings, domaines)", marketUnits: 4300, marketSrc: "≈ 4 300 / an (estimation golfs + campings)",
    price: 7000, cost: 5000, fixedMonth: 150, fullInvest: 30000, testInvest: 10000, pOk: 0.85,
    demand: { low: L(0.45, 0.004), mid: L(0.4, 0.012), high: L(0.15, 0.025) }, pWar: 0.25, warCut: 0.2, salvage: 0.75, signal: 0.75, delayMonths: 9,
    evidence: ["Antidumping US → usines chinoises en surplus, prix négociables", "Usage privé : pas d’homologation route nécessaire"] },
  { id: "mower", pAD: 0.1, name: "🌱 Débroussailleuses radiocommandées", marketUnits: 1050, marketSrc: "≈ 1 050 / an (estimation)",
    price: 5000, cost: 3550, fixedMonth: 150, fullInvest: 25000, testInvest: 6000, pOk: 0.65,
    demand: { low: L(0.5, 0.01), mid: L(0.35, 0.025), high: L(0.15, 0.05) }, pWar: 0.2, warCut: 0.2, salvage: 0.75, signal: 0.75, delayMonths: 12,
    evidence: ["Marques UE 9 800–40 000 € ; Vigorun ≈ 2 850 $", "Stage V moteur + bruit à prouver (pOk 70 %)"] },
  { id: "tracteur", pAD: 0.05, name: "🚜 Tracteurs compacts indiens", marketUnits: 39200, marketSrc: "≈ 39 200 tracteurs / an (Axema 2024)",
    price: 10500, cost: 8500, fixedMonth: 300, fullInvest: 50000, testInvest: 20000, pOk: 0.85,
    demand: { low: L(0.55, 0.0003), mid: L(0.35, 0.001), high: L(0.1, 0.002) }, pWar: 0.3, warCut: 0.2, salvage: 0.8, signal: 0.7, delayMonths: 6,
    evidence: ["Solis 21 % des espaces verts ; ≈ 8 900 € HT contre 16 800 € pour Kubota", "Marques déjà représentées → marge distributeur plus faible"] },
  { id: "foodtruck", pAD: 0.05, name: "🍔 Remorques food-truck homologuées", marketUnits: 800, marketSrc: "≈ 800 remorques/an (ESTIMATION : 600–700 food-trucks actifs + snacks de marché/événementiel ; ventes annuelles non publiées)",
    price: 14500, cost: 8500, fixedMonth: 200, fullInvest: 40000, testInvest: 9000, pOk: 0.5,
    demand: { low: L(0.5, 0.01), mid: L(0.35, 0.03), high: L(0.15, 0.06) }, pWar: 0.2, warCut: 0.15, salvage: 0.7, signal: 0.75, delayMonths: 6,
    evidence: ["France : remorque neuve 3–4 m 15 000–25 000 €, équipée jusqu’à 50 000 € (HelloPro)", "Chine : 1 500–5 900 $ FOB (CE annoncé à vérifier) ; remorque basique avec COC revendue 4 800 € en Europe", "Barrière = COC ou réception à titre isolé en DREAL + carte grise VASP « magasin » : TON métier", "Beau Comme Un Camion : 3,5 M€ de CA, > 500 véhicules livrés"] },
  { id: "padel", pAD: 0.05, name: "🎾 Structures de terrains de padel (clubs, campings)", marketUnits: 828, marketSrc: "≈ 828 terrains construits en 2024 (estimation de blog) ; 3 200 terrains en France en 2025, +311 % depuis 2020 (FFT)",
    price: 22000, cost: 16000, fixedMonth: 300, fullInvest: 50000, testInvest: 20000, pOk: 0.6,
    demand: { low: L(0.5, 0.005), mid: L(0.35, 0.015), high: L(0.15, 0.03) }, pWar: 0.3, warCut: 0.2, salvage: 0.75, signal: 0.7, delayMonths: 6,
    evidence: ["France : piste seule 18 000–30 000 € ; clé en main 60–70 k€", "Chine : panoramique 6 300–9 800 $ le set (affiché)", "Prêt à taux zéro FFT « Boost padel » : projets de 4 terrains minimum, cahier des charges + note de calcul", "Pose sous-traitée + garantie décennale probable (inclus dans le coût)"] },
  { id: "minipelle", pAD: 0.1, name: "🦺 Mini-pelles 1–2 t « conformes 2027 »", marketUnits: 12000, marketSrc: "≈ 12 000 mini-pelles/an en France (Environnement Magazine, non daté)",
    price: 5500, cost: 4000, fixedMonth: 200, fullInvest: 30000, testInvest: 9000, pOk: 0.55,
    demand: { low: L(0.55, 0.001), mid: L(0.35, 0.003), high: L(0.1, 0.006) }, pWar: 0.5, warCut: 0.3, salvage: 0.75, signal: 0.7, delayMonths: 6,
    evidence: ["Kubota U10-3 ≈ 14 500 € HT ; chinoise Kingway 11 008 € HT en Allemagne ; 1 t ≈ 1 850–1 900 $ FOB", "Marché déjà encombré (IMX, CZN, Pelle-Import) : guerre des prix", "Règlement machines 2023/1230 au 20/01/2027 + Stage V : avantage aux importateurs conformes"] },
];

/** Calibration tirée des cas réels (recherche du 2 novembre 2026). */
export const CALIBRATION = {
  rules: [
    "Chance d’être conforme : 75–90 % si le produit a DÉJÀ une réception UE vérifiée (COC, dossier CE) ; 35–55 % si c’est toi qui dois porter l’homologation.",
    "Succès commercial durable d’un petit importateur : 15–30 % (survie à 5 ans des intermédiaires du commerce de gros : 51 %, INSEE).",
    "Rabais nécessaire : 20–40 % sous les leaders (viser ≥ 30 % pour les pros).",
    "Part d’un importateur seul sans marque : < 1–2 % du segment.",
    "Défense commerciale : quand la part chinoise devient visible, les leaders portent plainte → droits de 20–50 % (souvent plus) en 2–4 ans, parfois rétroactifs.",
  ],
  cases: [
    "Voitures : marques chinoises 2,7 % → 5,1 % en Europe (S1 2024 → S1 2025), puis droits compensateurs 7,8–35,3 % sur les électriques. Aiways (petit entrant) : ≈ 1 000 voitures/an puis arrêt.",
    "Chariots élévateurs : 8 % → 15 % en EMEA (2020–2022), rabais 20–40 %, pas d’antidumping.",
    "Nacelles : forte hausse chinoise → droits antidumping 22–49 % (janvier 2025) + 0–14 % anti-subvention.",
    "Golfettes aux USA : 99 % des importations chinoises → droits 119–478 % (2025).",
    "Vélos électriques UE : droits 18,8–79,3 % → importations chinoises −84 % en 1 an.",
    "Robots tondeuses : décision antidumping UE au plus tard le 19/01/2027, importations enregistrées (rétroactif possible).",
    "VSP : Kaiyun ≈ 30 ventes en Europe (échec) ; XEV ≈ 10 000 en cumul (déclaration) ; marché −21 % en 2025.",
  ],
  base: [
    "Survie à 5 ans : 69 % (toutes entreprises), 64 % (commerce), 51 % (intermédiaires du commerce de gros) — INSEE.",
    "Safety Gate 2024 : 40 % des alertes visent des produits chinois (61 % hors cosmétiques).",
    "Non-conformité technique en contrôle douanier : 22 % (2017, toutes origines).",
    "Voitures électriques chinoises : décote ≈ 2× plus rapide (Allemagne).",
  ],
  sources: "jato.com, carscoops.com, internationalrentalnews.com, eur-lex.europa.eu (2025/45, 2024/2754, 2026/142), powertraininternationalweb.com, usitc.gov, cyclingindustry.news, insee.fr, banque-france.fr, sgs.com (Safety Gate), lemoci.com, journalauto.com",
};
