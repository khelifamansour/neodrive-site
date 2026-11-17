/** Espace livreur prestataire : liste des documents et contrat de prestation (texte partagé client / serveur). */

export const DRIVER_BUCKET = "driver-docs";

export const DOC_KINDS = [
  { id: "siret", label: "SIRET : extrait Kbis ou avis de situation INSEE", hint: "Avis de situation au répertoire SIRENE (autoentrepreneur) ou Kbis." },
  { id: "rc_pro", label: "Attestation d'assurance responsabilité civile professionnelle", hint: "Attestation en cours de validité." },
  { id: "permis_recto", label: "Permis de conduire (recto)", hint: "Catégorie B avec mention B96, ou BE." },
  { id: "permis_verso", label: "Permis de conduire (verso)", hint: "" },
  { id: "identite", label: "Pièce d'identité", hint: "Carte d'identité recto-verso ou passeport." },
  { id: "rib", label: "RIB", hint: "Pour le paiement de vos factures." },
  { id: "contrat_scan", label: "Contrat signé (scan, facultatif)", hint: "Seulement si vous avez aussi signé le contrat sur papier." },
] as const;
export type DocKind = typeof DOC_KINDS[number]["id"] | "contrat";
export const isDocKind = (k: unknown): k is DocKind => k === "contrat" || DOC_KINDS.some(d => d.id === k);
/** Documents obligatoires (le contrat signé en ligne compte à part). */
export const REQUIRED_DOCS: DocKind[] = ["siret", "rc_pro", "permis_recto", "permis_verso", "identite", "rib"];
export const DOC_STATUS_LABEL: Record<string, string> = { manquant: "Manquant", recu: "Reçu, à vérifier", valide: "Validé", refuse: "Refusé : à renvoyer" };

export const CONTRACT_VERSION = "2026-11-17";
export const COMPANY = { name: "MK HOLDING SAS (NeoDrive)", siren: "908 645 393", address: "31 rue Jean Nougaro, 31600 Muret" };

/** Contrat de prestation : chauffeur indépendant mis à disposition avec le véhicule et la remorque de MK HOLDING. */
export function contractSections(rate = 25): { title: string; text: string }[] {
  return [
    { title: "Parties", text: `Entre ${COMPANY.name}, SIREN ${COMPANY.siren}, ${COMPANY.address}, représentée par son président, ci-après « le Client », et le prestataire signataire, entrepreneur individuel immatriculé (numéro SIRET communiqué dans ses documents), ci-après « le Prestataire ».` },
    { title: "1. Objet", text: "Le Prestataire assure, en toute indépendance, la conduite du véhicule tracteur et de la remorque porte-voitures appartenant au Client, pour livrer des voitures sans permis aux clients du Client et pour les trajets liés (chargement aux dépôts, retours). Le Prestataire ne transporte pas de marchandises avec son propre véhicule : il est mis à disposition comme conducteur." },
    { title: "2. Missions", text: "Chaque mission (tournée) est proposée par le Client avec son itinéraire prévisionnel. Le Prestataire est libre d'accepter ou de refuser une mission. Une fois la tournée clôturée, aucun client n'y est ajouté sans l'accord des deux parties (ajout en cours de route)." },
    { title: "3. Rémunération", text: `${rate} € TTC de l'heure, TVA non applicable (article 293 B du CGI). Les heures comptées sont la conduite, le chargement et l'arrimage des véhicules et les livraisons chez les clients. Les pauses, les repas et les nuits ne sont pas comptés. Le Prestataire enregistre ses heures dans l'application NeoDrive (début de journée, pauses, fin de journée) et établit sa facture à partir du récapitulatif de la tournée. Paiement par virement à réception de la facture.` },
    { title: "4. Frais", text: "Le Client rembourse sur justificatif (photo du ticket dans l'application) : l'hôtel jusqu'à 70 € par nuit et les repas jusqu'à 30 € par jour lorsque la mission impose de dormir sur place. Le carburant et les péages sont payés directement avec la carte de paiement de MK HOLDING ; le Prestataire n'avance pas ces frais." },
    { title: "5. Argent des clients", text: "Le Prestataire ne manipule jamais l'argent des clients : aucun espèce, aucun chèque. Le client paie par virement instantané ; MK HOLDING confirme la réception du paiement au Prestataire avant la remise des clés. Sans cette confirmation, le véhicule n'est pas remis." },
    { title: "6. Véhicule, remorque et sécurité", text: "Le véhicule et la remorque sont assurés par le Client. Le Prestataire détient un permis valide adapté à l'ensemble (B96 ou BE), respecte le Code de la route (90 km/h maximum avec la remorque sur route et autoroute sauf limitation inférieure), arrime chaque voiture avec au moins quatre sangles et contrôle l'arrimage après les premiers kilomètres puis à chaque arrêt. Tout incident est signalé immédiatement dans l'application." },
    { title: "7. Assurance du Prestataire", text: "Le Prestataire souscrit à ses frais une assurance responsabilité civile professionnelle couvrant son activité et en fournit l'attestation avant la première mission, puis à chaque renouvellement." },
    { title: "8. Indépendance", text: "Le Prestataire exerce en toute indépendance, sans lien de subordination : il organise son travail, reste libre de travailler pour d'autres clients et n'est soumis à aucun horaire imposé en dehors des rendez-vous de livraison convenus avec les clients." },
    { title: "9. Confidentialité", text: "Les informations sur les clients (noms, adresses, téléphones) servent uniquement aux livraisons et ne sont ni conservées ni communiquées après la mission." },
    { title: "10. Durée et résiliation", text: "Le contrat prend effet à la signature, pour une durée indéterminée. Chaque partie peut y mettre fin à tout moment, par écrit (e-mail ou message), sans indemnité ; les missions déjà commencées sont terminées et payées." },
  ];
}
