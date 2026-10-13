import "server-only";
import OpenAI from "openai";
import { buildSocialCaption, cleanContext, type SocialAssetLike, type SocialTheme } from "@/lib/social-copy";

type Platform = "instagram" | "facebook";

function extractJson(value: string) {
  const text = value.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(text);
  const hook = String(parsed?.hook || "").trim();
  const caption = String(parsed?.caption || "").trim();
  if (!hook || !caption || caption.length > 2100) throw new Error("Invalid social copy");
  return { hook: hook.slice(0, 180), caption };
}

export async function buildCoherentSocialCopy(options: {
  platform: Platform;
  theme: SocialTheme;
  asset: SocialAssetLike;
  recentTexts?: string[];
}) {
  const { platform, theme, asset } = options;
  const fallback = { hook: theme.hook, caption: buildSocialCaption(theme, asset, `${platform}-fallback`) };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  const context = cleanContext(asset.context);
  const summary = cleanContext(asset.ai_summary);
  const tags = (asset.ai_tags || []).map(String).slice(0, 8).join(", ");
  const recent = (options.recentTexts || []).slice(0, 8).map((text) => text.slice(0, 220)).join("\n---\n");
  const mediaEvidence = [
    context && `Note humaine: ${context}`,
    summary && `Analyse du média: ${summary}`,
    tags && `Tags: ${tags}`,
    asset.title && `Nom/titre: ${String(asset.title).slice(0, 160)}`,
  ].filter(Boolean).join("\n") || "Aucun contexte visuel fiable. Reste neutre sur ce qui est montré.";

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: process.env.OPENAI_SOCIAL_MODEL || "gpt-4.1-mini",
      input: `Tu es le rédacteur social media de NeoDrive, marque française de voitures sans permis électriques.\n\nRéseau: ${platform}.\nType de média: ${asset.media_type || "média"}.\nContexte fiable du média:\n${mediaEvidence}\n\nAngle suggéré: ${theme.hook}\nFond factuel suggéré: ${theme.body}\n\nFaits autorisés: voiture sans permis électrique, 2 places, vitesse maximale 45 km/h, recharge sur prise 220 V, gamme à partir de 3 990 € TTC sur commande, vente directe, livraison en France, paiement du véhicule à la livraison selon les modalités convenues.\n\nRègles impératives:\n- La légende doit être cohérente avec le contexte du média. Si le contexte visuel est insuffisant, ne prétends pas décrire ce qu'on voit et reste neutre.\n- N'invente jamais une ville, un client, une livraison, une couleur, une autonomie, un stock, une garantie, une sécurité supérieure, une promotion ou un délai.\n- Ton naturel, concret et humain. Évite les phrases génériques comme « On nous pose souvent cette question » et « Parlons d'un sujet concret ».\n- ${platform === "instagram" ? "70 à 120 mots, phrases courtes, 4 hashtags maximum." : "80 à 150 mots, style conversationnel, 2 hashtags maximum."}\n- Termine par une invitation simple à demander une vidéo ou un devis sur easydrive-auto.fr.\n- Évite de répéter les formulations récentes ci-dessous.\n\nFormulations récentes:\n${recent || "Aucune"}\n\nRetourne uniquement un JSON valide: {"hook":"...","caption":"..."}.`,
      max_output_tokens: 420,
    });
    return extractJson(response.output_text || "");
  } catch {
    return fallback;
  }
}
