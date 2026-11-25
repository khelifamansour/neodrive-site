/** Studio vidéo : plan de montage (source unique de vérité), lecture des vidéos et rendu ffmpeg. Serveur uniquement. */
import { execFile } from "node:child_process";
import { access, chmod, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export const BUCKET = "studio-video";
/** Durée maximale d'une vidéo source (secondes) : au-delà, le rendu dépasse le temps d'exécution autorisé sur Vercel. */
export const MAX_SECONDS = 90;
export const MAX_MB = 200;
export const PAD = 0.15;

export type Word = { w: string; s: number; e: number };
export type Transcript = { text: string; words: Word[]; segments: { s: number; e: number; t: string }[] };
export type Mask = { id: string; start: number; end: number; label: string; kind: string; source: "ia" | "manuel" | "instruction"; on: boolean };
export type Overlay = { id: string; text: string; start: number; end: number | null; position: "top" | "center" | "bottom" };
export type Cut = { start: number; end: number; label: string };
export type VoiceOver = { enabled: boolean; scenario: string; text: string; voice: string; audioPath: string | null; audioText: string | null; duck: number };
export type EditPlan = {
  cuts: Cut[];
  masks: Mask[];
  maskMode: "beep" | "silence";
  speed: number;
  subtitles: boolean;
  overlays: Overlay[];
  frame: "auto" | "blur" | "crop";
  originalVolume: number;
  voiceover: VoiceOver;
  music: { enabled: boolean; volume: number };
};
export type Render = { path: string; created_at: string; size: number; duration: number; note?: string | null };
export type Project = {
  id: string; title: string; created_at: string; updated_at: string;
  source: { path: string; name: string; size: number; duration: number; width: number; height: number; hasAudio: boolean };
  transcript: Transcript | null; detected: boolean;
  plan: EditPlan; history: EditPlan[]; renders: Render[];
};

export const VOICES: Record<string, string> = { coral: "Voix féminine chaleureuse", ash: "Voix masculine posée", nova: "Voix féminine dynamique", onyx: "Voix masculine grave" };

export const defaultPlan = (): EditPlan => ({
  cuts: [], masks: [], maskMode: "beep", speed: 1, subtitles: true, overlays: [], frame: "auto", originalVolume: 1,
  voiceover: { enabled: false, scenario: "livraison", text: "", voice: "coral", audioPath: null, audioText: null, duck: 0.2 },
  music: { enabled: false, volume: 0.15 },
});

const num = (v: unknown, d: number) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const r2 = (v: number) => Math.round(v * 100) / 100;
const str = (v: unknown, m: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, m);
export const rid = () => Math.random().toString(36).slice(2, 9);

type R = Record<string, unknown>;
/** Remet un plan reçu (client ou IA) dans des bornes sûres. */
export function sanitizePlan(input: unknown, duration: number, prev?: EditPlan): EditPlan {
  const p = (input && typeof input === "object" ? input : {}) as R;
  const base = prev || defaultPlan();
  const D = Math.max(0.1, duration);
  const range = (s: unknown, e: unknown) => { const a = clamp(num(s, 0), 0, D), b = clamp(num(e, 0), 0, D); return b - a >= 0.05 ? [r2(a), r2(b)] as const : null; };
  const cuts: Cut[] = (Array.isArray(p.cuts) ? p.cuts as R[] : base.cuts as unknown as R[]).slice(0, 40).map((c: R) => { const r = range(c?.start, c?.end); return r ? { start: r[0], end: r[1], label: str(c?.label, 120) } : null; }).filter(Boolean) as Cut[];
  const masks: Mask[] = (Array.isArray(p.masks) ? p.masks as R[] : base.masks as unknown as R[]).slice(0, 80).map((m: R) => {
    const r = range(m?.start, m?.end); if (!r) return null;
    const source = ["ia", "manuel", "instruction"].includes(String(m?.source)) ? m.source as Mask["source"] : "instruction";
    return { id: str(m?.id, 20) || rid(), start: r[0], end: r[1], label: str(m?.label, 120) || "Passage masqué", kind: str(m?.kind, 30) || "autre", source, on: m?.on !== false };
  }).filter(Boolean) as Mask[];
  const overlays: Overlay[] = (Array.isArray(p.overlays) ? p.overlays as R[] : base.overlays as unknown as R[]).slice(0, 10).map((o: R) => {
    const text = str(o?.text, 120); if (!text) return null;
    const start = r2(clamp(num(o?.start, 0), 0, D));
    const endRaw = o?.end === null || o?.end === undefined || o?.end === "" ? null : r2(clamp(num(o.end, D), 0, D));
    const end = endRaw !== null && endRaw - start < 0.3 ? null : endRaw;
    const position = ["top", "center", "bottom"].includes(String(o?.position)) ? o.position as Overlay["position"] : "top";
    return { id: str(o?.id, 20) || rid(), text, start, end, position };
  }).filter(Boolean) as Overlay[];
  const vo = (p.voiceover && typeof p.voiceover === "object" ? p.voiceover : base.voiceover) as R;
  const text = str(vo.text, 900);
  const voiceover: VoiceOver = {
    enabled: !!vo.enabled && !!text, scenario: str(vo.scenario, 30) || "livraison", text,
    voice: VOICES[String(vo.voice)] ? String(vo.voice) : "coral",
    audioPath: typeof vo.audioPath === "string" && vo.audioPath.startsWith("voix/") ? vo.audioPath : null,
    audioText: typeof vo.audioText === "string" ? vo.audioText : null,
    duck: r2(clamp(num(vo.duck, 0.2), 0, 1)),
  };
  if (voiceover.audioText !== text) { voiceover.audioPath = null; voiceover.audioText = null; }
  const mu = (p.music && typeof p.music === "object" ? p.music : base.music) as R;
  return {
    cuts, masks, overlays, voiceover,
    maskMode: p.maskMode === "silence" ? "silence" : p.maskMode === "beep" ? "beep" : base.maskMode,
    speed: r2(clamp(num(p.speed, base.speed), 0.5, 2)),
    subtitles: typeof p.subtitles === "boolean" ? p.subtitles : base.subtitles,
    frame: ["auto", "blur", "crop"].includes(String(p.frame)) ? p.frame as EditPlan["frame"] : base.frame,
    originalVolume: r2(clamp(num(p.originalVolume, base.originalVolume), 0, 2)),
    music: { enabled: !!mu.enabled, volume: r2(clamp(num(mu.volume, 0.15), 0, 1)) },
  };
}

/** Parties gardées de la vidéo (temps d'origine), après les coupes. */
export function keeps(plan: EditPlan, D: number) {
  const cuts = [...plan.cuts].sort((a, b) => a.start - b.start);
  const out: [number, number][] = []; let t = 0;
  for (const c of cuts) { if (c.start > t + 0.05) out.push([t, c.start]); t = Math.max(t, c.end); }
  if (D - t > 0.05) out.push([t, D]);
  return out;
}
export const outputDuration = (plan: EditPlan, D: number) => keeps(plan, D).reduce((s, [a, b]) => s + b - a, 0) / plan.speed;

/** Convertit un temps de la vidéo d'origine en temps de la vidéo finale (null si le passage est coupé). */
export function mapTime(t: number, plan: EditPlan, D: number, snapForward = false) {
  let off = 0;
  for (const [a, b] of keeps(plan, D)) {
    if (t < a) return snapForward ? off / plan.speed : null;
    if (t <= b) return (off + t - a) / plan.speed;
    off += b - a;
  }
  return snapForward ? off / plan.speed : null;
}

const fmt = (s: number) => { const m = Math.floor(s / 60); return `${m ? m + " min " : ""}${(s - m * 60).toFixed(1).replace(".", ",")} s`; };
export const fmtTime = fmt;

/** Décrit en français ce qui change entre deux plans (affiché pour confirmation). */
export function describeChanges(a: EditPlan, b: EditPlan): string[] {
  const out: string[] = [];
  const key = (x: { start: number; end: number }) => `${x.start}-${x.end}`;
  const aCuts = new Set(a.cuts.map(key)), bCuts = new Set(b.cuts.map(key));
  for (const c of b.cuts) if (!aCuts.has(key(c))) out.push(`✂️ Couper de ${fmt(c.start)} à ${fmt(c.end)}${c.label ? ` (${c.label})` : ""}`);
  for (const c of a.cuts) if (!bCuts.has(key(c))) out.push(`↩️ Remettre le passage de ${fmt(c.start)} à ${fmt(c.end)}`);
  const am = new Map(a.masks.map(m => [m.id, m]));
  for (const m of b.masks) {
    const o = am.get(m.id);
    if (!o) { if (m.on) out.push(`🔇 ${b.maskMode === "beep" ? "Bip" : "Silence"} de ${fmt(m.start)} à ${fmt(m.end)} : ${m.label}`); }
    else if (o.on !== m.on) out.push(`${m.on ? "🔇 Masquer" : "🔊 Ne plus masquer"} : ${m.label} (${fmt(m.start)})`);
    else if (o.start !== m.start || o.end !== m.end) out.push(`🔇 Ajuster le masquage « ${m.label} » : ${fmt(m.start)} à ${fmt(m.end)}`);
  }
  const bm = new Set(b.masks.map(m => m.id));
  for (const m of a.masks) if (!bm.has(m.id) && m.on) out.push(`🔊 Supprimer le masquage : ${m.label}`);
  if (a.maskMode !== b.maskMode) out.push(b.maskMode === "beep" ? "🔔 Passages masqués avec un bip" : "🤫 Passages masqués en silence");
  if (a.speed !== b.speed) out.push(`⏩ Vitesse ×${String(b.speed).replace(".", ",")}`);
  if (a.subtitles !== b.subtitles) out.push(b.subtitles ? "💬 Sous-titres activés" : "💬 Sous-titres désactivés");
  if (a.frame !== b.frame) out.push(`🖼️ Cadrage : ${b.frame === "crop" ? "recadré plein écran" : b.frame === "blur" ? "fond flou" : "automatique"}`);
  const ao = new Map(a.overlays.map(o => [o.id, o]));
  for (const o of b.overlays) { const x = ao.get(o.id); if (!x || x.text !== o.text || x.start !== o.start || x.end !== o.end || x.position !== o.position) out.push(`🔤 Texte « ${o.text} » ${o.position === "top" ? "en haut" : o.position === "center" ? "au centre" : "en bas"}, de ${fmt(o.start)} ${o.end === null ? "jusqu’à la fin" : `à ${fmt(o.end)}`}`); }
  const bo = new Set(b.overlays.map(o => o.id));
  for (const o of a.overlays) if (!bo.has(o.id)) out.push(`🔤 Retirer le texte « ${o.text} »`);
  if (a.originalVolume !== b.originalVolume) out.push(`🔊 Son d’origine à ${Math.round(b.originalVolume * 100)} %`);
  if (a.voiceover.enabled !== b.voiceover.enabled) out.push(b.voiceover.enabled ? "🎙️ Voix off activée" : "🎙️ Voix off retirée");
  if (a.voiceover.text !== b.voiceover.text && b.voiceover.text) out.push(`🎙️ Nouveau texte de voix off : « ${b.voiceover.text.slice(0, 160)}${b.voiceover.text.length > 160 ? "…" : ""} »`);
  if (a.voiceover.voice !== b.voiceover.voice) out.push(`🎙️ ${VOICES[b.voiceover.voice]}`);
  if (a.voiceover.duck !== b.voiceover.duck) out.push(`🔉 Son d’origine pendant la voix off : ${Math.round(b.voiceover.duck * 100)} %`);
  if (a.music.enabled !== b.music.enabled) out.push(b.music.enabled ? "🎵 Musique de fond ajoutée" : "🎵 Musique de fond retirée");
  else if (b.music.enabled && a.music.volume !== b.music.volume) out.push(`🎵 Musique ${b.music.volume < a.music.volume ? "plus basse" : "plus forte"} (${Math.round(b.music.volume * 100)} %)`);
  return out;
}

// ───────────────────────── ffmpeg ─────────────────────────

export async function ffmpegPath() {
  const bundled = path.join(process.cwd(), "node_modules", "@ffmpeg-installer", "linux-x64", "ffmpeg");
  try { await access(bundled); await chmod(bundled, 0o755).catch(() => {}); return bundled; } catch { return "/usr/bin/ffmpeg"; }
}
export const fontsDir = () => path.join(process.cwd(), "lib", "studio-fonts");
export const musicFile = () => path.join(process.cwd(), "public", "neodrive-background.mp3");

/** Lit durée, dimensions (après rotation) et présence du son, à partir des informations d'ffmpeg. */
export async function probe(file: string) {
  const ff = await ffmpegPath();
  let err = "";
  try { await run(ff, ["-hide_banner", "-i", file], { maxBuffer: 4 * 1024 * 1024 }); } catch (e) { err = String((e as { stderr?: string }).stderr || ""); }
  const d = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(err);
  const duration = d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0;
  const v = /Stream #[^\n]*Video:[^\n]*?\b(\d{2,5})x(\d{2,5})\b/.exec(err);
  let width = v ? Number(v[1]) : 0, height = v ? Number(v[2]) : 0;
  const rot = /rotate\s*:\s*(-?\d+)/.exec(err) || /rotation of (-?[\d.]+) degrees/.exec(err);
  if (rot && Math.abs(Math.round(Number(rot[1]))) % 180 === 90) [width, height] = [height, width];
  return { duration, width, height, hasAudio: /Stream #[^\n]*Audio:/.test(err), hasVideo: !!v };
}

/** Piste son légère (mono 16 kHz) pour la transcription (limite Whisper : 25 Mo). */
export async function extractAudio(input: string, output: string) {
  await run(await ffmpegPath(), ["-y", "-hide_banner", "-loglevel", "error", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", output], { timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
}

const between = (rs: [number, number][], scale = 1) => rs.map(([a, b]) => `between(t,${(a / scale).toFixed(3)},${(b / scale).toFixed(3)})`).join("+");

function assTime(s: number) { const cs = Math.max(0, Math.round(s * 100)); const h = Math.floor(cs / 360000), m = Math.floor(cs / 6000) % 60, sec = Math.floor(cs / 100) % 60, c = cs % 100; return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(c).padStart(2, "0")}`; }
const assText = (t: string) => t.replace(/[{}]/g, "").replace(/\\/g, "/").replace(/\n/g, "\\N");

/** Sous-titres et textes au format ASS, déjà placés sur la ligne de temps finale. */
export function buildAss(plan: EditPlan, D: number, transcript: Transcript | null, maskWords = true) {
  const outD = outputDuration(plan, D);
  const masks = plan.masks.filter(m => m.on);
  const lines: string[] = [];
  if (plan.subtitles && transcript?.words?.length) {
    type Tok = { t: string; s: number; e: number };
    const toks: Tok[] = [];
    for (const w of transcript.words) {
      const s = mapTime(w.s, plan, D), e = mapTime(Math.max(w.s, w.e - 0.01), plan, D);
      if (s === null || e === null) continue;
      const masked = maskWords && masks.some(m => w.s < m.end && w.e > m.start);
      const t = masked ? "***" : w.w.trim();
      if (!t) continue;
      if (masked && toks.length && toks[toks.length - 1].t === "***" && s - toks[toks.length - 1].e < 0.6) { toks[toks.length - 1].e = e; continue; }
      toks.push({ t, s, e });
    }
    const groups: Tok[][] = []; let cur: Tok[] = [];
    for (const k of toks) {
      const prev = cur[cur.length - 1];
      const len = cur.reduce((n, x) => n + x.t.length + 1, 0);
      if (cur.length && (k.s - prev.e > 0.7 || cur.length >= 5 || len + k.t.length > 30 || k.e - cur[0].s > 2.6 || /[.!?]$/.test(prev.t))) { groups.push(cur); cur = []; }
      cur.push(k);
    }
    if (cur.length) groups.push(cur);
    groups.forEach((g, i) => {
      const s = g[0].s; let e = Math.max(g[g.length - 1].e + 0.25, s + 0.6);
      const next = groups[i + 1]; if (next) e = Math.min(e, next[0].s - 0.02);
      e = Math.min(e, outD);
      if (e - s < 0.15) return;
      lines.push(`Dialogue: 0,${assTime(s)},${assTime(e)},Sub,,0,0,0,,${assText(g.map(x => x.t).join(" "))}`);
    });
  }
  for (const o of plan.overlays) {
    const s = mapTime(o.start, plan, D, true) ?? 0;
    const e = o.end === null ? outD : (mapTime(o.end, plan, D, true) ?? outD);
    if (e - s < 0.2) continue;
    const style = o.position === "top" ? "Top" : o.position === "center" ? "Mid" : "Low";
    lines.push(`Dialogue: 1,${assTime(s)},${assTime(e)},${style},,0,0,0,,${assText(o.text)}`);
  }
  if (!lines.length) return null;
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Outfit,76,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,6,2,2,90,90,430,1
Style: Top,Outfit,78,&H00FFFFFF,&H00FFFFFF,&H00285AF0,&H00285AF0,-1,0,0,0,100,100,0,0,3,18,0,8,80,80,250,1
Style: Mid,Outfit,84,&H00FFFFFF,&H00FFFFFF,&H00285AF0,&H00285AF0,-1,0,0,0,100,100,0,0,3,18,0,5,80,80,0,1
Style: Low,Outfit,72,&H00FFFFFF,&H00FFFFFF,&H00141414,&H00141414,-1,0,0,0,100,100,0,0,3,16,0,2,80,80,640,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${lines.join("\n")}
`;
}

export type RenderInput = {
  src: string; out: string; work: string; plan: EditPlan; D: number; width: number; height: number; hasAudio: boolean;
  transcript: Transcript | null; voice?: { file: string; duration: number } | null; burnText: boolean;
  /** Sous-titres d'une voix off (Fabrique) : ne pas remplacer ses mots par *** sur les passages masqués du son d'origine. */
  subtitlesUnmasked?: boolean;
};

/** Construit et lance la commande ffmpeg du rendu final (1080x1920, H.264/AAC). */
export async function renderVideo(r: RenderInput) {
  const { plan, D } = r;
  const ks = keeps(plan, D);
  if (!ks.length) throw new Error("Toute la vidéo est coupée : il ne reste rien à rendre.");
  const outD = outputDuration(plan, D);
  const sp = plan.speed;
  const masks = plan.masks.filter(m => m.on).map(m => [m.start, m.end] as [number, number]);
  const sel = ks.length === 1 && ks[0][0] < 0.05 && ks[0][1] > D - 0.05 ? null : between(ks);
  const f: string[] = [];
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", r.src];
  let idx = 1;
  const voiceIdx = r.voice ? idx++ : -1; if (r.voice) args.push("-i", r.voice.file);
  const musicIdx = plan.music.enabled && plan.music.volume > 0 ? idx++ : -1; if (musicIdx > 0) args.push("-stream_loop", "-1", "-i", musicFile());

  // Image : parties gardées → vitesse → cadrage 9:16 → textes
  let v = `[0:v]fps=30${sel ? `,select='${sel}'` : ""},setpts=N/30/TB`;
  if (sp !== 1) v += `,setpts=PTS/${sp},fps=30`;
  const aspect = r.width && r.height ? r.width / r.height : 9 / 16;
  const frame = plan.frame === "auto" ? (Math.abs(aspect - 9 / 16) < 0.03 ? "fit" : "blur") : plan.frame;
  if (frame === "crop") f.push(`${v},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[vf]`);
  else if (frame === "fit") f.push(`${v},scale=1080:1920,setsar=1[vf]`);
  else {
    f.push(`${v},split[vb][vm]`);
    f.push(`[vb]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=10:2,scale=1080:1920,setsar=1[bg]`);
    f.push(`[vm]scale='if(gt(a,9/16),1080,-2)':'if(gt(a,9/16),-2,1920)',setsar=1[fg]`);
    f.push(`[bg][fg]overlay=(W-w)/2:(H-h)/2[vf]`);
  }
  let vLast = "vf";
  const ass = r.burnText ? buildAss(plan, D, r.transcript, !r.subtitlesUnmasked) : null;
  if (ass) {
    const assFile = path.join(r.work, "texte.ass");
    await writeFile(assFile, ass, "utf8");
    f.push(`[vf]subtitles=filename=${assFile}:fontsdir=${fontsDir()}[vs]`);
    vLast = "vs";
  }
  f.push(`[${vLast}]format=yuv420p[vout]`);

  // Son : masquage (bip ou silence) sur la ligne de temps d'origine, puis coupes, vitesse, voix off et musique
  f.push(r.hasAudio ? `[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a0]` : `anullsrc=r=48000:cl=stereo,atrim=0:${D.toFixed(3)},aformat=sample_fmts=fltp:channel_layouts=stereo[a0]`);
  let aLast = "a0";
  if (masks.length) {
    const m = between(masks);
    f.push(`[a0]volume=volume=0:enable='${m}'[am]`); aLast = "am";
    if (plan.maskMode === "beep") {
      f.push(`sine=frequency=1000:sample_rate=48000:duration=${D.toFixed(3)},aformat=sample_fmts=fltp:channel_layouts=stereo,volume='2.4*gt(${m},0)':eval=frame[bp]`);
      f.push(`[am][bp]amix=inputs=2:duration=first:dropout_transition=0,volume=2[amb]`); aLast = "amb";
    }
  }
  let a = `[${aLast}]${sel ? `aselect='${sel}',` : ""}asetpts=N/SR/TB`;
  if (sp !== 1) a += `,atempo=${sp}`;
  const vs = 0.3, ve = r.voice ? vs + r.voice.duration : 0;
  a += r.voice ? `,volume='if(between(t,${vs},${(ve + 0.2).toFixed(2)}),${plan.voiceover.duck},${plan.originalVolume})':eval=frame` : `,volume=${plan.originalVolume}`;
  f.push(`${a}[ab]`);
  const mix = ["[ab]"];
  if (voiceIdx > 0) { f.push(`[${voiceIdx}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=${vs * 1000}|${vs * 1000},apad[vo]`); mix.push("[vo]"); }
  if (musicIdx > 0) { f.push(`[${musicIdx}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${plan.music.volume}[mu]`); mix.push("[mu]"); }
  f.push(mix.length > 1 ? `${mix.join("")}amix=inputs=${mix.length}:duration=first:dropout_transition=0,volume=${mix.length},alimiter=limit=0.95[aout]` : `[ab]alimiter=limit=0.95[aout]`);

  const script = path.join(r.work, "graph.txt");
  await writeFile(script, f.join(";\n"), "utf8");
  const preset = outD > 50 ? "superfast" : "veryfast";
  args.push("-filter_complex_script", script, "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-preset", preset, "-crf", "23", "-maxrate", "3500k", "-bufsize", "7000k", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30",
    "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-t", outD.toFixed(3), "-movflags", "+faststart", r.out);
  const env = { ...process.env, FONTCONFIG_PATH: fontsDir() };
  await run(await ffmpegPath(), args, { timeout: 250000, maxBuffer: 8 * 1024 * 1024, env });
  return { duration: outD, subtitled: !!ass };
}
