import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { authorizeSection, logSection } from "../../../../lib/access";
import { crmDatabase } from "../../../../lib/crm-agent";
import {
  BUCKET, MAX_MB, MAX_SECONDS, PAD, VOICES, defaultPlan, describeChanges, extractAudio, outputDuration, probe, renderVideo, rid, sanitizePlan,
  type EditPlan, type Project, type Transcript,
} from "../../../../lib/studio-video";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = Record<string, unknown>;
type Db = ReturnType<typeof crmDatabase>;
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const MODEL = () => process.env.OPENAI_STUDIO_MODEL || "gpt-4.1";
const FACTS = `NeoDrive : voiture sans permis 100 % électrique, neuve, marque toulousaine. Prix TTC : Essentielle 3 990 €, Confort 4 990 €, Confort Plus 5 990 €. Réservation sans acompte, paiement à la livraison, livraison à domicile partout en France. 45 km/h, 2 places, dès 14 ans avec le permis AM.`;
const SCENARIOS: Record<string, string> = {
  livraison: "Livraison client : raconter la livraison du jour chez un client, la remise des clés, le plaisir du client.",
  temoignage: "Témoignage : mettre en valeur ce que le client vit et ressent avec sa voiture (sans inventer de citation).",
  modele: "Présentation du modèle : présenter la voiture visible dans la vidéo, ses atouts simples et le prix exact du modèle.",
  libre: "Libre : suivre la consigne du fondateur.",
};
const safeId = (v: unknown) => { const s = String(v || ""); return /^[a-z0-9]{6,20}$/.test(s) ? s : ""; };
const work = (id: string) => path.join(tmpdir(), "studio-video", id);

async function ensureBucket(db: Db) {
  const { error } = await db.storage.getBucket(BUCKET);
  if (!error) return;
  await db.storage.createBucket(BUCKET, { public: false, fileSizeLimit: `${MAX_MB + 50}MB` });
}
async function readProject(db: Db, id: string): Promise<Project | null> {
  const { data } = await db.storage.from(BUCKET).download(`projects/${id}.json`);
  if (!data) return null;
  try { return JSON.parse(await data.text()) as Project; } catch { return null; }
}
async function saveProject(db: Db, p: Project) {
  p.updated_at = new Date().toISOString();
  const { error } = await db.storage.from(BUCKET).upload(`projects/${p.id}.json`, Buffer.from(JSON.stringify(p)), { contentType: "application/json", upsert: true });
  if (error) throw new Error("Enregistrement impossible : " + error.message);
}
async function signed(db: Db, p: string, download?: string) {
  const { data } = await db.storage.from(BUCKET).createSignedUrl(p, 60 * 60 * 6, download ? { download } : undefined);
  return data?.signedUrl || null;
}
/** Copie locale de la vidéo source (réutilisée tant que l'instance reste chaude). */
async function localSource(db: Db, p: Project) {
  const dir = work(p.id); await mkdir(dir, { recursive: true });
  const file = path.join(dir, "source" + (path.extname(p.source.path) || ".mp4"));
  const st = await stat(file).catch(() => null);
  if (st && st.size === p.source.size) return file;
  const url = await signed(db, p.source.path);
  if (!url) throw new Error("Vidéo introuvable dans le stockage");
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error("Téléchargement de la vidéo impossible");
  await pipeline(Readable.fromWeb(r.body as unknown as WebReadableStream), createWriteStream(file));
  return file;
}
const pushHistory = (p: Project, prev: EditPlan) => { p.history = [...(p.history || []), prev].slice(-20); };
const samePlan = (a: EditPlan, b: EditPlan) => JSON.stringify(a) === JSON.stringify(b);

async function askJson(client: OpenAI, instructions: string, input: string, maxTokens = 2500) {
  const r = await client.responses.create({ model: MODEL(), instructions, input, text: { format: { type: "json_object" } }, max_output_tokens: maxTokens });
  const txt = r.output_text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(txt) as Record<string, unknown>;
}
const transcriptLines = (t: Transcript | null) => (t?.words || []).map((w, i) => `${i}|${w.s.toFixed(2)}-${w.e.toFixed(2)}|${w.w}`).join("\n");
/** Plan sans les champs techniques, pour l'IA. */
const planForAi = (p: EditPlan) => ({ ...p, voiceover: { enabled: p.voiceover.enabled, scenario: p.voiceover.scenario, text: p.voiceover.text, voice: p.voiceover.voice, duck: p.voiceover.duck } });

async function tts(client: OpenAI, db: Db, p: Project) {
  const vo = p.plan.voiceover;
  const instructions = "Parle en français de France, voix naturelle et chaleureuse, rythme posé, comme un vendeur sympathique qui raconte une livraison. Pas de ton publicitaire exagéré.";
  let buf: Buffer;
  try {
    const r = await client.audio.speech.create({ model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts", voice: vo.voice, input: vo.text, instructions, response_format: "mp3" });
    buf = Buffer.from(await r.arrayBuffer());
  } catch {
    const r = await client.audio.speech.create({ model: "tts-1", voice: vo.voice === "coral" ? "nova" : vo.voice, input: vo.text, response_format: "mp3" });
    buf = Buffer.from(await r.arrayBuffer());
  }
  const audioPath = `voix/${p.id}-${Date.now()}.mp3`;
  const { error } = await db.storage.from(BUCKET).upload(audioPath, buf, { contentType: "audio/mpeg", upsert: true });
  if (error) throw new Error("Enregistrement de la voix impossible");
  p.plan = { ...p.plan, voiceover: { ...vo, audioPath, audioText: vo.text } };
  return { audioPath, buf };
}

/** Studio vidéo (section « contenu ») : envoi, transcription, masquage des infos personnelles, instructions de montage, voix off et rendu 9:16. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Body;
  const acc = await authorizeSection(req, b.passcode, "contenu");
  if (!acc) return fail("Code incorrect", 401);
  const db = crmDatabase();
  const action = String(b.action || "");
  const key = process.env.OPENAI_API_KEY;
  const client = key ? new OpenAI({ apiKey: key }) : null;

  try {
    if (action === "init") {
      const size = Number(b.size) || 0; const name = String(b.name || "video.mp4").slice(0, 120);
      const ext = (/\.(mp4|mov|m4v)$/i.exec(name)?.[1] || "mp4").toLowerCase();
      if (size > MAX_MB * 1024 * 1024) return fail(`Vidéo trop lourde (${Math.round(size / 1048576)} Mo) : maximum ${MAX_MB} Mo.`);
      await ensureBucket(db);
      const id = Date.now().toString(36) + rid().slice(0, 4);
      const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(`sources/${id}.${ext}`);
      if (error || !data) return fail("Stockage indisponible : " + (error?.message || ""), 502);
      return NextResponse.json({ ok: true, id, bucket: BUCKET, path: data.path, token: data.token, maxSeconds: MAX_SECONDS });
    }

    if (action === "create") {
      const id = safeId(b.id); const src = String(b.path || "");
      if (!id || !src.startsWith(`sources/${id}.`)) return fail("Vidéo inconnue");
      if (!client) return fail("Clé IA absente", 503);
      const now = new Date().toISOString();
      const p: Project = { id, title: String(b.title || b.name || "Vidéo").slice(0, 120), created_at: now, updated_at: now, source: { path: src, name: String(b.name || "").slice(0, 120), size: Number(b.size) || 0, duration: 0, width: 0, height: 0, hasAudio: true }, transcript: null, detected: false, plan: defaultPlan(), history: [], renders: [] };
      const file = await localSource(db, p);
      p.source.size = (await stat(file)).size;
      const info = await probe(file);
      if (!info.hasVideo || !info.duration) return fail("Ce fichier n’est pas une vidéo lisible (mp4 ou mov).");
      if (info.duration > MAX_SECONDS + 1) {
        await db.storage.from(BUCKET).remove([src]); await rm(work(id), { recursive: true, force: true });
        return fail(`Vidéo de ${Math.round(info.duration)} s : le Studio accepte ${MAX_SECONDS} s maximum. Raccourcissez-la dans la galerie du téléphone puis renvoyez-la.`);
      }
      Object.assign(p.source, { duration: Math.round(info.duration * 100) / 100, width: info.width, height: info.height, hasAudio: info.hasAudio });
      if (info.hasAudio) {
        const mp3 = path.join(work(id), "audio.mp3");
        await extractAudio(file, mp3);
        const tr = await client.audio.transcriptions.create({ file: await toFile(await readFile(mp3), "audio.mp3"), model: "whisper-1", language: "fr", response_format: "verbose_json", timestamp_granularities: ["word", "segment"] });
        p.transcript = {
          text: tr.text || "",
          words: (tr.words || []).map(w => ({ w: w.word, s: Math.round(w.start * 100) / 100, e: Math.round(w.end * 100) / 100 })),
          segments: (tr.segments || []).map(s => ({ s: s.start, e: s.end, t: s.text.trim() })),
        };
      } else p.transcript = { text: "", words: [], segments: [] };
      await saveProject(db, p);
      await logSection(acc, "studio_video_import", { id, duration: p.source.duration });
      return NextResponse.json({ ok: true, project: p, sourceUrl: await signed(db, src) });
    }

    if (action === "list") {
      const [{ data: pj }, { data: rd }] = await Promise.all([
        db.storage.from(BUCKET).list("projects", { limit: 30, sortBy: { column: "created_at", order: "desc" } }),
        db.storage.from(BUCKET).list("renders", { limit: 60, sortBy: { column: "created_at", order: "desc" } }),
      ]);
      const projects = (await Promise.all((pj || []).filter(f => f.name.endsWith(".json")).slice(0, 15).map(f => readProject(db, f.name.replace(/\.json$/, "")))))
        .filter((p): p is Project => !!p).map(p => ({ id: p.id, title: p.title, created_at: p.created_at, duration: p.source.duration, renders: p.renders.length }));
      const files = (rd || []).filter(f => f.name.endsWith(".mp4"));
      const urls = files.length ? (await db.storage.from(BUCKET).createSignedUrls(files.map(f => `renders/${f.name}`), 60 * 60 * 6)).data || [] : [];
      const renders = files.map((f, i) => ({ name: f.name, created_at: f.created_at, size: Number((f.metadata as Record<string, unknown> | null)?.size) || 0, url: urls[i]?.signedUrl || null, project: f.name.split("-")[0] }));
      return NextResponse.json({ ok: true, projects, renders, maxSeconds: MAX_SECONDS, maxMb: MAX_MB });
    }

    const id = safeId(b.id);
    if (!id) return fail("Projet manquant");
    const p = await readProject(db, id);
    if (!p) return fail("Projet introuvable", 404);
    const D = p.source.duration;

    if (action === "get") {
      return NextResponse.json({ ok: true, project: p, sourceUrl: await signed(db, p.source.path), voiceUrl: p.plan.voiceover.audioPath ? await signed(db, p.plan.voiceover.audioPath) : null });
    }

    if (action === "detect") {
      if (!client) return fail("Clé IA absente", 503);
      const words = p.transcript?.words || [];
      let found: EditPlan["masks"] = [];
      if (words.length) {
        const j = await askJson(client, `Tu protèges la vie privée des clients de NeoDrive (vendeur français de voitures sans permis) dans des vidéos de livraison publiées sur TikTok.
On te donne la transcription mot par mot : « index|début-fin|mot ». Repère chaque passage qui révèle une information personnelle :
- "adresse" : nom de rue, avenue, chemin, lieu-dit, résidence, et le numéro de maison qui l'accompagne ;
- "ville" : nom de village ou de ville quand il permet de situer le domicile du client (avec une adresse, « chez … à X », « on est à X chez Madame … ») ; un département ou une région seuls ne sont pas à masquer ;
- "telephone" : numéro de téléphone (même partiel) ;
- "nom" : nom de famille d'un client ou d'un proche (« Madame Durand », « Monsieur Martin ») ; un prénom seul n'est pas à masquer ;
- "plaque" : plaque d'immatriculation ;
- "autre" : e-mail, date de naissance, numéro de dossier.
Ne masque jamais : NeoDrive, les noms des modèles (Essentielle, Confort, Confort Plus), les prix, les marques, les mots courants.
Réponds en json : {"items":[{"from":index du premier mot,"to":index du dernier mot,"kind":"adresse|ville|telephone|nom|plaque|autre","label":"description courte en français, ex. « Nom de rue »"}]}. Liste vide si rien n'est sensible.`, `Transcription :\n${transcriptLines(p.transcript)}\nRéponds en json.`, 2000);
        const items = Array.isArray(j.items) ? j.items as Record<string, unknown>[] : [];
        found = items.map(it => {
          const a = Math.max(0, Math.min(words.length - 1, Math.round(Number(it.from)))), z = Math.max(a, Math.min(words.length - 1, Math.round(Number(it.to))));
          if (!Number.isFinite(a) || !Number.isFinite(z)) return null;
          return { id: rid(), start: Math.max(0, words[a].s - PAD), end: Math.min(D, words[z].e + PAD), label: `${String(it.label || "Info personnelle").slice(0, 80)} : « ${words.slice(a, z + 1).map(w => w.w).join(" ").slice(0, 60)} »`, kind: String(it.kind || "autre"), source: "ia" as const, on: true };
        }).filter(Boolean) as EditPlan["masks"];
      }
      const prev = p.plan;
      p.plan = sanitizePlan({ ...p.plan, masks: [...p.plan.masks.filter(m => m.source !== "ia"), ...found] }, D, p.plan);
      if (!samePlan(prev, p.plan)) pushHistory(p, prev);
      p.detected = true;
      await saveProject(db, p);
      return NextResponse.json({ ok: true, project: p, found: found.length });
    }

    if (action === "save") {
      const next = sanitizePlan(b.plan, D, p.plan);
      if (!samePlan(next, p.plan)) { pushHistory(p, p.plan); p.plan = next; }
      if (typeof b.title === "string" && b.title.trim()) p.title = b.title.trim().slice(0, 120);
      await saveProject(db, p);
      return NextResponse.json({ ok: true, project: p });
    }

    if (action === "undo") {
      const last = (p.history || []).pop();
      if (!last) return fail("Rien à annuler");
      p.plan = sanitizePlan(last, D, p.plan);
      await saveProject(db, p);
      return NextResponse.json({ ok: true, project: p });
    }

    if (action === "instruction") {
      if (!client) return fail("Clé IA absente", 503);
      const text = String(b.text || "").trim().slice(0, 800);
      if (text.length < 3) return fail("Écrivez ou dictez votre instruction.");
      const j = await askJson(client, `Tu es le monteur vidéo de NeoDrive. Le fondateur te donne une instruction de montage en français oral ; tu la traduis en un nouveau plan de montage JSON.
Le plan est la seule source de vérité. TOUS les temps sont en secondes de la vidéo D'ORIGINE (avant coupes et vitesse), entre 0 et ${D}.
Champs du plan :
- "cuts": [{"start","end","label"}] passages supprimés (couper le début = {"start":0,"end":N}) ;
- "masks": [{"id","start","end","label","kind","source","on"}] passages dont le son est remplacé par un bip (ou silence) ; garde les "id" existants ; un nouveau masque a "source":"instruction", "on":true ; ajoute ${PAD} s de marge avant et après les mots ;
- "maskMode": "beep" ou "silence" ;
- "speed": vitesse entre 0.5 et 2 (« accélère un peu » = 1.2, « accélère » = 1.35, « ralentis un peu » = 0.85) ;
- "subtitles": true/false (sous-titres en français gravés dans l'image) ;
- "overlays": [{"id","text","start","end","position"}] textes affichés à l'écran ; position "top", "center" ou "bottom" ; "end": null = jusqu'à la fin ; un titre sans précision de durée = start 0, end null, position "top" ;
- "frame": "auto", "blur" (vidéo entière sur fond flou) ou "crop" (recadrée plein écran) ;
- "originalVolume": volume du son d'origine (1 = normal, 0 = coupé) ;
- "voiceover": {"enabled","scenario","text","voice","duck"} voix off lue par une voix de synthèse ; "duck" = volume du son d'origine pendant la voix off (0.2 par défaut) ; voix possibles : ${Object.entries(VOICES).map(([k, v]) => `"${k}" (${v})`).join(", ")} ; texte de 25 secondes maximum (65 mots), chaleureux, sans exagération, uniquement avec ces faits : ${FACTS} ;
- "music": {"enabled","volume"} musique de fond NeoDrive (volume 0 à 1, 0.15 par défaut ; « plus basse » = divise par 2 ; « plus forte » = ×1.5).
Pour « enlève le passage où je dis … » ou « mets le bip sur … », retrouve les mots dans la transcription (« index|début-fin|mot ») et utilise leurs temps exacts.
Garde tout le reste du plan à l'identique. Les instructions s'enchaînent (« et aussi … ») sur le plan actuel.
Si l'instruction demande d'annuler la dernière modification, réponds {"undo":true}.
Si une partie n'est pas faisable avec ces champs (ajouter une image, un filtre, une transition, changer de musique, zoomer, flouter un visage ou une plaque…), applique le reste et explique en une phrase courte en français dans "unsupported".
Réponds uniquement en json : {"plan":{…plan complet…},"message":"résumé très court en français de ce que tu as fait","unsupported":null ou "explication","undo":false}`,
        `Durée de la vidéo d'origine : ${D} s. Durée finale actuelle : ${outputDuration(p.plan, D).toFixed(1)} s.
Plan actuel :
${JSON.stringify(planForAi(p.plan))}
Transcription :
${transcriptLines(p.transcript) || "(aucune parole)"}
Instruction du fondateur : « ${text} »
Réponds en json.`, 5000);
      if (j.undo === true) {
        const last = (p.history || [])[p.history.length - 1];
        if (!last) return NextResponse.json({ ok: true, undo: true, changes: [], message: "Il n’y a aucune modification à annuler.", unsupported: null });
        return NextResponse.json({ ok: true, undo: true, plan: last, changes: describeChanges(p.plan, last), message: "Annuler la dernière modification.", unsupported: null });
      }
      const next = sanitizePlan({ ...(j.plan as object || {}), voiceover: { ...p.plan.voiceover, ...((j.plan as Record<string, unknown>)?.voiceover as object || {}) } }, D, p.plan);
      const unsupported = typeof j.unsupported === "string" && j.unsupported.trim() ? j.unsupported.trim().slice(0, 300) : null;
      return NextResponse.json({ ok: true, undo: false, plan: next, changes: describeChanges(p.plan, next), message: String(j.message || "").slice(0, 300), unsupported, duration: outputDuration(next, D) });
    }

    if (action === "apply") {
      if (b.undo === true) {
        const last = (p.history || []).pop();
        if (!last) return fail("Rien à annuler");
        p.plan = sanitizePlan(last, D, p.plan);
      } else {
        const next = sanitizePlan(b.plan, D, p.plan);
        if (!samePlan(next, p.plan)) { pushHistory(p, p.plan); p.plan = next; }
      }
      await saveProject(db, p);
      return NextResponse.json({ ok: true, project: p });
    }

    if (action === "voice_script") {
      if (!client) return fail("Clé IA absente", 503);
      const scenario = SCENARIOS[String(b.scenario)] ? String(b.scenario) : "livraison";
      const consigne = String(b.prompt || "").trim().slice(0, 500);
      if (scenario === "libre" && consigne.length < 3) return fail("Écrivez ce que la voix off doit dire.");
      const outD = outputDuration(p.plan, D);
      const maxWords = Math.max(15, Math.min(65, Math.round((Math.min(25, outD - 1)) * 2.5)));
      const j = await askJson(client, `Tu écris la voix off d'une vidéo TikTok de NeoDrive, lue par une voix de synthèse française. Faits (n'invente rien d'autre, aucun autre chiffre) : ${FACTS}
Règles : français oral, chaleureux, simple et crédible ; aucune promesse exagérée, aucun superlatif creux ; prix exacts uniquement s'ils sont utiles ; n'écris jamais d'adresse, de nom de famille ou de ville de client ; ${maxWords} mots maximum (moins de ${Math.round(maxWords / 2.5)} secondes) ; pas d'emoji, pas de hashtag ; termine par une phrase d'appel simple (ex. « Livraison partout en France, paiement à la livraison. »).
Réponds en json : {"text":"…"}`, `Scénario : ${SCENARIOS[scenario]}
${consigne ? `Consigne du fondateur : « ${consigne} »\n` : ""}Durée de la vidéo : ${outD.toFixed(0)} s.
Ce qui se dit dans la vidéo (contexte, ne pas recopier les infos personnelles) : ${(p.transcript?.text || "").slice(0, 1500) || "(pas de parole)"}
Réponds en json.`, 800);
      const text = String(j.text || "").trim().slice(0, 900);
      if (!text) return fail("L’IA n’a pas répondu, réessayez.", 502);
      return NextResponse.json({ ok: true, text, scenario });
    }

    if (action === "voice_tts") {
      if (!client) return fail("Clé IA absente", 503);
      const next = sanitizePlan({ ...p.plan, voiceover: { ...p.plan.voiceover, ...(b.voiceover as object || {}), enabled: true } }, D, p.plan);
      if (!next.voiceover.text) return fail("Le texte de la voix off est vide.");
      if (!samePlan(next, p.plan)) { pushHistory(p, p.plan); p.plan = next; }
      const { audioPath } = await tts(client, db, p);
      await saveProject(db, p);
      return NextResponse.json({ ok: true, project: p, voiceUrl: await signed(db, audioPath) });
    }

    if (action === "render") {
      const outD = outputDuration(p.plan, D);
      if (outD < 1) return fail("La vidéo finale ferait moins d’une seconde : retirez des coupes.");
      const dir = work(p.id); await mkdir(dir, { recursive: true });
      const file = await localSource(db, p);
      let voice: { file: string; duration: number } | null = null;
      const vo = p.plan.voiceover;
      if (vo.enabled && vo.text) {
        let buf: Buffer | null = null;
        if (vo.audioPath && vo.audioText === vo.text) { const { data } = await db.storage.from(BUCKET).download(vo.audioPath); if (data) buf = Buffer.from(await data.arrayBuffer()); }
        if (!buf) { if (!client) return fail("Clé IA absente", 503); buf = (await tts(client, db, p)).buf; }
        const vf = path.join(dir, "voix.mp3"); await writeFile(vf, buf);
        const vi = await probe(vf);
        voice = { file: vf, duration: vi.duration || 20 };
      }
      const out = path.join(dir, `rendu-${Date.now()}.mp4`);
      const base = { src: file, out, work: dir, plan: p.plan, D, width: p.source.width, height: p.source.height, hasAudio: p.source.hasAudio, transcript: p.transcript, voice };
      let res: { duration: number; subtitled: boolean }; let note: string | null = null;
      try { res = await renderVideo({ ...base, burnText: true }); }
      catch (e) {
        const wantedText = p.plan.subtitles || p.plan.overlays.length > 0;
        if (!wantedText) throw e;
        console.error("[studio-video] rendu avec textes", String((e as { stderr?: string }).stderr || e).slice(0, 400));
        res = await renderVideo({ ...base, burnText: false });
        note = "Les sous-titres et textes n’ont pas pu être incrustés : la vidéo est rendue sans texte.";
      }
      const buf = await readFile(out);
      const stamp = new Date();
      const renderPath = `renders/${p.id}-${stamp.getTime()}.mp4`;
      const { error } = await db.storage.from(BUCKET).upload(renderPath, buf, { contentType: "video/mp4", upsert: true });
      await rm(out, { force: true });
      if (error) return fail("Vidéo rendue mais enregistrement impossible : " + error.message, 502);
      p.renders = [{ path: renderPath, created_at: stamp.toISOString(), size: buf.length, duration: Math.round(res.duration * 10) / 10, note }, ...(p.renders || [])].slice(0, 20);
      await saveProject(db, p);
      await logSection(acc, "studio_video_render", { id: p.id, duration: res.duration });
      const name = `neodrive-${p.title.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40) || "video"}-${Math.round(res.duration)}s.mp4`;
      return NextResponse.json({ ok: true, project: p, url: await signed(db, renderPath), downloadUrl: await signed(db, renderPath, name), note, size: buf.length, duration: res.duration });
    }

    return fail("Action inconnue");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[studio-video]", action, msg.slice(0, 500), String((e as { stderr?: string }).stderr || "").slice(0, 500));
    return fail(/timed out|killed|SIGTERM/i.test(msg) ? "Le rendu a pris trop de temps : raccourcissez la vidéo (coupes) et réessayez." : "Erreur : " + msg.slice(0, 200), 500);
  }
}

/** Lecture par jeton (admin_once_tokens.purpose « studio-get », payload { id }) : projet + liens signés de la source et du dernier rendu. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return fail("Jeton invalide", 401);
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").select("payload").eq("token", token).eq("purpose", "studio-get").gt("expires_at", new Date().toISOString()).limit(1);
  const id = String((data?.[0] as { payload?: { id?: string } } | undefined)?.payload?.id || "");
  if (!/^[a-z0-9]{6,40}$/.test(id)) return fail("Jeton invalide", 401);
  const p = await readProject(db, id);
  if (!p) return fail("Projet introuvable", 404);
  const { data: files } = await db.storage.from(BUCKET).list("renders", { search: id, sortBy: { column: "created_at", order: "desc" } });
  const last = (files || []).filter(f => f.name.startsWith(id))[0];
  return NextResponse.json({ ok: true, project: p, sourceUrl: await signed(db, p.source.path), renderUrl: last ? await signed(db, `renders/${last.name}`) : null, renderName: last?.name || null });
}

/** Publication sur le site par jeton (purpose « studio-publish », payload { id, render?, name }) : copie un rendu dans le stockage public « social-media » et renvoie son adresse publique. */
export async function PUT(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return fail("Jeton invalide", 401);
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "studio-publish").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const pl = (data?.[0] as { payload?: { id?: string; render?: string; name?: string } } | undefined)?.payload;
  const id = String(pl?.id || ""); const name = String(pl?.name || "").replace(/[^a-z0-9-]/gi, "").slice(0, 60);
  if (!/^[a-z0-9]{6,40}$/.test(id) || !name) return fail("Jeton invalide", 401);
  let renderPath = pl?.render && /^renders\/[a-z0-9-]+\.mp4$/.test(pl.render) && pl.render.includes(id) ? pl.render : "";
  if (!renderPath) {
    const { data: files } = await db.storage.from(BUCKET).list("renders", { search: id, sortBy: { column: "created_at", order: "desc" } });
    const last = (files || []).filter(f => f.name.startsWith(id))[0];
    if (!last) return fail("Aucun rendu", 404);
    renderPath = `renders/${last.name}`;
  }
  const { data: blob } = await db.storage.from(BUCKET).download(renderPath);
  if (!blob) return fail("Rendu introuvable", 404);
  const dest = `site/${name}.mp4`;
  const up = await db.storage.from("social-media").upload(dest, Buffer.from(await blob.arrayBuffer()), { contentType: "video/mp4", upsert: true, cacheControl: "86400" });
  if (up.error) return fail("Publication impossible : " + up.error.message, 502);
  return NextResponse.json({ ok: true, render: renderPath, url: db.storage.from("social-media").getPublicUrl(dest).data.publicUrl });
}
