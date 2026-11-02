/** Analyse par famille de produits (recherche du 2 novembre 2026). Texte à revoir quand tu as des devis réels. */
import type { Cat } from "./sourcing";
export type Go = "go" | "test" | "later" | "no";
export type CatAnalysis = {
  cat: Cat; rank: number; go: Go; verdict: string; market: string; buyers: string; priceFr: string; fobRange: string;
  competition?: string; risks: string; season?: string; sources?: string;
  plan: { invest: string; unitsMonth: string; marginUnit: string; first: string };
};
export const ANALYSIS: CatAnalysis[] = [];
export const ROADMAP: { when: string; title: string; steps: string[] }[] = [];
