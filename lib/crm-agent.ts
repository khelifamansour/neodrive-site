import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { quoteDelivery } from "./neodrive-pricing";

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

const SITE = "https://www.easydrive-auto.fr";

/** Vidéos que l'agent peut envoyer (fichiers MP4 du site, < 16 Mo, format accepté par WhatsApp). */
export const VIDEOS = {
  presentation: { url: `${SITE}/presentation1.mp4`, caption: "🎬 Présentation de la NeoDrive" },
  interieur: { url: `${SITE}/interieur.mp4`, caption: "🪑 L'intérieur de la NeoDrive" },
  essai: { url: `${SITE}/essai-route.mp4`, caption: "🛣️ Essai sur route" },
  livraison: { url: `${SITE}/client1.mp4`, caption: "🚚 Une livraison client (région de Strasbourg)" },
} as const;
export type VideoKey = keyof typeof VIDEOS;

export function commercialFacts() {
  return `Tu es Léa, conseillère commerciale de NeoDrive (marque française de voitures sans permis électriques, basée à Muret près de Toulouse, SIREN 908 645 393). Tu réponds sur WhatsApp à des personnes qui ont contacté NeoDrive, souvent via une annonce Leboncoin.

FAITS VÉRIFIÉS (ne rien inventer en dehors) :
- Voiture sans permis 100 % électrique, 2 places, neuve, carrosserie et structure en ACIER (beaucoup de concurrentes sont en plastique), grand coffre, recharge sur une prise 220 V classique.
- 3 versions :
  • Essentielle : 3 990 € TTC — délai environ 6 à 8 mois (sur commande).
  • Confort : 4 990 € TTC — EN STOCK, disponible immédiatement — caméra de recul, chauffage et ventilation, Bluetooth/USB, alarme antivol. C'est la plus choisie.
  • Confort Plus+ : 5 990 € TTC — pack Confort + charge rapide + plus d'autonomie.
- Comparaison : la Confort coûte 3 200 € de moins qu'une Citroën Ami de base (8 190 €).
- Autonomie : jusqu'à 70 km. Recharge : environ 6 h sur prise 220 V. Ne jamais donner d'autre durée ni parler de technologie de batterie.
- 0 € d'acompte : le client paie le jour de la livraison.
- Livraison à domicile partout en France métropolitaine, prix selon la zone : 450 €, 590 €, 690 € ou 790 € (le prix exact dépend du code postal ; Corse et outre-mer sur devis). Demande le code postal pour donner le prix exact.
- Carte grise : NeoDrive peut s'en occuper (150 €).
- Garantie légale de conformité 2 ans. Pièces détachées sous 48 h, assistance technique directe.
- Financement possible : simulateur et demande sur ${SITE}/financement.
- Réservation en ligne : ${SITE}/reservation-devis
- Conduite : dès 14 ans avec le permis AM (BSR) pour les personnes nées après 1988 ; sans permis pour les personnes nées avant 1988. Une suspension ou annulation du permis B : ne jamais garantir le droit de conduire, demander de vérifier la décision.
- Vidéos disponibles : présentation, intérieur, essai sur route, livraison client. Page vidéos : ${SITE}/videos

TA MÉTHODE DE VENTE :
1. Réponds d'abord précisément à la question posée, avec des détails concrets (prix, équipement, délai, livraison).
2. Pose UNE question utile pour avancer : code postal (prix de livraison), usage (trajets, pour qui), budget, version qui l'intéresse, délai souhaité.
3. Propose l'étape suivante : vidéo, prix de livraison, réservation en ligne, ou appel avec le responsable.
4. Ton chaleureux, simple, professionnel, phrases courtes, 1 à 2 emojis maximum. Vouvoiement. Jamais insistant ni agressif.
5. Si la personne dit STOP / pas intéressée : remercie, confirme qu'on ne la recontactera plus.
6. Demande un humain (besoin_humain=true) si : réclamation, panne ou SAV, négociation de prix, question juridique, reprise de véhicule, commande ferme, ou si tu ne sais pas.
7. Ne jamais mentionner le type de batterie. Ne jamais inventer stock, délai, remise ou caractéristique.`;
}

function firstNameOf(lead: any) { return String(lead?.nom || "").trim().split(/\s+/)[0] || ""; }
function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s; }

export function firstMessage(lead: any): string {
  const first = cap(firstNameOf(lead));
  const greeting = first ? `Bonjour ${first} 👋` : "Bonjour 👋";
  const from = lead?.annonce ? "Vous nous avez contactés sur Leboncoin pour notre voiture sans permis électrique NeoDrive" : "Merci pour votre intérêt pour NeoDrive";
  return `${greeting}\n\n${from}. Je suis Léa, de NeoDrive (Muret, près de Toulouse).\n\n✅ 100 % électrique, carrosserie en acier, recharge sur prise 220 V\n✅ Dès 3 990 € TTC — la Confort (4 990 €) est en stock\n✅ 0 € d'acompte, paiement à la livraison, livrée chez vous partout en France\n\nVoici une courte vidéo de présentation 🎬 ${SITE}/videos\n\nDans quelle ville êtes-vous ? Je vous donne le prix exact de la livraison.\n\nRépondez STOP si vous ne souhaitez plus être contacté.`;
}

/** Prix de livraison si le prospect a donné un code postal. */
function deliveryHint(text: string) {
  const m = String(text || "").match(/\b(\d{5})\b/);
  if (!m) return "";
  const q = quoteDelivery(m[1]);
  return q.status === "estimated" ? `Le prospect a donné le code postal ${m[1]} : livraison = ${q.price} € (département ${q.department}).` : `Code postal ${m[1]} : livraison sur devis (${q.reason}).`;
}

export type AgentTurn = {
  reply: string;
  video: VideoKey | null;
  crm: { statut: string; phase: string; temperature: string; ville: string; code_postal: string; modele: string; budget: string; usage: string; resume: string; prochaine_action: string; relance_dans_jours: number; besoin_humain: boolean };
};

const TURN_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["reply", "video", "crm"],
  properties: {
    reply: { type: "string", description: "Message WhatsApp prêt à envoyer, 150 mots maximum" },
    video: { type: ["string", "null"], enum: [...Object.keys(VIDEOS), null], description: "Vidéo à joindre maintenant (jamais une vidéo déjà envoyée), ou null" },
    crm: {
      type: "object", additionalProperties: false,
      required: ["statut", "phase", "temperature", "ville", "code_postal", "modele", "budget", "usage", "resume", "prochaine_action", "relance_dans_jours", "besoin_humain"],
      properties: {
        statut: { type: "string", enum: ["Contacté", "Chaud", "Réfléchit", "Livraison", "Client", "Perdu"] },
        phase: { type: "string", enum: ["Attente réponse", "Réfléchit", "Devis", "Réservation", "Livraison", "Terminé"] },
        temperature: { type: "string", enum: ["🔥 Chaud", "🌤️ Tiède", "❄️ Froid"] },
        ville: { type: "string" }, code_postal: { type: "string" }, modele: { type: "string" }, budget: { type: "string" }, usage: { type: "string" },
        resume: { type: "string", description: "Résumé du prospect pour le CRM en 1 phrase" },
        prochaine_action: { type: "string", description: "Ce que le responsable ou l'agent doit faire ensuite" },
        relance_dans_jours: { type: "integer", description: "Dans combien de jours relancer si pas de réponse (0 = ne pas relancer)" },
        besoin_humain: { type: "boolean" },
      },
    },
  },
} as const;

/** Un tour de l'agent : réponse + vidéo éventuelle + mise à jour du CRM. */
export async function agentTurn(lead: any, incoming: string, history: any[] = [], videosSent: string[] = []): Promise<AgentTurn> {
  const fallback: AgentTurn = { reply: firstMessage(lead), video: null, crm: { statut: "Contacté", phase: "Attente réponse", temperature: "🌤️ Tiède", ville: lead?.ville || "", code_postal: "", modele: lead?.modele_interesse || "", budget: "", usage: "", resume: "", prochaine_action: "Répondre au prospect", relance_dans_jours: 2, besoin_humain: !process.env.OPENAI_API_KEY } };
  if (!process.env.OPENAI_API_KEY) return fallback;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const context = history.slice(-14).map((item: any) => `${item.direction === "inbound" ? "CLIENT" : "NEODRIVE"}: ${String(item.body || "").slice(0, 800)}`).join("\n");
  const result = await client.responses.create({
    model: process.env.OPENAI_CRM_MODEL || "gpt-4.1",
    instructions: commercialFacts(),
    input: `Fiche prospect : ${JSON.stringify({ nom: lead?.nom, ville: lead?.ville, annonce: lead?.annonce, demande_initiale: lead?.commentaire, modele: lead?.modele_interesse, statut: lead?.statut })}
Vidéos déjà envoyées : ${videosSent.join(", ") || "aucune"}
${deliveryHint(incoming)}
Conversation :
${context || "(aucun échange)"}
Dernier message du client : ${incoming || "(aucun — prépare un message)"}

Rédige la réponse et mets à jour la fiche CRM (garde les infos déjà connues si rien de nouveau).`,
    text: { format: { type: "json_schema", name: "agent_turn", strict: true, schema: TURN_SCHEMA as any } },
    max_output_tokens: 900,
  });
  try {
    const parsed = JSON.parse(result.output_text) as AgentTurn;
    if (!parsed.reply?.trim()) return fallback;
    if (parsed.video && (!(parsed.video in VIDEOS) || videosSent.includes(parsed.video))) parsed.video = null;
    return parsed;
  } catch { return fallback; }
}

export async function generateCommercialReply(lead: any, incoming: string, history: any[] = []) {
  return (await agentTurn(lead, incoming, history)).reply;
}

/** Applique la mise à jour CRM proposée par l'agent (champs existants + journal dans history). */
export function crmPatchFromTurn(lead: any, turn: AgentTurn) {
  const c = turn.crm; const now = new Date().toISOString();
  const history = [...(Array.isArray(lead?.history) ? lead.history : []), { type: "ai_update", at: now, temperature: c.temperature, resume: c.resume, prochaine_action: c.prochaine_action, budget: c.budget, usage: c.usage, code_postal: c.code_postal, besoin_humain: c.besoin_humain }].slice(-60);
  const keepClient = ["Client", "Livraison"].includes(String(lead?.statut || "")) && !["Client", "Livraison"].includes(c.statut);
  const score = c.temperature.includes("Chaud") ? 85 : c.temperature.includes("Tiède") ? 60 : 30;
  return {
    statut: keepClient ? lead.statut : c.statut, phase: keepClient ? lead.phase : c.phase,
    ville: c.ville || lead?.ville || null, modele_interesse: c.modele || lead?.modele_interesse || null,
    lead_score: score, history,
    next_followup_at: c.relance_dans_jours > 0 ? new Date(Date.now() + c.relance_dans_jours * 86400000).toISOString() : null,
    followup_step: 1, updated_at: now,
  };
}

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function graphSend(payload: any) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error("WhatsApp Business Platform n'est pas encore configuré");
  const response = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v22.0"}/${phoneId}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { const e: any = new Error(result?.error?.message || "Envoi WhatsApp refusé"); e.code = result?.error?.code; e.auth = response.status === 401 || result?.error?.code === 190; throw e; }
  return result?.messages?.[0]?.id || null;
}

/** Texte libre (dans les 24 h après un message du client) ou modèle approuvé (premier contact / relance). */
export async function sendWhatsApp(phone: string, body: string, template?: string, params: string[] = []) {
  const to = normalizePhone(phone);
  if (!to) throw new Error("Numéro de téléphone invalide");
  if (template) {
    const components = params.length ? [{ type: "body", parameters: params.map(text => ({ type: "text", text: text || "à vous" })) }] : undefined;
    return graphSend({ to, type: "template", template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr" }, ...(components ? { components } : {}) } });
  }
  return graphSend({ to, type: "text", text: { preview_url: true, body } });
}

export async function sendWhatsAppVideo(phone: string, key: VideoKey) {
  const to = normalizePhone(phone);
  if (!to) throw new Error("Numéro de téléphone invalide");
  const v = VIDEOS[key];
  return graphSend({ to, type: "video", video: { link: v.url, caption: v.caption } });
}

/** Modèles WhatsApp à faire approuver par Meta (premier contact + 2 relances). {{1}} = prénom. */
export const TEMPLATES = {
  bienvenue: {
    env: "WHATSAPP_TEMPLATE_NAME", name: "neodrive_bienvenue", category: "MARKETING",
    body: "Bonjour {{1}} 👋\n\nVous nous avez contactés sur Leboncoin pour notre voiture sans permis électrique NeoDrive. Je suis Léa, de NeoDrive (Muret, près de Toulouse).\n\n✅ 100 % électrique, carrosserie en acier\n✅ Dès 3 990 € TTC, la Confort (4 990 €) est en stock\n✅ 0 € d'acompte, paiement à la livraison, livrée chez vous partout en France\n\nRépondez à ce message avec votre ville : je vous envoie la vidéo de présentation et le prix exact de la livraison.",
    example: ["Marie"], buttons: [{ type: "QUICK_REPLY", text: "Recevoir la vidéo" }, { type: "QUICK_REPLY", text: "Prix de livraison" }, { type: "QUICK_REPLY", text: "STOP" }],
  },
  relance1: {
    env: "WHATSAPP_TEMPLATE_RELANCE", name: "neodrive_relance", category: "MARKETING",
    body: "Bonjour {{1}}, c'est Léa de NeoDrive 🙂\n\nVotre projet de voiture sans permis est-il toujours d'actualité ? La NeoDrive Confort est disponible tout de suite, livrée chez vous, et vous ne payez qu'à la livraison.\n\nVoulez-vous que je vous envoie la vidéo d'un essai sur route ?",
    example: ["Marie"], buttons: [{ type: "QUICK_REPLY", text: "Oui, la vidéo" }, { type: "QUICK_REPLY", text: "Plus tard" }, { type: "QUICK_REPLY", text: "STOP" }],
  },
  relance2: {
    env: "WHATSAPP_TEMPLATE_DERNIERE", name: "neodrive_derniere_relance", category: "MARKETING",
    body: "Bonjour {{1}}, dernier petit message de NeoDrive 🙂\n\nSi vous cherchez toujours une voiture sans permis électrique, je reste disponible pour toute question : prix, livraison, financement ou essai.\n\nSans réponse de votre part, je ne vous relancerai plus. Belle journée !",
    example: ["Marie"], buttons: [{ type: "QUICK_REPLY", text: "Je suis intéressé" }, { type: "QUICK_REPLY", text: "STOP" }],
  },
} as const;
export type TemplateKey = keyof typeof TEMPLATES;
export const templateName = (k: TemplateKey) => process.env[TEMPLATES[k].env] || TEMPLATES[k].name;

/** Crée les modèles manquants sur le compte WhatsApp Business et renvoie leur statut d'approbation. */
export async function syncTemplates(create: boolean) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN; const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "364388790101381";
  if (!token || !waba) throw new Error("Jeton WhatsApp ou identifiant du compte WhatsApp Business manquant (page /connexions)");
  const v = process.env.WHATSAPP_API_VERSION || "v22.0";
  const list = await fetch(`https://graph.facebook.com/${v}/${waba}/message_templates?fields=name,status,category,language&limit=200`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const lj = await list.json().catch(() => ({}));
  if (!list.ok) throw new Error(lj?.error?.message || "Lecture des modèles impossible");
  const existing = new Map<string, string>((lj.data || []).map((x: any) => [x.name, x.status]));
  const out: { key: string; name: string; status: string; error?: string }[] = [];
  for (const [key, tpl] of Object.entries(TEMPLATES)) {
    const name = templateName(key as TemplateKey);
    if (existing.has(name)) { out.push({ key, name, status: String(existing.get(name)) }); continue; }
    if (!create) { out.push({ key, name, status: "ABSENT" }); continue; }
    const r = await fetch(`https://graph.facebook.com/${v}/${waba}/message_templates`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name, category: tpl.category, language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr", components: [{ type: "BODY", text: tpl.body, example: { body_text: [tpl.example] } }, { type: "BUTTONS", buttons: tpl.buttons }] }) });
    const j = await r.json().catch(() => ({}));
    out.push({ key, name, status: r.ok ? String(j.status || "PENDING") : "ERREUR", error: r.ok ? undefined : j?.error?.error_user_msg || j?.error?.message });
  }
  return out;
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
