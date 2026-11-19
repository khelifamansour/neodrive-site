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
/** Salarié (CDD) : pièces pour la déclaration préalable à l'embauche (DPAE) et la paie. */
export const EMPLOYEE_DOC_KINDS = [
  { id: "identite_recto", label: "Pièce d'identité (recto)", hint: "Carte d'identité, passeport ou titre de séjour en cours de validité." },
  { id: "identite_verso", label: "Pièce d'identité (verso)", hint: "" },
  { id: "secu", label: "Carte Vitale ou attestation de sécurité sociale", hint: "Pour votre numéro de sécurité sociale (déclaration d'embauche et fiches de paie)." },
  { id: "rib", label: "RIB", hint: "Pour le versement de votre salaire et le remboursement de vos frais." },
  { id: "permis_recto", label: "Permis de conduire (recto)", hint: "Catégorie B avec mention B96, BE, C ou CE." },
  { id: "permis_verso", label: "Permis de conduire (verso)", hint: "" },
  { id: "domicile", label: "Justificatif de domicile de moins de 3 mois", hint: "Facture d'électricité, de téléphone ou d'internet, quittance de loyer, avis d'imposition…" },
  { id: "mutuelle", label: "Attestation de mutuelle personnelle (seulement si vous demandez une dispense)", hint: "Si vous êtes déjà couvert (mutuelle de votre conjoint, CSS…), vous pouvez demander à ne pas adhérer à la mutuelle de l'entreprise." },
  { id: "certificat_travail", label: "Dernier certificat de travail", hint: "Facultatif." },
] as const;
export const EMPLOYEE_REQUIRED: string[] = ["identite_recto", "identite_verso", "secu", "rib", "permis_recto", "permis_verso", "domicile"];
export type DocKind = typeof DOC_KINDS[number]["id"] | typeof EMPLOYEE_DOC_KINDS[number]["id"] | "contrat";
export const isDocKind = (k: unknown): k is DocKind => k === "contrat" || DOC_KINDS.some(d => d.id === k) || EMPLOYEE_DOC_KINDS.some(d => d.id === k);

export type ContractType = "prestataire" | "salarie";
export const isSalarie = (t: unknown) => t === "salarie";
export const docKindsFor = (t: unknown) => (isSalarie(t) ? EMPLOYEE_DOC_KINDS : DOC_KINDS) as readonly { id: string; label: string; hint: string }[];
export const requiredFor = (t: unknown): string[] => isSalarie(t) ? EMPLOYEE_REQUIRED : REQUIRED_DOCS;
/** Documents obligatoires (le contrat signé en ligne compte à part). */
export const REQUIRED_DOCS: DocKind[] = ["siret", "rc_pro", "permis_recto", "permis_verso", "identite", "rib"];
export const DOC_STATUS_LABEL: Record<string, string> = { manquant: "Manquant", recu: "Reçu, à vérifier", valide: "Validé", refuse: "Refusé : à renvoyer" };

export const CONTRACT_VERSION = "2026-11-19d";
export const CONTRACT_TITLE = "Contrat de prestation de services : livreur et préparateur de véhicules";
export const COMPANY = { name: "MK HOLDING SAS (NeoDrive)", siren: "908 645 393", address: "31 rue Jean Nougaro, 31600 Muret" };

/** Contrat de prestation : livreur et préparateur de véhicules indépendant, avec le véhicule et la remorque de MK HOLDING. */
export function contractSections(rate = 25): { title: string; text: string }[] {
  return [
    { title: "Parties", text: `Entre ${COMPANY.name}, SIREN ${COMPANY.siren}, ${COMPANY.address}, représentée par son président, ci-après « le Client », et le prestataire signataire, entrepreneur individuel immatriculé (numéro SIRET communiqué dans ses documents), ci-après « le Prestataire ».` },
    { title: "1. Objet", text: "Le Prestataire réalise pour le Client des prestations de livreur et de préparateur de véhicules : il livre aux clients du Client des voitures sans permis, avec le véhicule tracteur et la remorque porte-voitures appartenant au Client, et prépare, contrôle et entretient ces véhicules. Le Prestataire ne transporte pas de marchandises avec son propre véhicule." },
    { title: "2. Missions", text: "Pour chaque véhicule, les prestations comprennent : la livraison au client (conduite, chargement et déchargement, arrimage par sangles, attelage et dételage de la remorque) ; la préparation et le nettoyage du véhicule ; la réparation et la mécanique simple, y compris le remplacement de pièces sur les véhicules ; les explications au client et la mise en main du véhicule ; et toute tâche complémentaire liée à la livraison ou à la préparation demandée par NeoDrive. Chaque mission (tournée) est proposée par le Client avec son itinéraire prévisionnel ; le Prestataire est libre de l'accepter ou de la refuser. Une fois la tournée clôturée, aucun client n'y est ajouté sans l'accord des deux parties (ajout en cours de route). Le Client peut également confier au Prestataire des tâches de préparation, de livraison ou de transport de véhicules, y compris vers ou depuis un prestataire ou un partenaire (dépôt, garage, revendeur, transitaire…). Si un véhicule est défectueux, chez un client ou en stock, le Prestataire peut être amené à réaliser une prestation de réparation sur ce véhicule : diagnostic simple, mécanique, remplacement de pièces. Plus largement, le Client peut lui confier toute prestation liée aux véhicules et à leur logistique, notamment : réception et contrôle des véhicules à leur arrivée (état, photos, numéros de série, inventaire), préparation, nettoyage, entretien, remplacement de pièces, déplacement des véhicules entre dépôts, et toute tâche annexe convenue entre les parties. Cette liste n'est pas limitative. Ces prestations sont rémunérées au temps passé, dans les conditions de l'article 4." },
    { title: "3. Autonomie et indépendance", text: "Le Prestataire agit en autonomie : il organise lui-même son travail, ses trajets et ses horaires, dans le respect des tournées convenues et des rendez-vous pris avec les clients. Il exerce en toute indépendance, sans lien de subordination, et reste libre de travailler pour d'autres clients." },
    { title: "4. Rémunération et temps facturé", text: `Rémunération au temps passé : ${rate} € HT de l'heure (TVA non applicable, article 293 B du CGI). Seul le temps de travail effectif est facturé : conduite, chargement et arrimage, livraisons, préparation, nettoyage, réparation et mécanique, mise en main auprès des clients. Les pauses, les repas, les nuits et les temps personnels ne sont pas comptés. À la clôture de chaque tournée, le Prestataire saisit dans l'application NeoDrive ses heures et ses pauses, jour par jour, et photographie ses tickets. À la fin de chaque tournée, la facture est établie automatiquement à partir de ces heures, sans frais (article 5), selon l'article 12. Paiement par virement à réception de la facture, sur le compte dont le Prestataire a fourni le RIB.` },
    { title: "5. Carte bancaire d'entreprise et frais de mission", text: "Le Client remet au Prestataire une carte bancaire d'entreprise pour payer les frais de mission : carburant, péages, stationnement, hôtel et repas de mission. L'hôtel est pris en charge dans la limite de 70 € TTC par nuit et les repas dans la limite de 30 € TTC par jour ; tout dépassement reste à la charge du Prestataire et est déduit de sa facture. Ces frais ne figurent pas sur la facture du Prestataire. La carte est à usage exclusivement professionnel : tout usage personnel est interdit. Tous les justificatifs sont obligatoires : le Prestataire les dépose chaque soir sur la plateforme (photo dans son espace livreur) et remet les originaux papier à NeoDrive (MK HOLDING) à la fin de la tournée ; pour l'hôtel, il demande si possible une facture au nom de MK HOLDING SAS, 31 rue Jean Nougaro, 31600 Muret. Toute dépense sans justificatif, ou personnelle, est déduite de sa facture. La carte est restituée sur simple demande du Client et à la fin du contrat. Si le Prestataire a exceptionnellement payé lui-même un frais de mission, il lui est remboursé sur justificatif, par note de frais séparée, hors facture." },
    { title: "6. Paiements des clients", text: "Le Prestataire ne manipule en principe aucun argent des clients : les véhicules sont réglés par virement à NeoDrive. Si un paiement en espèces a été convenu avec le client, le Prestataire s'engage à remettre l'intégralité de la somme reçue à NeoDrive (MK HOLDING) dès la fin de la tournée. Il ne peut en aucun cas conserver tout ou partie de cet argent, ni le déduire de sa facture ou de ses frais, sans l'autorisation écrite préalable de NeoDrive." },
    { title: "7. Véhicule, remorque et sécurité", text: "Le véhicule et la remorque sont assurés par le Client. Le Prestataire détient un permis valide adapté à l'ensemble (B96 ou BE), respecte le Code de la route (90 km/h maximum avec la remorque sur route et autoroute sauf limitation inférieure), arrime chaque voiture avec au moins quatre sangles et contrôle l'arrimage après les premiers kilomètres puis à chaque arrêt. Tout incident est signalé immédiatement dans l'application." },
    { title: "8. Assurance du Prestataire", text: "Le Prestataire souscrit à ses frais une assurance responsabilité civile professionnelle couvrant son activité et en fournit l'attestation avant la première mission, puis à chaque renouvellement." },
    { title: "9. Confidentialité", text: "Les informations sur les clients (noms, adresses, téléphones) servent uniquement aux livraisons et ne sont ni conservées ni communiquées après la mission." },
    { title: "10. Durée et résiliation", text: "Le contrat prend effet à la signature, pour une durée indéterminée. Chaque partie peut y mettre fin à tout moment, par écrit (e-mail ou message), sans indemnité ; les missions déjà commencées sont terminées et payées." },
    { title: "11. Travail soigné et signalements", text: "Le Prestataire vérifie l'état de chaque véhicule au chargement et à la livraison, signale immédiatement dans l'application tout dommage, panne ou incident, et ne remet jamais un véhicule qu'il juge dangereux. Les pièces ou consommables nécessaires à la petite mécanique sont fournis par le Client." },
    { title: "12. Mandat d'autofacturation", text: "Le Prestataire donne mandat au Client, qui l'accepte, d'établir en son nom et pour son compte les factures de ses prestations (article 289, I-2 du CGI). Chaque facture est générée à la fin d'une tournée à partir des heures saisies par le Prestataire dans l'application, porte un numéro de la séquence propre au Prestataire et la mention « TVA non applicable, art. 293 B du CGI », et lui est transmise par e-mail. Le Prestataire vérifie la facture avant son envoi ; il dispose ensuite de 15 jours à compter de sa réception pour la contester par écrit, faute de quoi elle est réputée acceptée. Le Prestataire reste responsable de ses obligations fiscales et sociales (déclaration de son chiffre d'affaires) et informe le Client sans délai de tout changement (SIRET, adresse, régime de TVA, coordonnées bancaires). Ce mandat prend fin avec le contrat." },
  ];
}

/* ───────────── Salarié en CDD ───────────── */

export const EMPLOYEE_CONTRACT_VERSION = "cdd-2026-11-19";
export const EMPLOYEE_CONTRACT_TITLE = "Contrat de travail à durée déterminée";
export const DEFAULT_JOB_TITLE = "Chauffeur-livreur et préparateur de véhicules";
export type Employment = { start?: string; end?: string; salary?: number; hours?: number; title?: string };
export const contractVersionFor = (t: unknown) => isSalarie(t) ? EMPLOYEE_CONTRACT_VERSION : CONTRACT_VERSION;

const frDate = (d?: string) => /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }) : "[date à compléter]";
const eurTxt = (n?: number) => Number(n) > 0 ? `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "[à compléter]";
/** Période d'essai d'un CDD (art. L1242-10 du Code du travail) : 1 jour par semaine, 2 semaines au plus si le contrat dure 6 mois ou moins. */
export function trialDays(e: Employment) {
  const a = Date.parse((e.start || "") + "T12:00:00Z"), b = Date.parse((e.end || "") + "T12:00:00Z");
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 14;
  const weeks = Math.floor((b - a) / (7 * 86400e3));
  const months = (b - a) / (30.44 * 86400e3);
  return months <= 6 ? Math.max(1, Math.min(14, weeks)) : Math.min(30, weeks);
}

/** CDD pour accroissement temporaire d'activité : chauffeur-livreur et préparateur de véhicules (MK HOLDING). */
export function employeeContractSections(employeeName: string, e: Employment): { title: string; text: string }[] {
  const title = e.title || DEFAULT_JOB_TITLE; const hours = Number(e.hours) > 0 ? Number(e.hours) : 35; const trial = trialDays(e);
  return [
    { title: "Parties", text: `Entre la société MK HOLDING SAS (NeoDrive), SIREN ${COMPANY.siren}, ${COMPANY.address}, code NAF 45.11Z, représentée par son président, M. Mansour Khelifa, ci-après « l'Employeur », et ${employeeName || "[nom du salarié]"}, ci-après « le Salarié ». Le présent contrat relève de la convention collective nationale des services de l'automobile (IDCC 1090).` },
    { title: "1. Motif et durée du contrat", text: `Le présent contrat est conclu pour faire face à un accroissement temporaire d'activité lié à l'arrivée de conteneurs de véhicules et au pic de livraisons (article L1242-2, 2° du Code du travail). Il prend effet le ${frDate(e.start)} et prend fin le ${frDate(e.end)}. Il pourra être renouvelé dans les conditions prévues par la loi.` },
    { title: "2. Période d'essai", text: `Le contrat comporte une période d'essai de ${trial} jour${trial > 1 ? "s" : ""} (un jour par semaine de contrat, dans la limite de deux semaines pour un contrat de six mois au plus), pendant laquelle chacune des parties peut rompre le contrat sans indemnité, en respectant le délai de prévenance légal.` },
    { title: "3. Poste et missions", text: `Le Salarié est engagé en qualité de ${title}. Ses missions comprennent notamment : la livraison des véhicules aux clients et leur remise avec explications et mise en main ; le chargement, le déchargement et l'arrimage des véhicules ; l'attelage et le dételage de la remorque ; la préparation et le nettoyage des véhicules ; la petite mécanique et le remplacement de pièces ; la réception et le contrôle des véhicules à leur arrivée (état, photos, numéros de série, inventaire) ; le transport de véhicules vers ou depuis les dépôts, prestataires et partenaires ; et toute tâche annexe liée à ces activités confiée par l'Employeur.` },
    { title: "4. Lieu de travail", text: "Le Salarié est rattaché au dépôt de l'Employeur à Lamasquère (31600). Ses fonctions impliquent des déplacements sur l'ensemble du territoire français, y compris des tournées de plusieurs jours avec découchés." },
    { title: "5. Durée du travail", text: `La durée du travail est fixée à ${hours} heures par semaine. Les heures supplémentaires effectuées à la demande ou avec l'accord de l'Employeur sont rémunérées et majorées selon la loi et la convention collective (en principe 25 % de la 36e à la 43e heure, 50 % au-delà). Le Salarié déclare ses heures et ses pauses dans l'application NeoDrive ; un relevé d'heures mensuel sert à établir la paie. Les pauses, les repas et les nuits ne constituent pas du temps de travail effectif.` },
    { title: "6. Rémunération", text: `Le Salarié perçoit une rémunération brute mensuelle de ${eurTxt(e.salary)} pour ${hours} heures hebdomadaires, majorée le cas échéant des heures supplémentaires. Elle est versée chaque mois par virement.` },
    { title: "7. Frais de déplacement", text: "Les frais professionnels engagés lors des tournées sont pris en charge par l'Employeur : l'hôtel est réglé par l'Employeur ; les repas pris en tournée sont remboursés sur justificatif dans la limite de 30 € par jour, ou indemnisés selon le barème des indemnités de grand déplacement de l'URSSAF. Le carburant, les péages et le stationnement sont réglés avec la carte bancaire de l'entreprise." },
    { title: "8. Carte bancaire d'entreprise et justificatifs", text: "La carte bancaire d'entreprise remise au Salarié est réservée exclusivement aux frais professionnels ; tout usage personnel est interdit. Le Salarié dépose chaque soir la photo de ses justificatifs dans l'application et remet les originaux papier à l'Employeur à la fin de chaque tournée. La carte est restituée sur simple demande et à la fin du contrat." },
    { title: "9. Paiements des clients", text: "Le Salarié ne conserve jamais l'argent des clients. Si un paiement en espèces a été convenu avec un client, il remet l'intégralité de la somme reçue à l'Employeur dès la fin de la tournée et fait signer au client l'accusé de réception indiquant le mode de règlement." },
    { title: "10. Véhicule, remorque et sécurité", text: "Le Salarié conduit le véhicule et la remorque de l'Employeur, assurés par celui-ci. Il doit être titulaire d'un permis de conduire valide adapté à l'ensemble et informer immédiatement l'Employeur de toute suspension ou de tout retrait. Il respecte le Code de la route, arrime chaque voiture avec au moins quatre sangles, contrôle l'arrimage pendant le trajet et signale immédiatement tout incident, dommage ou panne." },
    { title: "11. Congés payés et fin de contrat", text: "Le Salarié acquiert des congés payés dans les conditions légales (2,5 jours ouvrables par mois de travail). À la fin du contrat, il perçoit l'indemnité de fin de contrat de 10 % de la rémunération brute totale, sauf cas d'exclusion prévus par la loi, ainsi qu'une indemnité compensatrice pour les congés acquis et non pris." },
    { title: "12. Protection sociale", text: "Le Salarié est affilié au régime général de la sécurité sociale. Il bénéficie de la mutuelle obligatoire de l'entreprise, sauf dispense prévue par la loi. Caisse de retraite complémentaire : [à compléter par l'employeur]. Organisme de prévoyance : [à compléter par l'employeur]." },
    { title: "13. Confidentialité", text: "Les informations sur les clients (noms, adresses, téléphones) servent uniquement aux livraisons et ne sont ni conservées ni communiquées à des tiers." },
    { title: "14. Documents", text: "Le Salarié remet avant son premier jour de travail les pièces nécessaires à son embauche (pièce d'identité, carte Vitale ou attestation de sécurité sociale, RIB, permis de conduire, justificatif de domicile) et signale tout changement de situation. Un exemplaire signé du présent contrat lui est remis au plus tard dans les deux jours ouvrables suivant l'embauche." },
  ];
}
