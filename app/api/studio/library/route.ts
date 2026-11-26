import { NextResponse } from "next/server";
import OpenAI from "openai";
import { authorizeSection, logSection } from "../../../../lib/access";
import { crmDatabase } from "../../../../lib/crm-agent";
import { BUCKET } from "../../../../lib/studio-video";
import { MAX_ATTEMPTS, analyseItem, attemptOf, permanentError, storedSize } from "../../../../lib/video-analysis";
import {
  LIB_MAX_BYTES, blankItem, deleteItem, getItem, libId, libPath, listItems, patchItem, readTicket, reconcile, safeLibId, saveItem, signTicket,
  type LibItem,
} from "../../../../lib/video-library";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = Record<string, unknown>;
type Db = ReturnType<typeof crmDatabase>;
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
/** Hôte de stockage direct (recommandé par Supabase pour les gros fichiers). */
const direct = (u: string) => u.replace(".supabase.co/storage/v1/", ".storage.supabase.co/storage/v1/");
/** Même URL via le site (réécriture /studio-upload → Supabase, voir next.config) : le Background Fetch de Chrome ne fait pas
 * de requête CORS préalable, un PUT vers un autre domaine y échoue ; un PUT vers le même domaine passe. */
const sameOrigin = (u: string) => { const i = u.indexOf("/object/upload/sign/"); return i < 0 ? null : "/studio-upload/" + u.slice(i + "/object/upload/sign/".length); };

let bucketReady = false;
async function ensureBucket(db: Db) {
  if (bucketReady) return;
  const { data, error } = await db.storage.getBucket(BUCKET);
  if (error || !data) await db.storage.createBucket(BUCKET, { public: false, fileSizeLimit: LIB_MAX_BYTES });
  else if ((data.file_size_limit || 0) < LIB_MAX_BYTES) await db.storage.updateBucket(BUCKET, { public: false, fileSizeLimit: LIB_MAX_BYTES });
  bucketReady = true;
}

async function uploadSlot(db: Db, path: string) {
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new Error("Stockage indisponible : " + (error?.message || ""));
  return { signedUrl: direct(data.signedUrl), bgUrl: sameOrigin(data.signedUrl), token: data.token };
}

async function withUrls(db: Db, items: LibItem[]) {
  const posters = items.map(i => i.poster_path).filter((x): x is string => !!x);
  const signed = posters.length ? (await db.storage.from(BUCKET).createSignedUrls(posters, 60 * 60 * 6)).data || [] : [];
  const map = new Map(signed.map(s => [s.path, s.signedUrl]));
  return items.map(i => ({ ...i, transcript: undefined, posterUrl: i.poster_path ? map.get(i.poster_path) || null : null, hasTranscript: !!i.transcript }));
}

/** Analyse les vidéos en attente, une par une. On ne commence une nouvelle vidéo que si l'appel a encore le temps de la finir
 * (Vercel : 300 s) : sinon la fonction était coupée en pleine analyse et la vidéo restait bloquée « Analyse… ».
 * Les vidéos en erreur passagère (lecture, délai) sont reprises automatiquement, 3 essais au total. */
async function processQueue(db: Db, client: OpenAI, max = 3, startBudgetMs = 60000) {
  const t0 = Date.now(); const done: { id: string; ok: boolean; error?: string }[] = [];
  const stale = Date.now() - 12 * 60000;
  const all = await listItems(db, { status: ["uploaded", "analysing", "error"], limit: 400 });
  const todo: LibItem[] = [];
  for (const i of all) {
    if (i.status === "uploaded") { todo.push(i); continue; }
    if (i.status === "analysing" && new Date(i.updated_at).getTime() >= stale) continue;
    if (i.status === "error" && (permanentError(i.error) || new Date(i.updated_at).getTime() >= Date.now() - 10 * 60000)) continue;
    if (attemptOf(i) >= MAX_ATTEMPTS) {
      if (i.status === "analysing") await patchItem(db, i.id, { status: "error", error: "Analyse trop longue (3 essais) : raccourcissez la vidéo ou renvoyez-la." }).catch(() => null);
      continue;
    }
    todo.push(i);
  }
  todo.sort((a, b) => (a.status === "uploaded" ? 0 : 1) - (b.status === "uploaded" ? 0 : 1) || a.created_at.localeCompare(b.created_at));
  for (const it of todo) {
    if (done.length >= max || Date.now() - t0 > startBudgetMs) break;
    try { await analyseItem(db, client, it); done.push({ id: it.id, ok: true }); }
    catch (e) { const m = (e as Error).message.slice(0, 200); await patchItem(db, it.id, { status: "error", error: m }).catch(() => null); done.push({ id: it.id, ok: false, error: m }); }
  }
  return { done, remaining: Math.max(0, todo.length - done.length) };
}

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

/** Bibliothèque vidéo (section « contenu ») : envois directs navigateur → Supabase, fiches, vignettes, consentement. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Body;
  const action = String(b.action || "");
  const db = crmDatabase();

  // Enregistrement après envoi : accepté avec un ticket signé (service worker, page fermée) sans code d'accès.
  if (action === "register" || action === "retoken") {
    const t = readTicket(b.ticket);
    if (!t) return fail("Ticket invalide ou expiré", 401);
    try {
      if (action === "retoken") return NextResponse.json({ ok: true, ...(await uploadSlot(db, t.path)), path: t.path });
      const { data: exists } = await db.storage.from(BUCKET).exists(t.path);
      if (!exists) return fail("Fichier absent du stockage : l’envoi n’est pas terminé.", 409);
      // Fichier coupé pendant l'envoi (réseau, arrière-plan) : refusé ici pour que le téléphone le renvoie, au lieu d'une « vidéo illisible » plus tard.
      const got = await storedSize(db, t.path).catch(() => -1);
      if (t.size && got >= 0 && got < t.size * 0.98) return fail(`Envoi incomplet (${Math.round(got / 1048576)} Mo reçus sur ${Math.round(t.size / 1048576)} Mo) : la vidéo va être renvoyée.`, 409);
      const prev = await getItem(db, t.id);
      const posterPath = typeof b.poster === "string" && b.poster === `${t.path}.jpg` ? b.poster : null;
      const it = prev || blankItem({ id: t.id, path: t.path, name: t.name, size: t.size, mime: t.mime || null, uploaded_by: t.by });
      Object.assign(it, {
        duration: num(b.duration) ?? it.duration, width: num(b.width) ?? it.width, height: num(b.height) ?? it.height,
        poster_path: posterPath || it.poster_path,
      });
      await saveItem(db, it);
      return NextResponse.json({ ok: true, item: it });
    } catch (e) { return fail("Erreur : " + (e as Error).message.slice(0, 200), 500); }
  }

  const acc = await authorizeSection(req, b.passcode, "contenu");
  if (!acc) return fail("Code incorrect", 401);

  try {
    if (action === "init") {
      const files = (Array.isArray(b.files) ? b.files as Body[] : []).slice(0, 50);
      if (!files.length) return fail("Aucun fichier");
      await ensureBucket(db);
      const out = [];
      for (const f of files) {
        const name = String(f.name || "video.mp4").slice(0, 140); const size = Number(f.size) || 0;
        const mime = String(f.type || "video/mp4").slice(0, 60);
        if (size > LIB_MAX_BYTES) { out.push({ name, error: `Trop lourde (${Math.round(size / 1048576)} Mo) : 1 100 Mo maximum.` }); continue; }
        if (mime && !mime.startsWith("video/")) { out.push({ name, error: "Ce n’est pas une vidéo." }); continue; }
        const id = libId(); const path = libPath(id, name);
        const [slot, poster] = await Promise.all([uploadSlot(db, path), uploadSlot(db, `${path}.jpg`)]);
        out.push({ name, id, path, signedUrl: slot.signedUrl, bgUrl: slot.bgUrl, token: slot.token, poster: { path: `${path}.jpg`, signedUrl: poster.signedUrl }, ticket: signTicket({ id, path, name, size, mime, by: acc.name }) });
      }
      return NextResponse.json({ ok: true, bucket: BUCKET, files: out });
    }

    if (action === "queue") {
      const key = process.env.OPENAI_API_KEY; if (!key) return fail("Clé IA absente", 503);
      const q = await processQueue(db, new OpenAI({ apiKey: key }), Math.min(5, Number(b.max) || 2), 45000);
      return NextResponse.json({ ok: true, ...q });
    }

    if (action === "list") {
      let items = await listItems(db, { limit: 400 });
      if (b.reconcile !== false) { const added = await reconcile(db, items).catch(() => []); if (added.length) items = [...added, ...items].sort((x, y) => y.created_at.localeCompare(x.created_at)); }
      return NextResponse.json({ ok: true, items: await withUrls(db, items) });
    }

    if (action === "retry_errors") {
      // Remet en file les vidéos en erreur (sauf envoi incomplet : il faut renvoyer le fichier).
      const errs = (await listItems(db, { status: ["error"], limit: 400 })).filter(i => !/^(Envoi incomplet|Fichier vide)/.test(i.error || ""));
      for (const i of errs) await patchItem(db, i.id, { status: "uploaded", error: null }).catch(() => null);
      await logSection(acc, "studio_library_retry", { n: errs.length });
      return NextResponse.json({ ok: true, requeued: errs.length });
    }

    const id = safeLibId(b.id);
    if (!id) return fail("Vidéo manquante");
    const it = await getItem(db, id);
    if (!it) return fail("Vidéo introuvable", 404);

    if (action === "get") {
      const { data } = await db.storage.from(BUCKET).createSignedUrl(it.path, 60 * 60 * 6);
      return NextResponse.json({ ok: true, item: { ...(await withUrls(db, [it]))[0], transcript: it.transcript }, url: data?.signedUrl || null });
    }
    if (action === "analyse") {
      const key = process.env.OPENAI_API_KEY; if (!key) return fail("Clé IA absente", 503);
      try {
        const next = await analyseItem(db, new OpenAI({ apiKey: key }), { ...it, error: null });
        await logSection(acc, "studio_library_analyse", { id });
        return NextResponse.json({ ok: true, item: { ...(await withUrls(db, [next]))[0] } });
      } catch (e) {
        const m = (e as Error).message.slice(0, 200);
        await patchItem(db, id, { status: "error", error: m }).catch(() => null);
        return fail("Analyse impossible : " + m, 500);
      }
    }
    if (action === "update") {
      const patch: Partial<LibItem> = {};
      if (typeof b.consent === "boolean") patch.consent = b.consent;
      if (typeof b.has_client === "boolean") patch.has_client = b.has_client;
      if (Array.isArray(b.tags)) patch.tags = (b.tags as unknown[]).map(t => String(t).trim().toLowerCase().slice(0, 30)).filter(Boolean).slice(0, 20);
      const next = await patchItem(db, id, patch);
      return NextResponse.json({ ok: true, item: next ? (await withUrls(db, [next]))[0] : null });
    }
    if (action === "delete") {
      await deleteItem(db, it);
      await logSection(acc, "studio_library_delete", { id });
      return NextResponse.json({ ok: true });
    }
    return fail("Action inconnue");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[studio-library]", action, msg.slice(0, 500));
    return fail("Erreur : " + msg.slice(0, 200), 500);
  }
}

/** Tâche planifiée (Vercel Cron, Authorization: Bearer CRON_SECRET) : analyse les vidéos en attente. */
export async function GET(req: Request) {
  const acc = await authorizeSection(req, null, "contenu");
  if (!acc) return fail("Non autorisé", 401);
  const key = process.env.OPENAI_API_KEY; if (!key) return fail("Clé IA absente", 503);
  try { return NextResponse.json({ ok: true, ...(await processQueue(crmDatabase(), new OpenAI({ apiKey: key }), 4, 60000)) }); }
  catch (e) { return fail("Erreur : " + (e as Error).message.slice(0, 200), 500); }
}
