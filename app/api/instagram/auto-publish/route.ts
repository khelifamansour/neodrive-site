import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE_URL = "https://www.easydrive-auto.fr";
const SUPABASE_URL = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type MediaItem = {
  id?: string;
  path: string;
  publicUrl?: string;
  type: "image" | "reel";
  theme: string;
  title?: string | null;
  context?: string | null;
  timesUsed?: number;
  fallback?: string;
};

const MORNING_MEDIA: MediaItem[] = [
  { path: "/hero.png", type: "image", theme: "mobilité électrique simple et accessible" },
  { path: "/img1.png", type: "image", theme: "design compact et déplacements du quotidien" },
  { path: "/img2.png", type: "image", theme: "voiture sans permis électrique et simplicité d'utilisation" },
  { path: "/img3.png", type: "image", theme: "confort et praticité pour les trajets de proximité" },
  { path: "/france4.jpg", type: "image", theme: "NeoDrive en France et mobilité de proximité" },
];

const EVENING_MEDIA: MediaItem[] = [
  { path: "/client1.mp4", type: "reel", theme: "expérience client et véhicule en situation réelle", fallback: "/hero.png" },
  { path: "/essai-route.mp4", type: "reel", theme: "essai routier et mobilité au quotidien", fallback: "/hero.png" },
  { path: "/client2.mp4", type: "reel", theme: "présentation dynamique du véhicule", fallback: "/img1.png" },
  { path: "/interieur.mp4", type: "reel", theme: "intérieur, confort et équipements", fallback: "/img2.png" },
  { path: "/hero.png", type: "image", theme: "offre NeoDrive à partir de 3 990 €" },
];

const FACTS = `
Faits autorisés sur NeoDrive : voiture électrique sans permis, 100 % électrique, 2 places, vitesse maximale réglementaire 45 km/h, recharge sur prise 220 V, gamme à partir de 3 990 €.
Ne jamais inventer autonomie, stock, délai, garantie, remise, financement, nombre de ventes ou caractéristiques non fournies.
`;

function parisParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return { dateKey: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

function getSlot() {
  const now = parisParts();
  if (now.hour === 9 && now.minute >= 20 && now.minute <= 55) return { slot: "morning" as const, ...now };
  if (now.hour === 18 && now.minute >= 20 && now.minute <= 55) return { slot: "evening" as const, ...now };
  return null;
}

function selectFallback(dateKey: string, slot: "morning" | "evening") {
  const pool = slot === "morning" ? MORNING_MEDIA : EVENING_MEDIA;
  return pool[hash(`${dateKey}-${slot}`) % pool.length];
}

async function selectSupabaseMedia(): Promise<MediaItem | null> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const url = new URL(`${SUPABASE_URL}/rest/v1/social_media_assets`);
  url.searchParams.set("status", "eq.ready");
  url.searchParams.set("select", "id,storage_path,public_url,media_type,title,context,times_used");
  url.searchParams.set("order", "times_used.asc,priority.desc,created_at.asc");
  url.searchParams.set("limit", "1");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}`, apikey: key }, cache: "no-store" });
  const rows = await res.json();
  if (!res.ok || !Array.isArray(rows) || !rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    path: r.storage_path,
    publicUrl: r.public_url,
    type: r.media_type === "reel" ? "reel" : "image",
    theme: r.context || r.title || "activité réelle de NeoDrive",
    title: r.title,
    context: r.context,
    timesUsed: Number(r.times_used || 0),
  };
}

async function markUsed(media: MediaItem) {
  if (!media.id) return;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return;
  await fetch(`${SUPABASE_URL}/rest/v1/social_media_assets?id=eq.${encodeURIComponent(media.id)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ times_used: (media.timesUsed || 0) + 1, last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
}

function extractText(data: any): string | null {
  for (const item of data?.output ?? []) for (const content of item?.content ?? []) if (content?.type === "output_text" && typeof content?.text === "string") return content.text.trim();
  return null;
}

async function generateCaption(media: MediaItem, slot: "morning" | "evening") {
  const key = process.env.OPENAI_API_KEY;
  const fallback = `Aujourd’hui chez NeoDrive : ${media.title || media.theme}. 🚗⚡\n\n#NeoDrive #VoitureSansPermis #VoitureElectrique #MobiliteElectrique`;
  if (!key) return fallback;
  const realContext = [media.title && `Titre donné par l'équipe : ${media.title}`, media.context && `Ce qui se passe réellement dans le média : ${media.context}`].filter(Boolean).join("\n");
  const prompt = `Tu écris comme le dirigeant ou un membre de l'équipe NeoDrive qui documente simplement son activité quotidienne sur Instagram. Le texte doit sembler humain, spontané, concret et crédible, jamais comme une publicité générée par IA. Évite absolument les formules comme « découvrez », « passez à », « révolutionnez », « mobilité de demain », « pensée pour vous », et les listes de caractéristiques sauf si elles sont naturellement utiles. Fais 2 à 5 phrases courtes, 180 à 450 caractères, 0 à 2 emojis, puis 3 à 5 hashtags maximum. Pas de markdown, pas de guillemets. Si un contexte réel est fourni, base le post principalement dessus. Créneau : ${slot === "morning" ? "matin" : "soir"}.\n${realContext || `Sujet : ${media.theme}`}\n${FACTS}`;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: "gpt-5.6", input: prompt, store: false }), cache: "no-store" });
    const data = await response.json();
    const text = response.ok ? extractText(data) : null;
    return text && text.length <= 2200 ? text : fallback;
  } catch { return fallback; }
}

async function getAccount(token: string) {
  const url = new URL("https://graph.instagram.com/me");
  url.searchParams.set("fields", "id,username");
  url.searchParams.set("access_token", token);
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data?.id) throw new Error(data?.error?.message ?? "Unable to resolve Instagram account");
  return data as { id: string; username?: string };
}

async function waitForContainer(id: string, token: string) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const url = new URL(`https://graph.instagram.com/${id}`);
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", token);
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();
    if (data?.status_code === "FINISHED") return;
    if (data?.status_code === "ERROR" || data?.status_code === "EXPIRED") throw new Error(`Media processing failed: ${JSON.stringify(data)}`);
    await sleep(2000);
  }
  throw new Error("Media processing timeout");
}

async function createContainer(accountId: string, token: string, media: MediaItem, caption: string) {
  const url = new URL(`https://graph.instagram.com/${accountId}/media`);
  const params: Record<string, string> = { caption, access_token: token };
  const publicUrl = media.publicUrl || `${BASE_URL}${media.path}`;
  if (media.type === "reel") { params.media_type = "REELS"; params.video_url = publicUrl; params.share_to_feed = "true"; }
  else params.image_url = publicUrl;
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params), cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data?.id) throw new Error(data?.error?.message ?? "Container creation failed");
  return data.id as string;
}

async function publishContainer(accountId: string, id: string, token: string) {
  await sleep(4000);
  let lastError = "Instagram publish failed";
  for (let attempt = 0; attempt < 5; attempt++) {
    const url = new URL(`https://graph.instagram.com/${accountId}/media_publish`);
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ creation_id: id, access_token: token }), cache: "no-store" });
    const data = await response.json();
    if (response.ok && data?.id) return data.id as string;
    lastError = data?.error?.message ?? lastError;
    if (!lastError.toLowerCase().includes("media id is not available")) break;
    await sleep(3000);
  }
  throw new Error(lastError);
}

async function publishMedia(account: { id: string }, token: string, media: MediaItem, caption: string) {
  try {
    const containerId = await createContainer(account.id, token, media, caption);
    await waitForContainer(containerId, token);
    return { mediaId: await publishContainer(account.id, containerId, token), used: media };
  } catch (error) {
    if (media.type === "reel" && media.fallback) {
      const fallback: MediaItem = { path: media.fallback, type: "image", theme: media.theme };
      const containerId = await createContainer(account.id, token, fallback, caption);
      await waitForContainer(containerId, token);
      return { mediaId: await publishContainer(account.id, containerId, token), used: fallback, reelError: error instanceof Error ? error.message : "Reel failed" };
    }
    throw error;
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const automationSecret = process.env.INSTAGRAM_AUTOMATION_SECRET;
  const auth = request.headers.get("authorization");
  const authorized = (cronSecret && auth === `Bearer ${cronSecret}`) || (automationSecret && auth === `Bearer ${automationSecret}`);
  if (!authorized) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const slot = getSlot();
  if (!slot) return NextResponse.json({ ok: true, skipped: true, reason: "Outside Paris publishing window" });
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: "INSTAGRAM_ACCESS_TOKEN missing" }, { status: 503 });

  try {
    const media = (await selectSupabaseMedia()) || selectFallback(slot.dateKey, slot.slot);
    const caption = await generateCaption(media, slot.slot);
    const account = await getAccount(token);
    const result = await publishMedia(account, token, media, caption);
    if (media.id) await markUsed(media);
    return NextResponse.json({ ok: true, published: true, slot: slot.slot, date: slot.dateKey, account: account.username ?? null, mediaId: result.mediaId, media: result.used.publicUrl || result.used.path, mediaType: result.used.type, source: media.id ? "supabase" : "fallback", reelFallbackReason: result.reelError ?? null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
