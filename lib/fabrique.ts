/** Fabrique TikTok : chaque jour ~10 propositions (angle, accroche, script, extraits de rushes analysés) puis rendu 9:16 une par une
 * (assemblage des extraits, voix off, sous-titres dynamiques, bips sur les infos personnelles). Serveur uniquement. */
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import OpenAI, { toFile } from "openai";
import type { crmDatabase } from "./crm-agent";
import { FINANCE, monthlyPayment } from "./neodrive-finance";
import { AVAILABILITY, VEHICLES } from "./neodrive-pricing";
import { BUCKET, PAD, defaultPlan, ffmpegPath, probe, renderVideo, sanitizePlan, type Transcript } from "./studio-video";
import type { Analysis } from "./video-analysis";
import { relay, LIB_MODEL } from "./video-analysis";
import { getItem, listItems, type LibItem } from "./video-library";
import { pickTemplates, templatesPrompt } from "./fabrique-templates";

const run = promisify(execFile);
type Db = ReturnType<typeof crmDatabase>;
export const PER_DAY = 10;
const META = "fabrique/";

// ───────────── faits vérifiés (seule source des chiffres) ─────────────
const eur = (n: number) => n.toLocaleString("fr-FR").replace(/ /g, " ");
const MONTHS = Math.max(...FINANCE.durations);
/** Mensualité « dès » affichée par le site (simulateur, durée la plus longue). Seul chiffre de financement autorisé. */
const FROM_MONTHLY = Math.round(monthlyPayment(VEHICLES.essentielle.price, MONTHS));
/** Mention obligatoire, à l'écran et dans la légende, dès qu'une mensualité est citée (règle de la stratégie contenu). */
export const CREDIT_ONSCREEN = `Exemple, sous réserve d'acceptation, TAEG à préciser. Un crédit vous engage et doit être remboursé.`;
export const CREDIT_MENTION = `${CREDIT_ONSCREEN} Vérifiez vos capacités de remboursement avant de vous engager.`;
export const FACTS = [
  `Marque NeoDrive : voitures sans permis neuves, 100 % électriques, 2 places, 45 km/h, accessibles dès 14 ans avec le permis AM. Société MK HOLDING (Muret, Haute-Garonne), vente directe en ligne et par téléphone.`,
  `Prix : on ne cite QUE la NeoDrive Confort à ${eur(VEHICLES.confort.price)} € TTC (${AVAILABILITY.confort.short.toLowerCase()}). Ne jamais citer d'autre prix de voiture.`,
  `Financement : « dès ${FROM_MONTHLY} €/mois » uniquement, toujours présenté comme un exemple, sous réserve d'acceptation (la mention légale est ajoutée automatiquement à l'écran et dans la légende). Aucun autre chiffre de crédit (durée, taux).`,
  `Livraison à domicile partout en France continentale : 450 € (Haute-Garonne, Tarn, Tarn-et-Garonne, Gers, Ariège), puis 590 €, 690 € ou 790 € selon le département ; Corse et outre-mer sur devis.`,
  `Réservation sans acompte, paiement à la livraison. Recharge sur une prise 220 V classique (environ 6 heures). Autonomie indicative 50 à 70 km selon conditions et version.`,
  `Pas de concession : import direct depuis le fabricant (conteneurs), vente directe, livrée chez le client par l'équipe NeoDrive.`,
].join("\n");
const ALLOWED = new Set<number>([
  VEHICLES.confort.price, FROM_MONTHLY,
  450, 590, 690, 790, 45, 14, 220, 50, 70, 100, 2026, 24,
]);
const COMPETITORS = /\b(aixam|ligier|microcar|chatenet|bellier|jdm|casalini|citro[eë]n|ami\b|topolino|fiat|twizy|mobilize|opel|rocks-e|renault|dacia|tesla|silence\s*s0[14])/i;

export const ANGLES: Record<string, string> = {
  prix_velo: "Le prix d'un bon vélo électrique… et t'as une voiture (Confort 4 990 € TTC)",
  pourquoi_prix: "Pourquoi nos prix sont bas : vente directe, pas de concession, livrée chez vous (sans se dire « les moins chers » ni chiffrer les autres)",
  electrique: "Électrique : pas de station-service, recharge sur une prise 220 V (qualitatif, aucun coût d'énergie chiffré)",
  concession: "Ce que les concessionnaires ne vous disent pas (questions à poser avant d'acheter, sans attaquer personne)",
  financement: `Financement dès ${FROM_MONTHLY} €/mois (exemple, sous réserve d'acceptation)`,
  livraison: "Livraison partout en France, chez vous (tarifs réels par zone)",
  temoignage: "Témoignage / livraison client (seulement avec des clips dont le client a donné son accord)",
  coulisses: "Coulisses : arrivage, préparation, remorque, l'équipe sur la route",
  permis_am: "Dès 14 ans avec le permis AM : liberté pour les ados et les parents",
  faq: "Réponse à une question qu'on nous pose tout le temps",
};

export type Segment = { clip: string; start: number; end: number; why: string };
export type ProposalStatus = "draft" | "rendering" | "rendered" | "error";
export type Proposal = {
  id: string; day: string; angle: string; title: string; hook: string; script: string; voice: "tts" | "original";
  segments: Segment[]; caption: string; hashtags: string[]; status: ProposalStatus;
  render_path: string | null; duration: number | null; error: string | null; feedback: string | null; published: boolean;
  attempts: number; created_at: string; updated_at: string;
};
export const parisDay = (d = new Date()) => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const pid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ───────────── stockage (table video_proposals, sinon JSON dans le bucket) ─────────────
let tableMissing: boolean | null = null;
async function hasTable(db: Db) {
  if (tableMissing !== null) return !tableMissing;
  const { error } = await db.from("video_proposals").select("id").limit(1);
  tableMissing = !!error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message || ""));
  return !tableMissing;
}
export async function saveProposal(db: Db, p: Proposal) {
  p.updated_at = new Date().toISOString();
  if (await hasTable(db)) { const { error } = await db.from("video_proposals").upsert(p, { onConflict: "id" }); if (error) throw new Error(error.message); return p; }
  const { error } = await db.storage.from(BUCKET).upload(`${META}${p.day}/${p.id}.json`, Buffer.from(JSON.stringify(p)), { contentType: "application/json", upsert: true });
  if (error) throw new Error(error.message);
  return p;
}
export async function listProposals(db: Db, day: string): Promise<Proposal[]> {
  if (await hasTable(db)) {
    const { data } = await db.from("video_proposals").select("*").eq("day", day).order("created_at", { ascending: true });
    return (data as Proposal[] | null) || [];
  }
  const { data } = await db.storage.from(BUCKET).list(`${META}${day}`, { limit: 200 });
  const out = await Promise.all((data || []).filter(f => f.name.endsWith(".json")).map(async f => {
    const { data: b } = await db.storage.from(BUCKET).download(`${META}${day}/${f.name}`);
    try { return b ? JSON.parse(await b.text()) as Proposal : null; } catch { return null; }
  }));
  return out.filter((x): x is Proposal => !!x).sort((a, b) => a.created_at.localeCompare(b.created_at));
}
export async function getProposal(db: Db, id: string, day?: string): Promise<Proposal | null> {
  if (await hasTable(db)) { const { data } = await db.from("video_proposals").select("*").eq("id", id).maybeSingle(); return (data as Proposal | null) || null; }
  if (!day) return null;
  return (await listProposals(db, day)).find(p => p.id === id) || null;
}
export async function listDays(db: Db): Promise<string[]> {
  if (await hasTable(db)) {
    const { data } = await db.from("video_proposals").select("day").order("day", { ascending: false }).limit(400);
    return Array.from(new Set(((data as { day: string }[] | null) || []).map(d => d.day))).slice(0, 30);
  }
  const { data } = await db.storage.from(BUCKET).list(META.slice(0, -1), { limit: 100, sortBy: { column: "name", order: "desc" } });
  return (data || []).map(f => f.name).filter(n => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort().reverse().slice(0, 30);
}

// ───────────── clips utilisables ─────────────
const A = (it: LibItem) => (it.analysis || {}) as Partial<Analysis>;
/** Un clip qui montre un client sans son accord n'est jamais utilisé. */
export const usable = (it: LibItem) => it.status === "analysed" && !!it.analysis && !(it.has_client && !it.consent) && (it.duration || 0) >= 1.5;

function catalog(items: LibItem[], used: Map<string, number>) {
  return items.map(it => {
    const a = A(it); const tr = (it.transcript || {}) as Partial<Transcript>;
    const speech = (tr.segments || []).slice(0, 14).map(s => `[${s.s.toFixed(1)}-${s.e.toFixed(1)}] ${s.t.slice(0, 110)}`).join(" ");
    const moments = (a.best_moments || []).map(m => `${m.start}-${m.end} ${m.kind}: ${m.why.slice(0, 80)}`).join(" ; ");
    const pii = (a.pii || []).map(p => `${p.start}-${p.end}${p.visual ? " (image)" : ""}`).join(", ");
    return `• ${it.id} | ${it.duration?.toFixed(1)} s | ${a.orientation || "?"} | qualité ${a.quality ?? "?"} | ${a.light || ""} | ${(a.scenes || []).join(",")}${a.founder_on_camera ? " | fondateur face caméra" : ""}${it.has_client ? " | client (accord donné)" : ""}${used.get(it.id) ? ` | déjà utilisé ${used.get(it.id)}×` : ""}
  ${String(a.summary || "").slice(0, 220)}
  moments : ${moments || "—"}
  parole : ${speech || "(aucune)"}${pii ? `\n  ⚠️ à éviter (infos perso) : ${pii}` : ""}`;
  }).join("\n");
}

// ───────────── contrôle des propositions ─────────────
function numbersIn(t: string) {
  return (t.match(/\d[\d\s  ]*(?:[.,]\d+)?/g) || []).map(x => Number(x.replace(/[\s  ]/g, "").replace(",", "."))).filter(n => Number.isFinite(n));
}
export function checkText(...texts: string[]) {
  const t = texts.join(" \n ");
  const bad = numbersIn(t).filter(n => n > 10 && !ALLOWED.has(n));
  if (bad.length) return `chiffre non vérifié : ${bad.slice(0, 3).join(", ")}`;
  const c = COMPETITORS.exec(t); if (c) return `concurrent cité : ${c[0]}`;
  if (/\[[^\]]*\]/.test(t)) return "élément à vérifier ou trou à remplir ([…])";
  if (/(permis|licence)[^.!?]{0,60}(suspendu|suspension|annul|retir)|(suspendu|suspension|annul|retrait)[^.!?]{0,60}permis/i.test(t) && !/décision|decision|jugement|juge|avocat/i.test(t)) return "permis suspendu : il faut renvoyer à la décision de justice";
  if (/(permis|licence)[^.!?]{0,60}(suspendu|suspension|annul|retir)[^.!?]{0,80}(tu peux|vous pouvez|autoris|le droit de) conduire(?! pas)/i.test(t) && !/peut aussi t'interdire|peut vous interdire|interdire de conduire tout|ça dépend|cela dépend/i.test(t)) return "permis suspendu : ne jamais dire qu'on peut conduire";
  if (/\bles?\s+moins\s+chers?\b|\ble moins cher\b|\bmoins cher(e)? (de|en) france\b/i.test(t)) return "affirmation « les moins chers » non vérifiable";
  return null;
}
const s = (v: unknown, m: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, m);

function cleanSegments(raw: unknown, clips: Map<string, LibItem>): Segment[] {
  const out: Segment[] = []; let total = 0;
  for (const r of (Array.isArray(raw) ? raw : []) as Record<string, unknown>[]) {
    const it = clips.get(String(r.clip || r.clip_id || "")); if (!it) continue;
    const D = it.duration || 0; let a = Math.max(0, Number(r.start) || 0); let b = Math.min(D, Number(r.end) || 0);
    if (!(b - a >= 1.2)) continue;
    if (b - a > 15) b = a + 15;
    const vis = (A(it).pii || []).filter(p => p.visual);
    if (vis.some(p => a < p.end + 0.5 && b > p.start - 0.5)) continue; // plaque, document visible : on n'utilise pas ce passage
    if (total + (b - a) > 45) b = a + Math.max(0, 45 - total);
    if (b - a < 1.2) break;
    a = Math.round(a * 10) / 10; b = Math.round(b * 10) / 10;
    out.push({ clip: it.id, start: a, end: b, why: s(r.why, 140) }); total += b - a;
  }
  return out;
}

function toProposal(day: string, j: Record<string, unknown>, clips: Map<string, LibItem>): Proposal | { reject: string } {
  const angle = ANGLES[String(j.angle)] ? String(j.angle) : "faq";
  const segments = cleanSegments(j.segments, clips);
  if (!segments.length) return { reject: "aucun extrait valide" };
  if (angle === "temoignage" && !segments.some(x => clips.get(x.clip)?.has_client)) { /* témoignage sans client : on garde, l'angle reste factuel */ }
  const p: Proposal = {
    id: pid(), day, angle, title: s(j.title, 90) || ANGLES[angle], hook: s(j.hook, 120), script: s(j.script, 700), voice: j.voice === "original" ? "original" : "tts",
    segments, caption: s(j.caption, 900), hashtags: (Array.isArray(j.hashtags) ? j.hashtags : []).map(h => "#" + String(h).replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "")).filter(h => h.length > 2).slice(0, 8),
    status: "draft", render_path: null, duration: null, error: null, feedback: null, published: false, attempts: 0,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  if (p.voice === "tts" && p.script.split(/\s+/).length < 12) return { reject: "script trop court" };
  const bad = checkText(p.hook, p.script, p.caption, p.title, p.hashtags.join(" "));
  if (bad) return { reject: bad };
  if (/financ|€\s*\/\s*mois|par mois|mensualit/i.test(`${p.script} ${p.caption} ${p.hook}`) && !p.caption.includes("sous réserve d'acceptation")) p.caption = `${p.caption}\n\n${CREDIT_MENTION}`.trim();
  return p;
}

const RULES = `Faits vérifiés (SEULE source de chiffres ; n'invente aucun autre chiffre, aucun pourcentage, aucune économie chiffrée, aucune statistique) :
${FACTS}
Règles :
- Accroche provocante mais vraie, en français oral de TikTok (tutoiement possible), moins de 12 mots.
- Script de voix off : 15 à 40 secondes (40 à 100 mots), phrases courtes, termine par un appel simple (lien en bio, réservation sans acompte, livraison partout en France).
- Publicité comparative : ne cite AUCUNE marque ni aucun concurrent ; ne dis jamais « les moins chers » ; parle des concessionnaires en général seulement par des questions ou des faits vérifiables, sans dénigrer.
- Permis suspendu ou annulé : ne dis JAMAIS que la personne peut conduire une voiture sans permis ; dis « vérifie ta décision de justice » (le juge peut interdire tout véhicule à moteur).
- La polémique vise des pratiques (acompte, prix hors taxes, délais), jamais une marque nommée.
- Aucun trou à remplir ([X], [à vérifier]) : écris uniquement ce qui est sûr.
- Ne promets rien hors des faits (pas de garantie, pas de délai autre que ceux donnés, pas d'économie chiffrée).
- Jamais de nom, d'adresse ou de ville d'un client.
- "voice" : "tts" (voix off lue sur les images, le son d'origine est baissé) ou "original" (on garde la parole du fondateur face caméra, le script = ce qu'il dit dans les extraits).
- "segments" : 2 à 6 extraits [{"clip":"id","start":s,"end":s,"why":"…"}] pris dans les clips listés, 1,5 à 12 s chacun, total ≥ durée de la voix off (≈ 2,5 mots par seconde) ; commence par l'image la plus forte ; évite les passages marqués ⚠️ ; varie les clips ; un clip « déjà utilisé » seulement si nécessaire.
- "caption" : légende TikTok (2 à 4 lignes, une question pour les commentaires) ; "hashtags" : 4 à 6 hashtags en français (#voituresanspermis…).`;

/** Prépare les propositions du jour (complète jusqu'à PER_DAY). */
export async function planDay(db: Db, client: OpenAI, day = parisDay(), wanted = PER_DAY) {
  const existing = await listProposals(db, day);
  const missing = wanted - existing.length;
  if (missing <= 0) return { created: 0, rejected: [] as string[], proposals: existing };
  const items = (await listItems(db, { status: ["analysed"], limit: 300 })).filter(usable)
    .sort((a, b) => (A(b).quality || 3) - (A(a).quality || 3) || b.created_at.localeCompare(a.created_at)).slice(0, 45);
  if (!items.length) throw new Error("Aucune vidéo analysée et utilisable dans la bibliothèque (pensez à « Accord du client » pour les clips avec client).");
  const used = new Map<string, number>();
  for (let i = 1; i <= 3; i++) for (const p of await listProposals(db, parisDay(new Date(Date.now() - i * 86400000))).catch(() => [])) for (const sg of p.segments) used.set(sg.clip, (used.get(sg.clip) || 0) + 1);
  for (const p of existing) for (const sg of p.segments) used.set(sg.clip, (used.get(sg.clip) || 0) + 1);
  const clips = new Map(items.map(i => [i.id, i]));
  const angles = Object.entries(ANGLES).map(([k, v]) => `"${k}" : ${v}`).join("\n");
  const r = await client.responses.create({
    model: LIB_MODEL(), max_output_tokens: 9000, text: { format: { type: "json_object" } },
    instructions: `Tu es le directeur de contenu TikTok de NeoDrive. Tu fabriques ${missing + 2} propositions de vidéos courtes (9:16) à partir des rushes du fondateur.
Angles possibles (varie, au moins 6 angles différents) :
${angles}
${RULES}${templatesPrompt(pickTemplates(day, checkText))}
Réponds en json : {"proposals":[{"angle":"clé","title":"titre interne court","hook":"…","voice":"tts|original","script":"…","segments":[…],"caption":"…","hashtags":["…"]}]}`,
    input: `Date : ${day}. Déjà proposé aujourd'hui : ${existing.map(p => `${p.angle} « ${p.hook} »`).join(" ; ") || "rien"}.\nClips disponibles :\n${catalog(items, used)}\nRéponds en json.`,
  });
  const j = JSON.parse(r.output_text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "")) as { proposals?: Record<string, unknown>[] };
  const rejected: string[] = []; const created: Proposal[] = [];
  for (const raw of j.proposals || []) {
    if (created.length >= missing) break;
    const p = toProposal(day, raw, clips);
    if ("reject" in p) { rejected.push(`${String(raw.angle)} : ${p.reject}`); continue; }
    created.push(await saveProposal(db, p));
  }
  return { created: created.length, rejected, proposals: [...existing, ...created] };
}

/** « Refaire » : nouvelle version d'une proposition avec la remarque du fondateur. */
export async function redoProposal(db: Db, client: OpenAI, p: Proposal, feedback: string) {
  const items = (await listItems(db, { status: ["analysed"], limit: 300 })).filter(usable).slice(0, 45);
  const clips = new Map(items.map(i => [i.id, i]));
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await client.responses.create({
      model: LIB_MODEL(), max_output_tokens: 2500, text: { format: { type: "json_object" } },
      instructions: `Tu es le directeur de contenu TikTok de NeoDrive. Refais UNE proposition de vidéo en tenant compte de la remarque du fondateur.\n${RULES}${templatesPrompt(pickTemplates(p.day, checkText, 4, 8))}${lastErr ? `\nLa version précédente a été refusée par le contrôle : ${lastErr}. Corrige.` : ""}\nRéponds en json : {"angle":"clé","title":"…","hook":"…","voice":"tts|original","script":"…","segments":[…],"caption":"…","hashtags":["…"]}`,
      input: `Angles : ${Object.keys(ANGLES).join(", ")}.\nProposition actuelle : ${JSON.stringify({ angle: p.angle, title: p.title, hook: p.hook, voice: p.voice, script: p.script, segments: p.segments, caption: p.caption })}\nRemarque du fondateur : « ${feedback} »\nClips disponibles :\n${catalog(items, new Map())}\nRéponds en json.`,
    });
    const j = JSON.parse(r.output_text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "")) as Record<string, unknown>;
    const n = toProposal(p.day, j, clips);
    if ("reject" in n) { lastErr = n.reject; continue; }
    return saveProposal(db, { ...n, id: p.id, created_at: p.created_at, feedback, published: false, attempts: 0 });
  }
  throw new Error("La nouvelle version ne respecte pas les règles (" + lastErr + "). Reformulez la remarque.");
}

// ───────────── rendu ─────────────
async function ff(args: string[], timeout = 200000) {
  await run(await ffmpegPath(), ["-y", "-hide_banner", "-loglevel", "error", ...args], { timeout, maxBuffer: 8 * 1024 * 1024 });
}

async function tts(client: OpenAI, text: string) {
  try {
    const r = await client.audio.speech.create({ model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts", voice: "ash", input: text, response_format: "mp3", instructions: "Français de France, voix masculine naturelle et énergique de créateur TikTok, rythme vif mais clair, sans ton publicitaire exagéré." });
    return Buffer.from(await r.arrayBuffer());
  } catch {
    const r = await client.audio.speech.create({ model: "tts-1", voice: "onyx", input: text, response_format: "mp3" });
    return Buffer.from(await r.arrayBuffer());
  }
}

/** Allonge les extraits (dans les limites des clips) pour couvrir la voix off. */
function extend(segs: Segment[], clips: Map<string, LibItem>, need: number) {
  const out = segs.map(x => ({ ...x }));
  let total = out.reduce((a, x) => a + x.end - x.start, 0);
  for (let pass = 0; pass < 6 && total < need; pass++) {
    for (const x of out) {
      if (total >= need) break;
      const D = clips.get(x.clip)?.duration || x.end;
      const vis = (A(clips.get(x.clip)!).pii || []).filter(p => p.visual);
      const add = Math.min(need - total, 3, D - x.end);
      const ne = x.end + add;
      if (add > 0.2 && !vis.some(p => x.start < p.end + 0.5 && ne > p.start - 0.5)) { x.end = Math.round(ne * 10) / 10; total += add; }
    }
  }
  return { segs: out, total };
}

export async function renderProposal(db: Db, client: OpenAI, p: Proposal) {
  const dir = path.join(tmpdir(), "fabrique", p.id);
  await mkdir(dir, { recursive: true });
  const relays: { close: () => void }[] = [];
  try {
    const clips = new Map<string, LibItem>();
    for (const sg of p.segments) if (!clips.has(sg.clip)) { const it = await getItem(db, sg.clip); if (it && usable(it)) clips.set(it.id, it); }
    let segs = p.segments.filter(sg => clips.has(sg.clip));
    if (!segs.length) throw new Error("Les extraits ne sont plus disponibles (vidéo supprimée ou sans accord client).");

    // Voix off d'abord : sa durée fixe la longueur de la vidéo.
    let voice: { file: string; duration: number } | null = null; let voiceWords: Transcript | null = null;
    if (p.voice === "tts" && p.script) {
      const buf = await tts(client, p.script);
      const vf = path.join(dir, "voix.mp3"); await writeFile(vf, buf);
      voice = { file: vf, duration: (await probe(vf)).duration || 20 };
      try {
        const tr = await client.audio.transcriptions.create({ file: await toFile(buf, "voix.mp3"), model: "whisper-1", language: "fr", response_format: "verbose_json", timestamp_granularities: ["word"] });
        voiceWords = { text: tr.text || "", words: (tr.words || []).map(w => ({ w: w.word, s: Math.round((w.start + 0.3) * 100) / 100, e: Math.round((w.end + 0.3) * 100) / 100 })), segments: [] };
      } catch { voiceWords = null; }
      segs = extend(segs, clips, voice.duration + 0.9).segs;
    }

    // Assemblage des extraits en une vidéo 1080x1920 (fond flou si horizontal).
    const inputs: string[] = []; const f: string[] = []; const urls = new Map<string, string>(); const hasAudio = new Map<string, boolean>();
    for (const id of new Set(segs.map(x => x.clip))) {
      const it = clips.get(id)!;
      const { data } = await db.storage.from(BUCKET).createSignedUrl(it.path, 3600);
      if (!data?.signedUrl) throw new Error("Vidéo introuvable : " + it.name);
      const rl = await relay(data.signedUrl); relays.push(rl); urls.set(id, rl.local);
      hasAudio.set(id, (await probe(rl.local)).hasAudio);
    }
    segs.forEach((x, i) => {
      const len = (x.end - x.start).toFixed(2);
      inputs.push("-ss", x.start.toFixed(2), "-t", len, "-i", urls.get(x.clip)!);
      f.push(`[${i}:v]fps=30,split[b${i}][m${i}]`, `[b${i}]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=10:2,scale=1080:1920,setsar=1[bg${i}]`,
        `[m${i}]scale=1080:1920:force_original_aspect_ratio=decrease,setsar=1[fg${i}]`, `[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2,format=yuv420p,trim=duration=${len},setpts=PTS-STARTPTS[v${i}]`);
      f.push(hasAudio.get(x.clip) ? `[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS,apad,atrim=duration=${len}[a${i}]` : `anullsrc=r=48000:cl=stereo,atrim=duration=${len}[a${i}]`);
    });
    f.push(`${segs.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${segs.length}:v=1:a=1[v][a]`);
    const graph = path.join(dir, "assemble.txt"); await writeFile(graph, f.join(";\n"));
    const joined = path.join(dir, "assemble.mp4");
    await ff([...inputs, "-filter_complex_script", graph, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "20", "-r", "30", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", joined]);
    const D = (await probe(joined)).duration || segs.reduce((a, x) => a + x.end - x.start, 0);

    // Ligne de temps assemblée : parole d'origine et infos personnelles parlées à masquer.
    const words: Transcript["words"] = []; const masks: { start: number; end: number; label: string }[] = [];
    let off = 0;
    for (const x of segs) {
      const it = clips.get(x.clip)!; const tr = (it.transcript || {}) as Partial<Transcript>;
      for (const w of tr.words || []) if (w.s >= x.start && w.e <= x.end) words.push({ w: w.w, s: Math.round((w.s - x.start + off) * 100) / 100, e: Math.round((w.e - x.start + off) * 100) / 100 });
      for (const m of A(it).pii || []) if (!m.visual && m.start < x.end && m.end > x.start) masks.push({ start: Math.max(0, Math.max(m.start, x.start) - x.start + off - PAD), end: Math.min(x.end, m.end) - x.start + off + PAD, label: m.label || "Info personnelle" });
      off += x.end - x.start;
    }
    const useVoice = !!voice;
    const overlays: { text: string; start: number; end: number | null; position: "top" | "bottom" }[] = [];
    if (p.hook) overlays.push({ text: p.hook, start: 0, end: Math.min(3.5, D), position: "top" });
    if (/financ|€\s*\/\s*mois|par mois|mensualit/i.test(`${p.script} ${p.hook}`)) overlays.push({ text: CREDIT_ONSCREEN, start: 0, end: null, position: "bottom" });
    const plan = sanitizePlan({
      ...defaultPlan(), cuts: [], subtitles: true, frame: "auto", maskMode: useVoice ? "silence" : "beep",
      masks: masks.map((m, i) => ({ id: `p${i}`, ...m, kind: "autre", source: "ia", on: true })),
      overlays: overlays.map((o, i) => ({ id: `o${i}`, ...o })),
      originalVolume: 1, music: { enabled: true, volume: useVoice ? 0.1 : 0.06 },
      voiceover: { enabled: false, scenario: "libre", text: "", voice: "ash", audioPath: null, audioText: null, duck: 0.15 },
    }, D);
    plan.voiceover = { ...plan.voiceover, duck: 0.15 };
    const out = path.join(dir, "rendu.mp4");
    const base = { src: joined, out, work: dir, plan, D, width: 1080, height: 1920, hasAudio: true, voice, transcript: useVoice ? voiceWords : { text: "", words, segments: [] }, subtitlesUnmasked: useVoice };
    let res: { duration: number };
    try { res = await renderVideo({ ...base, burnText: true }); }
    catch (e) { console.error("[fabrique] rendu avec textes", String((e as { stderr?: string }).stderr || e).slice(0, 300)); res = await renderVideo({ ...base, burnText: false }); }
    const buf = await readFile(out);
    const renderPath = `fabrique/${p.day}/${p.id}-${Date.now()}.mp4`;
    const { error } = await db.storage.from(BUCKET).upload(renderPath, buf, { contentType: "video/mp4", upsert: true });
    if (error) throw new Error("Enregistrement du rendu impossible : " + error.message);
    if (p.render_path) await db.storage.from(BUCKET).remove([p.render_path]).catch(() => null);
    return saveProposal(db, { ...p, segments: segs, status: "rendered", render_path: renderPath, duration: Math.round(res.duration * 10) / 10, error: null });
  } finally {
    relays.forEach(r => r.close());
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
}

/** Rend la prochaine proposition en attente du jour (une par appel). */
export async function renderNext(db: Db, client: OpenAI, day = parisDay()) {
  const list = await listProposals(db, day);
  const stale = Date.now() - 8 * 60000;
  const next = list.find(p => p.status === "draft") || list.find(p => p.status === "rendering" && new Date(p.updated_at).getTime() < stale && p.attempts < 3)
    || list.find(p => p.status === "error" && p.attempts < 2);
  if (!next) return { rendered: null as Proposal | null, remaining: 0 };
  await saveProposal(db, { ...next, status: "rendering", attempts: (next.attempts || 0) + 1 });
  try {
    const done = await renderProposal(db, client, next);
    return { rendered: done, remaining: list.filter(p => p.id !== next.id && (p.status === "draft" || p.status === "rendering")).length };
  } catch (e) {
    const m = (e as Error).message.slice(0, 300);
    console.error("[fabrique] rendu", next.id, m, String((e as { stderr?: string }).stderr || "").slice(0, 300));
    await saveProposal(db, { ...next, status: "error", error: m, attempts: (next.attempts || 0) + 1 });
    throw e;
  }
}
