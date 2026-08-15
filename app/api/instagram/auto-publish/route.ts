import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE_URL = "https://www.easydrive-auto.fr";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type MediaItem = {
  path: string;
  type: "image" | "reel";
  theme: string;
  fallback?: string;
};

const MORNING_MEDIA: MediaItem[] = [
  { path: "/hero.png", type: "image", theme: "mobilité électrique simple et accessible" },
  { path: "/img1.png", type: "image", theme: "design compact et déplacements du quotidien" },
  { path: "/img2.png", type: "image", theme: "voiture sans permis électrique et simplicité d'utilisation" },
  { path: "/img3.png", type: "image", theme: "confort et praticité pour les trajets de proximité" },
  { path: "/france4.jpg", type: "image", theme: "NeoDrive en France et mobilité de proximité" },
  { path: "/neodrive-instagram-test.jpg", type: "image", theme: "présentation du véhicule NeoDrive" },
];

const EVENING_MEDIA: MediaItem[] = [
  { path: "/client1.mp4", type: "reel", theme: "expérience client et véhicule en situation réelle", fallback: "/neodrive-instagram-test.jpg" },
  { path: "/essai-route.mp4", type: "reel", theme: "essai routier et mobilité au quotidien", fallback: "/hero.png" },
  { path: "/client2.mp4", type: "reel", theme: "présentation dynamique du véhicule", fallback: "/img1.png" },
  { path: "/interieur.mp4", type: "reel", theme: "intérieur, confort et équipements", fallback: "/img2.png" },
  { path: "/hero.png", type: "image", theme: "offre NeoDrive à partir de 3 990 €" },
  { path: "/neodrive-instagram-test.jpg", type: "image", theme: "découverte du véhicule électrique sans permis" },
];

const FACTS = `
Faits autorisés sur NeoDrive :
- voiture électrique sans permis
- 100 % électrique
- 2 places
- vitesse maximale réglementaire : 45 km/h
- recharge sur prise 220 V
- gamme à partir de 3 990 €
- marque NeoDrive
Ne jamais inventer autonomie, stock, délai, garantie, remise, financement, nombre de ventes ou caractéristiques non fournies.
`;

function parisParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
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

function selectMedia(dateKey: string, slot: "morning" | "evening") {
  const pool = slot === "morning" ? MORNING_MEDIA : EVENING_MEDIA;
  return pool[hash(`${dateKey}-${slot}`) % pool.length];
}

function extractText(data: any): string | null {
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content?.text === "string") return content.text.trim();
    }
  }
  return null;
}

async function generateCaption(theme: string, slot: "morning" | "evening") {
  const key = process.env.OPENAI_API_KEY;
  const fallback = slot === "morning"
    ? `NeoDrive ⚡ Une mobilité électrique simple pour les déplacements du quotidien.\n\n100 % électrique • 2 places • jusqu’à 45 km/h • recharge sur prise 220 V.\n\n#NeoDrive #VoitureSansPermis #VoitureElectrique #MobiliteElectrique #VSP`
    : `Découvrez NeoDrive ⚡🚗 La voiture électrique sans permis pensée pour une mobilité simple et pratique.\n\nGamme à partir de 3 990 €.\n\n#NeoDrive #SansPermis #VoitureElectrique #Mobilite #Electrique`;
  if (!key) return fallback;

  const prompt = `Tu es le responsable social media de NeoDrive en France. Rédige UNE légende Instagram en français, naturelle, crédible et non répétitive, pour un contenu dont le thème est : ${theme}. Le créneau est ${slot === "morning" ? "matin : informer/rassurer" : "soir : produit/démonstration"}. 500 à 900 caractères maximum. Commence par une accroche courte. Utilise quelques emojis mais pas trop. Termine par 5 à 8 hashtags pertinents. Pas de markdown, pas de guillemets. ${FACTS}`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-5.6", input: prompt, store: false }),
      cache: "no-store",
    });
    const data = await response.json();
    const text = response.ok ? extractText(data) : null;
    return text && text.length <= 2200 ? text : fallback;
  } catch {
    return fallback;
  }
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
  const publicUrl = `${BASE_URL}${media.path}`;
  if (media.type === "reel") {
    params.media_type = "REELS";
    params.video_url = publicUrl;
    params.share_to_feed = "true";
  } else {
    params.image_url = publicUrl;
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data?.id) throw new Error(data?.error?.message ?? "Container creation failed");
  return data.id as string;
}

async function publishContainer(accountId: string, id: string, token: string) {
  await sleep(4000);
  let lastError = "Instagram publish failed";
  for (let attempt = 0; attempt < 5; attempt++) {
    const url = new URL(`https://graph.instagram.com/${accountId}/media_publish`);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ creation_id: id, access_token: token }),
      cache: "no-store",
    });
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
    const media = selectMedia(slot.dateKey, slot.slot);
    const caption = await generateCaption(media.theme, slot.slot);
    const account = await getAccount(token);
    const result = await publishMedia(account, token, media, caption);
    return NextResponse.json({ ok: true, published: true, slot: slot.slot, date: slot.dateKey, account: account.username ?? null, mediaId: result.mediaId, media: result.used.path, mediaType: result.used.type, reelFallbackReason: result.reelError ?? null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
