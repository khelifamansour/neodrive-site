/**
 * SAV centralisé : statuts, priorités, alertes, types partagés (navigateur + serveur).
 * Aucune clé, aucun accès base ici.
 */

export const SAV_STATUSES = [
  { key: "nouveau", label: "Nouveau", color: "#ff6a00", legacy: "open", client: "Demande reçue", clientMsg: "Votre demande est bien enregistrée. Un technicien NeoDrive va l’étudier." },
  { key: "en_cours", label: "En cours", color: "#2563eb", legacy: "in_progress", client: "En cours de traitement", clientMsg: "Un technicien NeoDrive traite votre demande." },
  { key: "attente_pieces", label: "Attente pièces", color: "#a855f7", legacy: "in_progress", client: "Pièce en commande", clientMsg: "La pièce nécessaire est en commande. Nous vous prévenons dès son expédition." },
  { key: "attente_ingenieur", label: "Attente ingénieur", color: "#0891b2", legacy: "in_progress", client: "Analyse technique", clientMsg: "Votre dossier est étudié par notre ingénieur." },
  { key: "attente_client", label: "Attente client", color: "#ca8a04", legacy: "in_progress", client: "En attente de votre réponse", clientMsg: "Nous attendons une réponse ou une information de votre part. Répondez ci-dessous." },
  { key: "resolu", label: "Résolu", color: "#16a34a", legacy: "resolved", client: "Résolu", clientMsg: "Votre demande est traitée." },
  { key: "cloture", label: "Clôturé", color: "#4b5563", legacy: "closed", client: "Clôturé", clientMsg: "Ce dossier est clôturé. Vous pouvez toujours nous écrire ci-dessous." },
] as const;
export type SavStatusKey = typeof SAV_STATUSES[number]["key"];
export const CLOSED_STATUSES: string[] = ["resolu", "cloture"];
export const statusOf = (k: string | null | undefined) => SAV_STATUSES.find(s => s.key === k) || SAV_STATUSES[0];
export const isStatus = (k: unknown): k is SavStatusKey => typeof k === "string" && SAV_STATUSES.some(s => s.key === k);

/** Ancienne valeur de la colonne `status` (ERP) → nouveau statut. */
export function statusFromLegacy(status: string | null | undefined): SavStatusKey {
  if (status === "resolved") return "resolu";
  if (status === "closed") return "cloture";
  if (status === "in_progress") return "en_cours";
  return "nouveau";
}
/** Anciennes étapes du suivi JSON → nouveau statut. */
export const STAGE_TO_STATUS: Record<string, SavStatusKey> = { received: "nouveau", analysing: "en_cours", waiting_parts: "attente_pieces", scheduled: "en_cours", resolved: "resolu" };

export const SAV_PRIORITIES = [
  { key: "low", label: "Basse", color: "#6b7280" },
  { key: "normal", label: "Normale", color: "#2563eb" },
  { key: "high", label: "Haute", color: "#ea580c" },
  { key: "urgent", label: "Urgente", color: "#dc2626" },
] as const;
export const priorityOf = (k: string | null | undefined) => SAV_PRIORITIES.find(p => p.key === k) || SAV_PRIORITIES[1];
export const isPriority = (k: unknown) => typeof k === "string" && SAV_PRIORITIES.some(p => p.key === k);

export const CHANNEL_LABEL: Record<string, string> = { email: "E-mail", whatsapp: "WhatsApp", plateforme: "Site NeoDrive", note: "Note interne" };

export type SavMedia = { name: string; type: string; url: string; source?: string };
export type SavAttachment = { name: string; type?: string; size?: number; path: string; bucket?: string };
export type RequestedPart = { id: string; sku: string | null; name: string; image_url: string | null; category?: string | null; sale_price?: number | null };
export type SavMessage = { id: string; ticket_id: string; created_at: string; direction: "in" | "out" | "note"; channel: "email" | "whatsapp" | "plateforme" | "note"; author: string | null; body: string; attachments: SavAttachment[] | null; media?: SavMedia[] };
export type SavEventRow = { id: string; created_at: string; kind: string; from_value: string | null; to_value: string | null; author: string | null; note: string | null };

/** Délais d'alerte. */
export const ALERT_NO_REPLY_H = 24;
export const ALERT_OPEN_DAYS = 7;
export const ALERT_STALE_DAYS = 3;
const H = 3600e3, D = 24 * H;

export type AlertInput = { sav_status: string | null; created_at: string; closed_at?: string | null; status_changed_at?: string | null; updated_at?: string | null; last_customer_message_at?: string | null; last_staff_message_at?: string | null };
export type SavAlert = { key: "no_reply" | "open_long" | "stale"; label: string };

export function daysOpen(t: Pick<AlertInput, "created_at" | "closed_at">, now = Date.now()) {
  const end = t.closed_at ? new Date(t.closed_at).getTime() : now;
  return Math.max(0, Math.floor((end - new Date(t.created_at).getTime()) / D));
}
const ago = (ms: number) => { const h = Math.floor(ms / H); return h < 48 ? `${h} h` : `${Math.floor(ms / D)} jours`; };

/** Alertes « À traiter maintenant » d'un ticket ouvert. */
export function alertsOf(t: AlertInput, now = Date.now()): SavAlert[] {
  if (CLOSED_STATUSES.includes(t.sav_status || "")) return [];
  const out: SavAlert[] = [];
  const lastIn = t.last_customer_message_at ? new Date(t.last_customer_message_at).getTime() : new Date(t.created_at).getTime();
  const lastOut = t.last_staff_message_at ? new Date(t.last_staff_message_at).getTime() : 0;
  if (lastIn > lastOut && now - lastIn > ALERT_NO_REPLY_H * H) out.push({ key: "no_reply", label: `Client sans réponse depuis ${ago(now - lastIn)}` });
  const open = now - new Date(t.created_at).getTime();
  if (open > ALERT_OPEN_DAYS * D) out.push({ key: "open_long", label: `Ouvert depuis ${Math.floor(open / D)} jours` });
  const changed = new Date(t.status_changed_at || t.updated_at || t.created_at).getTime();
  if (now - changed > ALERT_STALE_DAYS * D) out.push({ key: "stale", label: `Statut inchangé depuis ${Math.floor((now - changed) / D)} jours` });
  return out;
}

/** 06 12 34 56 78 → 33612345678 (pour wa.me) */
export function waNumberOf(phone: string | null | undefined) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("33")) return d;
  if (d.startsWith("0") && d.length === 10) return "33" + d.slice(1);
  return d;
}

/** Image d'une pièce : URL complète ou chemin du site uniquement. */
export const partImage = (u: string | null | undefined) => { const s = String(u || "").trim(); return /^https?:\/\//.test(s) || s.startsWith("/") ? s : null; };

/** Sujets proposés sur le formulaire public. */
export const SAV_CATEGORIES = ["Démarrage / écran", "Charge / batterie", "Freinage", "Direction / roues", "Éclairage / accessoires", "Carrosserie", "Pièce détachée", "Question d’utilisation", "Autre"];
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** « batterie » → « Charge / batterie » (pour le lien pré-rempli). */
export function matchCategory(v: string | null | undefined) {
  const f = fold(String(v || "")); if (!f) return "";
  return SAV_CATEGORIES.find(c => fold(c) === f) || SAV_CATEGORIES.find(c => fold(c).split(" ").some(w => w.length > 3 && f.includes(w))) || (f.length >= 4 && SAV_CATEGORIES.find(c => fold(c).split(" ").some(w => w.length > 3 && f.split(" ").some(x => x.length >= 4 && w.startsWith(x.slice(0, 5)))))) || "Autre";
}
