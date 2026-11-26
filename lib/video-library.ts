/** Bibliothèque vidéo (rushes du fondateur) : fiches en table video_library, ou en JSON dans le bucket si la table n'existe pas encore. Serveur uniquement. */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { crmDatabase } from "./crm-agent";
import { BUCKET } from "./studio-video";

type Db = ReturnType<typeof crmDatabase>;
export const LIB_MAX_BYTES = 1100 * 1024 * 1024;
export const LIB_PREFIX = "library/";
const META = "library/_meta/";

export type LibStatus = "uploaded" | "analysing" | "analysed" | "error";
export type LibItem = {
  id: string; path: string; name: string; size: number; mime: string | null;
  duration: number | null; width: number | null; height: number | null; poster_path: string | null;
  status: LibStatus; analysis: Record<string, unknown> | null; transcript: Record<string, unknown> | null;
  has_client: boolean; consent: boolean; tags: string[]; error: string | null; uploaded_by: string | null;
  analysed_at: string | null; created_at: string; updated_at: string;
};

export const libId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const safeLibId = (v: unknown) => { const s = String(v || ""); return /^[a-z0-9]{8,24}$/.test(s) ? s : ""; };
export const safeName = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "video.mp4";
export const libPath = (id: string, name: string, d = new Date()) => `${LIB_PREFIX}${d.toISOString().slice(0, 7)}/${id}-${safeName(name)}`;

export function blankItem(p: Partial<LibItem> & { id: string; path: string }): LibItem {
  const now = new Date().toISOString();
  return {
    name: "", size: 0, mime: null, duration: null, width: null, height: null, poster_path: null, status: "uploaded", analysis: null, transcript: null,
    has_client: false, consent: false, tags: [], error: null, uploaded_by: null, analysed_at: null, created_at: now, updated_at: now, ...p,
  };
}

// ───────────── stockage des fiches (table, sinon JSON) ─────────────
let tableMissing: boolean | null = null;
const isMissing = (e: { code?: string; message?: string } | null) => !!e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message || ""));

async function hasTable(db: Db) {
  if (tableMissing !== null) return !tableMissing;
  const { error } = await db.from("video_library").select("id").limit(1);
  tableMissing = isMissing(error);
  return !tableMissing;
}

async function readMeta(db: Db, id: string): Promise<LibItem | null> {
  const { data } = await db.storage.from(BUCKET).download(`${META}${id}.json`);
  if (!data) return null;
  try { return JSON.parse(await data.text()) as LibItem; } catch { return null; }
}

export async function getItem(db: Db, id: string): Promise<LibItem | null> {
  if (await hasTable(db)) {
    const { data } = await db.from("video_library").select("*").eq("id", id).maybeSingle();
    return (data as LibItem | null) || null;
  }
  return readMeta(db, id);
}

export async function saveItem(db: Db, item: LibItem) {
  item.updated_at = new Date().toISOString();
  if (await hasTable(db)) {
    const { error } = await db.from("video_library").upsert(item, { onConflict: "id" });
    if (error) throw new Error("Enregistrement impossible : " + error.message);
    return item;
  }
  const { error } = await db.storage.from(BUCKET).upload(`${META}${item.id}.json`, Buffer.from(JSON.stringify(item)), { contentType: "application/json", upsert: true });
  if (error) throw new Error("Enregistrement impossible : " + error.message);
  return item;
}

export async function patchItem(db: Db, id: string, patch: Partial<LibItem>) {
  const it = await getItem(db, id);
  if (!it) return null;
  return saveItem(db, { ...it, ...patch, id: it.id, path: it.path });
}

export async function listItems(db: Db, opts: { limit?: number; status?: LibStatus[] } = {}): Promise<LibItem[]> {
  const limit = opts.limit || 300;
  if (await hasTable(db)) {
    let q = db.from("video_library").select("*").order("created_at", { ascending: false }).limit(limit);
    if (opts.status?.length) q = q.in("status", opts.status);
    const { data } = await q;
    return (data as LibItem[] | null) || [];
  }
  const { data } = await db.storage.from(BUCKET).list(META.slice(0, -1), { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
  const files = (data || []).filter(f => f.name.endsWith(".json")).slice(0, limit);
  const out: LibItem[] = [];
  for (let i = 0; i < files.length; i += 20) {
    const chunk = await Promise.all(files.slice(i, i + 20).map(f => readMeta(db, f.name.replace(/\.json$/, ""))));
    out.push(...chunk.filter((x): x is LibItem => !!x));
  }
  return out.filter(x => !opts.status?.length || opts.status.includes(x.status)).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function deleteItem(db: Db, it: LibItem) {
  const files = [it.path, it.poster_path].filter((x): x is string => !!x);
  if (files.length) await db.storage.from(BUCKET).remove(files);
  if (await hasTable(db)) await db.from("video_library").delete().eq("id", it.id);
  else await db.storage.from(BUCKET).remove([`${META}${it.id}.json`]);
}

/** Fichiers présents dans le bucket mais jamais enregistrés (envoi terminé en arrière-plan, page fermée) : on crée leur fiche. */
export async function reconcile(db: Db, known: LibItem[]) {
  const have = new Set(known.map(k => k.path));
  const now = new Date(); const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const months = [now.toISOString().slice(0, 7), prev.toISOString().slice(0, 7)];
  const added: LibItem[] = [];
  for (const m of months) {
    const { data } = await db.storage.from(BUCKET).list(`${LIB_PREFIX}${m}`, { limit: 1000 });
    for (const f of data || []) {
      const path = `${LIB_PREFIX}${m}/${f.name}`;
      if (have.has(path) || !f.id || f.name.endsWith(".jpg")) continue;
      const id = safeLibId(f.name.split("-")[0]);
      if (!id) continue;
      const meta = (f.metadata || {}) as Record<string, unknown>;
      // Objet vide ou presque (envoi coupé) : jamais de fiche « à analyser » pour un fichier qui n'est pas arrivé.
      if ((Number(meta.size) || 0) < 64 * 1024) continue;
      const it = blankItem({ id, path, name: f.name.slice(id.length + 1), size: Number(meta.size) || 0, mime: String(meta.mimetype || "") || null, created_at: f.created_at || new Date().toISOString() });
      await saveItem(db, it).catch(() => null);
      added.push(it);
    }
  }
  return added;
}

// ───────────── tickets d'enregistrement (sans code d'accès, pour le service worker) ─────────────
const key = () => process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "neodrive";
const b64 = (s: string) => Buffer.from(s).toString("base64url");
export type Ticket = { id: string; path: string; name: string; size: number; mime: string; by: string; exp: number };
export function signTicket(t: Omit<Ticket, "exp">, hours = 48) {
  const body = b64(JSON.stringify({ ...t, exp: Date.now() + hours * 3600_000 }));
  return `${body}.${createHmac("sha256", key()).update(body).digest("base64url")}`;
}
export function readTicket(v: unknown): Ticket | null {
  const [body, sig] = String(v || "").split(".");
  if (!body || !sig) return null;
  const want = createHmac("sha256", key()).update(body).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try { const t = JSON.parse(Buffer.from(body, "base64url").toString()) as Ticket; return t.exp > Date.now() ? t : null; } catch { return null; }
}

// ───────────── import des vraies vidéos déjà envoyées pour les réseaux sociaux ─────────────
const SOCIAL_BUCKET = "social-media";
type SocialRow = { id: string; storage_path: string; title: string | null; media_type: string | null; created_at: string };

/** Copie (côté serveur, sans téléchargement) les vraies vidéos de la bibliothèque réseaux sociaux (social_media_assets, bucket
 * social-media) dans la bibliothèque vidéo pour qu'elles soient analysées et servent à la Fabrique. Une vidéo déjà présente
 * (même nom de fichier) n'est pas dupliquée ; une fiche dont le fichier est vide (envoi raté) est réparée avec cette copie.
 * Jamais les vidéos générées (dossier generated/, « Reel NeoDrive automatique »). */
export async function importSocialVideos(db: Db, opts: { max?: number; budgetMs?: number } = {}) {
  const t0 = Date.now(); const max = opts.max || 40; const budget = opts.budgetMs || 200000;
  const { data, error } = await db.from("social_media_assets").select("id,storage_path,title,media_type,created_at")
    .eq("status", "ready").order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error("Bibliothèque réseaux sociaux illisible : " + error.message);
  const rows = ((data || []) as SocialRow[]).filter(a => a.storage_path && !/^generated\//.test(a.storage_path) && /\.(mp4|mov|m4v)$/i.test(a.storage_path) && !/automatique/i.test(a.title || ""));
  const known = await listItems(db, { limit: 1000 });
  const byName = new Map(known.map(k => [k.name, k]));
  const seen = new Set<string>();
  const out = { copied: 0, repaired: 0, skipped: 0, errors: [] as string[], remaining: 0 };
  for (const a of rows) {
    const name = (a.title || a.storage_path.split("/").pop() || "video.mp4").slice(0, 140);
    if (seen.has(name)) continue; seen.add(name);
    const prev = byName.get(name);
    const i = a.storage_path.lastIndexOf("/");
    const { data: ls } = await db.storage.from(SOCIAL_BUCKET).list(a.storage_path.slice(0, i), { search: a.storage_path.slice(i + 1), limit: 5 });
    const src = (ls || []).find(x => x.name === a.storage_path.slice(i + 1));
    const size = Number((src?.metadata as Record<string, unknown> | null)?.size || 0);
    if (!src || size < 64 * 1024) continue;
    if (prev && prev.size >= size * 0.98 && prev.status !== "error") { out.skipped++; continue; }
    if (prev && prev.status === "analysed") { out.skipped++; continue; }
    if (out.copied + out.repaired >= max || Date.now() - t0 > budget) { out.remaining++; continue; }
    const id = prev?.id || libId(); const path = prev?.path || libPath(id, name, new Date(a.created_at));
    if (prev) await db.storage.from(BUCKET).remove([path]).catch(() => null);
    const { error: ce } = await db.storage.from(SOCIAL_BUCKET).copy(a.storage_path, path, { destinationBucket: BUCKET });
    if (ce && !/exists/i.test(ce.message || "")) { out.errors.push(`${name} : ${ce.message.slice(0, 80)}`); continue; }
    const base = prev || blankItem({ id, path, name, created_at: a.created_at, uploaded_by: "réseaux sociaux" });
    await saveItem(db, { ...base, size, mime: "video/mp4", status: "uploaded", error: null, analysis: null, transcript: null, analysed_at: null });
    if (prev) out.repaired++; else out.copied++;
  }
  return out;
}
