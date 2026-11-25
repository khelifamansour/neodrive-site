/** Analyse d'un rush de la bibliothèque : transcription mot à mot, images clés, description par l'IA (scène, client, meilleurs moments,
 * infos personnelles, accroches). La vidéo n'est jamais copiée entièrement sur le serveur : ffmpeg la lit par plages via un relais local. Serveur uniquement. */
import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { promisify } from "node:util";
import OpenAI, { toFile } from "openai";
import type { crmDatabase } from "./crm-agent";
import { BUCKET, ffmpegPath, probe, type Transcript } from "./studio-video";
import { saveItem, type LibItem } from "./video-library";

const run = promisify(execFile);
type Db = ReturnType<typeof crmDatabase>;
export const LIB_MODEL = () => process.env.OPENAI_LIBRARY_MODEL || "gpt-4.1-mini";

export type Moment = { start: number; end: number; why: string; kind: string; score: number };
export type Pii = { start: number; end: number; kind: string; label: string; visual: boolean };
export type Analysis = {
  summary: string;
  scenes: string[];
  founder_on_camera: boolean;
  client_present: boolean;
  setting: string;
  light: "jour" | "nuit" | "interieur" | "inconnu";
  quality: number;
  orientation: "vertical" | "horizontal" | "carre";
  car_visible: string[];
  topics: string[];
  best_moments: Moment[];
  pii: Pii[];
  hooks: string[];
  frames: { t: number; text: string }[];
  model: string;
};

/** Relais HTTP local (127.0.0.1) vers une URL signée : ffmpeg lit avec des requêtes par plages, Node gère DNS et TLS. */
export async function relay(url: string): Promise<{ local: string; close: () => void }> {
  const server: Server = createServer(async (req, res) => {
    try {
      const headers: Record<string, string> = {};
      if (req.headers.range) headers.range = String(req.headers.range);
      const r = await fetch(url, { method: req.method === "HEAD" ? "HEAD" : "GET", headers });
      const out: Record<string, string> = { "accept-ranges": "bytes" };
      for (const k of ["content-length", "content-range", "content-type"]) { const v = r.headers.get(k); if (v) out[k] = v; }
      res.writeHead(r.status, out);
      if (req.method === "HEAD" || !r.body) { res.end(); return; }
      const s = Readable.fromWeb(r.body as unknown as WebReadableStream);
      s.on("error", () => res.destroy()); res.on("close", () => s.destroy());
      s.pipe(res);
    } catch { res.writeHead(502); res.end(); }
  });
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  return { local: `http://127.0.0.1:${port}/v`, close: () => server.close() };
}

async function ff(args: string[], timeout = 150000) {
  await run(await ffmpegPath(), ["-y", "-hide_banner", "-loglevel", "error", ...args], { timeout, maxBuffer: 8 * 1024 * 1024 });
}

export async function transcribe(client: OpenAI, input: string, dir: string, duration: number): Promise<Transcript> {
  const mp3 = path.join(dir, "audio.mp3");
  await ff(["-i", input, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", "-t", String(Math.min(duration || 5400, 5400)), mp3], 200000);
  const buf = await readFile(mp3);
  if (buf.length < 2000) return { text: "", words: [], segments: [] };
  const tr = await client.audio.transcriptions.create({ file: await toFile(buf, "audio.mp3"), model: "whisper-1", language: "fr", response_format: "verbose_json", timestamp_granularities: ["word", "segment"] });
  return {
    text: tr.text || "",
    words: (tr.words || []).map(w => ({ w: w.word, s: Math.round(w.start * 100) / 100, e: Math.round(w.end * 100) / 100 })),
    segments: (tr.segments || []).map(s => ({ s: Math.round(s.start * 100) / 100, e: Math.round(s.end * 100) / 100, t: s.text.trim() })),
  };
}

/** Images clés réparties sur la vidéo (JPEG 512 px). */
export async function sampleFrames(input: string, dir: string, duration: number, n = 8) {
  const D = Math.max(1, duration);
  const times = Array.from({ length: n }, (_, i) => Math.round((D * (i + 0.5) / n) * 10) / 10);
  const out: { t: number; jpg: Buffer }[] = [];
  await Promise.all(times.map(async (t, i) => {
    const f = path.join(dir, `f${i}.jpg`);
    try { await ff(["-ss", String(t), "-i", input, "-frames:v", "1", "-vf", "scale='if(gt(iw,ih),512,-2)':'if(gt(iw,ih),-2,512)'", "-q:v", "5", f], 60000); out.push({ t, jpg: await readFile(f) }); } catch { /* image illisible */ }
  }));
  return out.sort((a, b) => a.t - b.t);
}

const clamp = (v: unknown, a: number, b: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
const str = (v: unknown, m = 200) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, m);
const strs = (v: unknown, n: number, m = 80) => (Array.isArray(v) ? v : []).map(x => str(x, m)).filter(Boolean).slice(0, n);

export async function describe(client: OpenAI, frames: { t: number; jpg: Buffer }[], tr: Transcript, meta: { duration: number; width: number; height: number; name: string }): Promise<Analysis> {
  const D = meta.duration;
  const words = tr.words.map((w, i) => `${i}|${w.s.toFixed(1)}|${w.w}`).join(" ").slice(0, 40000);
  const instructions = `Tu analyses un rush vidéo de NeoDrive (vendeur français de voitures sans permis électriques, fondateur Mansour) pour fabriquer ensuite des vidéos TikTok.
On te donne ${frames.length} images clés (avec leur temps en secondes) et la transcription mot à mot « index|temps|mot ».
Réponds uniquement en json :
{"summary":"2 phrases en français : ce qu'on voit et ce qui se dit",
 "scenes":["étiquettes parmi : fondateur-face-camera, client, livraison, remise-des-cles, remorque, camion, voiture-exterieur, voiture-interieur, conduite, entrepot, conteneur, atelier, salon, rue, autre"],
 "founder_on_camera":bool (un homme qui parle face caméra comme vendeur/fondateur),
 "client_present":bool (une personne qui n'est pas de l'équipe est reconnaissable : visage, voix de client, remise des clés),
 "setting":"lieu en quelques mots", "light":"jour|nuit|interieur|inconnu", "quality":1 à 5 (netteté, stabilité, son),
 "car_visible":["couleurs/vues de la voiture visibles"], "topics":["sujets abordés : prix, financement, livraison, autonomie, permis AM, recharge, témoignage…"],
 "best_moments":[{"start":s,"end":s,"why":"pourquoi c'est fort","kind":"accroche|preuve|emotion|demonstration|explication|plan-de-coupe","score":1 à 5}] 2 à 6 moments de 2 à 20 s, temps entre 0 et ${D.toFixed(1)}, collés aux phrases de la transcription,
 "pii":[{"start":s,"end":s,"kind":"adresse|ville|telephone|nom|plaque|visage-client|autre","label":"description courte","visual":bool}] : passages parlés révélant une adresse, une ville de domicile, un nom de famille, un téléphone ; plaques d'immatriculation ou documents lisibles à l'image (visual=true, start/end autour de l'image concernée). Jamais NeoDrive, les modèles (Essentielle, Confort, Confort Plus), les prix,
 "hooks":["3 accroches TikTok courtes (moins de 12 mots) inspirées de ce rush, factuelles, sans chiffre inventé"],
 "frames":[{"t":temps,"text":"ce que montre l'image en 8 mots"}]}`;
  const content: OpenAI.Responses.ResponseInputContent[] = [
    { type: "input_text", text: `Fichier : ${meta.name}. Durée : ${D.toFixed(1)} s. Format : ${meta.width}x${meta.height}.\nTranscription :\n${words || "(aucune parole)"}\nRéponds en json.` },
    ...frames.flatMap(f => [
      { type: "input_text" as const, text: `Image à ${f.t} s :` },
      { type: "input_image" as const, image_url: `data:image/jpeg;base64,${f.jpg.toString("base64")}`, detail: "low" as const },
    ]),
  ];
  const r = await client.responses.create({ model: LIB_MODEL(), instructions, input: [{ role: "user", content }], text: { format: { type: "json_object" } }, max_output_tokens: 3000 });
  const j = JSON.parse(r.output_text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "")) as Record<string, unknown>;
  const range = (o: Record<string, unknown>) => { const s = clamp(o.start, 0, D, 0), e = clamp(o.end, 0, D, 0); return e - s >= 0.3 ? [Math.round(s * 10) / 10, Math.round(e * 10) / 10] : null; };
  const moments = (Array.isArray(j.best_moments) ? j.best_moments as Record<string, unknown>[] : []).map(m => { const r2 = range(m); return r2 ? { start: r2[0], end: r2[1], why: str(m.why, 200), kind: str(m.kind, 30) || "explication", score: clamp(m.score, 1, 5, 3) } : null; }).filter(Boolean).slice(0, 8) as Moment[];
  const pii = (Array.isArray(j.pii) ? j.pii as Record<string, unknown>[] : []).map(m => { const r2 = range(m) || (Number.isFinite(Number(m.start)) ? [clamp(m.start, 0, D, 0), Math.min(D, clamp(m.start, 0, D, 0) + 1)] : null); return r2 ? { start: r2[0], end: r2[1], kind: str(m.kind, 30) || "autre", label: str(m.label, 120), visual: m.visual === true } : null; }).filter(Boolean).slice(0, 40) as Pii[];
  const light = ["jour", "nuit", "interieur"].includes(String(j.light)) ? j.light as Analysis["light"] : "inconnu";
  const ratio = meta.width && meta.height ? meta.width / meta.height : 0.56;
  return {
    summary: str(j.summary, 600), scenes: strs(j.scenes, 12, 40), founder_on_camera: j.founder_on_camera === true, client_present: j.client_present === true,
    setting: str(j.setting, 120), light, quality: clamp(j.quality, 1, 5, 3), orientation: ratio < 0.9 ? "vertical" : ratio > 1.1 ? "horizontal" : "carre",
    car_visible: strs(j.car_visible, 8), topics: strs(j.topics, 12, 40), best_moments: moments, pii, hooks: strs(j.hooks, 5, 140),
    frames: (Array.isArray(j.frames) ? j.frames as Record<string, unknown>[] : []).map(f => ({ t: clamp(f.t, 0, D, 0), text: str(f.text, 100) })).slice(0, 12),
    model: LIB_MODEL(),
  };
}

/** Analyse complète d'une fiche (met à jour status, transcript, analysis, has_client, poster). */
export async function analyseItem(db: Db, client: OpenAI, it: LibItem): Promise<LibItem> {
  await saveItem(db, { ...it, status: "analysing", error: null });
  const dir = path.join(tmpdir(), "studio-library", it.id);
  await mkdir(dir, { recursive: true });
  const { data } = await db.storage.from(BUCKET).createSignedUrl(it.path, 60 * 60);
  if (!data?.signedUrl) throw new Error("Vidéo introuvable dans le stockage");
  const rl = await relay(data.signedUrl);
  try {
    const info = await probe(rl.local);
    if (!info.hasVideo || !info.duration) throw new Error("Vidéo illisible");
    const meta = { duration: Math.round(info.duration * 100) / 100, width: info.width, height: info.height, name: it.name };
    const [tr, frames] = await Promise.all([
      info.hasAudio ? transcribe(client, rl.local, dir, meta.duration) : Promise.resolve<Transcript>({ text: "", words: [], segments: [] }),
      sampleFrames(rl.local, dir, meta.duration, meta.duration > 120 ? 10 : 8),
    ]);
    if (!frames.length) throw new Error("Aucune image lisible (format non pris en charge)");
    const analysis = await describe(client, frames, tr, meta);
    let poster = it.poster_path;
    if (!poster) {
      const best = frames[Math.min(1, frames.length - 1)];
      const p = `${it.path}.jpg`;
      const { error } = await db.storage.from(BUCKET).upload(p, best.jpg, { contentType: "image/jpeg", upsert: true });
      if (!error) poster = p;
    }
    const next: LibItem = {
      ...it, ...meta, name: it.name, poster_path: poster, status: "analysed", error: null, analysed_at: new Date().toISOString(),
      transcript: tr as unknown as Record<string, unknown>, analysis: analysis as unknown as Record<string, unknown>,
      has_client: it.has_client || analysis.client_present,
      tags: Array.from(new Set([...(it.tags || []), ...analysis.scenes])).slice(0, 20),
    };
    return await saveItem(db, next);
  } finally {
    rl.close();
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
}
