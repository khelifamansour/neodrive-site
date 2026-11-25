/**
 * « Température » d'une réservation : aide à décider quelles réservations confier à Transports Rabouin
 * (camion réservé ~1 semaine à l'avance, non annulable). Partagé client / serveur (aucun secret).
 */

export type Temperature = "chaud" | "tiede" | "froid";
export const TEMPS: { key: Temperature; label: string; icon: string; bg: string; color: string }[] = [
  { key: "chaud", label: "Chaud", icon: "🔥", bg: "#fde8e7", color: "#b42318" },
  { key: "tiede", label: "Tiède", icon: "🌤️", bg: "#fff4d6", color: "#b54708" },
  { key: "froid", label: "Froid", icon: "❄️", bg: "#e8f0fe", color: "#1d4ed8" },
];
export const tempInfo = (t: unknown) => TEMPS.find(x => x.key === t) || null;

export const POSITIVE_SIGNALS = [
  { key: "relance_seul", label: "Relance de lui-même" },
  { key: "repond_jour", label: "Répond dans la journée" },
  { key: "bdc_vite", label: "Bon de commande signé sans traîner" },
  { key: "rib_vite", label: "RIB ajouté tout de suite" },
  { key: "accepte_date", label: "Accepte la date proposée" },
] as const;
export const NEGATIVE_SIGNALS = [
  { key: "va_reflechir", label: "Dit qu'il va réfléchir" },
  { key: "repond_lent", label: "Met plusieurs jours à répondre" },
  { key: "repousse_date", label: "Repousse la date" },
  { key: "negocie", label: "Négocie beaucoup" },
  { key: "argent_pas_pret", label: "Argent pas encore prêt (crédit, vente…)" },
] as const;
const POS = new Set<string>(POSITIVE_SIGNALS.map(s => s.key));
const NEG = new Set<string>(NEGATIVE_SIGNALS.map(s => s.key));
export const SIGNAL_KEYS = new Set<string>([...POS, ...NEG]);

/** Contenu de reservations.temperature_signals. */
export type TempSignals = { checked?: string[]; suggested?: Temperature; override?: boolean; by?: string; reply_by?: string };

/** Suggestion : ≥ 4 positifs et 0 négatif = chaud ; 2 négatifs ou plus = froid ; sinon tiède. */
export function suggestTemperature(checked: string[]): Temperature {
  const pos = checked.filter(k => POS.has(k)).length, neg = checked.filter(k => NEG.has(k)).length;
  if (neg >= 2) return "froid";
  if (pos >= 4 && neg === 0) return "chaud";
  return "tiede";
}

export const SILENCE_HOURS = 48;
/** « Chaud » sans réponse du client depuis 48 h (référence : dernière réponse, sinon date de la température). */
export function hotSilent(r: { temperature?: string | null; last_client_reply_at?: string | null; temperature_at?: string | null; statut?: string | null }, now = Date.now()) {
  if (r.temperature !== "chaud" || ["Livrée", "Annulée"].includes(String(r.statut || ""))) return false;
  const ref = r.last_client_reply_at || r.temperature_at;
  if (!ref) return false;
  return now - new Date(ref).getTime() > SILENCE_HOURS * 3600_000;
}

/** Département → région (métropole + outre-mer). */
const REGIONS: Record<string, string[]> = {
  "Auvergne-Rhône-Alpes": ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"],
  "Bourgogne-Franche-Comté": ["21", "25", "39", "58", "70", "71", "89", "90"],
  "Bretagne": ["22", "29", "35", "56"],
  "Centre-Val de Loire": ["18", "28", "36", "37", "41", "45"],
  "Corse": ["20", "2A", "2B"],
  "Grand Est": ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"],
  "Hauts-de-France": ["02", "59", "60", "62", "80"],
  "Île-de-France": ["75", "77", "78", "91", "92", "93", "94", "95"],
  "Normandie": ["14", "27", "50", "61", "76"],
  "Nouvelle-Aquitaine": ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"],
  "Occitanie": ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"],
  "Pays de la Loire": ["44", "49", "53", "72", "85"],
  "Provence-Alpes-Côte d'Azur": ["04", "05", "06", "13", "83", "84"],
  "Outre-mer": ["971", "972", "973", "974", "976"],
};
const DEPT_REGION: Record<string, string> = Object.fromEntries(Object.entries(REGIONS).flatMap(([r, ds]) => ds.map(d => [d, r])));
export function regionOf(dept?: string | null, cp?: string | null): string {
  const d = String(dept || "").trim().toUpperCase() || (/^\d{5}$/.test(String(cp || "")) ? (String(cp).startsWith("97") ? String(cp).slice(0, 3) : String(cp).slice(0, 2)) : "");
  return DEPT_REGION[d] || "Région inconnue";
}
