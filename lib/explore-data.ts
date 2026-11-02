/** Exploration de nouveaux marchés (recherche du 2 novembre 2026). Chaque chiffre a sa source ; 🧮 = estimation. */
export type Cand = {
  id: string; name: string; family: string; country: string;
  unitsFr: number | null; unitsEst: boolean; unitsSrc: string;
  priceFr: string; fob: string; gap: number | null;      // écart prix France / prix usine rendu (×)
  mutation: string; incumbents: string; chinaPen: string; saturation: number; // 1 = vide, 5 = saturé
  barrier: string; regulated: "none" | "soft" | "hard"; repeatable: boolean; logistics: string;
  fit: number; marginUnit: number | null; risks: string; verdict: string; sources: string[];
  mutating: number;                                          // 0–1 : marché en pleine mutation
};
export const EXPLORE: Cand[] = [];
export const EXPLORE_VERDICT = "";
export const ALGERIA: { verdict: string; rules: { topic: string; detail: string; source: string }[]; opps: { id: string; name: string; what: string; marketSize: string; investment: string; barrier: string; fit: number; risks: string; sources: string[] }[] } = { verdict: "", rules: [], opps: [] };

/** Note « schéma VSP » (0–100). */
export function patternScore(x: Cand) {
  const size = Math.min(1, Math.log10(Math.max(1, x.unitsFr || 1)) / 5);           // 100 000 u. = 1
  const gap = x.gap ? Math.min(1, Math.max(0, (x.gap - 1) / 2)) : 0.3;              // ×3 = 1
  const free = (5 - x.saturation) / 4, reg = x.regulated === "none" ? 1 : x.regulated === "soft" ? 0.6 : 0;
  return Math.round(100 * (0.15 * size + 0.2 * gap + 0.2 * x.mutating + 0.15 * free + 0.1 * reg + 0.05 * (x.repeatable ? 1 : 0) + 0.15 * (x.fit / 5)));
}
/** Potentiel de marge par an = marché × part × marge par unité. */
export const potential = (x: Cand, share: number) => (x.unitsFr || 0) * share * (x.marginUnit || 0);
