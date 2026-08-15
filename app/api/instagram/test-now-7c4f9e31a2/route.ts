import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE_URL = "https://www.easydrive-auto.fr";

function extractText(data: any): string | null {
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content?.text === "string") return content.text.trim();
    }
  }
  return null;
}

async function generateCaption() {
  const key = process.env.OPENAI_API_KEY;
  const fallback = "NeoDrive ⚡ Une mobilité électrique simple pour vos déplacements du quotidien. 100 % électrique, 2 places, jusqu’à 45 km/h et recharge sur prise 220 V. Gamme à partir de 3 990 €.\n\n#NeoDrive #VoitureSansPermis #VoitureElectrique #MobiliteElectrique #VSP";
  if (!key) return fallback;

  const prompt = `Rédige une légende Instagram en français pour NeoDrive, marque de voiture électrique sans permis. Thème : mobilité électrique simple, compacte et accessible pour les déplacements du quotidien. Faits autorisés uniquement : 100 % électrique, 2 places, vitesse maximale réglementaire 45 km/h, recharge sur prise 220 V, gamme à partir de 3 990 €. 400 à 700 caractères, accroche courte, quelques emojis, 5 à 8 hashtags, pas de markdown, ne rien inventer.`;

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

export async function GET() {
  const secret = process.env.INSTAGRAM_AUTOMATION_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "INSTAGRAM_AUTOMATION_SECRET missing" }, { status: 503 });

  const caption = await generateCaption();
  const response = await fetch(`${BASE_URL}/api/instagram/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      imageUrl: `${BASE_URL}/hero.png`,
      caption,
    }),
    cache: "no-store",
  });

  const data = await response.json();
  return NextResponse.json({
    ok: response.ok && data?.published === true,
    test: "immediate-automation",
    generatedCaption: caption,
    publisher: data,
  }, { status: response.ok ? 200 : response.status });
}
