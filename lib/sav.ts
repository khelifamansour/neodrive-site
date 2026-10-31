/** Suivi des demandes d'assistance NeoDrive (SAV). */
export const SAV_STAGES = [
  { key: "received", label: "Demande reçue", client: "Votre demande est bien enregistrée.", status: "open" },
  { key: "analysing", label: "En analyse", client: "Un technicien étudie votre demande.", status: "in_progress" },
  { key: "waiting_parts", label: "Pièce commandée", client: "La pièce nécessaire est commandée.", status: "in_progress" },
  { key: "scheduled", label: "Intervention planifiée", client: "Une intervention est planifiée avec vous.", status: "in_progress" },
  { key: "resolved", label: "Résolu", client: "Votre demande est traitée.", status: "resolved" },
] as const;
export type SavStageKey = typeof SAV_STAGES[number]["key"];
export const stageOf = (k: string) => SAV_STAGES.find(s => s.key === k) || SAV_STAGES[0];

export type SavEvent = { at: string; stage: SavStageKey; note?: string; internal?: string };
export type SavTimeline = { ref: string; folder: string; events: SavEvent[] };

export const SAV_BUCKET = "erp-documents";
export const SAV_MAX_PHOTO = 15 * 1024 * 1024;
export const SAV_MAX_VIDEO = 50 * 1024 * 1024; // limite par défaut du stockage Supabase
export const SAV_MAX_FILES = 8;
export const timelinePath = (ref: string) => `sav-suivi/${ref}.json`;

/** 06 12 34 56 78 → 33612345678 (pour wa.me) */
export function waNumber(phone: string) {
  const d = (phone || "").replace(/\D/g, "");
  if (d.startsWith("33")) return d;
  if (d.startsWith("0") && d.length === 10) return "33" + d.slice(1);
  return d;
}
export const ALERT_ENDPOINT = "https://formspree.io/f/xjgjrqqg";
