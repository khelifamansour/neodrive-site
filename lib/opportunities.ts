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
    market: 41900, marketLabel: "≈ 41 900 VSP d’occasion / an (≈ 18 900 par des pros)", marketSrc: "AAA Data : 38 674 en 2023 ; 2025 estimé depuis Aixam 16 804 transactions = 40,1 % ; prix moyen chez un pro 11 695 € (leboncoin)", marketEst: true,
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
    market: 4300, marketLabel: "≈ 4 300 neuves / an (parc ≈ 17 500)", marketSrc: "Calcul : 733 golfs × 15 voiturettes ÷ 6 ans (≈ 1 830) + 7 460 campings × 35 % × 2,5 ÷ 7 ans (≈ 930) + hôtels/collectivités/particuliers ≈ 1 500 — sources : Assemblée nationale, entreprises.gouv.fr ; hypothèses de flotte et de renouvellement", marketEst: true,
    price: "6 000–8 500 € (neuf 7 500–15 000 €)", share: [0.005, 0.012, 0.025], margin: 1400, invest: 9000, fixed: 0,
    barrier: 3, competition: 2, solo: 5, deliveries: true,
    why: "Même usine, même remorque, peu d’importateurs directs.", risk: "Homologation pour la route ; antidumping possible (USA déjà).", next: "2 golfettes lithium dans le prochain conteneur.",
    evidence: ["lechotouristique.com : ≈ 7 400 campings", "hellopro.fr : 7 500 € HT (2 places) à 25 000 € (route)"] },
  { id: "mower", name: "🌱 Débroussailleuses radiocommandées", group: "produit",
    market: 1050, marketLabel: "≈ 1 050 / an (fourchette 800–1 500)", marketSrc: "Calcul : Europe ≈ 96 M€ ÷ prix moyen 18 000 € ≈ 5 300 u. × 20 % France (relief, vignes, collectivités) — pmarketresearch (fiabilité faible), hellopro.fr", marketEst: true,
    price: "5 990–7 490 € (marques UE 9 800–40 000 €)", share: [0.01, 0.025, 0.05], margin: 1450, invest: 6000, fixed: 0,
    barrier: 3, competition: 1, solo: 5, deliveries: true,
    why: "Écart de prix 3–5×, débroussaillage obligatoire étendu à 52 départements, aucun importateur chinois trouvé.", risk: "Stage V, bruit, CE à ta charge ; saison mars–juin.", next: "Devis Vigorun avec certificat moteur avant mi-décembre.",
    evidence: ["ecologie.gouv.fr : 52 départements (arrêté du 13/04/2026)", "pmarketresearch.com : Europe ≈ 104 M$ (peu fiable)"] },
  { id: "utility", name: "🛻 Utilitaire sans permis L6e (clients privés)", group: "produit",
    market: 2000, marketLabel: "≈ 2 000 utilitaires légers / an", marketSrc: "Calcul : Goupil ≈ 750 en France (≈ 560 immatriculations VUL sur 2025, CCFA) + Aixam Pro ≈ 500 + Ligier Pro ≈ 300 + autres ≈ 450 (hypothèses) — marché en recul en 2025", marketEst: true,
    price: "8 990–9 990 € (Aixam Pro ≈ 16 800 € HT)", share: [0.005, 0.012, 0.025], margin: 1600, invest: 9000, fixed: 0,
    barrier: 4, competition: 2, solo: 4, deliveries: true,
    unknown: "COC de la version cargo à vérifier", why: "Même barrière que la VSP (COC), écart de prix énorme.", risk: "COC de la version cargo ; marchés publics verrouillés (UGAP).", next: "COC + photos réelles du pickup Yunlong.",
    evidence: ["lejournaldesentreprises.com : Goupil 3 600 en 2023", "journalauto.com : UGAP = Ligier + Goupil"] },
  { id: "utv", name: "🏍️ UTV électrique (fermes, chasses)", group: "produit",
    market: 2081, marketLabel: "2 081 SSV neufs / an (2025), dont ≈ 80 électriques", marketSrc: "Axema / Réussir ; part électrique ≈ 3–5 % (estimation)", marketEst: false,
    price: "9 990–12 990 € (Polaris électrique 33 332 € HT)", share: [0.001, 0.003, 0.006], margin: 3000, invest: 10000, fixed: 0,
    barrier: 4, competition: 4, solo: 3, deliveries: true,
    unknown: "prix usine inconnu", why: "Gros ticket, électrique encore rare.", risk: "Marché −10 %, Polaris 46 %, attachement au thermique, prix usine inconnu.", next: "Prix Hisun / Kandi.",
    evidence: ["reussir.fr : 2 315 (2024) → 2 081 (2025)", "reussir.fr : Polaris Ranger électrique 33 332 € HT"] },
  { id: "autoportee", name: "🚜 Tondeuses autoportées sur batterie (le « prochain VSP »)", group: "produit",
    market: 135000, marketLabel: "≈ 135 000 autoportées / an (toutes motorisations)", marketSrc: "Calcul depuis NielsenIQ-GfK (robots 112 603 u. = 20,6 % ; autoportées 39,9 % ≈ 338 M€ ÷ 2 500 €)", marketEst: true,
    price: "≈ 2 290–2 790 € (marques : électrique 3 400–5 800 €)", share: [0.0008, 0.002, 0.005], margin: 600, invest: 30000, fixed: 0,
    barrier: 3, competition: 2, solo: 4, deliveries: true, unknown: "devis usine + autonomie réelle de la batterie",
    why: "Même histoire que la voiture sans permis : vieux marché, marques chères, bascule vers la batterie, usines chinoises à ≈ 1 450 $, pas encore de casseur de prix en direct. Ta remorque et ton SAV.",
    risk: "Saison mars–juillet : stock (≈ 25 machines = ≈ 30 k€) à payer en hiver ; garantie batterie.", next: "3 devis d’usines (autoportée lithium 38–42\") + 1 échantillon ; commande d’un conteneur en décembre pour mars.",
    evidence: ["labomaison.com (NielsenIQ-GfK) : robots 112 603 u., 174,4 M€", "bricomarche.com : Stiga électrique 3 399 €", "accio.ai : autoportée lithium 1 437–1 496 $"] },
  { id: "remorques", name: "🛞 Remorques légères homologuées (bagagères, porte-voitures)", group: "produit",
    market: 95000, marketLabel: "≈ 95 000 / an (estimation)", marketSrc: "Calcul : 8 600 en Nouvelle-Aquitaine (2017, SDES) ≈ 9 % de la France", marketEst: true,
    price: "900–2 900 € (750 kg) ; porte-voiture 3 000–10 000 €", share: [0.0005, 0.0015, 0.003], margin: 300, invest: 15000, fixed: 0,
    barrier: 4, competition: 3, solo: 4, deliveries: true, unknown: "coût de l’homologation O1/O2",
    why: "Homologation UE obligatoire que les usines chinoises n’ont pas = ton savoir-faire COC. Se vend avec la livraison.", risk: "Écart ×1,8 seulement face aux Polonais ; volumineux.", next: "Chiffrer l’homologation O1/O2 auprès d’un service technique (UTAC).",
    evidence: ["fr.statista.com / SDES", "made-in-china.com : 600–1 210 $", "conseils.hellopro.fr : 900–2 900 €"] },
  { id: "tracteur-inde", name: "🚜 Tracteurs compacts indiens (marque non représentée)", group: "produit",
    market: 39200, marketLabel: "≈ 39 200 tracteurs / an (6 718 « espaces verts »)", marketSrc: "Axema via Pleinchamp (2024)", marketEst: false,
    price: "≈ 9 000–12 000 € HT (Kubota ≈ 16 800 € HT)", share: [0.0003, 0.001, 0.002], margin: 2000, invest: 25000, fixed: 0,
    barrier: 4, competition: 3, solo: 3, deliveries: true, unknown: "marque indienne libre en France",
    why: "Solis a déjà 21 % des espaces verts : la preuve que l’indien marche. Stage V déjà homologué.", risk: "SAV agricole, pièces, marques déjà représentées.", next: "Lister les marques indiennes Stage V sans importateur France.",
    evidence: ["pleinchamp.com : 6 718 espaces verts, Solis 21,1 %", "neyer.de : Solis 26 ≈ 8 900 € HT"] },
  // ── Dans les conteneurs déjà payés (≈ 12 m³ libres ; le conteneur est déjà déclaré « marchandise dangereuse »)
  { id: "rtk", name: "🛰️ Kits d’autoguidage GPS/RTK pour tracteurs", group: "conteneur",
    market: 37238, marketLabel: "37 238 tracteurs neufs / an (+ parc de 389 000 fermes)", marketSrc: "Axema 2020 ; recensement agricole 2020", marketEst: false,
    price: "≈ 4 900 € posé (France 4 700–8 333 €)", share: [0.0003, 0.001, 0.002], margin: 2000, invest: 9000, fixed: 0,
    barrier: 4, competition: 3, solo: 3, deliveries: false, unknown: "choisir une vraie marque (CHC, SMAJAYU), pas un clone",
    why: "Meilleure marge par m³ : ≈ 0,15 m³ et ≈ 2 000 € de marge. La pose et le réglage découragent les vendeurs purement en ligne ; tu as la remorque et le sens technique.",
    risk: "Activité de service (pose, support en saison) ; clones Alibaba ; concurrence FJD, FieldBee, concessions.", next: "3 kits d’une vraie marque dans un conteneur + 3 démonstrations chez des agriculteurs / une CUMA.",
    evidence: ["reussir.fr : FJD dès 6 000 €, FieldBee dès 4 700 €", "store.fjdynamics.com : FJD AT2 8 333 € HT", "alibaba.com : 1 200–4 360 $ FOB", "Réseau RTK Centipede gratuit"] },
  { id: "lifepo12", name: "🔋 Batteries lithium 12 V 200–300 Ah (camping-cars, vans, bateaux)", group: "conteneur",
    market: 20700, marketLabel: "≈ 20 700 / an (514 000 camping-cars en circulation)", marketSrc: "Calcul : 2,5 % du parc passe au lithium chaque année + 30 % des 26 328 neufs — SDES, UNI VDL (hypothèses de taux)", marketEst: true,
    price: "≈ 550–900 € (200 Ah chauffée, garantie France)", share: [0.005, 0.015, 0.03], margin: 150, invest: 6000, fixed: 0,
    barrier: 2, competition: 4, solo: 4, deliveries: false,
    why: "Très dense (≈ 0,03 m³), clientèle proche (vanlife, campings). Tu déclares déjà de la marchandise dangereuse.",
    risk: "Marques chinoises déjà en Europe (LiTime 200 Ah ≈ 430–510 €) ; obligation REP batteries (éco-organisme) depuis le 18/08/2025 ; envoi en colis = règles ADR.", next: "Se différencier : 200–300 Ah avec chauffage intégré + installation ; adhérer à un éco-organisme batteries.",
    evidence: ["toute-la-franchise.com : parc 514 000 camping-cars (SDES 2025)", "univdl.com : 26 328 neufs en 2025", "kaufland.fr / manomano.fr : prix France", "filieres-rep.ademe.fr : REP batteries"] },
  { id: "pack72", name: "🔋 Packs lithium 48/60/72 V (VSP, golfettes)", group: "conteneur",
    market: 15000, marketLabel: "≈ 15 000 remplacements de batterie / an (estimation)", marketSrc: "Calcul : ≈ 60 000 VSP électriques à batterie plomb (2020–2024) ÷ durée de vie ≈ 4 ans ; + golfettes (parc ≈ 17 500)", marketEst: true,
    price: "≈ 1 500–2 500 € posé", share: [0.001, 0.003, 0.006], margin: 500, invest: 5000, fixed: 0,
    barrier: 4, competition: 2, solo: 4, deliveries: false, unknown: "compatibilité BMS/chargeur par modèle",
    why: "Barrière technique réelle (BMS, chargeur, sécurité) et peu de concurrents. Commence par TES voitures : option autonomie et pièce SAV.", risk: "Sécurité (incendie), conformité au COC si la masse change.", next: "Pack d’origine de ta voiture en stock SAV + option « autonomie +40 % ».",
    evidence: ["globalsources.com : 38,4 V 105 Ah ≈ 480 $", "18650batterystore.com : kit golf 48 V 105 Ah 1 999 $ (USA)", "CCFA : 75 % des VSP vendues en 2025 sont électriques"] },
  { id: "savl6e", name: "🧰 Stock SAV de tes propres voitures", group: "conteneur",
    market: 600, marketLabel: "≈ 600 voitures NeoDrive en circulation (estimation)", marketSrc: "≈ 18 ventes/mois depuis ≈ 3 ans (à corriger)", marketEst: true,
    price: "pièces 20–500 €", share: [0.4, 0.6, 0.8], margin: 80, invest: 5000, fixed: 0,
    barrier: 5, competition: 1, solo: 5, deliveries: false,
    why: "Personne d’autre n’a tes pièces : marge récurrente + argument de vente (« pièces en stock en France »). CT obligatoire = réparations.", risk: "Stock dormant si trop de références.", next: "Demander à l’usine la liste des 30 pièces les plus remplacées + prix.",
    evidence: ["presse-citron.net : contrôle technique des VSP", "caradisiac.com : délais de pièces chinoises jusqu’à 200 jours"] },
  { id: "piecescn", name: "🚘 Pièces pour voitures chinoises (MG, BYD) → carrossiers", group: "conteneur",
    market: 46500, marketLabel: "≈ 46 500 réparations / an (parc ≈ 155 000 voitures chinoises)", marketSrc: "Calcul : parc estimé (MG 100 000 en France, BYD ≈ 14 000 en 2025) × 30 % de réparations/an (hypothèse)", marketEst: true,
    price: "vitrage, optiques, capteurs d’origine", share: [0.0005, 0.001, 0.003], margin: 60, invest: 10000, fixed: 0,
    barrier: 3, competition: 2, solo: 3, deliveries: false, unknown: "prix et marges non chiffrés",
    why: "Vrai manque (pare-brise MG attendu 5 mois, voitures « irréparables » selon KPMG). Les voitures chinoises = 7,9 % du marché en juillet 2026.", risk: "MG a ouvert un entrepôt (5 000 réf.) ; optiques et carrosserie : seulement pièces de l’équipementier d’origine (dessins protégés).", next: "Liste de 10 pièces MG4 / ZS / BYD Atto 3 + 5 carrossiers prêts à acheter.",
    evidence: ["journalauto.com : marques chinoises ≈ 8 % du marché (juillet 2026)", "assets.kpmg.com : pièces manquantes", "caradisiac.com : pare-brise 5 mois", "Cour de cassation 11/06/2025 : vitrage libéralisé"] },
  { id: "wallbox", name: "🔌 Bornes de recharge 7–22 kW (vente aux installateurs)", group: "conteneur",
    market: 200000, marketLabel: "≈ 200 000 bornes à domicile / an (estimation)", marketSrc: "Calcul : 326 923 voitures électriques en 2025 × 60 % qui installent une borne — Avere", marketEst: true,
    price: "matériel 600–1 200 €", share: [0.0001, 0.0003, 0.0006], margin: 150, invest: 6000, fixed: 0,
    barrier: 3, competition: 4, solo: 2, deliveries: false,
    why: "Marché énorme et en croissance.", risk: "Pose réservée aux installateurs IRVE ; marques européennes installées ; il faut une marque chinoise sérieuse (essais IEC 61851, OCPP).", next: "Seulement si 2–3 installateurs s’engagent à acheter.",
    evidence: ["avere-france.org : 1,5 M de voitures électriques, 326 923 en 2025", "fournisseurs-electricite.com : 600–1 200 € de matériel"] },
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
