/** Contenu des pages piliers et comparatifs (prix concurrents = prix constatés en novembre 2026, sources citées). */
import type { Landing } from "./seo-landing";

export const DATE = "Prix constatés en novembre 2026 dans les sources citées en bas de page ; ils peuvent évoluer, vérifiez auprès de chaque marque.";
export const S = {
  izi: { label: "izi by EDF – Prix d'une voiture électrique sans permis", url: "https://izi-by-edf.fr/blog/prix-voiture-electrique-sans-permis" },
  iziBest: { label: "izi by EDF – Meilleures voitures électriques sans permis", url: "https://izi-by-edf.fr/blog/voiture-electrique-sans-permis-meilleures" },
  motor1: { label: "Motor1 – Mobilize Duo vs Fiat Topolino vs Citroën Ami", url: "https://www.motor1.com/news/738924/mobilize-duo-versus-fiat-topolino-vs-citroen-ami/" },
  mondial: { label: "Mondial.paris – Voitures sans permis : modèles et prix", url: "https://mondial.paris/?p=99440" },
  aspp: { label: "ASPP – Voiture électrique sans permis Li-Bellule", url: "https://www.byaspp.com/voiture-electrique-sans-permis-w1" },
  simplici: { label: "LesVoitures.fr – Simplici S1 à 8 999 €", url: "https://lesvoitures.fr/simplici-s1-anti-citroen-ami-a-8-999-e-et-produite-en-chine-simplicicar-voiture-sans-permis-fiat-topolino-2024/" },
  alumi: { label: "Automobile Propre – Linktour Alumi", url: "https://www.automobile-propre.com/voitures/linktour-alumi/" },
  sp: { label: "Service-Public.fr – Aides à l'achat d'un véhicule propre", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/f34014" },
  roole: { label: "Roole – Quelles aides pour acheter une voiture sans permis ?", url: "https://media.roole.fr/transition/nouveaux-usages/quelles-sont-les-aides-pour-acheter-une-voiture-sans-permis" },
  gsp: { label: "Fin du bonus écologique pour les quadricycles", url: "https://gsanspermis.com/fin-du-bonus-ecologique-quel-impact-pour-les-quadricycles-electriques/" },
  ligierCee: { label: "Ligier – Prime CEE pour voiture sans permis électrique", url: "https://www.ligier.fr/faq/prime-cee-vsp-electrique/" },
};

const NEO_ROWS = [
  ["NeoDrive Essentielle", "3 990 €", "Sur commande (délai de fabrication)"],
  ["NeoDrive Confort", "4 990 €", "En stock, livrée chez vous"],
];

export const COMMON_FAQ = [
  { q: "Les voitures NeoDrive sont-elles homologuées ?", a: "Oui. Chaque NeoDrive est homologuée en catégorie L6e (quadricycle léger, 45 km/h) et livrée avec son certificat de conformité (COC), indispensable pour la carte grise." },
  { q: "Comment se passe le paiement ?", a: "Vous réservez sans acompte. Le paiement se fait à la livraison, après avoir vu la voiture, selon les modalités confirmées par l'équipe." },
  { q: "Combien coûte la livraison ?", a: "Le prix de livraison dépend de votre département (de 450 à 790 €). Le total exact s'affiche sur la page de réservation avec votre code postal." },
];

export const PILLARS: Record<string, Landing> = {
  "voiture-sans-permis-la-moins-chere": {
    path: "/voiture-sans-permis-la-moins-chere",
    title: "La voiture sans permis électrique la moins chère",
    metaTitle: "Voiture sans permis électrique la moins chère (2026)",
    description: "Comparatif des prix 2026 des voitures sans permis électriques neuves : Ami, Topolino, Duo, Aixam, Ligier… et NeoDrive dès 3 990 €. Prix sourcés.",
    eyebrow: "COMPARATIF DES PRIX 2026",
    h1: "Voiture sans permis électrique la moins chère : les prix 2026 comparés",
    intro: "Une voiture sans permis électrique neuve coûte en général entre 7 000 et 12 500 € chez les grandes marques. Voici les prix publics constatés, modèle par modèle, et pourquoi NeoDrive démarre à 3 990 €.",
    table: {
      caption: "Prix des voitures sans permis électriques neuves",
      head: ["Modèle", "Prix de départ", "Remarque"],
      rows: [
        ...NEO_ROWS,
        ["Li-Bellule (ASPP)", "6 990 €", "Prix annoncé hors batterie (à vérifier auprès du vendeur)"],
        ["Citroën Ami", "7 990 à 8 190 €", "Selon les sources"],
        ["Aixam / Ligier-Microcar (électrique)", "dès 8 999 €", "Selon version"],
        ["Simplici S1", "8 999 €", "Prix de lancement annoncé"],
        ["Fiat Topolino", "9 890 €", ""],
        ["Mobilize Duo", "9 990 €", ""],
        ["Linktour Alumi", "9 990 €", ""],
        ["Ligier Myli", "12 499 €", "Selon version"],
      ],
      note: DATE,
    },
    sections: [
      { h2: "Pourquoi NeoDrive est moins chère", paras: ["NeoDrive est une marque basée à Muret (31) qui vend en direct : pas de concessionnaire ni d'intermédiaire, et des voitures importées par conteneurs entiers. C'est cette chaîne courte qui permet un prix de départ à 3 990 € TTC.", "Le prix affiché ne fait pas tout : comparez aussi la livraison, la carte grise, la garantie et la disponibilité réelle du véhicule."] },
      { h2: "Ce qu'il faut comparer en plus du prix", bullets: ["Le délai : en stock ou sur commande", "La garantie et la disponibilité des pièces en France", "Les frais de livraison et de carte grise", "Les équipements réels (chauffage, caméra de recul, Bluetooth)", "Le mode de paiement : acompte ou paiement à la livraison"] },
    ],
    faq: [
      { q: "Quelle est la voiture sans permis électrique neuve la moins chère en 2026 ?", a: "Parmi les prix publics constatés en novembre 2026, la NeoDrive Essentielle à 3 990 € TTC (sur commande) et la NeoDrive Confort à 4 990 € TTC (en stock) sont nettement sous les autres modèles neufs, qui démarrent autour de 7 000 €." },
      { q: "Une voiture sans permis pas chère est-elle moins sûre ?", a: "Toutes les voitures sans permis vendues neuves doivent être homologuées dans leur catégorie (L6e pour les 45 km/h). Comparez la structure, les équipements et la garantie, pas seulement le prix." },
      ...COMMON_FAQ,
    ],
    sources: [S.izi, S.iziBest, S.motor1, S.mondial, S.aspp, S.simplici, S.alumi],
    related: [{ label: "Budget voiture sans permis 2026 : le vrai coût", href: "/budget-voiture-sans-permis-2026" }, { label: "Voiture sans permis chinoise : concession ou vente directe ?", href: "/voiture-sans-permis-chinoise-prix-concession" }, { label: "Voiture sans permis électrique chinoise : ce qu'il faut savoir", href: "/voiture-sans-permis-chinoise" }, { label: "Aides 2026 pour une voiture sans permis électrique", href: "/aides-voiture-sans-permis-electrique-2026" }, { label: "Prix d'une voiture sans permis", href: "/prix-voiture-sans-permis" }, { label: "Citroën Ami ou NeoDrive", href: "/citroen-ami-ou-neodrive" }],
  },
  "voiture-sans-permis-chinoise": {
    path: "/voiture-sans-permis-chinoise",
    title: "Voiture sans permis électrique chinoise",
    metaTitle: "Voiture sans permis électrique chinoise : avis, SAV, prix",
    description: "Voiture sans permis électrique fabriquée en Chine : homologation L6e, certificat de conformité, garantie, pièces et SAV en France. Le guide NeoDrive.",
    eyebrow: "FABRIQUÉE EN CHINE, SUIVIE EN FRANCE",
    h1: "Voiture sans permis électrique chinoise : ce qu'il faut vérifier avant d'acheter",
    intro: "De nombreuses voitures sans permis électriques sont aujourd'hui fabriquées en Chine, y compris certains modèles de grandes marques. Ce qui fait la différence, ce n'est pas le pays d'usine : c'est l'homologation, la garantie, les pièces et le service après-vente en France.",
    sections: [
      { h2: "1. L'homologation et le certificat de conformité", paras: ["Une voiture sans permis 45 km/h doit être homologuée en catégorie L6e. Sans certificat de conformité (COC), impossible d'obtenir une carte grise.", "Chaque NeoDrive est homologuée L6e et livrée avec son certificat de conformité ; NeoDrive peut aussi s'occuper de la carte grise."] },
      { h2: "2. La garantie et le vendeur", bullets: ["Un vendeur identifié en France, avec une adresse et un SIREN", "Une garantie écrite (NeoDrive : 2 ans)", "Des conditions de paiement claires : chez NeoDrive, aucun acompte et paiement à la livraison"] },
      { h2: "3. Les pièces détachées et le SAV", paras: ["Avant d'acheter, vérifiez que les pièces d'usure et de carrosserie sont disponibles en France. NeoDrive tient un catalogue de pièces détachées en ligne et un service après-vente avec diagnostic à distance."], bullets: ["Catalogue de pièces : /pieces", "Diagnostic et SAV en ligne : /neodiag"] },
      { h2: "4. Les preuves : livraisons réelles et avis", paras: ["Méfiez-vous des vendeurs sans aucune trace de livraison. NeoDrive publie des vidéos de livraisons chez ses clients et affiche ses avis Google."] },
    ],
    faq: [
      { q: "Une voiture sans permis chinoise est-elle fiable ?", a: "La fiabilité dépend du modèle, du contrôle avant livraison et du suivi après-vente, pas seulement du pays de fabrication. Vérifiez l'homologation L6e, la garantie écrite et la disponibilité des pièces en France." },
      { q: "Peut-on immatriculer une voiture sans permis importée de Chine ?", a: "Oui, si elle est homologuée dans sa catégorie et livrée avec son certificat de conformité (COC). Sans COC, la carte grise est refusée." },
      { q: "Pourquoi acheter chez un vendeur français plutôt que sur une marketplace ?", a: "Pour avoir un interlocuteur, une garantie applicable en France, des pièces disponibles et un SAV. Sur certaines marketplaces, le service après-vente en Europe n'est pas identifié." },
      ...COMMON_FAQ,
    ],
    related: [{ label: "Voiture sans permis chinoise : 2 fois moins chère en direct qu'en concession ?", href: "/voiture-sans-permis-chinoise-prix-concession" }, { label: "Voiture sans permis chinoise : avis et fiabilité", href: "/offres/voiture-sans-permis-chinoise-avis-fiabilite" }, { label: "Homologation L6e et certificat de conformité", href: "/offres/homologation-l6e-certificat-conformite" }, { label: "Pièces et SAV d'une voiture sans permis importée", href: "/offres/pieces-sav-voiture-sans-permis-importee" }, { label: "La voiture sans permis électrique la moins chère", href: "/voiture-sans-permis-la-moins-chere" }, { label: "Pièces détachées NeoDrive", href: "/pieces" }, { label: "SAV et diagnostic NeoDrive", href: "/neodiag" }],
  },
  "aides-voiture-sans-permis-electrique-2026": {
    path: "/aides-voiture-sans-permis-electrique-2026",
    title: "Aides 2026 pour une voiture sans permis électrique",
    metaTitle: "Aides 2026 voiture sans permis électrique : le vrai point",
    description: "Bonus écologique, prime CEE, aides locales : ce qui existe vraiment en 2026 pour acheter une voiture sans permis électrique. Sources officielles.",
    eyebrow: "AIDES À L'ACHAT 2026",
    h1: "Aides 2026 pour une voiture sans permis électrique : ce qui existe vraiment",
    intro: "Beaucoup de pages promettent encore un bonus pour les voitures sans permis électriques. La réalité est plus simple : le bonus écologique ne concerne plus les quadricycles, mais d'autres pistes existent selon le vendeur et votre commune.",
    sections: [
      { h2: "Le bonus écologique : plus pour les quadricycles", paras: ["Selon plusieurs sources spécialisées, l'aide de 900 € qui existait pour les quadricycles électriques a été supprimée fin 2024. Certaines pages affirment encore le contraire : en cas de doute, la référence est Service-Public.fr."] },
      { h2: "La prime CEE (certificats d'économies d'énergie)", paras: ["Depuis 2025, certains constructeurs et vendeurs proposent une prime financée par les certificats d'économies d'énergie pour les voitures sans permis 100 % électriques (L6e et L7e). Elle est déduite par le vendeur qui participe à un programme CEE ; son montant varie selon le vendeur et l'acheteur.", "NeoDrive ne propose pas de prime CEE à ce jour : son prix de départ à 3 990 € TTC est déjà inférieur au prix des autres modèles neufs après prime."] },
      { h2: "Les aides locales", paras: ["Certaines communes, métropoles ou régions aident à l'achat de véhicules électriques légers, parfois sous conditions de ressources. Ces aides changent souvent : à vérifier auprès de votre mairie ou de votre région avant l'achat."] },
      { h2: "Ce qui ne coûte rien", bullets: ["Pas de malus : une voiture sans permis n'y est pas soumise", "Une recharge sur une prise classique 220 V", "Une carte grise à coût réduit (service NeoDrive : 150 €)"] },
    ],
    faq: [
      { q: "Existe-t-il un bonus écologique pour une voiture sans permis électrique en 2026 ?", a: "D'après les sources disponibles en novembre 2026, le bonus écologique ne s'applique plus aux quadricycles électriques depuis fin 2024. Vérifiez la situation à jour sur Service-Public.fr." },
      { q: "Qu'est-ce que la prime CEE pour une voiture sans permis ?", a: "C'est une prime financée par les certificats d'économies d'énergie, déduite par certains vendeurs pour les voitures sans permis 100 % électriques. Son montant dépend du vendeur et de l'acheteur." },
      { q: "Ma commune peut-elle m'aider ?", a: "Parfois. Certaines collectivités financent l'achat de véhicules électriques légers. Renseignez-vous auprès de votre mairie ou de votre région." },
      ...COMMON_FAQ,
    ],
    sources: [S.sp, S.roole, S.gsp, S.ligierCee],
    related: [{ label: "La voiture sans permis électrique la moins chère", href: "/voiture-sans-permis-la-moins-chere" }, { label: "Financement d'une voiture sans permis", href: "/financement" }, { label: "Budget voiture sans permis 2026", href: "/budget-voiture-sans-permis-2026" }, { label: "Assurance voiture sans permis", href: "/assurance-voiture-sans-permis" }],
  },
};

type Rival = { slug: string; name: string; price: string; priceNote?: string; sources: Array<{ label: string; url: string }>; network: string };
const RIVALS: Rival[] = [
  { slug: "mobilize-duo-ou-neodrive", name: "Mobilize Duo", price: "9 990 €", sources: [S.motor1], network: "Réseau Renault / Mobilize" },
  { slug: "aixam-ou-neodrive", name: "Aixam (e-Aixam / Minauto)", price: "dès 8 999 €", priceNote: "selon version", sources: [S.mondial], network: "Concessions Aixam" },
  { slug: "ligier-myli-ou-neodrive", name: "Ligier Myli", price: "12 499 €", priceNote: "selon version", sources: [S.iziBest], network: "Concessions Ligier" },
  { slug: "microcar-ou-neodrive", name: "Microcar (électrique)", price: "dès 8 999 €", priceNote: "Ligier-Microcar, selon version", sources: [S.mondial], network: "Concessions Ligier-Microcar" },
  { slug: "linktour-alumi-ou-neodrive", name: "Linktour Alumi", price: "9 990 €", sources: [S.alumi], network: "Distribution en enseignes et revendeurs" },
  { slug: "li-bellule-ou-neodrive", name: "Li-Bellule", price: "6 990 €", priceNote: "hors batterie selon le vendeur, à vérifier", sources: [S.aspp], network: "Boutique de la marque" },
  { slug: "simplici-s1-ou-neodrive", name: "Simplici S1", price: "8 999 €", priceNote: "prix de lancement annoncé", sources: [S.simplici], network: "Réseau Simplicicar" },
  { slug: "opel-rocks-e-ou-neodrive", name: "Opel Rocks-e", price: "voir le tarif Opel", sources: [], network: "Réseau Opel" },
];

export const COMPARATIFS: Record<string, Landing> = Object.fromEntries(RIVALS.map(r => [r.slug, {
  path: `/comparatif/${r.slug}`,
  title: `${r.name} ou NeoDrive`,
  metaTitle: `${r.name} ou NeoDrive : prix et comparatif 2026`.slice(0, 65),
  description: `${r.name} ou NeoDrive : prix, places, garantie, livraison et paiement comparés honnêtement. NeoDrive dès 3 990 €, livrée chez vous.`,
  eyebrow: "COMPARATIF",
  h1: `${r.name} ou NeoDrive : quelle voiture sans permis électrique choisir ?`,
  intro: `${r.name} et NeoDrive sont deux voitures sans permis électriques deux places. Voici les différences concrètes, sans dénigrer personne : à vous de choisir selon votre budget et votre usage.`,
  table: {
    caption: "Comparatif rapide",
    head: ["", r.name, "NeoDrive"],
    rows: [
      ["Prix de départ", `${r.price}${r.priceNote ? ` (${r.priceNote})` : ""}`, "3 990 € (Essentielle, sur commande) · 4 990 € (Confort, en stock)"],
      ["Places", "2", "2"],
      ["Autonomie", "selon constructeur", "50 à 70 km selon conditions et version (indicatif)"],
      ["Garantie", "selon constructeur", "2 ans"],
      ["Achat", r.network, "En direct, livraison à domicile partout en France"],
      ["Paiement", "selon le vendeur", "Sans acompte, paiement à la livraison"],
      ["Délai", "selon le réseau", "Confort en stock : livrée en 2 à 3 semaines"],
      ["Homologation", "L6e", "L6e, livrée avec son certificat de conformité (COC)"],
    ],
    note: DATE,
  },
  sections: [
    { h2: `Quand choisir ${r.name}`, paras: [`Si vous voulez acheter dans un réseau physique (${r.network.toLowerCase()}) et que le budget n'est pas votre premier critère, ${r.name} est une option à considérer.`] },
    { h2: "Quand choisir NeoDrive", paras: ["Si votre priorité est le prix : NeoDrive démarre à 3 990 € TTC, avec la Confort en stock à 4 990 € TTC (chauffage, caméra de recul, Bluetooth). Vous réservez sans acompte, la voiture est livrée chez vous et vous payez à la livraison."] },
  ],
  faq: [
    { q: `${r.name} ou NeoDrive : laquelle est la moins chère ?`, a: `D'après les prix constatés en novembre 2026, ${r.name} démarre à ${r.price}${r.priceNote ? ` (${r.priceNote})` : ""}. NeoDrive démarre à 3 990 € TTC (Essentielle) et 4 990 € TTC pour la Confort en stock.` },
    { q: `Peut-on essayer ${r.name} ou NeoDrive avant d'acheter ?`, a: "NeoDrive vous montre la voiture en photos et en vidéo, et vous la voyez à la livraison avant de payer. Pour les autres marques, renseignez-vous auprès de leur réseau." },
    ...COMMON_FAQ,
  ],
  sources: r.sources,
  related: [{ label: "La voiture sans permis électrique la moins chère", href: "/voiture-sans-permis-la-moins-chere" }, { label: "Citroën Ami ou NeoDrive", href: "/citroen-ami-ou-neodrive" }, { label: "Fiat Topolino ou NeoDrive", href: "/fiat-topolino-ou-neodrive" }, { label: "Budget voiture sans permis 2026", href: "/budget-voiture-sans-permis-2026" }, { label: "Concession ou vente directe : l'écart de prix", href: "/voiture-sans-permis-chinoise-prix-concession" }, ...RIVALS.filter(x => x.slug !== r.slug).slice(0, 3).map(x => ({ label: `${x.name} ou NeoDrive`, href: `/comparatif/${x.slug}` }))],
  breadcrumb: [{ name: "Comparatifs", path: "/comparatif" }],
} as Landing]));

export const COMPARATIF_SLUGS = RIVALS.map(r => r.slug);
export const NEW_SEO_PATHS = [...Object.values(PILLARS).map(p => p.path), "/comparatif", ...COMPARATIF_SLUGS.map(s => `/comparatif/${s}`)];
