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

export const FINANCE_DOCS = [
  { key: "identite", label: "Pièce d’identité (recto-verso)", required: true },
  { key: "domicile", label: "Justificatif de domicile (- de 3 mois)", required: true },
  { key: "salaire1", label: "Bulletin de salaire n°1 (dernier mois)", required: true },
  { key: "salaire2", label: "Bulletin de salaire n°2", required: true },
  { key: "salaire3", label: "Bulletin de salaire n°3", required: false },
  { key: "impots", label: "Dernier avis d’imposition", required: false },
  { key: "rib", label: "RIB", required: true },
  { key: "contrat", label: "Contrat de travail / attestation employeur", required: false },
] as const;
export type FinanceDocKey = typeof FINANCE_DOCS[number]["key"];
export const FINANCE_MAX_FILE = 10 * 1024 * 1024;
export const FINANCE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"];
