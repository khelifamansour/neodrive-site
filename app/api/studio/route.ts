import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isAuthorized } from "../../../lib/integrations";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const FACTS = `NeoDrive : voiture sans permis 100 % électrique, neuve, marque toulousaine (Muret). Carrosserie en acier. Prix : Essentielle 3 990 € TTC, Confort 4 990 € TTC (caméra de recul, chauffage, Bluetooth, alarme), Confort Plus 5 990 € TTC (charge rapide, autonomie renforcée). Ne jamais mentionner le type de batterie. 45 km/h, 2 places, dès 14 ans avec le permis AM, autonomie indicative 50 à 70 km, recharge sur prise 220 V. Livraison à domicile partout en France, 0 € d'acompte, paiement à la livraison, carte grise gérée (150 €), garantie 2 ans. Site : easydrive-auto.fr`;

const TYPES: Record<string, string> = {
  livraison: "une vidéo de livraison chez un client",
  question: "une réponse face caméra à une question fréquente de client",
  face: "une prise de parole du fondateur face caméra",
  arrivage: "une vidéo d'arrivage de voitures sur camion",
  essai: "une vidéo de la voiture qui roule / prise en main",
  avis: "la lecture d'un avis client",
};

/** Studio : textes prêts à publier pour TikTok, Facebook et Instagram, et envoi en brouillon TikTok. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const secret = process.env.CRON_SECRET;
  if (!isAuthorized(req, b.passcode)) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });

  if (b.action === "tiktok") {
    const origin = new URL(req.url).origin;
    const r = await fetch(`${origin}/api/tiktok/publish-reel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: secret, videoUrl: b.videoUrl, caption: String(b.caption || "").slice(0, 2200) }) });
    const j = await r.json().catch(() => ({}));
    return NextResponse.json({ ok: !!j.ok, mode: j.mode || null, error: j.error || null, note: j.note || null }, { status: j.ok ? 200 : 502 });
  }

  const description = String(b.description || "").trim().slice(0, 800);
  if (description.length < 3) return NextResponse.json({ ok: false, error: "Décrivez la vidéo en quelques mots." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ ok: false, error: "Clé IA absente" }, { status: 503 });
  const kind = TYPES[String(b.type)] || "une vidéo NeoDrive";
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `Tu es le community manager de NeoDrive. Faits (n'invente rien d'autre) : ${FACTS}
Vidéo : ${kind}. Description du fondateur : « ${description} ».
Écris en français naturel, chaleureux, crédible, sans superlatifs creux ni promesses non listées dans les faits, sans mots anxiogènes (panne, problème, SAV) :
- "hook" : l'accroche à afficher en gros dans la première seconde de la vidéo (max 8 mots).
- "tiktok" : légende TikTok courte (max 150 caractères) + 4 à 6 hashtags pertinents (#voituresanspermis #neodrive …).
- "facebook" : post Facebook de 2 à 4 phrases, se termine par « Prix livré en 1 minute : easydrive-auto.fr ».
- "instagram" : légende Instagram de 2 à 3 phrases avec 2-3 emojis, puis 8 à 12 hashtags sur une ligne séparée.
- "idea" : une idée de vidéo suivante à tourner (1 phrase).
Réponds uniquement en JSON strict : {"hook":"","tiktok":"","facebook":"","instagram":"","idea":""}`;
  try {
    const r = await client.responses.create({ model: process.env.OPENAI_SOCIAL_MODEL || "gpt-5-mini", input: prompt, max_output_tokens: 1200 });
    const txt = r.output_text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const j = JSON.parse(txt);
    return NextResponse.json({ ok: true, hook: String(j.hook || ""), tiktok: String(j.tiktok || ""), facebook: String(j.facebook || ""), instagram: String(j.instagram || ""), idea: String(j.idea || "") });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "L’IA n’a pas répondu, réessayez. " + (e instanceof Error ? e.message.slice(0, 120) : "") }, { status: 502 });
  }
}
