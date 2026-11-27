/**
 * Paramètres de la simulation de financement NeoDrive.
 * ⚠️ Taux INDICATIFS : à remplacer par l'exemple représentatif fourni par
 * l'organisme de crédit partenaire avant toute communication commerciale.
 */
export const FINANCE = {
  taeg: 6.45,           // TAEG fixe indicatif (%)
  tauxDebiteur: 6.27,   // taux débiteur annuel fixe indicatif (%)
  fraisDossier: 0,
  durations: [12, 24, 36, 48, 60, 72, 84] as const,
  minAmount: 1500,
  maxAmount: 75000,
};

export function monthlyPayment(amount: number, months: number, annualRate = FINANCE.tauxDebiteur) {
  if (amount <= 0 || months <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return amount / months;
  return (amount * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/**
 * Mensualité « ou dès XX €/mois » affichée à côté des prix (accueil, produit, pages SEO).
 * ⚠️ Reste à false tant que l'organisme prêteur n'a pas fourni par écrit son exemple
 * représentatif (TAEG, taux débiteur, durée, frais). Tant que false, AUCUNE mensualité
 * chiffrée n'est affichée hors de /financement : seulement un lien « simuler » + la mention légale.
 * Passer à true (après mise à jour de FINANCE.taeg / tauxDebiteur / fraisDossier) suffit à
 * afficher partout « ou dès XX €/mois » avec l'exemple représentatif (art. L312-6 C. conso).
 */
export const FINANCE_RATE_CONFIRMED = false;

/** Mention obligatoire de toute publicité pour un crédit (art. L312-5 du Code de la consommation). */
export const CREDIT_WARNING = "Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.";

/** Exemple représentatif « dès » : durée la plus longue du simulateur, sans apport, montant = prix affiché. */
export function representativeExample(amount: number) {
  const months = FINANCE.durations[FINANCE.durations.length - 1];
  const monthly = Math.round(monthlyPayment(amount, months) * 100) / 100;
  const totalDue = Math.round((monthly * months + FINANCE.fraisDossier) * 100) / 100;
  return { amount, months, monthly, totalDue, cost: Math.round((totalDue - amount) * 100) / 100, taeg: FINANCE.taeg, tauxDebiteur: FINANCE.tauxDebiteur, fraisDossier: FINANCE.fraisDossier };
}

export const FINANCE_DOCS = [
  { key: "identite", label: "Pièce d’identité (recto-verso)", required: true },
  { key: "domicile", label: "Justificatif de domicile (- de 3 mois)", required: false },
  { key: "salaire1", label: "Bulletin de salaire n°1 (dernier mois)", required: false },
  { key: "salaire2", label: "Bulletin de salaire n°2", required: false },
  { key: "salaire3", label: "Bulletin de salaire n°3", required: false },
  { key: "impots", label: "Dernier avis d’imposition", required: false },
  { key: "rib", label: "RIB", required: false },
  { key: "contrat", label: "Contrat de travail / attestation employeur", required: false },
] as const;
export type FinanceDocKey = typeof FINANCE_DOCS[number]["key"];
export const FINANCE_MAX_FILE = 10 * 1024 * 1024;
export const FINANCE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"];

/** Conseiller(s) bancaire(s) qui reçoivent (pas un partenariat officiel : on transmet simplement le dossier du client) — automatiquement chaque nouveau dossier complet (ex. conseiller Groupama). Vide = dossier envoyé seulement à NeoDrive. */
export const FINANCE_PARTNER_EMAILS: string[] = ["xavier.etchemendigaray@groupama-oc.fr"];
