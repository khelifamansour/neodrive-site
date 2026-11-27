/**
 * Guides et comparatifs SEO rendus avec le gabarit LandingPage (FAQPage + fil d'Ariane en JSON-LD).
 * Prix NeoDrive : barème central (lib/neodrive-pricing.ts). Prix des autres marques : prix publics
 * constatés en novembre 2026 (sources en bas de page) ou ordres de grandeur formulés « environ ».
 * Aucun revendeur concurrent n'est cité nommément.
 */
import type { Landing } from "./seo-landing";
import { S, DATE, COMMON_FAQ } from "./seo-pillars";
import { VEHICLES, REGISTRATION_PRICE, deliveryPriceForDepartment } from "./neodrive-pricing";
import { CREDIT_WARNING } from "./neodrive-finance";

const eur = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " €";
const E = eur(VEHICLES.essentielle.price);
const C = eur(VEHICLES.confort.price);
const P = eur(VEHICLES.confortPlus.price);
const CG = eur(REGISTRATION_PRICE);
/** Prix livré d'une Confort (véhicule + carte grise + livraison du département). */
const livree = (dept: string) => VEHICLES.confort.price + REGISTRATION_PRICE + (deliveryPriceForDepartment(dept) ?? 0);
const LIV_MIN = livree("31");
const LIV_MAX = livree("59");
const DELIVERY = `${eur(deliveryPriceForDepartment("31")!)} à ${eur(deliveryPriceForDepartment("59")!)} selon le département`;

const COMPARE_CRUMB = [{ name: "Comparatifs", path: "/comparatif" }];
const GUIDE_CRUMB = [{ name: "Guide", path: "/guide-voiture-sans-permis" }];

const FINANCE_FAQ = { q: "Peut-on payer une NeoDrive en plusieurs mensualités ?", a: `Oui, un financement peut être étudié : faites une simulation sur la page Financement puis déposez votre dossier, transmis à un conseiller financement. L'acceptation dépend de l'organisme prêteur. ${CREDIT_WARNING}` };

const NEO_COLUMN = {
  prix: `${C} TTC (Confort, en stock) · ${E} (Essentielle, sur commande) · ${P} (Confort Plus)`,
  autonomie: "50 à 70 km selon la version et les conditions (indicatif)",
  recharge: "Prise domestique 220 V, environ 6 h",
  garantie: "2 ans (garantie légale de conformité)",
  livraison: `À domicile partout en France : ${DELIVERY}, ou retrait gratuit à Muret (31)`,
  paiement: "0 € d'acompte, paiement à la livraison",
  delai: "Confort en stock : livrée en 2 à 3 semaines",
};

export const GUIDES: Record<string, Landing> = {
  "citroen-ami-ou-neodrive": {
    path: "/citroen-ami-ou-neodrive",
    title: "Citroën Ami ou NeoDrive",
    metaTitle: "Citroën Ami ou NeoDrive : prix, autonomie, garantie (2026)",
    description: `Citroën Ami (environ 8 000 €) ou NeoDrive Confort (${C}, en stock) : prix, autonomie, équipements, garantie et livraison comparés sans détour.`,
    eyebrow: "COMPARATIF 2026",
    h1: "Citroën Ami ou NeoDrive : quelle voiture sans permis électrique choisir ?",
    intro: "La Citroën Ami est la voiture sans permis électrique la plus connue en France. NeoDrive est une marque toulousaine qui vend en direct, sans concession. Voici les différences concrètes de prix, d'autonomie, d'équipement et de livraison, pour choisir selon votre usage.",
    table: {
      caption: "Citroën Ami ou NeoDrive : le comparatif",
      head: ["", "Citroën Ami", "NeoDrive"],
      rows: [
        ["Prix de départ", "Environ 8 000 € (7 990 à 8 190 € selon la version et la source)", NEO_COLUMN.prix],
        ["Places / vitesse", "2 places · 45 km/h", "2 places · 45 km/h"],
        ["Autonomie annoncée", "75 km (annonce constructeur)", NEO_COLUMN.autonomie],
        ["Recharge", "Prise domestique 220 V", NEO_COLUMN.recharge],
        ["Carrosserie", "Panneaux en plastique", "Structure et carrosserie en acier"],
        ["Équipement", "Minimaliste, packs d'accessoires en option", "Confort : chauffage, caméra de recul, Bluetooth / USB, alarme"],
        ["Garantie", "Garantie constructeur (voir conditions Citroën)", NEO_COLUMN.garantie],
        ["Achat et livraison", "Réseau Citroën et points de vente partenaires", NEO_COLUMN.livraison],
        ["Paiement", "Selon le point de vente", NEO_COLUMN.paiement],
      ],
      note: `${DATE} Caractéristiques de l'Ami : annonces du constructeur. Citroën et Ami sont des marques de leurs propriétaires respectifs.`,
    },
    sections: [
      { h2: "Le prix : environ 3 000 € d'écart", paras: [
        `La Citroën Ami neuve démarre autour de 7 990 à 8 190 € selon les sources. La NeoDrive Confort, en stock, coûte ${C} TTC ; l'Essentielle ${E} TTC, fabriquée sur commande (6 à 8 mois).`,
        `Même en ajoutant la carte grise (${CG}) et la livraison la plus chère, une NeoDrive Confort livrée chez vous revient à ${eur(LIV_MAX)} au maximum en France continentale, soit environ 2 000 € de moins qu'une Ami avant ses propres frais de mise à la route.`,
      ] },
      { h2: "Autonomie et recharge", paras: [
        "L'Ami annonce 75 km d'autonomie. La NeoDrive annonce 50 à 70 km selon la version, la température, le relief et la conduite. Si vous roulez souvent plus de 50 km par jour sans pouvoir recharger, l'Ami a l'avantage sur le papier.",
        "Pour les trajets locaux (courses, travail, rendez-vous à moins de 20 km), les deux conviennent : elles se rechargent la nuit sur une prise classique, sans borne.",
      ] },
      { h2: "Équipement et confort au quotidien", paras: ["L'Ami est volontairement simple, avec des accessoires proposés en option. La NeoDrive Confort est livrée de série avec chauffage, ventilation de toit, caméra de recul et aide au stationnement, autoradio Bluetooth / USB, alarme antivol et assistance en côte. Comparez version par version, options comprises."] },
      { h2: "Quand choisir la Citroën Ami", bullets: ["Vous avez un point de vente Citroën près de chez vous et voulez l'essayer sur place", "Vous privilégiez une marque très connue", "Vous avez besoin de l'autonomie annoncée la plus élevée"] },
      { h2: "Quand choisir NeoDrive", bullets: [`Votre budget : ${C} TTC pour la Confort en stock`, "Vous voulez le chauffage et la caméra de recul de série", "Vous préférez être livré chez vous et payer à la livraison, sans acompte", "Vous préférez une carrosserie en acier"] },
    ],
    faq: [
      { q: "Quelle est la différence de prix entre une Citroën Ami et une NeoDrive ?", a: `D'après les prix publics constatés en novembre 2026, la Citroën Ami démarre autour de 7 990 à 8 190 €. La NeoDrive Confort, en stock, coûte ${C} TTC et l'Essentielle ${E} TTC sur commande : environ 3 000 € d'écart à l'achat.` },
      { q: "Quelle autonomie pour la Citroën Ami et la NeoDrive ?", a: "Citroën annonce 75 km pour l'Ami. NeoDrive annonce 50 à 70 km selon la version et les conditions d'utilisation. Dans les deux cas, l'autonomie réelle baisse par temps froid et en côte." },
      { q: "La NeoDrive se conduit-elle avec le même permis que l'Ami ?", a: "Oui. Ce sont deux quadricycles légers L6e limités à 45 km/h : accessibles dès 14 ans avec le permis AM (ou sans, pour les personnes nées avant 1988)." },
      { q: "Peut-on se faire livrer une NeoDrive à domicile ?", a: `Oui, partout en France : ${DELIVERY}. Le prix exact s'affiche sur la page de réservation avec votre code postal.` },
      FINANCE_FAQ,
      ...COMMON_FAQ,
    ],
    sources: [S.motor1, S.izi, S.mondial],
    related: [{ label: "Fiat Topolino ou NeoDrive", href: "/fiat-topolino-ou-neodrive" }, { label: "Tous les comparatifs", href: "/comparatif" }, { label: "Budget voiture sans permis 2026 : le vrai coût", href: "/budget-voiture-sans-permis-2026" }, { label: "Voiture sans permis chinoise : concession ou vente directe ?", href: "/voiture-sans-permis-chinoise-prix-concession" }, { label: "La voiture sans permis électrique la moins chère", href: "/voiture-sans-permis-la-moins-chere" }],
    breadcrumb: COMPARE_CRUMB,
  },

  "fiat-topolino-ou-neodrive": {
    path: "/fiat-topolino-ou-neodrive",
    title: "Fiat Topolino ou NeoDrive",
    metaTitle: "Fiat Topolino ou NeoDrive : prix, autonomie, livraison (2026)",
    description: `Fiat Topolino (environ 9 890 €) ou NeoDrive Confort (${C}, en stock) : prix, autonomie, équipements, garantie et livraison comparés.`,
    eyebrow: "COMPARATIF 2026",
    h1: "Fiat Topolino ou NeoDrive : quelle voiture sans permis électrique choisir ?",
    intro: "La Fiat Topolino séduit par son style rétro italien. NeoDrive mise sur le prix et l'équipement, avec une vente directe et une livraison chez vous. Voici ce qui les sépare vraiment.",
    table: {
      caption: "Fiat Topolino ou NeoDrive : le comparatif",
      head: ["", "Fiat Topolino", "NeoDrive"],
      rows: [
        ["Prix de départ", "Environ 9 890 €", NEO_COLUMN.prix],
        ["Places / vitesse", "2 places · 45 km/h", "2 places · 45 km/h"],
        ["Autonomie annoncée", "75 km (annonce constructeur)", NEO_COLUMN.autonomie],
        ["Recharge", "Prise domestique 220 V", NEO_COLUMN.recharge],
        ["Équipement", "Selon version et options", "Confort : chauffage, caméra de recul, Bluetooth / USB, alarme"],
        ["Garantie", "Garantie constructeur (voir conditions Fiat)", NEO_COLUMN.garantie],
        ["Achat et livraison", "Réseau Fiat et points de vente partenaires", NEO_COLUMN.livraison],
        ["Paiement", "Selon le point de vente", NEO_COLUMN.paiement],
      ],
      note: `${DATE} Caractéristiques de la Topolino : annonces du constructeur. Fiat et Topolino sont des marques de leurs propriétaires respectifs.`,
    },
    sections: [
      { h2: "Le prix : presque le double", paras: [
        `La Fiat Topolino démarre autour de 9 890 €. La NeoDrive Confort coûte ${C} TTC : la Topolino coûte presque deux fois plus cher, pour le même usage (2 places, 45 km/h, recharge sur prise).`,
        `Une NeoDrive Confort livrée, carte grise comprise, revient à ${eur(LIV_MIN)} (Haute-Garonne) à ${eur(LIV_MAX)} selon le département.`,
      ] },
      { h2: "Autonomie et usage", paras: ["La Topolino annonce 75 km, la NeoDrive 50 à 70 km selon la version et les conditions. Pour des trajets quotidiens de quelques kilomètres à quelques dizaines de kilomètres avec recharge la nuit, la différence se ressent peu. Pour de longs trajets sans recharge, comparez l'autonomie réelle de chaque version."] },
      { h2: "Style ou équipement ?", paras: ["La Topolino plaît pour son design et son image. La NeoDrive Confort privilégie l'équipement de série : chauffage, ventilation, caméra de recul, Bluetooth / USB, alarme antivol, et une carrosserie en acier."] },
      { h2: "Quand choisir la Fiat Topolino", bullets: ["Le design est votre premier critère", "Vous voulez acheter et entretenir en concession", "Vous avez besoin de l'autonomie annoncée la plus élevée"] },
      { h2: "Quand choisir NeoDrive", bullets: [`Un budget autour de ${C} au lieu de près de 10 000 €`, "Le chauffage et la caméra de recul de série", "Une livraison chez vous et un paiement à la livraison", "Une voiture en stock, livrée en 2 à 3 semaines"] },
    ],
    faq: [
      { q: "Quelle est la différence de prix entre une Fiat Topolino et une NeoDrive ?", a: `D'après les prix publics constatés en novembre 2026, la Fiat Topolino démarre autour de 9 890 €. La NeoDrive Confort coûte ${C} TTC (en stock) et l'Essentielle ${E} TTC (sur commande), soit près de 5 000 € d'écart avec la Confort.` },
      { q: "La Topolino et la NeoDrive ont-elles la même autonomie ?", a: "Fiat annonce 75 km pour la Topolino, NeoDrive 50 à 70 km selon la version. L'autonomie réelle dépend de la température, du relief et de la conduite." },
      { q: "Peut-on essayer une NeoDrive avant de payer ?", a: "Vous voyez la voiture en photos et vidéos réelles, et vous la contrôlez à la livraison avant de payer. Le retrait sur place à Muret (31) est aussi possible." },
      FINANCE_FAQ,
      ...COMMON_FAQ,
    ],
    sources: [S.motor1, S.izi],
    related: [{ label: "Citroën Ami ou NeoDrive", href: "/citroen-ami-ou-neodrive" }, { label: "Mobilize Duo ou NeoDrive", href: "/comparatif/mobilize-duo-ou-neodrive" }, { label: "Tous les comparatifs", href: "/comparatif" }, { label: "Budget voiture sans permis 2026", href: "/budget-voiture-sans-permis-2026" }, { label: "Voiture sans permis chinoise : concession ou vente directe ?", href: "/voiture-sans-permis-chinoise-prix-concession" }],
    breadcrumb: COMPARE_CRUMB,
  },

  "prix-voiture-sans-permis": {
    path: "/prix-voiture-sans-permis",
    title: "Prix d'une voiture sans permis",
    metaTitle: "Prix d'une voiture sans permis en 2026 : neuve, occasion",
    description: `Combien coûte une voiture sans permis en 2026 ? Prix neuf électrique et thermique, occasion, frais de livraison et carte grise. NeoDrive neuve dès ${E} TTC.`,
    eyebrow: "GUIDE DES PRIX 2026",
    h1: "Quel est le prix d'une voiture sans permis en 2026 ?",
    intro: `Électrique ou thermique, neuve ou d'occasion : le prix d'une voiture sans permis va de quelques milliers d'euros à plus de 15 000 €. Voici les ordres de grandeur, ce qui fait varier le prix et le prix livré d'une NeoDrive, dès ${E} TTC.`,
    table: {
      caption: "Les ordres de grandeur des prix",
      head: ["Type de voiture sans permis", "Prix constaté", "À savoir"],
      rows: [
        ["NeoDrive électrique neuve", `${E} à ${P} TTC`, "Vente directe, Confort en stock à " + C],
        ["Électrique neuve, grandes marques (Ami, Topolino, Duo, Aixam, Ligier…)", "Environ 8 000 à 12 500 €", "Selon modèle et version"],
        ["Thermique (diesel) neuve, marques historiques", "Souvent plus de 12 000 €", "Selon finition et options"],
        ["Occasion", "Très variable", "Selon l'âge, le kilométrage, l'état de la batterie ou du moteur"],
      ],
      note: DATE,
    },
    sections: [
      { h2: "Ce qui fait varier le prix", bullets: ["La marque et le réseau de vente (concession ou vente directe)", "L'énergie : électrique ou diesel", "Les équipements de série et les options", "La garantie et la disponibilité des pièces", "Les frais annexes : livraison, carte grise, préparation"] },
      { h2: "Le prix livré d'une NeoDrive", paras: [`Le prix affiché est celui du véhicule. Pour connaître le prix complet, ajoutez la carte grise (formalités NeoDrive : ${CG}) et la livraison à domicile (${DELIVERY}). Exemple : une NeoDrive Confort livrée en Haute-Garonne revient à ${eur(LIV_MIN)}, et à ${eur(LIV_MAX)} au maximum en France continentale.`, "Votre prix exact s'affiche en direct sur la page de réservation avec votre code postal, sans acompte."] },
      { h2: "Neuve ou d'occasion ?", paras: ["Une occasion paraît moins chère au départ, mais une batterie fatiguée, des pièces d'usure à changer ou l'absence de garantie peuvent vite effacer l'écart. Comparez toujours une occasion au prix d'une neuve garantie, livrée et immatriculée."] },
      { h2: "Et le coût sur la durée ?", paras: ["Assurance, recharge et entretien s'ajoutent au prix d'achat. Nous avons détaillé chaque poste dans notre guide du budget 2026."] },
    ],
    faq: [
      { q: "Combien coûte une voiture sans permis neuve en 2026 ?", a: `Chez les grandes marques, une voiture sans permis électrique neuve coûte en général entre 8 000 et 12 500 € environ ; les diesels dépassent souvent 12 000 €. NeoDrive démarre à ${E} TTC (Essentielle, sur commande) et ${C} TTC pour la Confort en stock.` },
      { q: "Quel est le prix d'une NeoDrive livrée chez moi ?", a: `Véhicule + carte grise (${CG}) + livraison (${DELIVERY}). Pour une NeoDrive Confort : ${eur(LIV_MIN)} à ${eur(LIV_MAX)} en France continentale. Corse et outre-mer : sur devis.` },
      { q: "Pourquoi une voiture sans permis coûte-t-elle si cher en concession ?", a: "Le prix intègre plusieurs intermédiaires (importateur, distributeur, concession) et les frais d'un réseau physique. NeoDrive vend en direct, ce qui explique une partie de l'écart." },
      FINANCE_FAQ,
      ...COMMON_FAQ,
    ],
    sources: [S.izi, S.iziBest, S.motor1, S.mondial],
    related: [{ label: "Budget voiture sans permis 2026 : le vrai coût", href: "/budget-voiture-sans-permis-2026" }, { label: "La voiture sans permis électrique la moins chère", href: "/voiture-sans-permis-la-moins-chere" }, { label: "Voiture sans permis d'occasion", href: "/voiture-sans-permis-occasion" }, { label: "Assurance voiture sans permis", href: "/assurance-voiture-sans-permis" }, { label: "Tous les comparatifs", href: "/comparatif" }],
    breadcrumb: GUIDE_CRUMB,
  },

  "meilleure-voiture-sans-permis-electrique": {
    path: "/meilleure-voiture-sans-permis-electrique",
    title: "Meilleure voiture sans permis électrique",
    metaTitle: "Meilleure voiture sans permis électrique 2026 : comment choisir",
    description: "Il n'y a pas une meilleure voiture sans permis électrique pour tout le monde : prix, autonomie, équipement, garantie et livraison comparés selon votre usage.",
    eyebrow: "COMPARATIF 2026",
    h1: "Quelle est la meilleure voiture sans permis électrique pour vous ?",
    intro: "La meilleure voiture sans permis électrique est celle qui correspond à votre budget et à vos trajets. Voici les critères qui comptent vraiment, et les modèles à regarder selon votre priorité.",
    table: {
      caption: "Selon votre priorité",
      head: ["Votre priorité", "Ce qu'il faut regarder", "Modèles à comparer"],
      rows: [
        ["Le plus petit budget", "Prix livré complet, acompte, délai", `NeoDrive Essentielle (${E}) ou Confort en stock (${C})`],
        ["L'équipement de série", "Chauffage, caméra de recul, Bluetooth", "NeoDrive Confort, versions hautes des marques historiques"],
        ["L'autonomie annoncée", "Autonomie constructeur et réelle en hiver", "Citroën Ami et Fiat Topolino (75 km annoncés), NeoDrive Confort Plus"],
        ["Une concession près de chez soi", "Atelier, essai, reprise", "Aixam, Ligier, Microcar, Citroën, Fiat"],
        ["Être livré à domicile", "Prix et délai de livraison", "NeoDrive (livraison partout en France)"],
      ],
      note: DATE,
    },
    sections: [
      { h2: "Les 6 critères qui comptent", bullets: ["Le prix livré et immatriculé, pas seulement le prix affiché", "L'autonomie réelle par rapport à vos trajets quotidiens", "Les équipements de série (chauffage pour l'hiver, caméra de recul en ville)", "La garantie écrite et la disponibilité des pièces en France", "Le délai : en stock ou sur commande", "Les conditions de paiement : acompte ou paiement à la livraison"] },
      { h2: "Où se place NeoDrive", paras: [`NeoDrive fait partie des voitures sans permis électriques neuves les moins chères du marché : ${C} TTC pour la Confort en stock, bien équipée, avec carrosserie en acier et garantie 2 ans. Son point faible : une autonomie annoncée de 50 à 70 km, inférieure à certains modèles de grandes marques. Pour la plupart des trajets locaux, elle suffit.`] },
      { h2: "Comparer modèle par modèle", paras: ["Nous avons publié un comparatif détaillé face à chaque modèle courant : Citroën Ami, Fiat Topolino, Mobilize Duo, Aixam, Ligier, Microcar et d'autres. Retrouvez-les tous sur la page Comparatifs."] },
    ],
    faq: [
      { q: "Quelle est la meilleure voiture sans permis électrique en 2026 ?", a: "Cela dépend de votre usage. Pour un petit budget et des trajets locaux, une voiture bien équipée et peu chère comme la NeoDrive Confort est un bon choix. Pour la plus grande autonomie annoncée ou une concession proche, regardez aussi les grandes marques." },
      { q: "Quelle autonomie choisir ?", a: "Prenez vos trajets d'une journée et ajoutez une marge d'environ 30 % pour l'hiver et les côtes. Si vous rechargez chaque nuit, 50 km réels suffisent pour la plupart des usages locaux." },
      { q: "Faut-il choisir une marque connue ?", a: "Une marque connue rassure, mais comparez aussi le prix final, les équipements de série, la garantie, les pièces et le délai. Une voiture sans permis neuve doit dans tous les cas être homologuée L6e." },
      FINANCE_FAQ,
      ...COMMON_FAQ,
    ],
    sources: [S.izi, S.iziBest, S.motor1],
    related: [{ label: "Quelle voiture sans permis choisir ?", href: "/quelle-voiture-sans-permis-choisir" }, { label: "Tous les comparatifs", href: "/comparatif" }, { label: "Citroën Ami ou NeoDrive", href: "/citroen-ami-ou-neodrive" }, { label: "Fiat Topolino ou NeoDrive", href: "/fiat-topolino-ou-neodrive" }, { label: "Batterie lithium ou plomb", href: "/batterie-lithium-ou-plomb-voiture-sans-permis" }],
    breadcrumb: COMPARE_CRUMB,
  },

  "quelle-voiture-sans-permis-choisir": {
    path: "/quelle-voiture-sans-permis-choisir",
    title: "Quelle voiture sans permis choisir ?",
    metaTitle: "Quelle voiture sans permis choisir ? Le guide 2026",
    description: "Budget, trajets, électrique ou diesel, neuf ou occasion, garantie et livraison : le guide simple pour choisir sa voiture sans permis en 2026.",
    eyebrow: "GUIDE D'ACHAT 2026",
    h1: "Quelle voiture sans permis choisir en 2026 ?",
    intro: "Citroën Ami, Fiat Topolino, Aixam, Ligier, occasion ou NeoDrive : pour bien choisir, partez de votre budget total et de vos trajets. Voici la méthode en 5 étapes.",
    table: {
      caption: "Le bon choix selon votre profil",
      head: ["Profil", "Ce qui compte", "Notre conseil"],
      rows: [
        ["Jeune dès 14 ans", "Permis AM, assurance, sécurité", "Une électrique neuve, simple à recharger ; faites simuler l'assurance avant"],
        ["Senior", "Accès à bord, chauffage, stationnement", "Une voiture compacte avec chauffage et caméra de recul"],
        ["Trajets en ville", "Gabarit, recharge la nuit", "Une électrique de 2,50 m environ suffit largement"],
        ["Zone rurale, trajets plus longs", "Autonomie réelle, côtes, hiver", "Vérifiez l'autonomie réelle ; envisagez une version à autonomie renforcée"],
        ["Petit budget", "Prix livré complet", `Une neuve dès ${E} plutôt qu'une occasion sans garantie`],
      ],
    },
    sections: [
      { h2: "1. Fixez votre budget total", paras: ["Ajoutez au prix d'achat la carte grise, la livraison, l'assurance et la recharge. Notre guide du budget 2026 détaille chaque poste."] },
      { h2: "2. Mesurez vos trajets", paras: ["Notez vos trajets d'une journée normale. Une voiture sans permis électrique qui recharge la nuit couvre la plupart des usages locaux ; prévoyez une marge pour l'hiver."] },
      { h2: "3. Électrique ou diesel ?", paras: ["L'électrique se recharge sur une prise classique, sans vidange ni carburant. Le diesel garde une plus grande autonomie, mais il est plus cher à l'achat et à l'entretien, et il est bruyant."] },
      { h2: "4. Neuf ou occasion ?", paras: ["Une occasion peut cacher une batterie usée ou des réparations à venir. Une neuve est homologuée, garantie et livrée avec son certificat de conformité."] },
      { h2: "5. Vérifiez le vendeur", bullets: ["Une entreprise identifiée en France (adresse, SIREN)", "Une garantie écrite et des pièces disponibles", "Des preuves de livraisons réelles et des avis clients", "Pas de gros acompte avant d'avoir vu la voiture"] },
    ],
    faq: [
      { q: "Quelle voiture sans permis choisir pour un jeune de 14 ans ?", a: "Une voiture sans permis L6e (45 km/h) se conduit dès 14 ans avec le permis AM. Privilégiez une électrique neuve et faites simuler l'assurance avant l'achat : elle dépend beaucoup de l'âge du conducteur." },
      { q: "Faut-il choisir une voiture sans permis neuve ou d'occasion ?", a: `L'occasion coûte parfois moins cher au départ, mais sans garantie et avec un risque sur la batterie. Une NeoDrive neuve démarre à ${E} TTC, garantie 2 ans.` },
      { q: "Électrique ou diesel : que choisir ?", a: "Pour des trajets locaux avec recharge à domicile, l'électrique est plus simple et moins chère à utiliser. Le diesel garde l'avantage pour les longs trajets sans possibilité de recharge." },
      FINANCE_FAQ,
      ...COMMON_FAQ,
    ],
    sources: [S.izi, S.iziBest],
    related: [{ label: "Meilleure voiture sans permis électrique : comment choisir", href: "/meilleure-voiture-sans-permis-electrique" }, { label: "Budget voiture sans permis 2026", href: "/budget-voiture-sans-permis-2026" }, { label: "Voiture sans permis d'occasion", href: "/voiture-sans-permis-occasion" }, { label: "Tous les comparatifs", href: "/comparatif" }, { label: "Assurance voiture sans permis", href: "/assurance-voiture-sans-permis" }],
    breadcrumb: GUIDE_CRUMB,
  },

  "budget-voiture-sans-permis-2026": {
    path: "/budget-voiture-sans-permis-2026",
    title: "Budget voiture sans permis 2026",
    metaTitle: "Budget voiture sans permis 2026 : le vrai coût, poste par poste",
    description: "Prix d'achat, carte grise, livraison, assurance, recharge, entretien et financement : le vrai coût d'une voiture sans permis électrique en 2026, poste par poste.",
    eyebrow: "BUDGET 2026",
    h1: "Budget voiture sans permis 2026 : le vrai coût",
    intro: `Le prix affiché n'est qu'une partie du budget. Voici, poste par poste, ce que coûte vraiment une voiture sans permis électrique en 2026 : achat, carte grise, livraison, assurance, recharge, entretien et financement, avec l'exemple d'une NeoDrive Confort à ${C} TTC.`,
    table: {
      caption: "Le budget poste par poste (exemple : NeoDrive Confort)",
      head: ["Poste", "Combien", "À savoir"],
      rows: [
        ["Prix d'achat", `${C} TTC`, `Essentielle ${E} (sur commande), Confort Plus ${P}`],
        ["Carte grise", `${CG} (formalités NeoDrive)`, "Dossier d'immatriculation préparé pour vous"],
        ["Livraison", DELIVERY, "Gratuite en retrait à Muret (31) ; Corse et outre-mer sur devis"],
        ["Assurance", "Selon votre profil", "Obligatoire ; plus chère pour un jeune conducteur : faites-la simuler avant l'achat"],
        ["Recharge", "Environ 1 € pour 5 kWh", "Au tarif Base d'environ 0,20 €/kWh ; moins en heures creuses"],
        ["Entretien", "Faible", "Pas de vidange ni de carburant ; pneus, freins et pièces d'usure"],
        ["Financement", "Optionnel", "Coût du crédit selon la durée et le taux accordés"],
        ["Bonus / malus", "0 €", "Pas de malus ; plus de bonus écologique pour les quadricycles depuis fin 2024 selon les sources"],
      ],
      note: "Tarif du kWh : exemple au tarif réglementé Base 2026 ; utilisez le prix de votre contrat. Assurance : prix variable, demandez des devis.",
    },
    sections: [
      { h2: "Le prix d'une NeoDrive Confort livrée chez vous", paras: [`Véhicule + carte grise + livraison : ${eur(LIV_MIN)} en Haute-Garonne, ${eur(livree("33"))} en Gironde, ${eur(livree("75"))} à Paris, ${eur(LIV_MAX)} dans le Nord. Pour comparaison, une Citroën Ami démarre autour de 8 000 € avant ses propres frais.`, "Votre total exact s'affiche sur la page de réservation avec votre code postal. Vous réservez sans acompte et payez à la livraison."] },
      { h2: "L'assurance : le poste qui varie le plus", paras: ["L'assurance est obligatoire (au minimum la responsabilité civile). Son prix dépend surtout de l'âge du conducteur, de son historique, du lieu de stationnement et des garanties choisies (vol, incendie, tous risques). Pour une voiture neuve, comparez plusieurs devis avant l'achat."] },
      { h2: "La recharge : quelques euros par semaine", paras: ["Le calcul est simple : énergie mesurée à la prise (kWh) × prix du kWh de votre contrat. Avec 5 kWh au tarif Base d'environ 0,20 €, une recharge coûte environ 1 €. Une NeoDrive se recharge sur une prise 220 V classique en 6 heures environ, sans borne."] },
      { h2: "L'entretien : simple et peu coûteux", paras: ["Pas de vidange, pas de filtre à gasoil, pas d'embrayage. Il reste les pneus, les freins, l'éclairage et la batterie à surveiller. NeoDrive tient un catalogue de pièces en ligne et un service après-vente avec diagnostic à distance."] },
      { h2: "Le financement : étaler sans se tromper", paras: [`Vous pouvez simuler un financement sur la durée de votre choix sur notre page Financement, puis déposer votre dossier en ligne. Comparez toujours le coût total du crédit, pas seulement la mensualité. ${CREDIT_WARNING}`] },
      { h2: "Les coûts cachés à vérifier partout", bullets: ["Les frais de préparation ou de mise à la route", "La livraison non incluse dans le prix affiché", "Une batterie vendue à part ou en location", "Les options payantes (chauffage, caméra…)", "Un acompte élevé à verser avant d'avoir vu la voiture"] },
    ],
    faq: [
      { q: "Quel budget prévoir pour une voiture sans permis électrique neuve ?", a: `Pour une NeoDrive Confort livrée et immatriculée : ${eur(LIV_MIN)} à ${eur(LIV_MAX)} en France continentale. Chez les grandes marques, comptez environ 8 000 à 12 500 € avant frais. Ajoutez ensuite l'assurance, propre à votre profil.` },
      { q: "Combien coûte une voiture sans permis par mois ?", a: "Hors crédit : l'assurance (selon votre profil), quelques euros de recharge par semaine et un entretien léger. Avec un crédit, la mensualité dépend de la durée et du taux accordés : faites une simulation sur la page Financement." },
      { q: "Combien coûte la carte grise d'une voiture sans permis NeoDrive ?", a: `${CG} avec le service NeoDrive, qui prépare le dossier d'immatriculation pour vous.` },
      { q: "Existe-t-il une aide à l'achat en 2026 ?", a: "Le bonus écologique ne concerne plus les quadricycles depuis fin 2024 selon les sources disponibles. Certaines collectivités proposent des aides locales : renseignez-vous auprès de votre mairie ou de votre région." },
      { q: "Faut-il installer une borne de recharge ?", a: "Non. Une prise domestique 220 V en bon état suffit. Si votre installation est ancienne, faites-la vérifier par un électricien." },
      ...COMMON_FAQ,
    ],
    sources: [S.sp, S.gsp, S.izi],
    related: [{ label: "Prix d'une voiture sans permis", href: "/prix-voiture-sans-permis" }, { label: "Assurance voiture sans permis", href: "/assurance-voiture-sans-permis" }, { label: "Aides 2026 pour une voiture sans permis électrique", href: "/aides-voiture-sans-permis-electrique-2026" }, { label: "Coût de recharge d'une voiture sans permis électrique", href: "/blog/cout-recharge-voiture-sans-permis-electrique" }, { label: "Financement : simulation et dossier", href: "/financement" }, { label: "Carte grise d'une voiture sans permis", href: "/carte-grise" }],
    breadcrumb: GUIDE_CRUMB,
  },

  "voiture-sans-permis-chinoise-prix-concession": {
    path: "/voiture-sans-permis-chinoise-prix-concession",
    title: "Voiture sans permis chinoise : concession ou vente directe",
    metaTitle: "Voiture sans permis chinoise : jusqu'à 2 fois moins chère en direct",
    description: `Des voitures sans permis fabriquées en Chine sont vendues près de 10 000 € en réseau. NeoDrive, fabriquée en Chine et vendue en direct : ${C} TTC. Comparatif honnête.`,
    eyebrow: "VENTE DIRECTE OU CONCESSION",
    h1: "NeoDrive ou une voiture sans permis chinoise vendue 2 fois plus cher en concession ?",
    intro: `Plusieurs voitures sans permis électriques vendues en France sont fabriquées en Chine. NeoDrive aussi, et nous ne le cachons pas. La différence se joue entre l'usine et vous : certains modèles chinois sont vendus en réseau autour de 9 000 à 10 000 €, la NeoDrive Confort, vendue en direct, coûte ${C} TTC.`,
    table: {
      caption: "Fabrication, prix et mode de vente",
      head: ["Modèle", "Fabrication", "Prix public constaté", "Mode de vente"],
      rows: [
        ["NeoDrive Confort", "Chine, importée par NeoDrive (Muret, 31)", `${C} TTC, en stock`, "En direct, livrée à domicile"],
        ["NeoDrive Essentielle", "Chine, importée par NeoDrive", `${E} TTC, sur commande`, "En direct, livrée à domicile"],
        ["Linktour Alumi", "Chine", "Environ 9 990 €", "Revendeurs et enseignes"],
        ["Simplici S1", "Chine", "Environ 8 999 € (prix de lancement annoncé)", "Réseau de la marque"],
        ["Pour comparaison : Citroën Ami", "Maroc", "Environ 7 990 à 8 190 €", "Réseau Citroën"],
        ["Pour comparaison : Fiat Topolino", "Maroc", "Environ 9 890 €", "Réseau Fiat"],
      ],
      note: `${DATE} Pays de fabrication : informations publiques des constructeurs et de la presse spécialisée.`,
    },
    sections: [
      { h2: "Pourquoi le même type de voiture peut coûter deux fois plus cher", paras: [
        "Dans la distribution automobile classique, plusieurs intermédiaires se rémunèrent entre l'usine et le client : importateur, distributeur national, puis concession ou revendeur. Chacun a ses frais : showroom, stock, personnel, publicité, financement du stock.",
        "NeoDrive importe ses voitures par conteneurs entiers, les stocke et les prépare à Muret (31), puis les vend en direct et les livre chez le client. Moins d'étapes, donc un prix plus bas : une Linktour Alumi à environ 9 990 € coûte environ deux fois le prix d'une NeoDrive Confort.",
      ] },
      { h2: "Ce que vous payez en concession… et ce que vous obtenez", paras: ["Être honnête, c'est aussi dire ce que le réseau apporte : un essai sur place, un interlocuteur près de chez vous, un atelier local et parfois une reprise de votre ancien véhicule. Si ces services comptent plus que le prix pour vous, la concession reste une bonne option."] },
      { h2: "Ce que NeoDrive propose à la place", bullets: [`Un prix de ${C} TTC pour la Confort en stock, livrée en 2 à 3 semaines`, "0 € d'acompte et paiement à la livraison, après avoir vu la voiture", `Livraison partout en France (${DELIVERY}) ou retrait à Muret`, "Garantie 2 ans, catalogue de pièces en ligne et diagnostic à distance", "Des vidéos de livraisons réelles et des avis clients publics"] },
      { h2: "Les limites de NeoDrive, à connaître", bullets: ["Une autonomie annoncée de 50 à 70 km, inférieure à certains modèles", "L'Essentielle est fabriquée sur commande : 6 à 8 mois de délai", "Pas de réseau de concessions : l'accompagnement se fait à distance et à la livraison", "Une marque récente, basée près de Toulouse"] },
      { h2: "Comment vérifier une voiture sans permis chinoise, où qu'elle soit vendue", bullets: ["L'homologation L6e et le certificat de conformité (COC), indispensable pour la carte grise", "Un vendeur identifié en France (adresse, SIREN)", "Une garantie écrite et des pièces disponibles en France", "Des preuves : livraisons réelles, avis vérifiables", "Les conditions de paiement : méfiez-vous des gros acomptes"] },
    ],
    faq: [
      { q: "Les voitures sans permis vendues en concession sont-elles fabriquées en Chine ?", a: "Pas toutes. Aixam et Ligier fabriquent en France, la Citroën Ami et la Fiat Topolino sont assemblées au Maroc. D'autres modèles vendus en France, comme le Linktour Alumi ou la Simplici S1, sont fabriqués en Chine, comme NeoDrive." },
      { q: "Pourquoi NeoDrive est-elle moins chère qu'une voiture sans permis chinoise en concession ?", a: "Parce que NeoDrive vend en direct : pas d'importateur, de distributeur ni de concession entre l'usine et vous. Les voitures arrivent par conteneurs entiers et sont livrées depuis Muret (31)." },
      { q: "Une voiture deux fois moins chère est-elle de moins bonne qualité ?", a: "Pas forcément : l'écart vient surtout du mode de distribution. Comparez l'homologation, la structure, les équipements de série, la garantie et la disponibilité des pièces, pas seulement le prix." },
      { q: "Peut-on voir la voiture avant de payer ?", a: "Oui. Vous réservez sans acompte, vous voyez et contrôlez la voiture à la livraison, puis vous payez. Le retrait sur place à Muret est aussi possible." },
      FINANCE_FAQ,
      ...COMMON_FAQ.filter(f => !/homologuées/.test(f.q)),
    ],
    sources: [S.alumi, S.simplici, S.motor1, S.izi],
    related: [{ label: "Voiture sans permis électrique chinoise : ce qu'il faut vérifier", href: "/voiture-sans-permis-chinoise" }, { label: "Linktour Alumi ou NeoDrive", href: "/comparatif/linktour-alumi-ou-neodrive" }, { label: "Simplici S1 ou NeoDrive", href: "/comparatif/simplici-s1-ou-neodrive" }, { label: "La voiture sans permis électrique la moins chère", href: "/voiture-sans-permis-la-moins-chere" }, { label: "Budget voiture sans permis 2026", href: "/budget-voiture-sans-permis-2026" }, { label: "Tous les comparatifs", href: "/comparatif" }],
    breadcrumb: COMPARE_CRUMB,
  },
};

export const GUIDE_PATHS = Object.values(GUIDES).map(g => g.path);
/** Pages nouvelles (les autres guides existaient déjà dans le sitemap). */
export const NEW_GUIDE_PATHS = ["/budget-voiture-sans-permis-2026", "/voiture-sans-permis-chinoise-prix-concession"];
