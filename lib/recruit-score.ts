/**
 * Note NeoDrive (une seule note /100 pour tout le recrutement) et règle de salaire.
 * Français 25 · Intelligence 25 · Expérience pertinente 25 · Stabilité 15 · Bac 10, renormalisé sur les critères connus.
 * Copier-coller pendant les tests : −5 par collage (max −20) ; 6 collages ou plus = exclu des classements.
 */
import { pillars } from "./pillars";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any> | null | undefined;

export const NOTE_WEIGHTS = { francais: 25, intelligence: 25, experience: 25, stabilite: 15, bac: 10 } as const;
export type NoteKey = keyof typeof NOTE_WEIGHTS;
export const NOTE_LABEL: Record<NoteKey, string> = { francais: "Fr", intelligence: "Int", experience: "Exp", stabilite: "Stab", bac: "Bac" };

/** Règle de salaire (dinars algériens par mois). */
export const SALARY_MAX = 120_000;          // au-delà : écarté, sauf profil exceptionnel
export const SALARY_EXCEPTION_MAX = 150_000; // profil exceptionnel : jusqu'à ce montant, « à négocier »
export const EXCEPTIONAL_NOTE = 75;          // note NeoDrive à partir de laquelle un profil est « exceptionnel »
export const PASTE_EXCLUDE = 6;              // copier-coller à partir duquel le candidat est exclu des classements
export const EUR_TO_DZD = 150;

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Expérience : analyse IA du CV si disponible, sinon estimation à partir des années déclarées (l'ancienneté n'est pas récompensée au-delà de 8 ans). */
export function experienceScore(app: R, deep: R): number | null {
  if (deep && deep.experience != null && Number.isFinite(Number(deep.experience))) return clamp(Number(deep.experience));
  const t = String(app?.experience_years ?? "").toLowerCase().trim();
  if (!t) return null;
  const m = t.match(/\d+(?:[.,]\d+)?/);
  if (!m) return /aucun|non|pas|débutant|debutant/.test(t) ? 20 : null;
  const y = parseFloat(m[0].replace(",", "."));
  if (y > 60) return null; // année (ex. « 2023 ») : inexploitable
  if (y < 1) return 20;
  if (y < 2) return 40;
  if (y < 4) return 60;
  if (y <= 8) return 75;
  return 70;
}

export const bacScore = (app: R): number | null => { const b = Number(String(app?.bac_average ?? "").replace(",", ".")); return b > 0 ? Math.round(clamp((b - 10) / 8 * 100)) : null; };

export type Note = { note: number; parts: Record<NoteKey, number | null>; pastes: number; penalty: number };

export function noteNeoDrive(app: R, exc: R, deep: R): Note {
  const P = pillars(app, exc, deep);
  const parts: Record<NoteKey, number | null> = { francais: P.francais, intelligence: P.intelligence, experience: experienceScore(app, deep), stabilite: P.stabilite, bac: bacScore(app) };
  const ok = (Object.keys(NOTE_WEIGHTS) as NoteKey[]).filter(k => parts[k] != null);
  const base = ok.length ? ok.reduce((t, k) => t + (parts[k] as number) * NOTE_WEIGHTS[k], 0) / ok.reduce((t, k) => t + NOTE_WEIGHTS[k], 0) : 0;
  const pastes = Number(app?.paste_count) || 0; const penalty = Math.min(20, 5 * pastes);
  return { note: Math.max(0, Math.round(base - penalty)), parts, pastes, penalty };
}

/** Prétention salariale en dinars ; ambiguous = montant probablement mal saisi (à clarifier au téléphone). */
export function parseSalaryDZD(raw: unknown): { dzd: number | null; ambiguous: boolean } {
  const t = String(raw ?? "").toLowerCase().replace(/ /g, " ").trim();
  if (!t) return { dzd: null, ambiguous: false };
  const eur = t.match(/(\d[\d\s.,]*)\s*(?:€|euro)/);
  if (eur) { const n = Number(eur[1].replace(/[\s.,]/g, "")); if (n > 0) return { dzd: n * EUR_TO_DZD, ambiguous: false }; }
  const m = t.match(/\d[\d\s.,]*/);
  if (!m) return { dzd: null, ambiguous: false };
  let s = m[0].trim().replace(/[.,]\d{1,2}$/, ""); // « 150000.00 » → 150000
  s = s.split(/\s*-\s*/)[0];
  let n = Number(s.replace(/[\s.,]/g, ""));
  if (!(n > 0)) return { dzd: null, ambiguous: false };
  if (/million/.test(t)) n = n * 10_000; // « 6 millions » = 6 millions de centimes = 60 000 DA
  if (n < 20_000 || n >= 1_000_000) return { dzd: n, ambiguous: true };
  return { dzd: n, ambiguous: false };
}

export type SalaryVerdict = { keep: boolean; badge: "" | "à négocier" | "à clarifier" | "non précisé"; reason: string };

export function salaryRule(note: number, raw: unknown): SalaryVerdict {
  const { dzd, ambiguous } = parseSalaryDZD(raw);
  if (dzd == null) return { keep: true, badge: "non précisé", reason: "" };
  if (ambiguous) return { keep: true, badge: "à clarifier", reason: "" };
  if (dzd <= SALARY_MAX) return { keep: true, badge: "", reason: "" };
  if (dzd <= SALARY_EXCEPTION_MAX && note >= EXCEPTIONAL_NOTE) return { keep: true, badge: "à négocier", reason: "" };
  return { keep: false, badge: "", reason: `prétention ${Math.round(dzd / 1000)} k DA (au-dessus de ${SALARY_MAX / 1000} k${note >= EXCEPTIONAL_NOTE ? ` et de ${SALARY_EXCEPTION_MAX / 1000} k` : ""}, note ${note})` };
}

export const fmtK = (raw: unknown) => { const { dzd } = parseSalaryDZD(raw); return dzd == null ? (String(raw ?? "").trim().slice(0, 16) || "—") : `${Math.round(dzd / 1000)} k DA`; };
