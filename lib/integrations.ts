import { createClient } from "@supabase/supabase-js";
import { readJson, writeJson, dataClient } from "./datastore";

/**
 * Accès (jetons) enregistrés depuis la page privée /connexions.
 * Stockés dans le stockage privé Supabase (lisible uniquement avec la clé serveur),
 * ils priment sur les variables Vercel. Aucun jeton n'est jamais renvoyé au navigateur.
 */
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
export const INTEGRATIONS_BUCKET = "erp-documents";
export const INTEGRATIONS_PATH = "integrations/connexions.json";
export const MANAGED_KEYS = ["FACEBOOK_PAGE_ID", "FACEBOOK_PAGE_ACCESS_TOKEN", "INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_BUSINESS_ACCOUNT_ID", "RESEND_API_KEY", "CRM_FROM_EMAIL", "BREVO_API_KEY", "BREVO_SENDER_EMAIL"] as const;
export type ManagedKey = typeof MANAGED_KEYS[number];
export type StoredIntegrations = { values: Partial<Record<ManagedKey, string>>; meta: Record<string, unknown>; updated_at?: string };

let cache: { at: number; data: StoredIntegrations } | null = null;

export function serviceClient() {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return null;
  return createClient(SB, sk, { auth: { persistSession: false } });
}

export async function readIntegrations(force = false): Promise<StoredIntegrations> {
  if (!force && cache && Date.now() - cache.at < 5 * 60 * 1000) return cache.data;
  const empty: StoredIntegrations = { values: {}, meta: {} };
  const sb = dataClient();
  if (!sb) return empty;
  const parsed = await readJson<StoredIntegrations>(sb, INTEGRATIONS_PATH).catch(() => null);
  cache = { at: Date.now(), data: parsed ? { values: parsed.values || {}, meta: parsed.meta || {}, updated_at: parsed.updated_at } : empty };
  return cache.data;
}

export async function writeIntegrations(patch: Partial<Record<ManagedKey, string | null>>, meta: Record<string, unknown> = {}) {
  const sb = dataClient();
  if (!sb) throw new Error("Configuration serveur incomplète");
  const cur = await readIntegrations(true);
  const values = { ...cur.values };
  for (const [k, v] of Object.entries(patch)) { if (v === null || v === "") delete values[k as ManagedKey]; else values[k as ManagedKey] = v as string; }
  const next: StoredIntegrations = { values, meta: { ...cur.meta, ...meta }, updated_at: new Date().toISOString() };
  await writeJson(sb, INTEGRATIONS_PATH, next);
  cache = { at: Date.now(), data: next };
  await applyStoredSecrets(true);
  return next;
}

/** À appeler en tête des routes de publication / relance : injecte les accès enregistrés. */
export async function applyStoredSecrets(force = false) {
  const { values } = await readIntegrations(force);
  for (const k of MANAGED_KEYS) { const v = values[k]; if (v) process.env[k] = v; }
}

/** Vérifie un appel cron (en-tête Vercel) ou un code d'accès. */
export function isAuthorized(req: Request, passcode?: string) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}` || passcode === secret;
}
