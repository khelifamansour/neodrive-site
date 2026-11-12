/** Note NeoDrive en 6 piliers : chaque pilier /100 a sa formule, puis une moyenne pondérée. */
export const PILLAR_WEIGHTS = { intelligence: 30, francais: 25, experience: 15, stabilite: 15, formation: 10, coherence: 5 } as const;
export type PillarKey = keyof typeof PILLAR_WEIGHTS;
export const PILLAR_LABEL: Record<PillarKey, string> = { intelligence: "🧠 Intelligence", francais: "🇫🇷 Français", experience: "💼 Expérience", stabilite: "⚓ Stabilité", formation: "🎓 Formation", coherence: "✅ Cohérence" };

type R = Record<string, any> | null | undefined;
const wavg = (parts: [number | null | undefined, number][]) => { const ok = parts.filter(([v]) => v != null && Number.isFinite(v)) as [number, number][]; return ok.length ? Math.round(ok.reduce((t, [v, w]) => t + v * w, 0) / ok.reduce((t, [, w]) => t + w, 0)) : null; };
const pct = (v: unknown, max: number) => v == null || v === "" ? null : Math.max(0, Math.min(100, Number(v) / max * 100));

/**
 * Intelligence = QCM d'excellence 40 + problème des 8 pommes 20 + test de logique 20 + énigmes 10 + bac 10.
 * Français    = test de français 40 + rédaction 35 + français du CV (IA) 25.
 * Expérience  = pertinence de l'expérience pour le poste (IA, analyse approfondie du CV).
 * Stabilité   = durée moyenne par employeur (24 mois = 100), −12 par poste de moins de 12 mois au-delà du premier ; débutant sans instabilité = 60.
 * Formation   = niveau et prestige de l'établissement (IA).
 * Cohérence   = cohérence du CV : dates, chevauchements, trous, entreprises plausibles (IA).
 * Copier-coller : −5 par collage (max −20) sur la note globale.
 */
export function pillars(app: R, exc: R, deep: R) {
  const rid = String(app?.answers?.riddles_score || "").match(/^(\d+)\/(\d+)$/);
  const bac = Number(app?.bac_average);
  const intelligence = wavg([[exc?.qcm_score ?? null, 40], [exc?.reasoning_score ?? null, 20], [pct(app?.test_logic, 8), 20], [rid ? Number(rid[1]) / Number(rid[2]) * 100 : null, 10], [bac > 0 ? Math.max(0, Math.min(100, (bac - 10) / 8 * 100)) : null, 10]]);
  const francais = wavg([[pct(app?.test_french, 10), 40], [pct(app?.test_writing, 20), 35], [deep?.french_cv ?? null, 25]]);
  const experience = deep?.experience ?? null;
  let stabilite: number | null = null;
  if (deep) {
    const avg = Number(deep.avg_tenure_months) || 0; const short = Math.max(0, (Number(deep.short_stints) || 0) - 1); const total = Number(deep.total_experience_months) || 0;
    stabilite = total < 24 && short === 0 ? 60 : Math.max(0, Math.min(100, Math.round(avg / 24 * 100 - short * 12)));
  }
  const formation = deep?.prestige ?? null; const coherence = deep?.coherence ?? null;
  const p: Record<PillarKey, number | null> = { intelligence, francais, experience, stabilite, formation, coherence };
  const g = wavg((Object.keys(PILLAR_WEIGHTS) as PillarKey[]).map(k => [p[k], PILLAR_WEIGHTS[k]]));
  const global = g == null ? null : Math.max(0, g - Math.min(20, 5 * (Number(app?.paste_count) || 0)));
  return { ...p, global };
}
