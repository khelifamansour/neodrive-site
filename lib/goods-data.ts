/** Produits hors véhicules à glisser dans les conteneurs et vendre localement (recherche du 2 novembre 2026).
 *  Prix chinois = prix affichés (pas des devis) ; marges = estimations. */
export type Good = {
  id: string; name: string; family: "Particuliers" | "Pros" | "Saison / obligation";
  marketFr: string; priceFr: string; fob: string; volM3: number | null; fitsInCar: boolean;
  marginUnit: number | null; window: string; orderBy: string; competition: string; localAdvantage: string;
  compliance: string; antidumping: string; score: number; verdict: string; sources: string[];
};
export const GOODS: Good[] = [];
export const GOODS_VERDICT = "";
export const MONTHS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
