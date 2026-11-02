/** Exploration de nouveaux marchés (recherche du 2 novembre 2026). Chaque chiffre a sa source ; 🧮 = estimation. */
export type Cand = {
  id: string; name: string; family: string; country: string;
  unitsFr: number | null; unitsEst: boolean; unitsSrc: string;
  priceFr: string; fob: string; gap: number | null;      // écart prix France / prix usine rendu (×)
  mutation: string; incumbents: string; chinaPen: string; saturation: number; // 1 = vide, 5 = saturé
  barrier: string; regulated: "none" | "soft" | "hard"; repeatable: boolean; logistics: string;
  fit: number; marginUnit: number | null; risks: string; verdict: string; sources: string[];
  mutating: number;                                          // 0–1 : marché en pleine mutation
};
export const EXPLORE: Cand[] = [
  // ── Fournisseurs hors Chine (Inde, Turquie…)
  { id: "trac-inde", name: "🚜 Tracteurs compacts indiens (Solis, Farmtrac, Mahindra)", family: "Machines agricoles", country: "Inde",
    unitsFr: 39200, unitsEst: false, unitsSrc: "≈ 39 200 tracteurs tous types en 2024 (Axema via Pleinchamp), dont 6 718 « espaces verts » (+9 %) où Solis a déjà 21 % ; standards 19 561 en 2025 (−18,5 %)",
    priceFr: "Kubota B1-241 ≈ 16 800 € HT", fob: "Solis 26 neuf ≈ 8 900 € HT revendeur (DE)", gap: 1.9, mutating: 0.5,
    mutation: "Les marques indiennes gagnent les petits tracteurs (Stage V déjà homologué) ; accord UE–Inde conclu le 27/01/2026 (pas encore en vigueur).", incumbents: "Kubota, Iseki, John Deere, New Holland",
    chinaPen: "Solis 21 % des espaces verts ; Farmtrac via Caminel", saturation: 3, barrier: "Stage V + réception tracteur (167/2013), SAV et pièces", regulated: "none", repeatable: true,
    logistics: "Conteneur, 1 par remorque", fit: 4, marginUnit: 2000, risks: "Marques déjà représentées → viser une marque non distribuée ; marché standard en baisse.", verdict: "Meilleur compromis hors Chine, mais le segment compact pur (≈ 6 700) est sous ton seuil de 20 000.",
    sources: ["pleinchamp.com", "reussir.fr", "maquinac.com", "neyer.de", "intellectual-property-helpdesk.ec.europa.eu"] },
  { id: "remorques", name: "🛞 Remorques routières légères (bagagères, porte-voitures, porte-engins)", family: "Transport", country: "Turquie (0 % de douane) / Pologne",
    unitsFr: 40000, unitsEst: true, unitsSrc: "Volume national non publié (SDES par département ; 8 600 en Nouvelle-Aquitaine en 2017 → national très probablement > 40 000, estimation) ; < 500 kg non immatriculées",
    priceFr: "≈ 400–4 000 € selon le type", fob: "non trouvé", gap: null, mutating: 0.3,
    mutation: "Peu de mutation technique ; union douanière UE–Turquie = 0 % de droits ; enseignes (Roady) lancent leurs marques.", incumbents: "Lider (Trigano), Saris, Erde, Franc ; Niewiadów, Temared (Pologne)",
    chinaPen: "faible", saturation: 3, barrier: "Réception O1/O2 (freinage, éclairage, attelage)", regulated: "none", repeatable: true,
    logistics: "Volumineux : camion depuis la Pologne plutôt que conteneur ; ta remorque et ton réseau de livraison", fit: 4, marginUnit: 300, risks: "Faible valeur au m³, Trigano dominant, volume à confirmer (SDES).", verdict: "Colle à ta logistique, mais marge unitaire faible.",
    sources: ["statistiques.developpement-durable.gouv.fr", "fr.statista.com", "trade.ec.europa.eu", "ac-franchise.com"] },
  { id: "vans", name: "🚐 Camping-cars et vans aménagés", family: "Loisirs", country: "Turquie",
    unitsFr: 26328, unitsEst: false, unitsSrc: "11 918 camping-cars + 14 410 vans neufs en 2025 (Wikicampers / UNI VDL) + 7 104 caravanes",
    priceFr: "40 000–90 000 €", fob: "non trouvé", gap: null, mutating: 0.3,
    mutation: "Fourgons électriques et marques turques qui arrivent en Europe.", incumbents: "Trigano, Erwin Hymer, Pilote, Rapido", chinaPen: "faible", saturation: 4,
    barrier: "Réception multi-étapes M1 autocaravane : lourde", regulated: "none", repeatable: true, logistics: "Roulant, pas en conteneur", fit: 2, marginUnit: 3000,
    risks: "Capital énorme par unité, garantie de l’aménagement, saisonnier.", verdict: "Trop lourd en capital pour toi aujourd’hui.", sources: ["wikicampers.fr", "camping-car.com", "openvan.camp"] },
  { id: "motos-inde", name: "🏍️ Motos 125–400 cm³ indiennes (Bajaj, TVS, Hero)", family: "Deux-roues", country: "Inde",
    unitsFr: 127000, unitsEst: false, unitsSrc: "≈ 127 000 immatriculations ≥ 125 cm³ en 2025 (marché 2-3RM 224 186, −16 %)",
    priceFr: "4 000–8 000 €", fob: "non trouvé", gap: null, mutating: 0.3, mutation: "Euro 5+ depuis 2025.", incumbents: "Honda, Yamaha, BMW, KTM (Bajaj), Royal Enfield",
    chinaPen: "marques chinoises présentes", saturation: 5, barrier: "Réception L3e, réseau d’atelier", regulated: "none", repeatable: true, logistics: "Conteneur", fit: 2, marginUnit: 500,
    risks: "Distribution déjà verrouillée par les constructeurs indiens.", verdict: "Gros marché fermé.", sources: ["lerepairedesmotards.com", "speedway.fr", "autocarindia.com"] },
  // ── Besoins humains (vieillissement, chaleur, loisirs)
  { id: "scooter-pmr", name: "🦽 Scooters électriques 4 roues pour seniors (PMR)", family: "Seniors", country: "Chine",
    unitsFr: 20000, unitsEst: true, unitsSrc: "Aucun chiffre national publié (à demander : codes douane NC 8713, données CNAM) — 20 000 = hypothèse à valider ; 7,5 M de Français de 75 ans et plus (INSEE)",
    priceFr: "1 200–7 000 € (base LPPR classe C ≈ 3 800 €)", fob: "385–990 $", gap: 3.5, mutating: 0.6,
    mutation: "Vieillissement + vente en ligne ; réseaux médicaux chers et fragmentés.", incumbents: "Invacare, Sunrise/Sterling, revendeurs médicaux", chinaPen: "marques chinoises en ligne", saturation: 3,
    barrier: "Dispositif médical classe I (autocertification CE, EN 12184, EUDAMED, vigilance)", regulated: "soft", repeatable: true,
    logistics: "Excellente : conteneur + ta remorque, même SAV que les VSP", fit: 5, marginUnit: 800, risks: "Volume non prouvé, concurrence en ligne, modèles remboursés via ordonnance.", verdict: "Le plus proche de ton métier côté seniors ; à valider par les chiffres douane.",
    sources: ["conseils.hellopro.fr", "invacare.fr", "made-in-china.com", "epicsourcing.co.uk", "insee.fr"] },
  { id: "monte-escalier", name: "🪜 Monte-escaliers droits", family: "Seniors", country: "Chine",
    unitsFr: 15000, unitsEst: true, unitsSrc: "Pas de volume annuel publié ; parc Stannah 50–60 000 + Etna 25 000 ; MaPrimeAdapt’ vise 45 000 logements adaptés en 2025 (Anah) — 15 000/an = hypothèse",
    priceFr: "2 500–5 000 € + pose 1 500–3 000 €", fob: "≈ 1 500–2 500 $", gap: 2.5, mutating: 0.5,
    mutation: "Aide MaPrimeAdapt’ depuis 2024 (50–70 % des travaux) + vieillissement.", incumbents: "Stannah, Etna, TK Home, Otolift, Handicare", chinaPen: "faible", saturation: 2,
    barrier: "NF EN 81-40, directive Machines, pose sur mesure", regulated: "none", repeatable: true, logistics: "Colis de rail, pose en 1 jour", fit: 4, marginUnit: 2000,
    risks: "Responsabilité en cas de chute, SAV long, démarchage des seniors très encadré.", verdict: "Belle marge et contrat d’entretien récurrent ; volume à confirmer.",
    sources: ["conseils.hellopro.fr", "lamaisonsaintgobain.fr", "previssima.fr", "accio.com"] },
  { id: "clim-mobile", name: "❄️ Climatiseurs mobiles", family: "Chaleur", country: "Chine",
    unitsFr: 390000, unitsEst: false, unitsSrc: "390 000 unités, 130 M€ (mai 2025–avril 2026, NielsenIQ GfK via LSA)",
    priceFr: "≈ 333 € en moyenne", fob: "non fiable", gap: null, mutating: 0.3, mutation: "Canicules à répétition.", incumbents: "GMS, De’Longhi, Midea, marques distributeurs",
    chinaPen: "très forte", saturation: 5, barrier: "Faible", regulated: "none", repeatable: true, logistics: "Colis", fit: 1, marginUnit: 50,
    risks: "Saisonnier, stock invendu, marge minuscule.", verdict: "Commodité tenue par la grande distribution.", sources: ["lsa-conso.fr"] },
  { id: "pac-split", name: "🌡️ Climatisation split / PAC", family: "Chaleur", country: "Chine",
    unitsFr: 803661, unitsEst: false, unitsSrc: "803 661 unités extérieures air-air en 2025 ; 179 377 PAC air-eau (Uniclima)",
    priceFr: "1 500–8 000 € posé", fob: "—", gap: null, mutating: 0.6, mutation: "Électrification du chauffage.", incumbents: "Daikin, Mitsubishi, Atlantic, Midea + milliers d’installateurs",
    chinaPen: "forte", saturation: 5, barrier: "Attestation fluides frigorigènes obligatoire + RGE pour les aides", regulated: "hard", repeatable: true, logistics: "Bonne", fit: 1, marginUnit: null,
    risks: "Certification obligatoire.", verdict: "Barrière réglementaire : exclu par tes critères.", sources: ["fpa.fr (Uniclima)", "hellowatt.fr", "capeb.fr"] },
  { id: "spa", name: "🛁 Spas acryliques extérieurs", family: "Loisirs", country: "Chine",
    unitsFr: 9000, unitsEst: true, unitsSrc: "8 000–10 000 / an (estimation de faible fiabilité)", priceFr: "5 000–12 000 €", fob: "1 500–5 500 $", gap: 2, mutating: 0.2,
    mutation: "—", incumbents: "Piscinistes, magasins spa, e-commerce", chinaPen: "moyenne", saturation: 3, barrier: "Électricité, manutention", regulated: "none", repeatable: true,
    logistics: "≈ 5 m³ : 10–12 par conteneur, livraison en remorque plateau", fit: 3, marginUnit: 2000, risks: "Sous le seuil, achat plaisir.", verdict: "Logistique idéale, marché trop petit.",
    sources: ["modelesdebusinessplan.com", "made-in-china.com"] },
  { id: "robot-piscine", name: "🤖 Robots de piscine", family: "Loisirs", country: "Chine", unitsFr: 60000, unitsEst: true, unitsSrc: "≈ 60 000 (estimation Maytronics, 2022)",
    priceFr: "300–2 000 €", fob: "—", gap: null, mutating: 0.5, mutation: "Robots sans fil chinois.", incumbents: "Maytronics, Zodiac, Aiper, Beatbot", chinaPen: "très forte", saturation: 5,
    barrier: "Faible", regulated: "none", repeatable: true, logistics: "Colis", fit: 1, marginUnit: null, risks: "Marques chinoises en direct.", verdict: "Saturé.", sources: ["maytronics.com", "guide-piscine.fr"] },
  { id: "cyclo-elec", name: "🛵 Cyclomoteurs électriques L1e (ados 14 ans)", family: "Deux-roues", country: "Chine",
    unitsFr: 47078, unitsEst: false, unitsSrc: "47 078 50 cc neufs en 2025 (−28 %, Solly Azar / AAA Data), ≈ 19 % électriques (≈ 9 000)",
    priceFr: "1 500–4 000 €", fob: "230–785 $", gap: 2.5, mutating: 0.6, mutation: "Passage à l’électrique, même cible que tes VSP (parents d’ados).", incumbents: "Peugeot Motocycles, Niu, Silence, Yadea",
    chinaPen: "forte", saturation: 4, barrier: "Homologation L1e (COC) — tu sais faire", regulated: "none", repeatable: true, logistics: "Conteneur dense + remorque", fit: 4, marginUnit: 400,
    risks: "Marché en chute, petit ticket, cannibalise les VSP.", verdict: "Complément de gamme facile, pas un relais de croissance.", sources: ["lerepairedesmotards.com", "cleanrider.com"] },
];
export const EXPLORE_VERDICT = "";
export const ALGERIA: { verdict: string; rules: { topic: string; detail: string; source: string }[]; opps: { id: string; name: string; what: string; marketSize: string; investment: string; barrier: string; fit: number; risks: string; sources: string[] }[] } = {
  verdict: "Les véhicules vers l’Algérie, c’est presque fermé pour un commerçant : revente des « moins de 3 ans » bloquée 36 mois (LF 2025), importations groupées interdites, concessionnaires sous agrément + quotas + engagement industriel.\n3 pistes réalistes : 1) pièces de rechange via une SARL locale avec un associé résident (1,6 Md$ importés en 2025, pénurie, prix ×2–3) ; 2) export Algérie → France (climatiseurs Condor, dattes Deglet Nour ≈ 2× moins chères que les tunisiennes) — le sens le plus simple ; 3) service payé en euros pour la diaspora qui rentre définitivement (véhicule de moins de 5 ans en franchise depuis 2026).\nTes ≈ 22 000 € là-bas : ne pas passer par le marché noir (≈ 276 DA/€ contre ≈ 151 officiel = infraction). Euros → compte devises dans une banque algérienne, puis apport au capital d’une SARL. Dinars → capital local définitif (un projet financé en dinars ne permet pas de rapatrier les bénéfices, art. 8 loi 22-18). Tout est à valider avec un avocat et un banquier algériens : les règles changent à chaque loi de finances.",
  rules: [
    { topic: "Véhicules de moins de 3 ans", detail: "Particuliers résidents seulement, 1 véhicule / 3 ans, essence/hybride/électrique (pas de diesel), abattement 80 % pour l’électrique. Revente pénalisée pendant 36 mois depuis 2025 ; importations groupées interdites.", source: "algerie360.com" },
    { topic: "Diaspora qui rentre (CCR, LF 2026)", detail: "Véhicule neuf ou de moins de 5 ans en franchise, ≤ 1 800 cm³, pas de diesel, 3 ans de séjour à l’étranger, une seule fois.", source: "algerie360.com" },
    { topic: "Concessionnaires (décret 22-383)", detail: "Agrément du ministère de l’Industrie, quotas, ≤ 1 600 cm³, engagement d’investissement industriel ; 27 agréments en 2023-2024.", source: "radioalgerie.dz" },
    { topic: "Assemblage (décret 22-384 / 24-159)", detail: "Taux d’intégration croissants (10 → 30 % ou plus) ; application aux tricycles/quadricycles non confirmée.", source: "maghrebemergent.news" },
    { topic: "Taxes", detail: "Droits 15–30 %, TCS 2–3 %, TVA 19 % ; pas d’exonération générale pour l’électrique importé par une entreprise ; pas de vignette pour l’électrique en 2026.", source: "algerie360.com, maghrebemergent.news" },
    { topic: "PPI + domiciliation", detail: "Depuis juillet 2025, tout import passe par un Programme prévisionnel d’importation ; domiciliation bancaire avant expédition ; crédit/remise documentaire.", source: "lemoci.com" },
    { topic: "Micro-importateur (décret 25-170)", detail: "Statut « cabas » légal à 5 % de droits — réservé aux résidents.", source: "upgrowth.dz" },
    { topic: "Change", detail: "Dinar non convertible ; > 1 000 € à déclarer ; ≈ 151 DA/€ officiel contre ≈ 276 au marché parallèle (illégal).", source: "embsofia.mfa.gov.dz, observalgerie.com" },
    { topic: "Investissement (loi 22-18)", detail: "Exonérations douane/TVA pendant la réalisation ; 51/49 abrogé sauf secteurs stratégiques ; transfert des bénéfices seulement si apport en devises.", source: "zoomalgerie.com, unctad.org" },
    { topic: "Marché", detail: "96 418 véhicules importés en 2025 (54 418 « moins de 3 ans ») ; 190 045 véhicules chinois expédiés janvier–août 2026 ; pièces 1,611 Md$ (2 369 importateurs).", source: "portseurope.com, algerie360.com" },
  ],
  opps: [
    { id: "dz-pieces", name: "🔧 Pièces de rechange France/Chine → Algérie (SARL locale)", what: "SARL importatrice avec un associé résident ; NeoDrive centrale d’achat en France, facturation en euros par crédit documentaire. Marques françaises (≈ 41 % du parc) et chinoises (en explosion).", marketSize: "1,611 Md$ importés en 2025, pénurie", investment: "15–40 k€ (estimation)", barrier: "Autorisation d’import, PPI, domiciliation", fit: 4, risks: "Gel des PPI, contrefaçon, bénéfices bloqués en dinars.", sources: ["algerie360.com", "lemoci.com"] },
    { id: "dz-export", name: "📦 Export Algérie → France (climatiseurs Condor, dattes)", what: "Distribuer en France des produits algériens compétitifs, payés en euros ; l’exportateur rapatrie les fonds.", marketSize: "Dattes 184 M$ exportés (2025) ; Condor > 250 000 climatiseurs commandés pour l’Espagne", investment: "10–30 k€ (1er conteneur)", barrier: "Distribution en France, CE", fit: 3, risks: "Tensions diplomatiques, régularité de la qualité.", sources: ["observalgerie.com", "maghrebemergent.news"] },
    { id: "dz-ccr", name: "🚗 Service clé en main pour la diaspora qui rentre", what: "Trouver le véhicule (électrique chinois inclus), vérifier l’éligibilité, transport Marseille → Alger, dossier douanier ; payé en euros en France.", marketSize: "non chiffré (retours définitifs)", investment: "< 5 k€", barrier: "Éligibilité stricte, règles changeantes", fit: 3, risks: "Volume incertain, LF 2027.", sources: ["algerie360.com", "ulysse.com"] },
    { id: "dz-skd", name: "🏭 Assemblage de tricycles / scooters électriques", what: "Montage SKD/CKD avec avantages AAPI ; HAM Motors exporte déjà vers la Tunisie et le Tchad.", marketSize: "non chiffré", investment: "centaines de k€ à M€", barrier: "Agrément, taux d’intégration, foncier", fit: 2, risks: "Régulation instable, capital bloqué.", sources: ["dzair-tube.dz", "zoomalgerie.com"] },
  ],
};

/** Note « schéma VSP » (0–100). */
export function patternScore(x: Cand) {
  const size = Math.min(1, Math.log10(Math.max(1, x.unitsFr || 1)) / 5);           // 100 000 u. = 1
  const gap = x.gap ? Math.min(1, Math.max(0, (x.gap - 1) / 2)) : 0.3;              // ×3 = 1
  const free = (5 - x.saturation) / 4, reg = x.regulated === "none" ? 1 : x.regulated === "soft" ? 0.6 : 0;
  return Math.round(100 * (0.15 * size + 0.2 * gap + 0.2 * x.mutating + 0.15 * free + 0.1 * reg + 0.05 * (x.repeatable ? 1 : 0) + 0.15 * (x.fit / 5)));
}
/** Potentiel de marge par an = marché × part × marge par unité. */
export const potential = (x: Cand, share: number) => (x.unitsFr || 0) * share * (x.marginUnit || 0);
