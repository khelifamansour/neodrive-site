/** Publication automatique Facebook / Instagram (1 par jour et par réseau) à partir de VRAIS médias :
 * photos et vidéos de la bibliothèque réseaux sociaux (social_media_assets, envoyées depuis /social-upload ou /studio)
 * et vidéos de la Fabrique que le fondateur a validées (« Publiée sur TikTok »).
 *
 * - Rotation des types de contenu (livraison client, témoignage, question fréquente, prix / stock, comparaison, coulisses).
 * - Jamais le même média ni la même accroche sur un réseau pendant 14 jours (historique : social_content_queue).
 * - Les médias les plus récents passent en premier.
 * - Légende écrite par l'IA avec contraintes de variété, contrôlée (chiffres, concurrents, type de batterie, citations),
 *   sinon modèle de secours. Serveur uniquement. */
import "server-only";
import OpenAI from "openai";
import { crmDatabase } from "./crm-agent";
import { listDays, listProposals, parisDay, type Proposal } from "./fabrique";
import { TEMPLATES } from "./fabrique-templates";
import { AVAILABILITY, VEHICLES } from "./neodrive-pricing";
import { BUCKET } from "./studio-video";

type Db = ReturnType<typeof crmDatabase>;
export type Platform = "facebook" | "instagram";
export type PillarId = "livraison" | "temoignage" | "faq" | "prix_stock" | "comparaison" | "coulisses";
type Kind = "image" | "video";

export const NO_REPEAT_DAYS = 14;
const SITE = "https://www.easydrive-auto.fr";

export type Media = {
  key: string; source: "bibliotheque" | "fabrique"; assetId: string | null; url: string; kind: Kind; created_at: string;
  title: string; evidence: string; text: string; angle: string | null; timesUsed: number;
  /** Légendes relues par le fondateur dans la Fabrique (prioritaires si elles passent les contrôles). */
  prewritten?: Partial<Record<Platform, string>>;
};

type Pillar = {
  id: PillarId; label: string; prefer: Kind | null;
  /** Le média doit correspondre (null : n'importe quelle vraie photo / vidéo de la voiture). */
  match: RegExp | null; angles: string[]; bank: string[]; path: string; brief: string;
  fallback: { hook: string; body: string }[];
};

const eur = (n: number) => `${n.toLocaleString("fr-FR").replace(/\s/g, " ")} €`;
const CONFORT = eur(VEHICLES.confort.price), ESS = eur(VEHICLES.essentielle.price), PLUS = eur(VEHICLES.confortPlus.price);

/** « Livrée avant Noël » seulement si la livraison annoncée (3 semaines au plus) tombe avant le 23 décembre. */
export function beforeChristmas(now = new Date()) {
  if (!AVAILABILITY.confort.inStock || now.getMonth() < 9) return false;
  const limit = new Date(now.getFullYear(), 11, 23);
  return now.getTime() + 21 * 86400000 <= limit.getTime();
}

function facts(now = new Date()) {
  return [
    `NeoDrive (MK HOLDING, Muret près de Toulouse) : voitures sans permis neuves, 100 % électriques, 2 places, 45 km/h, dès 14 ans avec le permis AM. Vente directe, sans concession.`,
    `Prix TTC : Essentielle ${ESS} (${AVAILABILITY.essentielle.short.toLowerCase()}), Confort ${CONFORT} (${AVAILABILITY.confort.short.toLowerCase()}), Confort Plus ${PLUS} (sur commande).`,
    `Confort : caméra de recul, chauffage, Bluetooth, alarme.`,
    `Livraison à domicile partout en France. 0 € d'acompte : on paie à la livraison. Garantie 2 ans.`,
    `Recharge sur une prise 220 V classique (environ 6 heures). Autonomie indicative jusqu'à 70 km selon conditions.`,
    beforeChristmas(now) ? `Commandée maintenant, la Confort en stock est livrée avant Noël.` : "",
  ].filter(Boolean).join("\n");
}

/** Recalculé à chaque appel (la mention « avant Noël » dépend de la date). */
const pillars = (): Pillar[] => [
  {
    id: "livraison", label: "Livraison client", prefer: "video", path: "/livraison",
    match: /livr|remise|cl[eé]s|chez (le|la|un|une|nos) client|nouvelle propri|nouveau propri|client(e)? (re[cç]oit|d[eé]couvre)/i,
    angles: ["livraison"], bank: ["livraison"],
    brief: "Une vraie livraison chez un client : la voiture arrive chez lui, remise des clés, prise en main. Raconte ce que montre le média, sans inventer de prénom, de ville ni de réaction.",
    fallback: [
      { hook: "Encore une NeoDrive qui arrive à destination.", body: "Livraison à domicile partout en France, prise en main sur place, et le paiement se fait seulement à la livraison." },
      { hook: "Le jour J, c'est nous qui venons à vous.", body: "Pas besoin de traverser la France : la voiture est livrée chez vous, on vous montre la recharge et les commandes, et vous payez à ce moment-là." },
    ],
  },
  {
    id: "temoignage", label: "Témoignage client", prefer: "video", path: "/temoignage",
    match: /t[eé]moign|avis client|interview|raconte|son avis|leur avis|satisfait|contente?\b/i,
    angles: ["temoignage"], bank: ["temoignage", "témoignage"],
    brief: "Un client (qui a donné son accord) parle de son achat. Ne cite JAMAIS de paroles qui ne figurent pas mot pour mot dans le contexte. Pas d'avis inventé, pas de note, pas de nombre de clients.",
    fallback: [
      { hook: "Ce sont nos clients qui en parlent le mieux.", body: "Une vraie cliente, une vraie livraison : regardez la vidéo jusqu'au bout. Vous aussi, réservez sans acompte et payez à la livraison." },
      { hook: "Pas un acteur, pas une pub : une cliente NeoDrive.", body: "On préfère vous montrer de vraies livraisons plutôt que de longs discours. Garantie 2 ans, livraison partout en France." },
    ],
  },
  {
    id: "faq", label: "Question fréquente", prefer: null, path: "/faq",
    match: null, angles: ["faq", "permis_am", "electrique", "face_voiture"], bank: ["faq", "objection/réponse", "permis_am", "electrique"],
    brief: "Réponds à UNE question fréquente de futurs clients, au choix parmi : permis AM dès 14 ans, qui peut conduire sans permis, recharge sur prise 220 V, autonomie, paiement à la livraison sans acompte, garantie 2 ans, carte grise, livraison partout en France. Pose la question puis réponds clairement avec les faits.",
    fallback: [
      { hook: "« Il faut une borne pour la recharger ? » Non.", body: "Une prise 220 V classique suffit, environ 6 heures, par exemple la nuit. Autonomie indicative jusqu'à 70 km selon conditions." },
      { hook: "Dès 14 ans ? Oui, avec le permis AM.", body: "La voiture sans permis est accessible dès 14 ans avec le permis AM. 2 places, 45 km/h, au sec et au chaud pour aller au lycée." },
      { hook: "Faut-il payer avant d'être livré ? Non.", body: "0 € d'acompte : vous réservez, on livre chez vous, vous voyez la voiture et vous payez à la livraison." },
    ],
  },
  {
    id: "prix_stock", label: "Prix et stock", prefer: null, path: "/produit",
    match: null, angles: ["prix_velo"], bank: ["prix", "choc/prix"],
    brief: `Message prix et disponibilité : NeoDrive Confort à ${CONFORT} TTC, en stock, livrée en 2 à 3 semaines${beforeChristmas() ? " (donc avant Noël si commandée maintenant)" : ""}, 0 € d'acompte, paiement à la livraison. Tu peux citer l'Essentielle (${ESS}, sur commande 6 à 8 mois) en complément. Direct et concret.`,
    fallback: [
      { hook: `Confort à ${CONFORT}, en stock.`, body: `Neuve, 100 % électrique, livrée chez vous en 2 à 3 semaines${beforeChristmas() ? ", donc avant Noël" : ""}. 0 € d'acompte, vous payez à la livraison.` },
      { hook: `Une voiture sans permis neuve à ${CONFORT}.`, body: "Caméra de recul, chauffage, Bluetooth, alarme, garantie 2 ans. En stock, livrée partout en France, payée à la livraison." },
    ],
  },
  {
    id: "comparaison", label: "Comparaison", prefer: null, path: "/comparatif",
    match: null, angles: ["pourquoi_prix", "concession"], bank: ["concession", "comparatif", "data"],
    brief: `Comparaison honnête : les voitures sans permis neuves des marques traditionnelles dépassent souvent 10 000 €, la NeoDrive Confort est à ${CONFORT} TTC. Explique pourquoi : vente directe, pas de concession ni d'intermédiaire. Ne nomme aucune marque concurrente, ne dénigre personne, ne dis pas « la moins chère de France ».`,
    fallback: [
      { hook: "Plus de 10 000 € pour une voiture sans permis neuve ? Pas chez nous.", body: `La NeoDrive Confort est à ${CONFORT} TTC. La différence : vente directe, sans concession ni intermédiaire, livrée chez vous.` },
      { hook: "Pourquoi une telle différence de prix ?", body: `Beaucoup de voitures sans permis neuves dépassent 10 000 €. Nous vendons en direct, sans réseau de concessions : la Confort est à ${CONFORT} TTC, garantie 2 ans.` },
    ],
  },
  {
    id: "coulisses", label: "Coulisses", prefer: "video", path: "/videos",
    match: /d[eé]charg|d[eé]pot|conteneur|container|camion|remorque|arrivage|sangle|quai|chargement|pr[eé]paration|atelier|entrep[oô]t|coulisse|transport/i,
    angles: ["coulisses"], bank: ["coulisses", "coulisses import Chine"],
    brief: "Les coulisses : arrivage des voitures, déchargement du conteneur ou du camion, préparation, remorque, route. Montre que c'est une vraie entreprise avec une vraie logistique. Décris seulement ce que le contexte indique.",
    fallback: [
      { hook: "Les coulisses avant qu'une NeoDrive arrive chez vous.", body: "Arrivage, déchargement, préparation, transport : chaque voiture passe entre nos mains avant d'être livrée." },
      { hook: "Ce que vous ne voyez pas sur le site.", body: "Avant la livraison, il y a l'arrivage, le déchargement et la préparation. Une vraie équipe, de vraies voitures, depuis Muret près de Toulouse." },
    ],
  },
];
export const PILLAR_IDS = pillars().map(p => p.id);

const STYLES = [
  "commence par une question directe au lecteur",
  "commence par un fait concret tiré du média",
  "liste courte de 3 points avec des tirets",
  "ton conversationnel, comme un message du fondateur",
  "commence par le chiffre clé, puis explique",
  "mini-histoire en 3 phrases (avant / pendant / après)",
];

const HASHTAGS: Record<PillarId, string[]> = {
  livraison: ["#Livraison", "#LivraisonADomicile", "#NouvelleVoiture", "#VoitureNeuve"],
  temoignage: ["#AvisClient", "#Temoignage", "#ClientContent", "#VraiClient"],
  faq: ["#PermisAM", "#Conseils", "#VoitureElectrique", "#Questions"],
  prix_stock: ["#EnStock", "#PrixDirect", "#VoitureNeuve", "#BonPlan"],
  comparaison: ["#VenteDirecte", "#Comparatif", "#PrixDirect", "#SansIntermediaire"],
  coulisses: ["#Coulisses", "#Logistique", "#Arrivage", "#Toulouse"],
};

// ───────────── contrôle des textes ─────────────
const COMPETITORS = /\b(aixam|ligier|microcar|chatenet|bellier|jdm|casalini|citro[eë]n|topolino|fiat|twizy|mobilize|opel|rocks-e|renault|dacia|tesla|silence\s*s0[14])\b/i;
const BATTERY = /lithium|li-?ion|lifepo|plomb|\bagm\b|\bgel\b|\bkwh\b/i;
const ALLOWED = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 14, 45, 50, 70, 100, 150, 220, 10000,
  VEHICLES.essentielle.price, VEHICLES.confort.price, VEHICLES.confortPlus.price, new Date().getFullYear()]);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const words = (s: string) => new Set(norm(s).split(" ").filter(w => w.length > 3));
function jaccard(a: string, b: string) {
  const A = words(a), B = words(b); if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / (A.size + B.size - n);
}
const firstLine = (s: string) => s.split("\n").map(x => x.trim()).find(Boolean) || "";

export function checkCaption(text: string, evidence: string, recent: string[]) {
  const nums = (text.match(/\d[\d\s  .]*\d|\d/g) || []).map(x => Number(x.replace(/[\s  .]/g, ""))).filter(Number.isFinite);
  const bad = nums.filter(n => !ALLOWED.has(n));
  if (bad.length) return `chiffre non vérifié : ${bad.slice(0, 3).join(", ")}`;
  const c = COMPETITORS.exec(text); if (c) return `concurrent cité : ${c[0]}`;
  if (BATTERY.test(text)) return "type de batterie mentionné";
  if (/\ble moins cher|\bles moins chers|moins chere? de france/i.test(norm(text))) return "« le moins cher » non vérifiable";
  const ev = norm(evidence);
  for (const q of text.match(/«([^»]{6,})»|"([^"]{6,})"/g) || []) {
    const inner = norm(q.replace(/[«»"]/g, ""));
    if (inner && !ev.includes(inner) && !/^(il faut|faut il|est ce|on paie|je peux|peut on|combien)/.test(inner)) return "citation absente du contexte";
  }
  const head = firstLine(text);
  for (const r of recent) {
    if (jaccard(head, firstLine(r)) > 0.5) return "accroche trop proche d'une publication récente";
    if (jaccard(text, r) > 0.45) return "légende trop proche d'une publication récente";
  }
  return null;
}

// ───────────── médias ─────────────
const isVideo = (type: string, url: string) => /video|reel/i.test(type || "") || /\.(mp4|mov|m4v)(\?|$)/i.test(url || "");
const clean = (v: unknown, n = 400) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

type AssetRow = { id: string; storage_path: string; public_url: string; media_type: string; title: string | null; context: string | null; ai_summary: string | null; ai_tags: string[] | null; times_used: number | null; created_at: string };

async function libraryMedia(db: Db): Promise<Media[]> {
  const { data } = await db.from("social_media_assets")
    .select("id,storage_path,public_url,media_type,title,context,ai_summary,ai_tags,times_used,created_at")
    .eq("status", "ready").order("created_at", { ascending: false }).limit(1000);
  return ((data || []) as AssetRow[])
    // Jamais d'affiche ni de visuel générés : seulement les photos et vidéos réelles envoyées par l'équipe.
    .filter(a => a.public_url && !/^generated\//.test(a.storage_path || "") && (isVideo(a.media_type, a.public_url) || /\.(jpe?g|png)(\?|$)/i.test(a.public_url)))
    .map(a => {
      const evidence = [a.context && `Note de l'équipe : ${clean(a.context)}`, a.ai_summary && `Analyse du média : ${clean(a.ai_summary)}`,
        a.ai_tags?.length && `Tags : ${a.ai_tags.slice(0, 8).join(", ")}`, a.title && `Nom du fichier : ${clean(a.title, 120)}`].filter(Boolean).join("\n");
      return {
        key: `asset:${a.id}`, source: "bibliotheque" as const, assetId: a.id, url: a.public_url, kind: isVideo(a.media_type, a.public_url) ? "video" as const : "image" as const,
        created_at: a.created_at, title: clean(a.title, 120), evidence, text: `${a.context || ""} ${a.title || ""} ${a.ai_summary || ""} ${(a.ai_tags || []).join(" ")}`, angle: null, timesUsed: Number(a.times_used || 0),
      };
    });
}

/** Vidéos de la Fabrique validées par le fondateur (cochées « Publiée sur TikTok »), hors financement (mention légale du crédit). */
async function fabriqueMedia(db: Db): Promise<Media[]> {
  const out: Proposal[] = [];
  try {
    const { data, error } = await db.from("video_proposals").select("*").eq("published", true).eq("status", "rendered").order("created_at", { ascending: false }).limit(60);
    if (!error) out.push(...((data || []) as Proposal[]));
    else for (const d of (await listDays(db)).slice(0, 21)) out.push(...(await listProposals(db, d)).filter(p => p.published && p.status === "rendered"));
  } catch { return []; }
  const ok = out.filter(p => p.render_path && p.angle !== "financement" && !/€\s*\/\s*mois|par mois|mensualit/i.test(`${p.script} ${p.caption} ${p.hook}`));
  if (!ok.length) return [];
  const { data: signed } = await db.storage.from(BUCKET).createSignedUrls(ok.map(p => p.render_path as string), 6 * 3600);
  const urls = new Map((signed || []).map(s => [s.path, s.signedUrl]));
  return ok.flatMap(p => {
    const url = urls.get(p.render_path as string); if (!url) return [];
    const evidence = [`Vidéo montée à partir de nos rushes réels, validée par le fondateur.`, `Accroche à l'écran : ${clean(p.hook, 160)}`, `Texte de la vidéo : ${clean(p.script, 700)}`].join("\n");
    return [{ key: `fabrique:${p.id}`, source: "fabrique" as const, assetId: null, url, kind: "video" as const, created_at: p.created_at, title: clean(p.title, 120), evidence, text: `${p.title} ${p.hook} ${p.script}`, angle: p.angle, timesUsed: 0, prewritten: { facebook: p.captions?.facebook, instagram: p.captions?.instagram } }];
  });
}

const matches = (p: Pillar, m: Media) => m.angle ? p.angles.includes(m.angle) : !!p.match && p.match.test(m.text);
const specific = (m: Media) => pillars().some(p => p.match && matches(p, m));

// ───────────── historique ─────────────
type HistRow = { media_url: string | null; media_brief: string | null; hook: string | null; caption: string | null; updated_at: string };
export type History = { rows: HistRow[]; usedKeys: Set<string>; usedUrls: Set<string>; recentTexts: string[]; pillarsOrder: PillarId[]; lastTags: string; today: number };

export function parseBrief(b: string | null) {
  const m = /^auto\|([a-z_]+)\|(\d+)\|(.+)$/.exec(b || "");
  if (m) return { pillar: m[1] as PillarId, style: Number(m[2]), key: m[3] };
  const old = /^(?:fresh-library|real-upload):(.+)$/.exec(b || "");
  return old ? { pillar: null, style: null, key: `asset:${old[1]}` } : null;
}

export async function loadHistory(db: Db, platform: Platform, now = new Date()): Promise<History> {
  const since = new Date(now.getTime() - 30 * 86400000).toISOString();
  const { data } = await db.from("social_content_queue").select("media_url,media_brief,hook,caption,updated_at")
    .eq("platform", platform).in("status", ["published", "publishing"]).gte("updated_at", since).order("updated_at", { ascending: false }).limit(120);
  const rows = (data || []) as HistRow[];
  const cutoff = now.getTime() - NO_REPEAT_DAYS * 86400000;
  const recent = rows.filter(r => new Date(r.updated_at).getTime() >= cutoff);
  const usedKeys = new Set(recent.map(r => parseBrief(r.media_brief)?.key).filter((x): x is string => !!x));
  const usedUrls = new Set(recent.map(r => (r.media_url || "").split("?")[0]).filter(Boolean));
  const pillarsOrder = rows.map(r => parseBrief(r.media_brief)?.pillar).filter((x): x is PillarId => !!x);
  const today = parisDay(now);
  return {
    rows, usedKeys, usedUrls, pillarsOrder,
    recentTexts: recent.map(r => `${r.hook || ""}\n${r.caption || ""}`.trim()).filter(Boolean).slice(0, 30),
    lastTags: rows[0]?.caption?.match(/#\w+/g)?.join(" ") || "",
    today: rows.filter(r => parisDay(new Date(r.updated_at)) === today).length,
  };
}

// ───────────── choix du sujet et du média ─────────────
export type Choice = { pillar: Pillar; media: Media; style: number };

export function choose(media: Media[], h: History, platform: Platform): Choice | null {
  const fresh = media.filter(m => !h.usedKeys.has(m.key) && !h.usedUrls.has(m.url.split("?")[0]));
  if (!fresh.length) return null;
  // Sujet publié le moins récemment d'abord ; à égalité, ordre décalé selon le réseau pour que Facebook et Instagram diffèrent le même jour.
  const offset = platform === "instagram" ? 3 : 0;
  const since = (id: PillarId) => { const i = h.pillarsOrder.indexOf(id); return i < 0 ? 1e6 : i; };
  const all = pillars();
  const order = all.map((p, i) => ({ p, i: (i + offset) % all.length }))
    .filter(x => x.p.id !== "prix_stock" || AVAILABILITY.confort.inStock)
    .sort((a, b) => since(b.p.id) - since(a.p.id) || a.i - b.i).map(x => x.p);
  const newest = (a: Media, b: Media) => b.created_at.localeCompare(a.created_at) || a.timesUsed - b.timesUsed;
  for (const p of order) {
    let pool = fresh.filter(m => matches(p, m));
    // Sujets généraux (question, prix, comparaison) : n'importe quelle vraie photo / vidéo, en gardant les livraisons et témoignages pour leur sujet.
    if (!p.match) pool = [...pool.sort(newest), ...fresh.filter(m => !m.angle && !specific(m)).sort(newest)];
    else pool.sort(newest);
    if (p.prefer) pool.sort((a, b) => (a.kind === p.prefer ? 0 : 1) - (b.kind === p.prefer ? 0 : 1));
    const m = pool[0];
    if (m) {
      const lastStyle = h.rows.map(r => parseBrief(r.media_brief)?.style).filter((x): x is number => typeof x === "number").slice(0, 3);
      const styles = STYLES.map((_, i) => i).filter(i => !lastStyle.includes(i));
      return { pillar: p, media: m, style: styles[Math.floor(Math.random() * styles.length)] ?? 0 };
    }
  }
  return null;
}

// ───────────── légende ─────────────
function hashtags(p: Pillar, platform: Platform, last: string) {
  const pool = HASHTAGS[p.id].filter(t => !last.includes(t));
  const extra = (pool.length >= 2 ? pool : HASHTAGS[p.id]).slice().sort(() => Math.random() - 0.5).slice(0, platform === "instagram" ? 3 : 1);
  return ["#NeoDrive", "#VoitureSansPermis", ...extra].join(" ");
}

function cta(p: Pillar, platform: Platform) {
  const url = `${SITE}${p.path}?utm_source=${platform}&utm_medium=organic_social&utm_campaign=auto_${p.id}`;
  return platform === "instagram" ? "Prix livré chez vous en 1 minute : lien en bio (easydrive-auto.fr)." : `Prix livré chez vous en 1 minute : ${url}`;
}

function fallbackCaption(c: Choice, platform: Platform, recent: string[]) {
  const options = c.pillar.fallback.filter(f => !recent.some(r => jaccard(f.hook, firstLine(r)) > 0.5));
  const f = (options.length ? options : c.pillar.fallback)[Math.floor(Math.random() * (options.length || c.pillar.fallback.length))];
  return { hook: f.hook, text: `${f.hook}\n\n${f.body}`, ai: false };
}

export async function writeCaption(c: Choice, platform: Platform, h: History) {
  const recent = h.recentTexts;
  const tags = hashtags(c.pillar, platform, h.lastTags);
  const finish = (x: { hook: string; text: string; ai: boolean }, why: string | null = null) =>
    ({ hook: x.hook.slice(0, 180), caption: `${x.text.trim()}\n\n${cta(c.pillar, platform)}\n\n${tags}`, ai: x.ai, rejected: why });
  const pre = c.media.prewritten?.[platform]?.trim();
  if (pre && !checkCaption(pre, c.media.evidence + "\n" + pre, recent)) {
    const hook = firstLine(pre);
    return { hook: hook.slice(0, 180), caption: /easydrive-auto\.fr/.test(pre) ? pre : `${pre}\n\n${cta(c.pillar, platform)}`, ai: false, rejected: null };
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) return finish(fallbackCaption(c, platform, recent), "IA non configurée");
  const bank = (TEMPLATES.hooks || []).filter(x => c.pillar.bank.includes(x.type) && !/\[[^\]]*\]/.test(x.text) && !checkCaption(x.text, "", [])).map(x => `- ${x.text}`).slice(0, 6).join("\n");
  const avoid = recent.slice(0, 20).map(t => `- ${firstLine(t).slice(0, 140)}`).join("\n");
  const client = new OpenAI({ apiKey: key });
  let why: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = `Tu rédiges une publication ${platform === "instagram" ? "Instagram" : "Facebook"} pour NeoDrive, vendeur français de voitures sans permis électriques neuves.
Sujet du jour : ${c.pillar.label}. ${c.pillar.brief}
Média publié (${c.media.kind === "video" ? "vidéo" : "photo"} réelle) :
${c.media.evidence || "Aucune description : reste général, ne décris pas l'image."}

Faits autorisés (aucun autre chiffre, aucune autre promesse) :
${facts()}

Style imposé : ${STYLES[c.style]}.
${bank ? `Accroches qui marchent sur notre compte (inspire-toi, ne recopie pas) :\n${bank}\n` : ""}Accroches déjà publiées ces ${NO_REPEAT_DAYS} derniers jours (interdit de les reprendre ou de commencer pareil) :
${avoid || "- aucune"}
${why ? `\nTa proposition précédente a été refusée : ${why}. Corrige.\n` : ""}
Règles : français naturel et chaleureux, phrases courtes ; ${platform === "instagram" ? "50 à 90 mots, 1 à 3 emojis" : "50 à 110 mots, 0 à 2 emojis"} ; aucune marque concurrente ; ne parle jamais du type de batterie ; n'invente ni client, ni prénom, ni ville, ni avis, ni citation, ni chiffre ; pas de « le moins cher » ; pas de hashtags ni de lien (ajoutés automatiquement) ; pas de mots anxiogènes (panne, arnaque).
Réponds uniquement en JSON : {"hook":"première phrase (max 12 mots)","caption":"texte complet, qui commence par l'accroche"}`;
    try {
      const r = await client.responses.create({ model: process.env.OPENAI_SOCIAL_MODEL || "gpt-4.1-mini", input: prompt, max_output_tokens: 600 });
      const j = JSON.parse((r.output_text || "").trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim()) as { hook?: unknown; caption?: unknown };
      const hook = clean(j.hook, 180), text = String(j.caption || "").replace(/#\w+/g, "").replace(/https?:\/\/\S+/g, "").trim();
      if (!hook || text.length < 40 || text.length > 1500) { why = "réponse incomplète"; continue; }
      why = checkCaption(`${hook}\n${text}`, c.media.evidence, recent);
      if (!why) return finish({ hook, text: text.toLowerCase().startsWith(hook.toLowerCase().slice(0, 20)) ? text : `${hook}\n\n${text}`, ai: true });
    } catch (e) { why = "IA indisponible : " + (e as Error).message.slice(0, 80); }
  }
  return finish(fallbackCaption(c, platform, recent), why);
}

// ───────────── point d'entrée ─────────────
export type Plan = { skip: string } | { choice: Choice; hook: string; caption: string; brief: string; ai: boolean; rejected: string | null };

export async function planAutoPost(platform: Platform, opts: { manual?: boolean } = {}): Promise<Plan> {
  const db = crmDatabase();
  // Anciens créneaux de l'ancien planificateur (4 par jour) : on les retire pour qu'ils ne repassent jamais.
  await db.from("social_content_queue").delete().eq("platform", platform).eq("status", "scheduled").like("media_brief", "real-upload:%");
  const h = await loadHistory(db, platform);
  if (!opts.manual && h.today >= 1) return { skip: `Déjà une publication aujourd'hui sur ${platform} (1 par jour maximum).` };
  const media = [...await libraryMedia(db), ...await fabriqueMedia(db)];
  if (!media.length) return { skip: "Aucune vraie photo ou vidéo dans la bibliothèque." };
  const choice = choose(media, h, platform);
  if (!choice) return { skip: `Tous les médias ont déjà été publiés sur ${platform} ces ${NO_REPEAT_DAYS} derniers jours : ajoutez de nouvelles vidéos (/social-upload).` };
  const copy = await writeCaption(choice, platform, h);
  return { choice, hook: copy.hook, caption: copy.caption, ai: copy.ai, rejected: copy.rejected, brief: `auto|${choice.pillar.id}|${choice.style}|${choice.media.key}` };
}

/** Après une publication réussie : historique (anti-répétition) et compteur d'usage du média. */
export async function recordAutoPost(platform: Platform, plan: Extract<Plan, { choice: Choice }>, externalId: string) {
  const db = crmDatabase(); const now = new Date().toISOString();
  const m = plan.choice.media;
  const { error } = await db.from("social_content_queue").insert({
    platform, content_type: m.kind === "video" ? "reel" : "post", hook: plan.hook, caption: plan.caption, hashtags: plan.caption.match(/#\w+/g) || [],
    media_brief: plan.brief, media_url: m.source === "fabrique" ? `fabrique:${m.key.slice(9)}` : m.url, cta: "easydrive-auto.fr",
    publish_at: now, status: "published", requires_human_review: false, external_post_id: externalId, retry_count: 0, max_retries: 3, updated_at: now,
  });
  if (m.assetId) await db.from("social_media_assets").update({ times_used: m.timesUsed + 1, last_used_at: now, updated_at: now }).eq("id", m.assetId);
  if (error) throw new Error("Publication réussie mais enregistrement impossible : vérifier le réseau avant de relancer");
}
