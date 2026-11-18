/** Facture livreur : types et contrôles purs (IBAN, SIRET, heures), utilisables côté navigateur. */
export type Billing = { legal_name?: string; siret?: string; address?: string; iban?: string; bic?: string };
export type InvDay = { date: string; depart: string; start: string; end: string; pause_min: number; worked_min: number };
export type InvDelivery = { client: string; vin: string; date: string | null; accuse: boolean };
/** Contrôle de fin de tournée : prévu / réel, livraisons, dépenses carte (hors facture). */
export type Control = { planned_h: number; real_h: number; gap_h: number; planned_km: number; planned_stops: number; delivered: number; missing: string[]; no_vin: string[]; no_receipt: string[]; card_total: number; perso_total: number; tickets: number; days_without_receipt: string[]; cap_alerts: string[]; tickets_no_photo: number };

/** IBAN : format et clé de contrôle (mod 97). */
export function ibanOk(raw: string) {
  const s = String(raw || "").toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  if (s.startsWith("FR") && s.length !== 27) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  let m = 0; for (const ch of r) m = (m * 10 + Number(ch)) % 97;
  return m === 1;
}
export const bicOk = (s: string) => /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(String(s || "").toUpperCase().replace(/\s+/g, ""));
export const siretOk = (s: string) => /^\d{14}$/.test(String(s || "").replace(/\s+/g, ""));
export const fmtIban = (s: string) => String(s || "").toUpperCase().replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

/** "08:30" → minutes depuis minuit (null si invalide). */
export const toMin = (t: string) => { const m = /^(\d{1,2})[:h](\d{2})$/.exec(String(t || "").trim()); if (!m) return null; const h = Number(m[1]), mi = Number(m[2]); return h < 24 && mi < 60 ? h * 60 + mi : null; };
/** Durée travaillée d'une journée saisie (fin après minuit acceptée), pauses déduites. */
export const dayWorked = (start: string, end: string, pause: number) => { const a = toMin(start), b = toMin(end); if (a == null || b == null) return 0; const span = b >= a ? b - a : b + 1440 - a; return Math.max(0, span - Math.max(0, Math.round(pause || 0))); };

