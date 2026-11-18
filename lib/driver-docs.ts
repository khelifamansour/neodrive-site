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

export const CONTRACT_VERSION = "2026-11-18";
export const COMPANY = { name: "MK HOLDING SAS (NeoDrive)", siren: "908 645 393", address: "31 rue Jean Nougaro, 31600 Muret" };

/** Contrat de prestation : chauffeur indépendant mis à disposition avec le véhicule et la remorque de MK HOLDING. */
export function contractSections(rate = 25): { title: string; text: string }[] {
  return [
    { title: "Parties", text: `Entre ${COMPANY.name}, SIREN ${COMPANY.siren}, ${COMPANY.address}, représentée par son président, ci-après « le Client », et le prestataire signataire, entrepreneur individuel immatriculé (numéro SIRET communiqué dans ses documents), ci-après « le Prestataire ».` },
    { title: "1. Objet", text: "Le Prestataire assure, en toute indépendance, la conduite du véhicule tracteur et de la remorque porte-voitures appartenant au Client, pour livrer des voitures sans permis aux clients du Client et pour les trajets liés (chargement aux dépôts, retours). Le Prestataire ne transporte pas de marchandises avec son propre véhicule : il est mis à disposition comme conducteur." },
    { title: "2. Missions", text: "Chaque mission (tournée) est proposée par le Client avec son itinéraire prévisionnel. Le Prestataire est libre d'accepter ou de refuser une mission. Une fois la tournée clôturée, aucun client n'y est ajouté sans l'accord des deux parties (ajout en cours de route)." },
    { title: "3. Rémunération", text: `${rate} € TTC de l'heure, TVA non applicable (article 293 B du CGI). Les heures comptées sont la conduite, le chargement et l'arrimage des véhicules et les livraisons chez les clients. Les pauses, les repas et les nuits ne sont pas comptés. Le Prestataire enregistre ses heures dans l'application NeoDrive (début de journée, pauses, fin de journée) À la fin de chaque tournée, la facture est établie automatiquement à partir de ces heures, sans frais (article 4), selon l'article 11. Paiement par virement à réception de la facture, sur le compte dont le Prestataire a fourni le RIB.` },
    { title: "4. Frais de mission", text: "Les frais de mission (hôtel, repas, carburant, péages) sont payés directement avec la carte de paiement de MK HOLDING ; ils ne figurent pas sur la facture du Prestataire. Le Prestataire photographie ses tickets dans l'application, au fil des journées ou en une fois à la fin de la tournée ; pour l'hôtel, il demande si possible une facture au nom de MK HOLDING SAS, 31 rue Jean Nougaro, 31600 Muret. Repères : hôtel 70 € la nuit, repas 30 € par jour ; un dépassement est signalé au Client. Si le Prestataire a exceptionnellement payé lui-même, la dépense lui est remboursée sur justificatif, par note de frais séparée, hors facture." },
    { title: "5. Argent des clients", text: "Le Prestataire ne manipule jamais l'argent des clients : aucun espèce, aucun chèque. Le client paie par virement instantané ; MK HOLDING confirme la réception du paiement au Prestataire avant la remise des clés. Sans cette confirmation, le véhicule n'est pas remis." },
    { title: "6. Véhicule, remorque et sécurité", text: "Le véhicule et la remorque sont assurés par le Client. Le Prestataire détient un permis valide adapté à l'ensemble (B96 ou BE), respecte le Code de la route (90 km/h maximum avec la remorque sur route et autoroute sauf limitation inférieure), arrime chaque voiture avec au moins quatre sangles et contrôle l'arrimage après les premiers kilomètres puis à chaque arrêt. Tout incident est signalé immédiatement dans l'application." },
    { title: "7. Assurance du Prestataire", text: "Le Prestataire souscrit à ses frais une assurance responsabilité civile professionnelle couvrant son activité et en fournit l'attestation avant la première mission, puis à chaque renouvellement." },
    { title: "8. Indépendance", text: "Le Prestataire exerce en toute indépendance, sans lien de subordination : il organise son travail, reste libre de travailler pour d'autres clients et n'est soumis à aucun horaire imposé en dehors des rendez-vous de livraison convenus avec les clients." },
    { title: "9. Confidentialité", text: "Les informations sur les clients (noms, adresses, téléphones) servent uniquement aux livraisons et ne sont ni conservées ni communiquées après la mission." },
    { title: "10. Durée et résiliation", text: "Le contrat prend effet à la signature, pour une durée indéterminée. Chaque partie peut y mettre fin à tout moment, par écrit (e-mail ou message), sans indemnité ; les missions déjà commencées sont terminées et payées." },
    { title: "11. Mandat d'autofacturation", text: "Le Prestataire donne mandat au Client, qui l'accepte, d'établir en son nom et pour son compte les factures de ses prestations (article 289, I-2 du CGI). Chaque facture est générée à la fin d'une tournée à partir des heures saisies par le Prestataire dans l'application, porte un numéro de la séquence propre au Prestataire et la mention « TVA non applicable, art. 293 B du CGI », et lui est transmise par e-mail. Le Prestataire vérifie la facture avant son envoi ; il dispose ensuite de 15 jours à compter de sa réception pour la contester par écrit, faute de quoi elle est réputée acceptée. Le Prestataire reste responsable de ses obligations fiscales et sociales (déclaration de son chiffre d'affaires) et informe le Client sans délai de tout changement (SIRET, adresse, régime de TVA, coordonnées bancaires). Ce mandat prend fin avec le contrat." },
  ];
}
