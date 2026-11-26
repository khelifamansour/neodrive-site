/** Articles saisonniers (Noël 2026) et prix livré : contenu factuel, prix NeoDrive réels, aucun avis ni chiffre inventé. */
import type { Landing } from "./seo-landing";
import { VEHICLES, REGISTRATION_PRICE } from "./neodrive-pricing";
import { eur, NOEL_NOTE } from "./seo-local";

const C = VEHICLES.confort.price;
const E = VEHICLES.essentielle.price;
const P = VEHICLES.confortPlus.price;
const ZONES: [string, number][] = [["Zone 1 : Haute-Garonne, Tarn, Tarn-et-Garonne, Gers, Ariège", 450], ["Zone 2 : grand Sud-Ouest (Gironde, Hérault, Aude, Landes…)", 590], ["Zone 3 : Île-de-France, Rhône, Bouches-du-Rhône, Puy-de-Dôme, Charente, Charente-Maritime, Vienne", 690], ["Zone 4 : reste de la France métropolitaine", 790]];
const BLOG = [{ name: "Blog", path: "/blog" }];

export const ARTICLE_NOEL: Landing = {
  path: "/blog/voiture-sans-permis-cadeau-noel",
  title: "Voiture sans permis en cadeau de Noël",
  metaTitle: `Voiture sans permis cadeau de Noël : Confort ${eur(C)} en stock (guide 2026)`,
  description: `Offrir une voiture sans permis à Noël : la NeoDrive Confort (${eur(C)} TTC) est en stock et livrée en 2 à 3 semaines. Budget livré, permis AM, assurance, carte grise : le guide pour ne rien oublier.`,
  eyebrow: "GUIDE CADEAU · NOËL 2026",
  h1: "Offrir une voiture sans permis à Noël : le guide pratique",
  intro: `Pour un adolescent de 14 ans et plus, un parent ou un grand-parent, une voiture sans permis électrique est un cadeau qui change le quotidien. Le point clé à Noël, c'est le délai : seule une voiture en stock peut arriver à temps. ${NOEL_NOTE}`,
  table: {
    caption: "Budget d'une NeoDrive offerte à Noël (prix TTC)",
    head: ["Zone de livraison", "Confort livrée", "Confort + carte grise"],
    rows: ZONES.map(([z, d]) => [z, eur(C + d), eur(C + d + REGISTRATION_PRICE)]),
    note: `NeoDrive Confort ${eur(C)} TTC + livraison selon le département + carte grise faite par nos soins (${eur(REGISTRATION_PRICE)}, facultative). Le total exact s'affiche avec votre code postal sur la page de réservation.`,
  },
  sections: [
    { h2: "Quelle version choisir pour qu'elle soit là à Noël ?", paras: [
      `La NeoDrive Confort (${eur(C)} TTC) est la seule version en stock : elle est livrée à domicile en 2 à 3 semaines environ. Pour Noël, il faut donc réserver le plus tôt possible en décembre ; la date de livraison exacte est confirmée au moment de la réservation, selon la tournée.`,
      `L'Essentielle (${eur(E)} TTC) et la Confort Plus (${eur(P)} TTC) sont fabriquées sur commande : l'Essentielle demande 6 à 8 mois. Elles ne seront pas livrées pour Noël 2026, mais peuvent être un cadeau « bon pour » à recevoir plus tard.`,
    ] },
    { h2: "Pour qui c'est un bon cadeau ?", bullets: [
      "Un adolescent dès 14 ans titulaire du permis AM : collège, lycée, sport, petit job, sans dépendre des parents.",
      "Un parent ou grand-parent qui veut rester autonome pour les courses et les rendez-vous de proximité.",
      "Un deuxième véhicule pour les trajets courts du quotidien, rechargé sur une simple prise 220 V.",
      "Une personne née avant le 1er janvier 1988, qui peut conduire une voiture sans permis sans formation particulière.",
    ] },
    { h2: "À vérifier avant d'offrir", bullets: [
      "Le permis AM : pour un adolescent né après 1988, il faut l'ASSR1, l'ASSR2 ou l'ASR puis la formation pratique en auto-école. Anticipez si elle n'est pas encore faite.",
      "L'assurance : obligatoire dès le premier trajet. Demandez un devis en précisant le conducteur principal ; pour un mineur, le contrat est en général au nom d'un parent.",
      "La carte grise : elle peut être au nom de la personne qui offre ou du futur conducteur majeur. NeoDrive peut s'en occuper pour vous.",
      "L'usage réel : 45 km/h maximum, 2 places, autonomie indicative de 50 à 70 km selon l'usage, le relief et la température.",
      "La recharge : une prise domestique 220 V suffit, dans un garage, un abri ou une place avec prise.",
    ] },
    { h2: "Comment se passe l'achat ?", paras: [
      "Vous réservez en ligne sans acompte (0 €). Nous vous envoyons des photos et vidéos réelles si vous le souhaitez. La voiture est préparée, puis livrée à l'adresse convenue, sur rendez-vous.",
      "Vous payez à la livraison, après avoir vu et inspecté la voiture avec le livreur. Elle est couverte par une garantie de 2 ans, avec un SAV et des pièces suivis depuis la France. Plus de 40 clients ont déjà été livrés partout en France.",
    ] },
  ],
  faq: [
    { q: "Une voiture sans permis commandée en décembre peut-elle arriver avant Noël ?", a: `Oui pour la NeoDrive Confort, qui est en stock et livrée en 2 à 3 semaines environ : réservée tôt en décembre, elle peut arriver avant Noël. La date est confirmée à la réservation. L'Essentielle, fabriquée sur commande (6 à 8 mois), ne peut pas être livrée pour Noël.` },
    { q: "Combien coûte une voiture sans permis offerte à Noël ?", a: `La NeoDrive Confort coûte ${eur(C)} TTC. Ajoutez la livraison (de 450 à 790 € selon le département) et, si vous le souhaitez, la carte grise faite par nos soins (${eur(REGISTRATION_PRICE)}) : de ${eur(C + 450)} à ${eur(C + 790 + REGISTRATION_PRICE)} au total.` },
    { q: "Faut-il payer à la commande ?", a: "Non : 0 € d'acompte. Le paiement se fait à la livraison, après avoir vu la voiture." },
    { q: "À partir de quel âge peut-on recevoir une voiture sans permis en cadeau ?", a: "La conduite d'une voiture sans permis (quadricycle léger L6e) est possible dès 14 ans avec le permis AM." },
    { q: "Peut-on faire livrer la voiture à une autre adresse que la sienne ?", a: "Oui, la livraison se fait à l'adresse convenue lors de la réservation, en France métropolitaine, sur rendez-vous. Le tarif de livraison dépend du département de cette adresse." },
  ],
  related: [
    { label: "NeoDrive Confort : photos, équipements et prix", href: "/produit" },
    { label: "Voiture sans permis neuve en stock, livrée rapidement", href: "/offres/voiture-sans-permis-neuve-en-stock" },
    { label: "Prix d'une voiture sans permis neuve livrée chez vous", href: "/blog/prix-voiture-sans-permis-neuve-livree" },
    { label: "Permis AM et voiturette électrique", href: "/blog/permis-am-voiturette-electrique" },
    { label: "Voiture sans permis à 14 ans", href: "/blog/voiture-sans-permis-14-ans" },
    { label: "Assurance voiture sans permis : ce qu'il faut vérifier", href: "/blog/assurance-voiture-sans-permis-ce-quil-faut-verifier" },
    { label: "Livraison et prix dans votre ville ou votre département", href: "/voiture-sans-permis" },
  ],
  breadcrumb: BLOG,
};

export const ARTICLE_PRIX_LIVRE: Landing = {
  path: "/blog/prix-voiture-sans-permis-neuve-livree",
  title: "Prix d'une voiture sans permis neuve livrée",
  metaTitle: "Prix voiture sans permis neuve livrée chez vous : le vrai total 2026",
  description: `Combien coûte vraiment une voiture sans permis électrique neuve livrée à domicile ? Prix NeoDrive dès ${eur(E)}, livraison de 450 à 790 €, carte grise ${eur(REGISTRATION_PRICE)} : le total par zone, sans surprise.`,
  eyebrow: "PRIX ET BUDGET 2026",
  h1: "Voiture sans permis neuve : le vrai prix livrée chez vous",
  intro: `Le prix affiché n'est qu'une partie du budget. Livraison, carte grise, délai : voici le total réel d'une NeoDrive neuve livrée à domicile, version par version et zone par zone. La Confort (${eur(C)} TTC) est en stock ; l'Essentielle (${eur(E)} TTC) est sur commande.`,
  table: {
    caption: "Total TTC livré à domicile, carte grise comprise",
    head: ["Zone de livraison", "Livraison", `Essentielle (${eur(E)}, sur commande)`, `Confort (${eur(C)}, en stock)`, `Confort Plus (${eur(P)}, sur commande)`],
    rows: ZONES.map(([z, d]) => [z, eur(d), eur(E + d + REGISTRATION_PRICE), eur(C + d + REGISTRATION_PRICE), eur(P + d + REGISTRATION_PRICE)]),
    note: `Carte grise faite par NeoDrive : ${eur(REGISTRATION_PRICE)} (facultative). Corse et outre-mer : sur devis. Le total exact s'affiche avec votre code postal sur la page de réservation.`,
  },
  sections: [
    { h2: "Ce qui est compris dans le prix", bullets: [
      "Une voiture sans permis électrique neuve, 2 places, 45 km/h, homologuée L6e avec son certificat de conformité.",
      "Le chargeur pour prise domestique 220 V : pas de borne à acheter.",
      "La garantie 2 ans, avec SAV et pièces suivis depuis la France.",
      "La livraison à domicile sur rendez-vous, avec inspection et prise en main.",
    ] },
    { h2: "Moins de 5 000 € : quelles options ?", paras: [
      `La NeoDrive Essentielle reste sous 5 000 € livrée partout en France métropolitaine (de ${eur(E + 450)} à ${eur(E + 790)} hors carte grise), mais elle est fabriquée sur commande avec 6 à 8 mois de délai.`,
      `La Confort est affichée ${eur(C)} TTC et elle est en stock : c'est la seule option neuve livrable en 2 à 3 semaines. Livrée, elle coûte de ${eur(C + 450)} à ${eur(C + 790)} selon votre département.`,
    ] },
    { h2: "Les coûts à prévoir ensuite", bullets: [
      "L'assurance, obligatoire : le tarif dépend du conducteur, de son âge et de la formule. Faites un devis avant la livraison.",
      "La recharge : quelques kilowattheures sur une prise 220 V. Voir notre article sur le coût de la recharge.",
      "L'entretien courant (pneus, freins, contrôle) : une voiture électrique n'a ni vidange ni courroie.",
    ] },
    { h2: "Comparer avec les autres marques", paras: [
      "Chez les grandes marques, une voiture sans permis électrique neuve démarre généralement entre 7 000 et 12 500 € avant livraison et frais. Les prix publics constatés, modèle par modèle et avec leurs sources, sont détaillés dans notre comparatif 2026.",
    ] },
  ],
  faq: [
    { q: "Quel est le prix d'une voiture sans permis neuve livrée ?", a: `Chez NeoDrive, de ${eur(E + 450)} (Essentielle en zone 1, sur commande) à ${eur(P + 790 + REGISTRATION_PRICE)} (Confort Plus en zone 4 avec carte grise). La Confort en stock coûte de ${eur(C + 450)} à ${eur(C + 790)} livrée.` },
    { q: "Combien coûte la livraison d'une voiture sans permis ?", a: "Chez NeoDrive, 450 € en zone 1 (Haute-Garonne et départements voisins), 590 € en zone 2, 690 € en zone 3 et 790 € dans le reste de la France métropolitaine." },
    { q: "La carte grise est-elle obligatoire ?", a: `Oui, comme pour tout véhicule immatriculé. NeoDrive peut s'en charger pour ${eur(REGISTRATION_PRICE)}, ou vous pouvez la faire vous-même avec le certificat de conformité fourni.` },
    { q: "Faut-il verser un acompte ?", a: "Non. La réservation est à 0 € et le paiement se fait à la livraison, après avoir vu la voiture." },
    { q: "Quelle est l'autonomie d'une NeoDrive ?", a: "L'autonomie indicative est de 50 à 70 km selon l'usage, la température et le relief." },
  ],
  related: [
    { label: "Voiture sans permis électrique la moins chère (comparatif 2026 sourcé)", href: "/voiture-sans-permis-la-moins-chere" },
    { label: "Voiture sans permis neuve à moins de 5 000 €", href: "/offres/voiture-sans-permis-moins-de-5000-euros" },
    { label: "Coût de la recharge d'une voiture sans permis électrique", href: "/blog/cout-recharge-voiture-sans-permis-electrique" },
    { label: "Carte grise d'une voiture sans permis électrique", href: "/blog/carte-grise-voiture-sans-permis-electrique" },
    { label: "Offrir une voiture sans permis à Noël", href: "/blog/voiture-sans-permis-cadeau-noel" },
    { label: "Prix livré dans votre département", href: "/voiture-sans-permis" },
  ],
  breadcrumb: BLOG,
};
