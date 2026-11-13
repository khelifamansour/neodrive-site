import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Lien chauffeur sans code d'accès : « <tournée>.<signature> ».
 * La signature (HMAC avec le secret serveur) empêche de deviner le lien d'une autre tournée.
 * « libre » = lien général (chargement / livraison hors tournée planifiée).
 */
const sig = (tour: string) => createHmac("sha256", process.env.CRON_SECRET || "").update("driver:" + tour).digest("base64url").slice(0, 22);

export function driverKey(tour: string) {
  if (!process.env.CRON_SECRET || !/^[A-Za-z0-9_-]{1,80}$/.test(tour)) return null;
  return `${tour}.${sig(tour)}`;
}

/** Renvoie l'id de la tournée si le lien est authentique, sinon null. */
export function checkDriverKey(k: unknown): string | null {
  const m = /^([A-Za-z0-9_-]{1,80})\.([A-Za-z0-9_-]{22})$/.exec(String(k || ""));
  if (!m || !process.env.CRON_SECRET) return null;
  const a = Buffer.from(m[2]), b = Buffer.from(sig(m[1]));
  return a.length === b.length && timingSafeEqual(a, b) ? m[1] : null;
}
