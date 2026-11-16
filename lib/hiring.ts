/** Recrutement standardisé des 3 postes freelance à Alger : questions, mises en situation et grille d'évaluation IA. */
export type PosteKey = "closer" | "coordinateur" | "social";

export type Question = { id: string; label: string; type: "text" | "long" | "choice"; options?: string[]; required?: boolean };

export const COMMON: Question[] = [
  { id: "presentation", label: "Présentez-vous en 6 à 10 lignes, avec vos propres mots : votre parcours, vos 3 principales qualités, un vrai défaut, et pourquoi ce poste vous correspond.", type: "long", required: true },
  { id: "freelance_ok", label: "La mission est en prestataire freelance (vous facturez NeoDrive chaque mois, ce n'est pas un contrat salarié). Acceptez-vous ce statut ?", type: "choice", options: ["Oui", "Oui, mais j'ai besoin d'aide pour le statut", "Non"], required: true },
  { id: "billing_structure", label: "Avez-vous déjà une structure pour facturer ?", type: "choice", options: ["Oui, auto-entrepreneur", "Oui, registre de commerce / société", "Pas encore, mais je peux la créer", "Non"], required: true },
  { id: "availability", label: "Êtes-vous disponible du lundi au samedi aux horaires français, en sachant que le planning peut varier et inclure ponctuellement le dimanche selon les besoins de l'entreprise ?", type: "choice", options: ["Oui", "Oui, sauf certains jours", "Non"], required: true },
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
  { id: "fr1", q: "Les factures que je vous ai ___ parvenir sont jointes.", options: ["fait", "faite", "faites", "faits"] },
  { id: "fr2", q: "Bien que le conteneur ___ en retard, il sera dédouané cette semaine.", options: ["est", "soit", "sera", "serait"] },
  { id: "fr3", q: "Après que le client ___ signé, nous lançons la commande.", options: ["ait", "a", "aie", "aura"] },
  { id: "fr4", q: "Quelle orthographe est correcte ?", options: ["occurence", "occurrence", "ocurrence", "occurrance"] },
  { id: "fr5", q: "Les clients ___ nous avons parlé hier ont réservé.", options: ["que", "dont", "qu'", "lesquels"] },
  { id: "fr6", q: "Quelle phrase est correcte ?", options: ["Quelque soit le prix, nous livrons.", "Quel que soit le prix, nous livrons.", "Quelque soient le prix, nous livrons.", "Quels que soit le prix, nous livrons."] },
  { id: "fr7", q: "Elle s'est ___ les mains en déchargeant la voiture.", options: ["blessée", "blessé", "blessées", "blessés"] },
  { id: "fr8", q: "Ci-___ la facture que vous avez demandée.", options: ["joint", "jointe", "joints", "jointes"] },
  { id: "fr9", q: "Les trois heures que le chargement a ___ nous ont retardés.", options: ["duré", "durées", "durés", "durée"] },
  { id: "fr10", q: "Quelle réponse est la plus professionnelle à un client mécontent ?", options: ["Ce n'est pas de notre faute, voyez avec le transporteur.", "Je comprends votre inquiétude : je vérifie votre dossier et je vous rappelle avant 17 h.", "Calmez-vous, tout va bien se passer.", "On fait ce qu'on peut, il faut attendre."] },
];
export const LOGIC_TEST: Mcq[] = [
  { id: "lo1", q: "Complétez la suite : 3, 7, 15, 31, 63, …", options: ["94", "126", "127", "128"] },
  { id: "lo2", q: "Une voiture achetée 1 800 € est revendue 5 400 €. La marge représente quel pourcentage du prix de vente ?", options: ["50 %", "66,7 %", "200 %", "300 %"] },
  { id: "lo3", q: "Un prix augmente de 20 %, puis baisse de 20 %. Par rapport au prix de départ, il est :", options: ["identique", "4 % plus bas", "4 % plus haut", "20 % plus bas"] },
  { id: "lo4", q: "3 chauffeurs livrent 12 voitures en 2 jours. Au même rythme, combien de jours faut-il à 2 chauffeurs pour livrer 24 voitures ?", options: ["3", "4", "6", "8"] },
  { id: "lo5", q: "Aucun conteneur arrivé à Fos n'est bloqué. Certains conteneurs bloqués contiennent des pièces. Donc :", options: ["Certains conteneurs de Fos contiennent des pièces", "Aucun conteneur contenant des pièces n'est arrivé à Fos", "Certains conteneurs contenant des pièces ne sont pas arrivés à Fos", "Tous les conteneurs bloqués sont arrivés à Fos"] },
  { id: "lo6", q: "Un client verse un acompte de 30 % sur une voiture à 5 990 €. Combien reste-t-il à payer ?", options: ["4 093 €", "4 193 €", "4 293 €", "1 797 €"] },
  { id: "lo7", q: "Nous sommes mardi. Quel jour serons-nous dans 100 jours ?", options: ["Mercredi", "Jeudi", "Vendredi", "Samedi"] },
  { id: "lo8", q: "Une remorque transporte 3 voitures et chaque aller-retour dure 5 h. Combien d'heures faut-il au minimum pour livrer 14 voitures avec une seule remorque ?", options: ["20 h", "23 h", "25 h", "30 h"] },
];
export const WRITING_PROMPT = "Rédaction (10 à 15 lignes, sans copier-coller ni outil de rédaction) : un client écrit « J'ai versé un acompte il y a 3 semaines et je n'ai aucune nouvelle. C'est une arnaque ? Je veux être remboursé. ». Rédigez l'e-mail que vous lui envoyez : rassurer, expliquer où en est sa commande, proposer une solution concrète et une date, sans promettre ce que vous ne pouvez pas tenir.";

export const RIDDLES = [
  { id: "ri1", q: "Énigme 1 : un éleveur a 17 moutons. Tous meurent sauf 9. Combien lui en reste-t-il ?" },
  { id: "ri2", q: "Énigme 2 : chaque voiture livrée rapporte 1 000 € de marge. Chaque trajet de livraison coûte 200 €. Un client commande 3 voitures : la 1re part seule, la 2e et la 3e partent ensemble sur la même remorque. Quelle est la marge totale, en euros ?" },
  { id: "ri3", q: "Énigme 3 : un vendeur vend 2 voitures à 6 000 € chacune. Sur la première, il gagne 20 % de son prix d'achat ; sur la seconde, il perd 20 % de son prix d'achat. Quel est son résultat total, en euros (écrivez seulement le nombre) ?" },
];
export const BAC_SUBJECTS = [["bac_maths", "Mathématiques"], ["bac_francais", "Français"], ["bac_arabe", "Arabe"], ["bac_anglais", "Anglais"]] as const;
/** Matières facultatives (selon la filière). */
export const BAC_OPTIONAL = [["bac_physique", "Physique"], ["bac_philo", "Philosophie"]] as const;
