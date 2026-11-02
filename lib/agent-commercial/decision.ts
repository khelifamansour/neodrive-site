export type LeadInput = {
  nom?: string; telephone?: string; email?: string; annonce?: string;
  message?: string; maturite?: string; ville?: string; source?: string;
  whatsapp_opt_in?: boolean; opted_out_at?: string | null;
  ai_enabled?: boolean; last_inbound_at?: string | null;
};
export type SalesDecision = {
  intent: "purchase" | "delivery" | "price" | "video" | "appointment" | "sav" | "other";
  priority: "high" | "normal";
  score: number;
  humanHandoff: boolean;
  suggestedReply: string;
  assetKeys: string[];
  outboundWhatsappAllowed: boolean;
};
const has = (s: string, pattern: RegExp) => pattern.test(s);
export function normalizePhone(value: string): string | null {
  const raw = value.replace(/[^+\d]/g, "");
  if (/^0[1-9]\d{8}$/.test(raw)) return "+33" + raw.slice(1);
  if (/^33[1-9]\d{8}$/.test(raw)) return "+" + raw;
  if (/^\+33[1-9]\d{8}$/.test(raw)) return raw;
  return null;
}
export function decideSalesReply(lead: LeadInput): SalesDecision {
  const m = (lead.message || "").toLowerCase();
  const purchase = has(m, /acheter|commande|commander|réserver|je la prends|achat/);
  const sav = has(m, /panne|sav|réparation|garantie.*problème|ne démarre|batterie.*défaut/);
  const appointment = has(m, /rendez.vous|visio|appel|téléphone|téléphoner|rdv/);
  const delivery = has(m, /livraison|livrer|transport|frais de port/);
  const video = has(m, /vidéo|video|catalogue|photo|documentation/);
  const price = has(m, /prix|tarif|combien|coût|cher/);
  const intent = sav ? "sav" : purchase ? "purchase" : appointment ? "appointment" : delivery ? "delivery" : video ? "video" : price ? "price" : "other";
  const score = purchase ? 90 : appointment ? 75 : delivery ? 65 : price ? 50 : 30;
  const humanHandoff = sav || purchase || appointment;
  const answers: Record<typeof intent, string> = {
    purchase: "Merci pour votre intérêt pour NeoDrive ! Je transmets votre demande à notre équipe afin de confirmer le stock, les modalités de livraison et la commande. Dans quelle ville souhaitez-vous être livré ?",
    sav: "Merci de nous avoir contactés. Je transmets votre demande au service après-vente. Pouvez-vous préciser le problème, la date de livraison et joindre une photo ou vidéo si possible ?",
    appointment: "Avec plaisir ! Préférez-vous un appel téléphonique ou une présentation en visio ? Notre équipe vous proposera un créneau disponible.",
    delivery: "Nous proposons la livraison à domicile en France. Vous pouvez consulter notre simulateur sur https://www.easydrive-auto.fr/livraison-fusion . Quel est votre code postal ? Les délais et tarifs seront confirmés selon la tournée.",
    video: "Avec plaisir ! Nous pouvons vous présenter des photos, des vidéos et notre catalogue NeoDrive. Souhaitez-vous aussi une présentation en visio ?",
    price: "Notre modèle NeoDrive Confort est proposé à 4 990 € TTC, hors livraison et carte grise. Souhaitez-vous connaître ses équipements et estimer la livraison à votre domicile ?",
    other: "Bonjour et merci pour votre intérêt pour NeoDrive ! Souhaitez-vous connaître le prix, les équipements, l'autonomie ou les possibilités de livraison ?"
  };
  return {
    intent, priority: score >= 75 ? "high" : "normal", score,
    humanHandoff, suggestedReply: answers[intent],
    assetKeys: video ? ["catalogue", "videos"] : price ? ["catalogue"] : [],
    outboundWhatsappAllowed: lead.whatsapp_opt_in === true && !lead.opted_out_at && !!normalizePhone(lead.telephone || "")
  };
}
