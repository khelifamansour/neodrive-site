/** Recrutement standardisé des 3 postes freelance à Alger : questions, mises en situation et grille d'évaluation IA. */
export type PosteKey = "closer" | "coordinateur" | "social";

export type Question = { id: string; label: string; type: "text" | "long" | "choice"; options?: string[]; required?: boolean };

export const COMMON: Question[] = [
  { id: "freelance_ok", label: "La mission est en freelance (vous facturez NeoDrive chaque mois). Acceptez-vous ce statut ?", type: "choice", options: ["Oui", "Oui, mais j'ai besoin d'aide pour le statut", "Non"], required: true },
  { id: "billing_structure", label: "Avez-vous déjà une structure pour facturer ?", type: "choice", options: ["Oui, auto-entrepreneur", "Oui, registre de commerce / société", "Pas encore, mais je peux la créer", "Non"], required: true },
  { id: "availability", label: "Êtes-vous disponible du lundi au samedi aux horaires français (et ponctuellement le dimanche si besoin) ?", type: "choice", options: ["Oui", "Oui, sauf certains jours", "Non"], required: true },
  { id: "onsite", label: "La mission se fait en présentiel à Alger. Est-ce possible pour vous ?", type: "choice", options: ["Oui", "Oui, mais j'habite hors d'Alger", "Non"], required: true },
  { id: "salary_expectation", label: "Votre rémunération mensuelle souhaitée (fixe, en DA)", type: "text", required: true },
  { id: "start", label: "Quand pouvez-vous commencer ?", type: "choice", options: ["Immédiatement", "Sous 2 semaines", "Sous 1 mois", "Plus tard"], required: true },
];

export const POSTES: Record<PosteKey, { title: string; short: string; summary: string; questions: Question[]; rubric: string }> = {
  closer: {
    title: "Commercial(e) closer & gestion administrative",
    short: "Commercial closer",
    summary: "Rappeler les clients français, conseiller, conclure les ventes, relancer, et gérer l'administratif client (devis, carte grise, livraisons, SAV).",
    questions: [
      { id: "exp_phone", label: "Décrivez votre expérience de vente par téléphone (entreprise, produit, durée, résultats chiffrés).", type: "long", required: true },
      { id: "case_price", label: "Mise en situation : un client vous dit « 5 900 € livrée, c'est trop cher, je vais prendre une occasion ». Écrivez exactement ce que vous lui répondez.", type: "long", required: true },
      { id: "case_scam", label: "Mise en situation : un client dit « Vous êtes une arnaque ? Je ne vous connais pas ». Que répondez-vous ?", type: "long", required: true },
      { id: "case_close", label: "Le client est intéressé mais dit « je vais réfléchir ». Comment obtenez-vous un engagement (réservation) sans être insistant ?", type: "long", required: true },
      { id: "case_sav", label: "Un client livré appelle : sa voiture ne démarre plus. Quelles questions lui posez-vous et que faites-vous ?", type: "long", required: true },
      { id: "volume", label: "Combien d'appels sortants pouvez-vous passer par jour en restant efficace ?", type: "text", required: true },
    ],
    rubric: "Français parfait (écrit sans fautes, ton naturel), réelle expérience de vente téléphonique avec chiffres, capacité à traiter les objections (prix, peur d'arnaque) avec des arguments et une question de relance, sens de la conclusion (proposer une réservation, une question fermée), empathie et méthode en SAV, fiabilité.",
  },
  coordinateur: {
    title: "Coordinateur(trice) administratif & logistique (import, livraisons)",
    short: "Coordinateur",
    summary: "Suivre les commandes usine et les conteneurs, préparer les documents d'import et de douane avec le transitaire, organiser le stockage, planifier les livraisons et suivre le chauffeur à distance.",
    questions: [
      { id: "exp_import", label: "Décrivez votre expérience en transit, import-export, logistique ou assistanat (entreprise, missions, durée).", type: "long", required: true },
      { id: "docs", label: "Citez les documents nécessaires pour dédouaner un conteneur de véhicules arrivant de Chine en France, et à quoi sert chacun.", type: "long", required: true },
      { id: "case_delay", label: "Mise en situation : le conteneur est bloqué en douane car un document manque, et 8 clients attendent leur livraison. Que faites-vous, dans quel ordre ?", type: "long", required: true },
      { id: "case_tour", label: "Vous devez planifier 6 livraisons cette semaine (Toulouse, Bordeaux, Lyon, Marseille, Nantes, Paris) avec un seul chauffeur et une remorque de 2 voitures. Proposez une organisation.", type: "long", required: true },
      { id: "tools", label: "Quels outils maîtrisez-vous (Excel/Google Sheets, CRM, suivi de conteneurs, e-mail en anglais) ? Donnez votre niveau d'anglais écrit.", type: "long", required: true },
    ],
    rubric: "Rigueur et organisation (réponses structurées, étapes ordonnées), connaissance réelle de l'import (facture commerciale, packing list, connaissement/B/L, certificat de conformité/COC, déclaration en douane, DAU, EORI, assurance), priorisation sous pression et communication proactive avec les clients, logique de tournée géographique cohérente, outils et anglais écrit.",
  },
  social: {
    title: "Social media manager vidéo (TikTok / Reels) – acquisition clients",
    short: "Social media",
    summary: "Construire la stratégie vidéo, écrire les scénarios, monter une vidéo par jour, publier, gérer les commentaires et analyser les statistiques pour générer des contacts.",
    questions: [
      { id: "portfolio", label: "Liens vers vos comptes et vidéos (TikTok, Instagram, YouTube, Drive). Indiquez pour chaque compte le nombre d'abonnés et votre rôle.", type: "long", required: true },
      { id: "results", label: "Votre meilleur résultat chiffré (vues, abonnés gagnés, contacts ou ventes générés). Expliquez pourquoi ça a marché.", type: "long", required: true },
      { id: "hooks", label: "Proposez 3 accroches (texte des 2 premières secondes) pour une vidéo de livraison d'une voiture sans permis neuve à 4 990 €.", type: "long", required: true },
      { id: "ideas", label: "Proposez 3 idées de vidéos pour NeoDrive avec, pour chacune, la liste des plans à filmer.", type: "long", required: true },
      { id: "stats", label: "Une vidéo fait 50 000 vues mais aucun message client. Qu'analysez-vous et que changez-vous ?", type: "long", required: true },
      { id: "tools", label: "Logiciels de montage maîtrisés, et combien de vidéos courtes pouvez-vous livrer par semaine ?", type: "text", required: true },
    ],
    rubric: "Résultats prouvés et vérifiables (liens, chiffres), compréhension des algorithmes (accroche, rétention, tendances), créativité et pertinence des accroches et idées pour la cible (parents d'ados, seniors, ruraux), capacité à relier les vues aux contacts/ventes (appel à l'action, WhatsApp, pub), cadence de production, français écrit correct.",
  },
};

export const isPoste = (v: unknown): v is PosteKey => v === "closer" || v === "coordinateur" || v === "social";

/** Tests communs aux 3 postes (les bonnes réponses sont uniquement côté serveur : lib/hiring-keys.ts). */
export type Mcq = { id: string; q: string; options: string[] };
export const FRENCH_TEST: Mcq[] = [
  { id: "fr1", q: "Les voitures que nous avons ___ hier sont arrivées.", options: ["livré", "livrées", "livrés", "livrer"] },
  { id: "fr2", q: "Si le client appelle demain, nous le ___.", options: ["rappelerons", "rappellerons", "rapellerons", "rappelons"] },
  { id: "fr3", q: "Je vous envoie le devis ___ vous m'avez demandé.", options: ["que", "dont", "qu'il", "lequel"] },
  { id: "fr4", q: "Il faut que vous nous ___ votre code postal.", options: ["envoyez", "envoyiez", "envoyer", "envoyé"] },
  { id: "fr5", q: "Quelle orthographe est correcte ?", options: ["accompte", "acompte", "acomte", "accomte"] },
  { id: "fr6", q: "Quelle phrase est correcte ?", options: ["Je vous rappelle dès que possible.", "Je vous rappel dès que possible.", "Je vous rapelle dés que possible.", "Je vous rappelles dès que possible."] },
  { id: "fr7", q: "Les clients se sont ___ satisfaits de la livraison.", options: ["déclaré", "déclarés", "déclarées", "déclarer"] },
  { id: "fr8", q: "Nous avons ___ de préparer votre dossier.", options: ["finit", "fini", "finis", "finie"] },
  { id: "fr9", q: "Ce sont des voitures ___ , garanties 2 ans.", options: ["neuve", "neufs", "neuves", "neuf"] },
  { id: "fr10", q: "Quelle formule convient pour terminer un e-mail à un client ?", options: ["Bisous", "Cordialement", "A+", "Salut"] },
];
export const LOGIC_TEST: Mcq[] = [
  { id: "lo1", q: "Complétez la suite : 2, 6, 12, 20, 30, …", options: ["36", "40", "42", "44"] },
  { id: "lo2", q: "Une voiture coûte 4 990 €, la livraison 590 € et la carte grise 150 €. Quel est le total ?", options: ["5 630 €", "5 730 €", "5 830 €", "5 580 €"] },
  { id: "lo3", q: "Une remise de 10 % est faite sur 5 000 €. Quel est le nouveau prix ?", options: ["4 900 €", "4 500 €", "4 990 €", "4 000 €"] },
  { id: "lo4", q: "Il faut livrer 27 voitures, à raison de 3 par jour. Combien de jours faut-il ?", options: ["8", "9", "10", "12"] },
  { id: "lo5", q: "Tous les clients de Lyon ont réservé. Paul a réservé. Donc :", options: ["Paul est de Lyon", "Paul n'est pas de Lyon", "On ne peut pas savoir si Paul est de Lyon", "Paul n'a pas réservé"] },
  { id: "lo6", q: "Un conteneur part le 1er mars et voyage 45 jours. Quand arrive-t-il ?", options: ["14 avril", "15 avril", "16 avril", "15 mai"] },
  { id: "lo7", q: "Un commercial rappelle 12 clients par heure. Combien en 2 h 30 ?", options: ["24", "28", "30", "36"] },
  { id: "lo8", q: "Quel est l'intrus ?", options: ["Lundi", "Mardi", "Avril", "Jeudi"] },
];
export const WRITING_PROMPT = "Rédaction (8 à 12 lignes, sans copier-coller) : un client écrit « J'ai réservé il y a 3 semaines et je n'ai aucune nouvelle. C'est une arnaque ? ». Rédigez la réponse que vous lui envoyez par e-mail.";

export const RIDDLES = [
  { id: "ri1", q: "Énigme 1 : un éleveur a 17 moutons. Tous meurent sauf 9. Combien lui en reste-t-il ?" },
  { id: "ri2", q: "Énigme 2 : chaque voiture livrée rapporte 1 000 € de marge. Chaque trajet de livraison coûte 200 €. Un client commande 3 voitures : la 1re part seule, la 2e et la 3e partent ensemble sur la même remorque. Quelle est la marge totale, en euros ?" },
];
export const BAC_SUBJECTS = [["bac_maths", "Mathématiques"], ["bac_francais", "Français"], ["bac_arabe", "Arabe"], ["bac_anglais", "Anglais"]] as const;
