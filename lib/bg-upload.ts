/**
 * Envoi de gros fichiers depuis le navigateur, réutilisable sur toute page d'envoi (vidéos, CV, tickets…). Client uniquement.
 *
 * ⚠️ Bibliothèque vidéo : NE PAS utiliser l'arrière-plan pour des vidéos de la galerie. Le 26/11/2026, 55 vidéos (2 Go) envoyées
 *    ainsi depuis Android sont toutes arrivées VIDES (0 octet, en quelques secondes) : le corps des requêtes n'a jamais été envoyé.
 *    On envoie dans la page en TUS reprenable (morceaux de 6 Mo), qui reprend où il s'était arrêté.
 * 1. Arrière-plan (Chrome Android) : Background Fetch depuis le service worker /studio-sw.js. L'envoi continue page fermée,
 *    écran verrouillé ou appli changée ; le système affiche une notification de progression. Quand chaque fichier est arrivé,
 *    le service worker appelle lui-même l'URL d'enregistrement (`register`) avec le corps prévu (ticket signé, sans code d'accès).
 * 2. Sinon : envoi dans la page (TUS reprenable si `tus` est fourni, sinon PUT simple), plusieurs fichiers en parallèle,
 *    nouvelles tentatives automatiques et maintien de l'écran allumé (Wake Lock) si disponible.
 *
 * Les fichiers partagés depuis la galerie (Web Share Target du manifeste) sont rangés par le service worker dans le cache
 * « nd-share » : `takeSharedFiles()` les récupère.
 */
import * as tus from "tus-js-client";

export const SW_URL = "/studio-sw.js";
export const SW_SCOPE = "/studio/";
const IDB = "nd-bg-upload", STORE = "batches", CHANNEL = "nd-bg-upload";

export type UploadJob = {
  key: string;
  file: File;
  /** URL PUT signée (corps brut). */
  putUrl: string;
  /** URL PUT du même domaine pour l'arrière-plan (Chrome n'y fait pas de requête CORS préalable). Par défaut : putUrl. */
  bgUrl?: string | null;
  contentType?: string;
  headers?: Record<string, string>;
  /** Envoi reprenable dans la page (Supabase TUS signé). */
  tus?: { endpoint: string; token: string; bucket: string; path: string };
  /** Appelé (POST JSON) une fois le fichier arrivé, par la page ou par le service worker. */
  register?: { url: string; body: Record<string, unknown> };
  /** Nouveau jeton juste avant (re)tentative dans la page : les jetons signés expirent. */
  refresh?: () => Promise<{ putUrl: string; token: string }>;
};
export type JobStatus = "queued" | "uploading" | "registering" | "done" | "error";
export type JobState = { key: string; status: JobStatus; sent: number; total: number; error?: string; attempt?: number };
export type Mode = "background" | "page";
type StoredItem = { key: string; url: string; register?: UploadJob["register"]; name: string; size: number };
export type StoredBatch = { id: string; created: number; page: string; items: StoredItem[]; results?: Record<string, "done" | "error">; finished?: boolean };

type BgRecord = { request: Request; responseReady: Promise<Response> };
type BgRegistration = EventTarget & {
  id: string; uploadTotal: number; uploaded: number; downloadTotal: number; downloaded: number;
  result: "" | "success" | "failure"; failureReason: string; recordsAvailable: boolean;
  matchAll(): Promise<BgRecord[]>; abort(): Promise<boolean>;
};
type BgManager = {
  fetch(id: string, requests: Request[], opts?: { title?: string; icons?: { src: string; sizes?: string; type?: string }[]; downloadTotal?: number }): Promise<BgRegistration>;
  get(id: string): Promise<BgRegistration | undefined>; getIds(): Promise<string[]>;
};
const bgOf = (reg: ServiceWorkerRegistration | null) => (reg as unknown as { backgroundFetch?: BgManager } | null)?.backgroundFetch || null;

// ───────────── IndexedDB (partagé avec le service worker) ─────────────
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: "id" }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbDo<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await idb();
  return new Promise((res, rej) => { const t = db.transaction(STORE, mode); const q = fn(t.objectStore(STORE)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
export const getBatch = (id: string) => idbDo<StoredBatch | undefined>("readonly", s => s.get(id) as IDBRequest<StoredBatch | undefined>).catch(() => undefined);
export const allBatches = () => idbDo<StoredBatch[]>("readonly", s => s.getAll() as IDBRequest<StoredBatch[]>).catch(() => [] as StoredBatch[]);
export const dropBatch = (id: string) => idbDo("readwrite", s => s.delete(id)).catch(() => undefined);
const putBatch = (b: StoredBatch) => idbDo("readwrite", s => s.put(b));

// ───────────── service worker et détection ─────────────
let swPromise: Promise<ServiceWorkerRegistration | null> | null = null;
export function registerUploadWorker() {
  if (swPromise) return swPromise;
  swPromise = (async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
    try {
      await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
      const ready = navigator.serviceWorker.ready;
      return await Promise.race([ready, new Promise<null>(r => setTimeout(() => r(null), 8000))]);
    } catch { return null; }
  })();
  return swPromise;
}
/** Vrai si l'envoi peut continuer page fermée (Background Fetch disponible). */
export async function backgroundSupported() {
  if (typeof window === "undefined" || !("BackgroundFetchManager" in window)) return false;
  return !!bgOf(await registerUploadWorker());
}

/** Lance un lot en arrière-plan. Lève une erreur si le navigateur refuse (on bascule alors sur l'envoi dans la page). */
export async function startBackground(opts: { id: string; title: string; jobs: UploadJob[]; page?: string; icon?: string }) {
  const reg = await registerUploadWorker();
  const bg = bgOf(reg);
  if (!bg) throw new Error("Envoi en arrière-plan indisponible");
  const requests = opts.jobs.map(j => new Request(j.bgUrl ? new URL(j.bgUrl, location.href).href : j.putUrl, {
    method: "PUT", body: j.file,
    headers: { "content-type": j.contentType || j.file.type || "application/octet-stream", "x-upsert": "true", "cache-control": "max-age=3600", ...(j.headers || {}) },
  }));
  await putBatch({ id: opts.id, created: Date.now(), page: opts.page || location.pathname, items: opts.jobs.map((j, i) => ({ key: j.key, url: requests[i].url, register: j.register, name: j.file.name, size: j.file.size })) });
  try {
    const icons = [{ src: opts.icon || "/studio-icon-192.png", sizes: "192x192", type: "image/png" }];
    return await bg.fetch(opts.id, requests, { title: opts.title, icons });
  } catch (e) { await dropBatch(opts.id); throw e; }
}

export type BgProgress = { id: string; sent: number; total: number; result: "" | "success" | "failure"; done: Set<string>; failed: Set<string> };
/** Suit les lots en cours (progression globale, fichiers terminés) et les résultats envoyés par le service worker. */
export async function watchBackground(onUpdate: (p: BgProgress) => void) {
  const reg = await registerUploadWorker(); const bg = bgOf(reg);
  const stops: (() => void)[] = [];
  const follow = async (r: BgRegistration) => {
    const batch = await getBatch(r.id); if (!batch) return;
    const done = new Set<string>(), failed = new Set<string>();
    const emit = () => onUpdate({ id: r.id, sent: r.uploaded, total: r.uploadTotal, result: r.result, done, failed });
    const h = () => emit(); r.addEventListener("progress", h); stops.push(() => r.removeEventListener("progress", h));
    emit();
    r.matchAll().then(recs => recs.forEach(rec => {
      const it = batch.items.find(x => x.url === rec.request.url); if (!it) return;
      rec.responseReady.then(resp => { (resp.ok ? done : failed).add(it.key); emit(); }).catch(() => { failed.add(it.key); emit(); });
    })).catch(() => null);
  };
  if (bg) for (const id of await bg.getIds().catch(() => [] as string[])) { const r = await bg.get(id); if (r) follow(r); }
  let ch: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = e => {
      const d = e.data as { type?: string; id?: string; results?: Record<string, string> };
      if (d?.type !== "batch" || !d.id) return;
      const done = new Set(Object.entries(d.results || {}).filter(([, v]) => v === "done").map(([k]) => k));
      const failed = new Set(Object.entries(d.results || {}).filter(([, v]) => v !== "done").map(([k]) => k));
      onUpdate({ id: d.id, sent: 0, total: 0, result: failed.size ? "failure" : "success", done, failed });
    };
  }
  return {
    follow: async (id: string) => { const r = await bg?.get(id); if (r) await follow(r); },
    stop: () => { stops.forEach(f => f()); ch?.close(); },
  };
}

// ───────────── envoi dans la page (secours) ─────────────
/** Garde l'écran allumé tant que `release` n'est pas appelé (reprend après un retour sur la page). */
export async function keepAwake() {
  type WL = { release(): Promise<void> };
  const nav = navigator as unknown as { wakeLock?: { request(t: "screen"): Promise<WL> } };
  if (!nav.wakeLock) return { supported: false, release: () => {} };
  let lock: WL | null = null; let on = true;
  const take = async () => { try { lock = await nav.wakeLock!.request("screen"); } catch { lock = null; } };
  const vis = () => { if (on && document.visibilityState === "visible") take(); };
  await take(); document.addEventListener("visibilitychange", vis);
  return { supported: true, release: () => { on = false; document.removeEventListener("visibilitychange", vis); lock?.release().catch(() => null); } };
}

function putXhr(url: string, file: File, headers: Record<string, string>, onProgress: (n: number) => void, signal?: AbortSignal) {
  return new Promise<void>((res, rej) => {
    const x = new XMLHttpRequest(); x.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) x.setRequestHeader(k, v);
    x.upload.onprogress = e => onProgress(e.loaded);
    x.onload = () => (x.status >= 200 && x.status < 300 ? res() : rej(new Error(`Erreur ${x.status} ${x.responseText.slice(0, 120)}`)));
    x.onerror = () => rej(new Error("Connexion perdue")); x.onabort = () => rej(new Error("Annulé"));
    signal?.addEventListener("abort", () => x.abort());
    x.send(file);
  });
}
function putTus(job: UploadJob, token: string, onProgress: (n: number) => void, signal?: AbortSignal) {
  const t = job.tus!;
  return new Promise<void>((res, rej) => {
    const up = new tus.Upload(job.file, {
      endpoint: t.endpoint, retryDelays: [0, 2000, 5000, 10000, 20000, 30000], headers: { "x-signature": token, "x-upsert": "true" },
      uploadDataDuringCreation: true, removeFingerprintOnSuccess: true, chunkSize: 6 * 1024 * 1024,
      // Reprise liée au chemin de destination (et pas seulement au fichier) : un envoi coupé reprend vers la même fiche.
      fingerprint: async () => `nd-tus:${t.bucket}/${t.path}:${job.file.size}`,
      metadata: { bucketName: t.bucket, objectName: t.path, contentType: job.contentType || job.file.type || "application/octet-stream", cacheControl: "3600" },
      onProgress: a => onProgress(a), onError: e => rej(new Error(String(e.message || "Envoi interrompu").slice(0, 160))), onSuccess: () => res(),
    });
    signal?.addEventListener("abort", () => { up.abort(true).catch(() => null); rej(new Error("Annulé")); });
    up.findPreviousUploads().then(p => { if (p.length) up.resumeFromPreviousUpload(p[0]); up.start(); }).catch(() => up.start());
  });
}

export async function registerJob(job: UploadJob) {
  if (!job.register) return;
  const r = await fetch(job.register.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(job.register.body) });
  const j = await r.json().catch(() => ({ ok: false }));
  if (!r.ok || !j.ok) throw new Error(j.error || `Enregistrement impossible (${r.status})`);
}

/** Envoie les fichiers dans la page, `parallel` à la fois, avec nouvelles tentatives. */
export async function uploadInPage(jobs: UploadJob[], opts: { parallel?: number; retries?: number; onState: (s: JobState) => void; signal?: AbortSignal }) {
  const queue = [...jobs]; const retries = opts.retries ?? 4; const started = Date.now();
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const total = job.file.size;
      for (let attempt = 1; ; attempt++) {
        if (opts.signal?.aborted) return;
        try {
          let token = job.tus?.token || "", url = job.putUrl;
          if (job.refresh && (attempt > 1 || Date.now() - started > 80 * 60000)) { const n = await job.refresh(); token = n.token; url = n.putUrl; }
          opts.onState({ key: job.key, status: "uploading", sent: 0, total, attempt });
          const prog = (n: number) => opts.onState({ key: job!.key, status: "uploading", sent: n, total, attempt });
          if (job.tus) await putTus(job, token, prog, opts.signal);
          else await putXhr(url, job.file, { "content-type": job.contentType || job.file.type || "application/octet-stream", "x-upsert": "true", ...(job.headers || {}) }, prog, opts.signal);
          opts.onState({ key: job.key, status: "registering", sent: total, total });
          await registerJob(job);
          opts.onState({ key: job.key, status: "done", sent: total, total });
          break;
        } catch (e) {
          if (opts.signal?.aborted) return;
          if (attempt > retries) { opts.onState({ key: job.key, status: "error", sent: 0, total, error: (e as Error).message }); break; }
          opts.onState({ key: job.key, status: "queued", sent: 0, total, error: `Nouvelle tentative (${attempt}/${retries})…` });
          await new Promise(r => setTimeout(r, Math.min(30000, 2000 * 2 ** attempt)));
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.parallel || 3) }, worker));
}

// ───────────── fichiers partagés depuis la galerie ─────────────
/** Récupère (et retire du cache) les fichiers reçus par le partage Android (« Partager → NeoDrive Studio »). */
export async function takeSharedFiles(): Promise<File[]> {
  if (typeof caches === "undefined") return [];
  try {
    const c = await caches.open("nd-share");
    const keys = await c.keys(); const out: File[] = [];
    for (const k of keys) {
      const r = await c.match(k); if (!r) continue;
      const blob = await r.blob();
      const name = decodeURIComponent(r.headers.get("x-name") || "video.mp4");
      out.push(new File([blob], name, { type: blob.type || r.headers.get("content-type") || "video/mp4", lastModified: Number(r.headers.get("x-modified")) || Date.now() }));
      await c.delete(k);
    }
    return out;
  } catch { return []; }
}

/** Durée, dimensions et vignette JPEG (≈ 1 s) lues par le navigateur. Tout est facultatif (vidéo non décodable → null). */
export function readVideoMeta(file: File, timeoutMs = 5000): Promise<{ duration: number | null; width: number | null; height: number | null; poster: Blob | null }> {
  return new Promise(res => {
    const v = document.createElement("video"); const url = URL.createObjectURL(file);
    let done = false; const meta = { duration: null as number | null, width: null as number | null, height: null as number | null };
    const end = (poster: Blob | null) => { if (done) return; done = true; clearTimeout(t); v.removeAttribute("src"); v.load(); URL.revokeObjectURL(url); res({ ...meta, poster }); };
    const t = setTimeout(() => end(null), timeoutMs);
    v.muted = true; v.playsInline = true; v.preload = "metadata";
    v.onloadedmetadata = () => {
      meta.duration = Number.isFinite(v.duration) ? Math.round(v.duration * 100) / 100 : null;
      meta.width = v.videoWidth || null; meta.height = v.videoHeight || null;
      v.currentTime = Math.min(1, (v.duration || 2) / 3);
    };
    v.onseeked = () => {
      try {
        const w = 270, h = Math.round(w * (v.videoHeight || 480) / (v.videoWidth || 270));
        const c = document.createElement("canvas"); c.width = w; c.height = Math.min(h, 600);
        c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
        c.toBlob(b => end(b), "image/jpeg", 0.72);
      } catch { end(null); }
    };
    v.onerror = () => end(null);
    v.src = url;
  });
}
