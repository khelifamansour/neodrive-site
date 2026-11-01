import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Petit magasin de données JSON privé (bucket Supabase dédié « neodrive-data »).
 * Les écritures vérifient les erreurs : un échec remonte au lieu d'être silencieux.
 */
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
export const DATA_BUCKET = "neodrive-data";
let ensured = false;

export function dataClient(): SupabaseClient | null {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return sk ? createClient(SB, sk, { auth: { persistSession: false } }) : null;
}

async function ensure(sb: SupabaseClient) {
  if (ensured) return;
  const { error } = await sb.storage.createBucket(DATA_BUCKET, { public: false });
  if (error && !/exist/i.test(error.message)) console.error("[datastore] bucket", error.message);
  ensured = true;
}

export async function readJson<X>(sb: SupabaseClient, path: string): Promise<X | null> {
  await ensure(sb);
  const { data } = await sb.storage.from(DATA_BUCKET).download(path);
  if (!data) return null;
  try { return JSON.parse(await data.text()) as X; } catch { return null; }
}

export async function writeJson(sb: SupabaseClient, path: string, obj: unknown) {
  await ensure(sb);
  const { error } = await sb.storage.from(DATA_BUCKET).upload(path, new Blob([JSON.stringify(obj)], { type: "application/json" }), { contentType: "application/json", upsert: true });
  if (error) { console.error("[datastore] write", path, error.message); throw new Error("Enregistrement impossible : " + error.message); }
}

export async function listJson<X>(sb: SupabaseClient, folder: string): Promise<X[]> {
  await ensure(sb);
  const { data, error } = await sb.storage.from(DATA_BUCKET).list(folder, { limit: 1000 });
  if (error) { console.error("[datastore] list", folder, error.message); return []; }
  const files = (data || []).filter(f => f.name.endsWith(".json"));
  const out = await Promise.all(files.map(f => readJson<X>(sb, `${folder}/${f.name}`)));
  return out.filter(Boolean) as X[];
}

export async function removeJson(sb: SupabaseClient, paths: string[]) {
  await ensure(sb);
  const { error } = await sb.storage.from(DATA_BUCKET).remove(paths);
  if (error) throw new Error("Suppression impossible : " + error.message);
}
