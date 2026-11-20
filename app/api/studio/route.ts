import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";

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

const SCRIPT_STATUS = ["idée", "tourné", "publié", "abandonné"];
const ANGLES: Record<string, string> = {
  libre: "au choix, le plus efficace",
  livraison: "une livraison du jour chez un client (route, remorque, remise des clés, réaction du client)",
  coulisses: "les coulisses de la livraison : charger 2 voitures sur la remorque, les sangles, la route, les kilomètres",
  prix: "le prix qui fait débattre : une voiture neuve au prix d'un scooter, comparaison avec la location ou l'occasion",
  question: "la réponse à une question fréquente de client (permis AM dès 14 ans, autonomie, recharge, carte grise, paiement à la livraison)",
  confiance: "rassurer contre la peur de l'arnaque : vraie entreprise, vraies livraisons, paiement à la livraison, avis clients",
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

  // ── Scripts vidéo (face caméra et voix off) écrits par l'IA, bibliothèque et performances
  if (b.action === "script_list") {
    const { data, error } = await crmDatabase().from("content_scripts").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, scripts: data || [] });
  }
  if (b.action === "script_save") {
    const sc = b.script && typeof b.script === "object" ? b.script : null; if (!sc) return NextResponse.json({ ok: false, error: "Script manquant" }, { status: 400 });
    const { data, error } = await crmDatabase().from("content_scripts").insert({ context: String(b.context || "").slice(0, 400) || null, script: sc }).select("*").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, script: data });
  }
  if (b.action === "script_update") {
    const id = Number(b.id); if (!id) return NextResponse.json({ ok: false, error: "id manquant" }, { status: 400 });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (SCRIPT_STATUS.includes(String(b.status))) { patch.status = String(b.status); if (b.status === "publié") patch.published_at = new Date().toISOString(); }
    for (const k of ["views", "likes", "comments"] as const) if (b[k] !== undefined) patch[k] = b[k] === "" || b[k] === null ? null : Math.max(0, Math.round(Number(b[k]) || 0));
    if (b.notes !== undefined) patch.notes = String(b.notes || "").slice(0, 500) || null;
    if (b.delete) { await crmDatabase().from("content_scripts").delete().eq("id", id); return NextResponse.json({ ok: true }); }
    const { error } = await crmDatabase().from("content_scripts").update(patch).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "scripts") {
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ ok: false, error: "Clé IA absente" }, { status: 503 });
    const context = String(b.context || "").trim().slice(0, 600);
    const angle = ANGLES[String(b.angle)] || ANGLES.libre;
    const n = Math.min(Math.max(Number(b.count) || 3, 1), 5);
    // Ce qui a marché : les scripts publiés avec le plus de vues servent d'exemples à l'IA.
    const { data: best } = await crmDatabase().from("content_scripts").select("script,views,comments,notes").eq("status", "publié").not("views", "is", null).order("views", { ascending: false }).limit(5);
    const examples = (best || []).map(x => `- ${x.views} vues${x.comments ? `, ${x.comments} commentaires` : ""} : accroche « ${String((x.script as Record<string, unknown>)?.hook || "")} »${x.notes ? ` (${x.notes})` : ""}`).join("\n");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `Tu écris des scripts de vidéos courtes (TikTok, Reels, Shorts, 20 à 45 secondes) pour NeoDrive. Celui qui filme est le fondateur, Mansour, pendant ses livraisons avec sa remorque : il parle naturellement, tutoie peu, filme au téléphone.
Faits (n'invente rien d'autre, aucun chiffre hors de cette liste) : ${FACTS}
Ce qui marche le mieux sur notre compte : une accroche qui touche un problème du spectateur dans les 2 premières secondes (budget, liberté, ado, retraité sans permis), un chiffre choc vrai (4 990 € neuve), une comparaison qui fait débattre en commentaire (scooter, location, voiture d'occasion), les coulisses vraies (remorque, sangles, route, remise des clés), le fondateur face caméra.
${examples ? `Nos meilleures vidéos :\n${examples}\n` : ""}Angle demandé : ${angle}.
${context ? `Contexte du jour (à utiliser) : « ${context} ».\n` : ""}Règles : français oral simple, phrases courtes ; jamais de promesse fausse ; le prix « dès 4 990 € » doit toujours être nuancé dans le commentaire épinglé (livraison selon la distance, carte grise 150 €) ; pas de mots anxiogènes (panne, problème) ; pas de dénigrement de concurrents nommés.
Écris ${n} scripts différents (accroches et angles variés). Pour chacun :
- "title" : titre interne court
- "hook" : la phrase d'accroche dite dans les 2 premières secondes (max 15 mots)
- "onscreen" : le texte à afficher en gros sur la vidéo (max 8 mots)
- "format" : "face caméra" ou "voix off sur images"
- "shots" : liste de 3 à 6 plans à filmer, dans l'ordre (ex. "Plan large de la remorque avec 2 voitures")
- "face" : le texte complet à dire face caméra (si format face caméra, sinon "")
- "voiceover" : le texte complet de la voix off à lire sur les images (toujours rempli, 50 à 110 mots)
- "cta" : la phrase de fin (ex. « Livraison partout en France, lien dans la bio »)
- "pinned" : le commentaire à épingler (transparent sur le prix)
- "caption" : légende TikTok (max 150 caractères) + 4 à 6 hashtags
- "why" : en une phrase, pourquoi ça devrait marcher
Réponds uniquement en JSON strict : {"scripts":[{...}]}`;
    try {
      const r = await client.responses.create({ model: process.env.OPENAI_SOCIAL_MODEL || "gpt-5-mini", input: prompt, max_output_tokens: 6000 });
      const txt = r.output_text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      const j = JSON.parse(txt) as { scripts?: Record<string, unknown>[] };
      const str = (v: unknown, m: number) => String(v ?? "").slice(0, m);
      const scripts = (j.scripts || []).slice(0, n).map(x => ({ title: str(x.title, 120), hook: str(x.hook, 200), onscreen: str(x.onscreen, 120), format: str(x.format, 40), shots: Array.isArray(x.shots) ? x.shots.slice(0, 8).map(v => str(v, 200)) : [], face: str(x.face, 1500), voiceover: str(x.voiceover, 1500), cta: str(x.cta, 200), pinned: str(x.pinned, 400), caption: str(x.caption, 400), why: str(x.why, 300) }));
      if (!scripts.length) throw new Error("réponse vide");
      return NextResponse.json({ ok: true, scripts });
    } catch (e) {
      return NextResponse.json({ ok: false, error: "L’IA n’a pas répondu, réessayez. " + (e instanceof Error ? e.message.slice(0, 120) : "") }, { status: 502 });
    }
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
