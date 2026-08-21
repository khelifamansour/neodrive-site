import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

export function crmDatabase() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Configuration Supabase manquante");
  return createClient(SUPABASE_URL, secret, { auth: { persistSession: false } });
}

export function normalizePhone(input: unknown): string {
  let value = String(input || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (value.startsWith("00")) value = value.slice(2);
  if (value.startsWith("0")) value = `33${value.slice(1)}`;
  return /^\d{9,15}$/.test(value) ? value : "";
}

export function commercialFacts() {
  return `Tu es le conseiller commercial NeoDrive en France. Faits vérifiés : voiture sans permis électrique 2 places ; NeoDrive Essentielle à partir de 3 990 € TTC, Confort à partir de 4 990 € TTC, Confort Plus lithium à partir de 5 990 € TTC ; préparation 249 € si applicable ; recharge prise 220 V ; autonomie indicative 50 à 70 km selon conditions et version ; livraison partout en France sur devis ; paiement à la livraison selon conditions validées par l'équipe ; accessible à partir de 14 ans avec permis AM lorsque requis. Une suspension ou annulation du permis B ne garantit jamais le droit de conduire : demander de vérifier la décision et la situation. Ne jamais inventer stock, délai, garantie, disponibilité, homologation ou frais de livraison. Tu peux proposer photos, vidéo, catalogue et échange humain, sans promettre leur envoi si indisponible. Ton chaleureux, professionnel, naturel, court, jamais agressif. Si STOP/refus : confirmer l'arrêt. Si sujet juridique complexe, réclamation, négociation exceptionnelle ou engagement ferme : recommander un conseiller humain.`;
}

export function firstMessage(lead: any): string {
  const first = String(lead.nom || "").trim().split(/\s+/)[0];
  const greeting = first ? `Bonjour ${first},` : "Bonjour,";
  return `${greeting}\n\nMerci pour votre intérêt pour NeoDrive. Nous proposons des voitures sans permis électriques neuves à partir de 3 990 € TTC, avec livraison partout en France.\n\nSouhaitez-vous recevoir les photos, les tarifs et les informations de livraison ?\n\nSi vous ne souhaitez plus être contacté, répondez STOP.`;
}

export async function generateCommercialReply(lead: any, incoming: string, history: any[] = []) {
  if (!process.env.OPENAI_API_KEY) return firstMessage(lead);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const context = history.slice(-8).map((item: any) => `${item.direction}: ${String(item.body || "").slice(0, 1000)}`).join("\n");
  const result = await client.responses.create({
    model: process.env.OPENAI_CRM_MODEL || "gpt-4.1-mini",
    input: `${commercialFacts()}\nProspect : ${JSON.stringify({ nom: lead.nom, ville: lead.ville, modele: lead.modele_interesse, annonce: lead.annonce, notes: lead.commentaire })}\nHistorique : ${context || "aucun"}\nDernier message : ${incoming || "Prépare un premier message personnalisé."}\nRéponds uniquement par le message WhatsApp prêt à envoyer, 120 mots maximum.`,
    max_output_tokens: 260,
  });
  return result.output_text.trim() || firstMessage(lead);
}

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsApp(phone: string, body: string, template?: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error("WhatsApp Business Platform n'est pas encore configuré");
  const to = normalizePhone(phone);
  if (!to) throw new Error("Numéro de téléphone invalide");
  const payload = template
    ? { messaging_product: "whatsapp", to, type: "template", template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr" } } }
    : { messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body } };
  const response = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v22.0"}/${phoneId}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || "Envoi WhatsApp refusé");
  return result?.messages?.[0]?.id || null;
}

export function leadScore(lead: any): number {
  let score = 15;
  if (normalizePhone(lead.telephone)) score += 25;
  if (lead.email) score += 10;
  if (lead.ville) score += 10;
  const text = `${lead.annonce || ""} ${lead.commentaire || ""} ${lead.modele_interesse || ""}`.toLowerCase();
  if (/prix|budget|tarif|3990|3.?990|financement/.test(text)) score += 15;
  if (/livraison|disponib|acheter|commande|réserv|reservation/.test(text)) score += 20;
  if (/urgent|rapid|cette semaine/.test(text)) score += 5;
  return Math.min(100, score);
}
