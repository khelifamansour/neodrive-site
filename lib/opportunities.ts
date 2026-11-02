/** Synthèse des opportunités NeoDrive, chacune simulée À PARTIR DE LA TAILLE DU MARCHÉ :
 *  ventes = marché France / an × part que NeoDrive peut prendre (min / probable / max).
 *  Chaque ligne indique la source du marché et si c'est un chiffre publié ou une estimation. */
export type Tri = [number, number, number];
export type Opp = {
  id: string; name: string; group: "coeur" | "levier" | "produit" | "conteneur";
  market: number; marketLabel: string; marketSrc: string; marketEst: boolean; // unités / an en France
  price: string; share: Tri;                 // part du marché prise à maturité (année 3)
  margin: number;                            // marge HT par unité (après tous les frais)
  invest: number; fixed: number;             // mise de départ (stock + mise en place), charges / mois
  barrier: number; competition: number; solo: number; // 1–5
  deliveries: boolean;                       // passe par ta remorque (consomme ta capacité de livraison)
  why: string; risk: string; next: string; evidence: string[];
  unknown?: string;                          // ce qui manque pour décider (prix usine, partenaire…)
};

export const OPPS: Opp[] = [
  { id: "coeur", name: "🚗 Voitures sans permis électriques (ton cœur)", group: "coeur",
    market: 18700, marketLabel: "≈ 18 700 VSP électriques neuves / an", marketSrc: "24 977 L6 en 2025 × ≈ 75 % électrique — AAA Data / JATO", marketEst: false,
    price: "4 990–6 490 € (le neuf le moins cher du marché)", share: [0.011, 0.014, 0.02], margin: 1493, invest: 0, fixed: 0,
    barrier: 4, competition: 2, solo: 5, deliveries: true,
    why: "Tu es déjà à ≈ 216/an = 1,2 % du marché électrique, sous tous les concurrents neufs (le suivant est à 7 490 €) et sous l’Ami d’occasion (7 251 €).",
    risk: "Aide 2027 réservée aux modèles européens ; seuil SIV de 200 cartes grises/an.", next: "Garder le prix, ajouter le prix au mois sur chaque annonce.",
    evidence: ["AAA Data via journalauto.com : 24 977 L6 en 2025 (−21 %)", "JATO : électrique +19 % en 2025", "sans-p.fr, voltandgo.com : neuf le moins cher hors NeoDrive 7 490 €"] },
  { id: "credit", name: "💳 Crédit / LOA pour les clients", group: "levier",
    market: 7490, marketLabel: "≈ 7 500 acheteurs qui financent / an", marketSrc: "30 % des ventes financées (Aixam, Sofinco) × 24 977", marketEst: true,
    price: "mensualité ≈ 99–149 €/mois", share: [0.003, 0.006, 0.01], margin: 1493, invest: 1500, fixed: 0,
    barrier: 2, competition: 3, solo: 4, deliveries: true,
    why: "Tu ne touches presque pas ces clients aujourd’hui (vente comptant sur Leboncoin).", risk: "Agrément d’un petit vendeur par la banque ; statut IOBSP (formation + ORIAS).",
    next: "Paiement 10× dès maintenant (Oney/Alma), crédit affecté en 2–4 mois.",
    evidence: ["journalauto.com : Aixam ≈ 30 % de ventes financées", "docs.adyen.com : Oney 1 % pour le marchand si le client paie les frais"] },
  { id: "lld", name: "📆 Location longue durée via un partenaire", group: "levier",
    market: 8000, marketLabel: "≈ 8 000 VSP louées / an", marketSrc: "Topolino 6 956 × 80 % en location + part des Ami en LLD", marketEst: true,
    price: "≈ 89–99 €/mois (vs 59–79 € chez Stellantis)", share: [0.002, 0.005, 0.01], margin: 1343, invest: 0, fixed: 0,
    barrier: 3, competition: 4, solo: 3, deliveries: true,
    unknown: "partenaire loueur à trouver", why: "C’est comme ça que Stellantis a pris 57 % du marché.", risk: "Trouver un loueur qui accepte une marque chinoise (valeur de revente).", next: "Contacter 2 loueurs spécialisés / banques en LOA.",
    evidence: ["journalauto.com : 80 % des Topolino en location", "automobile-propre.com : Ami LLD 69 €/mois"] },
  { id: "reprise", name: "🔁 Reprise + occasion", group: "levier",
    market: 38674, marketLabel: "38 674 VSP d’occasion vendues / an", marketSrc: "AAA Data 2023 (+2,4 %)", marketEst: false,
    price: "occasions 3 000–14 000 €", share: [0.0005, 0.0015, 0.003], margin: 800, invest: 10000, fixed: 0,
    barrier: 3, competition: 3, solo: 3, deliveries: true,
    why: "Marché plus gros que le neuf, faible décote (≈ 5 %/an), CT obligatoire qui pousse les vieux diesels dehors. Chaque reprise fait aussi vendre une neuve.",
    risk: "Vices cachés des moteurs diesel, garantie légale.", next: "Proposer « reprise de ta vieille VSP » dans toutes les annonces ; dépôt-vente pour ne pas bloquer d’argent.",
    evidence: ["journalauto.com : 38 674 changements de propriétaire (2023)", "mister-auto.com : décote −20 % puis −5 %/an", "mondial.paris : CT obligatoire depuis 2024"] },
  { id: "agents", name: "🤝 3 garages agents (voiture d’exposition)", group: "levier",
    market: 18700, marketLabel: "même marché, zones loin de tes hubs", marketSrc: "Aixam vend via ≈ 230 points de vente", marketEst: true,
    price: "commission ≈ 550 €/vente", share: [0.001, 0.0025, 0.005], margin: 943, invest: 12000, fixed: 0,
    barrier: 2, competition: 3, solo: 3, deliveries: true,
    why: "Les leaders vendent par réseau ; tu n’as que Leboncoin.", risk: "Stock chez des tiers, qualité de vente inégale.", next: "1 garage test près de chaque hub.",
    evidence: ["lejournaldesentreprises.com : Aixam ≈ 230 points de vente", "inovev.com : réseaux = > 70 % du marché"] },
  { id: "webads", name: "📣 Google / Meta / TikTok (1 000 €/mois)", group: "levier",
    market: 18700, marketLabel: "même marché", marketSrc: "lead 15–45 € (Facebook FR), conversion ≈ 10 % (hypothèse)", marketEst: true,
    price: "≈ 300 € de pub par vente", share: [0.0006, 0.0018, 0.003], margin: 1493, invest: 2000, fixed: 1000,
    barrier: 1, competition: 4, solo: 4, deliveries: true,
    why: "Ne plus dépendre d’un seul canal.", risk: "Coût par vente inconnu pour les VSP : tester 2 mois.", next: "Test 2 mois avec un objectif de coût par vente < 300 €.",
    evidence: ["lafabriquedunet.fr : lead Facebook 15–45 €", "webtonic.io : conversion Google Ads auto ≈ 7,8 %"] },
  { id: "golf", name: "⛳ Golfettes (campings, domaines, golfs)", group: "produit",
    market: 2500, marketLabel: "≈ 2 500 / an (estimation)", marketSrc: "≈ 7 400 campings + 600–730 golfs ; à affiner", marketEst: true,
    price: "6 000–8 500 € (neuf 7 500–15 000 €)", share: [0.005, 0.012, 0.025], margin: 1400, invest: 9000, fixed: 0,
    barrier: 3, competition: 2, solo: 5, deliveries: true,
    why: "Même usine, même remorque, peu d’importateurs directs.", risk: "Homologation pour la route ; antidumping possible (USA déjà).", next: "2 golfettes lithium dans le prochain conteneur.",
    evidence: ["lechotouristique.com : ≈ 7 400 campings", "hellopro.fr : 7 500 € HT (2 places) à 25 000 € (route)"] },
  { id: "mower", name: "🌱 Débroussailleuses radiocommandées", group: "produit",
    market: 1000, marketLabel: "≈ 1 000 / an (estimation)", marketSrc: "Europe ≈ 104 M$ ÷ prix moyen ≈ 15 k$ ≈ 7 000 u. × ≈ 15 % France", marketEst: true,
    price: "5 990–7 490 € (marques UE 9 800–40 000 €)", share: [0.01, 0.025, 0.05], margin: 1450, invest: 6000, fixed: 0,
    barrier: 3, competition: 1, solo: 5, deliveries: true,
    why: "Écart de prix 3–5×, débroussaillage obligatoire étendu à 52 départements, aucun importateur chinois trouvé.", risk: "Stage V, bruit, CE à ta charge ; saison mars–juin.", next: "Devis Vigorun avec certificat moteur avant mi-décembre.",
    evidence: ["ecologie.gouv.fr : 52 départements (arrêté du 13/04/2026)", "pmarketresearch.com : Europe ≈ 104 M$ (peu fiable)"] },
  { id: "utility", name: "🛻 Utilitaire sans permis L6e (clients privés)", group: "produit",
    market: 1500, marketLabel: "≈ 1 500 / an (estimation)", marketSrc: "Goupil 3 600 u./an en Europe ; part privée France à affiner", marketEst: true,
    price: "8 990–9 990 € (Aixam Pro ≈ 16 800 € HT)", share: [0.005, 0.012, 0.025], margin: 1600, invest: 9000, fixed: 0,
    barrier: 4, competition: 2, solo: 4, deliveries: true,
    unknown: "COC de la version cargo à vérifier", why: "Même barrière que la VSP (COC), écart de prix énorme.", risk: "COC de la version cargo ; marchés publics verrouillés (UGAP).", next: "COC + photos réelles du pickup Yunlong.",
    evidence: ["lejournaldesentreprises.com : Goupil 3 600 en 2023", "journalauto.com : UGAP = Ligier + Goupil"] },
  { id: "utv", name: "🏍️ UTV électrique (fermes, chasses)", group: "produit",
    market: 2081, marketLabel: "2 081 SSV neufs / an (2025)", marketSrc: "Axema / Réussir", marketEst: false,
    price: "9 990–12 990 € (Polaris électrique 33 332 € HT)", share: [0.002, 0.006, 0.012], margin: 3000, invest: 10000, fixed: 0,
    barrier: 4, competition: 4, solo: 3, deliveries: true,
    unknown: "prix usine inconnu", why: "Gros ticket, électrique encore rare.", risk: "Marché −10 %, Polaris 46 %, attachement au thermique, prix usine inconnu.", next: "Prix Hisun / Kandi.",
    evidence: ["reussir.fr : 2 315 (2024) → 2 081 (2025)", "reussir.fr : Polaris Ranger électrique 33 332 € HT"] },
];

// ── Simulation par opportunité (Monte-Carlo) : part de marché, croissance et marge réelle tirées au hasard
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function tri(r: () => number, [a, m, b]: Tri) { if (b <= a) return m; const u = r(), c = (m - a) / (b - a); return u < c ? a + Math.sqrt(u * (b - a) * (m - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - m)); }
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };

export function simulateOpp(o: Opp, shareMid?: number, runs = 600) {
  const share: Tri = shareMid ? [Math.min(o.share[0], shareMid), shareMid, Math.max(o.share[2], shareMid)] : o.share;
  const r = rng(o.id.length * 7919 + Math.round((shareMid || 0) * 1e6));
  const profits: number[] = [], y3: number[] = [], payback: number[] = [];
  const isCore = o.group === "coeur";
  for (let k = 0; k < runs; k++) {
    const sh = tri(r, share), growth = tri(r, [-0.12, 0.02, 0.12]), marginF = tri(r, [0.75, 1, 1.1]);
    let profit = -o.invest * (isCore ? 0 : 0), pb = 99;
    let cum = -o.invest;
    for (let y = 0; y < 3; y++) {
      const ramp = isCore ? 1 : [0.4, 0.75, 1][y];
      const units = o.market * Math.pow(1 + growth, y) * sh * ramp;
      const m = units * o.margin * marginF - o.fixed * 12;
      profit += m;
      if (pb === 99 && cum + m >= 0) pb = y * 12 + (m > 0 ? Math.ceil(12 * (-cum) / m) : 12);
      cum += m;
      if (y === 2) y3.push(units);
    }
    profits.push(profit); payback.push(pb);
  }
  const p50 = q(profits, 0.5), units3 = q(y3, 0.5);
  return { p10: q(profits, 0.1), p50, p90: q(profits, 0.9), units3, perMonth3: units3 / 12, payback: q(payback, 0.5), pLoss: profits.filter(x => x < 0).length / runs };
}
export type OppResult = ReturnType<typeof simulateOpp>;

/** Note de décision (0–100) : argent (profit probable), vitesse (retour), solidité (barrière, peu de concurrents, faisable seul, fiabilité des données). */
export function decisionScore(o: Opp, r: OppResult) {
  const money = Math.min(1, Math.max(0, r.p50 / 150000)), speed = Math.max(0, 1 - Math.min(r.payback, 36) / 36);
  const moat = (o.barrier + (6 - o.competition) + o.solo) / 15, data = o.marketEst ? 0.6 : 1;
  return Math.round(100 * (0.4 * money + 0.2 * speed + 0.3 * moat + 0.1 * data) * (r.pLoss > 0.3 ? 0.7 : 1) * (o.unknown ? 0.85 : 1));
}
export function verdictOf(score: number, r: OppResult): [string, string] {
  if (r.p50 <= 0) return ["❌ Non", "#b42318"];
  if (score >= 72) return ["🟢 Lancer", "#067647"];
  if (score >= 55) return ["🟡 Tester petit", "#b54708"];
  return ["⏳ Plus tard", "#435063"];
}
