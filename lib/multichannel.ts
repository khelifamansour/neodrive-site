/**
 * E-mails et SMS automatiques (Brevo), en complément de WhatsApp.
 * - E-mail 1 : le jour du package (catalogue + vidéos + réservation).
 * - E-mail 2 : 4 jours après si pas de réponse (prix livré). Puis plus rien.
 * - SMS : un seul, à tous les contacts (1 h après le package WhatsApp).
 * Arrêt dès que le client répond, se désinscrit ou dit STOP. Pas le dimanche.
 */
import { crmDatabase, normalizePhone } from "./crm-agent";
import { isOffTopic as isOffTopicLead } from "./welcome-package";
import { brevoReady, sendEmail, sendSms, unsubscribeUrl, SITE, OWNER_EMAIL } from "./brevo";

const hist = (l: any) => (Array.isArray(l?.history) ? l.history : []);
const prenomOf = (nom: string | null) => { const f = String(nom || "").trim().split(/\s+/)[0] || ""; return f ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : ""; };
const validEmail = (e: string | null) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim()) && !/leboncoin/i.test(String(e));
// Pas de SMS/e-mail commercial le dimanche ni les jours fériés.
const FERIES = ["2026-11-11", "2026-12-25", "2027-01-01", "2027-03-29", "2027-05-01", "2027-05-06", "2027-05-08", "2027-05-17", "2027-07-14", "2027-08-15", "2027-11-01", "2027-11-11", "2027-12-25"];
const isSunday = () => new Date().toLocaleDateString("fr-FR", { weekday: "long", timeZone: "Europe/Paris" }) === "dimanche" || FERIES.includes(new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }));

export function layout(inner: string, leadId: number) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0b1b33;padding:18px 24px"><span style="font-size:24px;font-weight:bold;color:#ffffff">Neo<span style="color:#f97316">Drive</span></span><br><span style="font-size:11px;letter-spacing:2px;color:#cbd5e1">VOITURES SANS PERMIS ÉLECTRIQUES</span></td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">${inner}</td></tr>
<tr><td style="padding:16px 24px;background:#f8fafc;font-size:12px;color:#64748b">NeoDrive — voitures sans permis électriques, Toulouse (SIREN 908 645 393). Vous recevez ce message suite à votre demande sur Leboncoin, ainsi que notre lettre d’information (deux fois par mois au maximum).<br><a href="${unsubscribeUrl(leadId)}" style="color:#64748b">Ne plus recevoir de messages de NeoDrive</a></td></tr>
</table></td></tr></table></body></html>`;
}
export const btn = (href: string, label: string) => `<p style="text-align:center;margin:22px 0"><a href="${href}" style="background:#f97316;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;display:inline-block">${label}</a></p>`;

export function emailContent(step: 1 | 2 | 3 | 4, lead: any) {
  const p = prenomOf(lead?.nom); const hello = p ? `Bonjour ${p},` : "Bonjour,";
  if (step === 1) return {
    subject: "Votre NeoDrive en vidéo + notre catalogue 2026",
    html: layout(`<p>${hello}</p><p>Merci pour votre message sur Leboncoin ! Comme promis, voici tout ce qu'il faut pour découvrir la <b>NeoDrive SWITCH</b>, voiture sans permis 100 % électrique, <b>carrosserie en acier</b>, livrée chez vous partout en France.</p>
<p><a href="${SITE}/videos"><img src="${SITE}/voiture.jpg" alt="NeoDrive SWITCH" width="512" style="width:100%;max-width:512px;border-radius:10px;display:block"></a></p>
<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:8px 0 4px"><tr style="background:#fff7ed"><td><b>Essentielle</b> (sur commande)</td><td align="right"><b>3 990 €</b></td></tr><tr><td><b>Confort</b> ✅ en stock — la plus choisie</td><td align="right"><b>4 990 €</b></td></tr><tr style="background:#fff7ed"><td><b>Confort Plus+</b> (plus d'autonomie)</td><td align="right"><b>5 990 €</b></td></tr></table>
<p>✔ <b>0 € d'acompte</b> : vous payez à la livraison, après avoir vu la voiture<br>✔ Jusqu'à 70 km d'autonomie, recharge sur une prise classique<br>✔ Conception simple et modulaire : peu de composants, entretien facile<br>✔ Garantie 2 ans, pièces disponibles</p>
<p>📄 <a href="${SITE}/catalogue-neodrive-2026.pdf"><b>Télécharger le catalogue 2026 (PDF)</b></a><br>🎬 <a href="${SITE}/videos"><b>Voir toutes les vidéos</b></a> (intérieur, essai sur route, vraies livraisons)</p>
${btn(`${SITE}/reservation-devis`, "Voir mon prix livré et réserver")}
<p>Dites-moi simplement <b>pour qui</b> est la voiture et votre <b>code postal</b> en répondant à cet e-mail : je vous donne le prix tout compris livré chez vous.</p><p>À très vite,<br><b>L'équipe NeoDrive</b></p>`, lead.id),
  };
  if (step === 3) return {
    subject: "Devenez propriétaire de votre voiture sans permis, pas locataire",
    html: layout(`<p>${hello}</p><p>Beaucoup de nos clients hésitaient entre l'achat et la <b>location avec option d'achat (LOA)</b>. Avec la LOA, vous payez chaque mois… et la voiture ne vous appartient pas à la fin du contrat, sauf à payer encore l'option d'achat.</p>
<p>Chez NeoDrive, la voiture est <b>à vous</b>, avec deux possibilités :</p>
<table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:6px 0 10px"><tr style="background:#fff7ed"><td>💶 <b>Paiement comptant</b></td><td>à la livraison, après avoir vu votre voiture</td></tr><tr><td>📝 <b>Financement</b></td><td>déposez votre dossier en ligne en quelques minutes, nous recherchons une solution adaptée à votre budget</td></tr></table>
<p>✔ Modèles neufs de <b>3 990 € à 5 990 €</b>, la Confort (4 990 €) disponible de suite<br>✔ Garantie 2 ans et service après-vente national<br>✔ Livraison chez vous partout en France</p>
${btn(`${SITE}/financement`, "Simuler et déposer mon dossier")}
<p>Une question ? Répondez simplement à cet e-mail.</p><p>Bonne journée,<br><b>L'équipe NeoDrive</b></p>
<p style="font-size:12px;color:#64748b"><b>Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.</b> Financement sous réserve d'étude et d'acceptation de votre dossier par l'organisme prêteur. Vous disposez d'un délai de rétractation de 14 jours.</p>`, lead.id),
  };
  if (step === 4) return {
    subject: "Ils roulent déjà en NeoDrive : découvrez leurs livraisons",
    html: layout(`<p>${hello}</p><p>Acheter une voiture sans permis à distance, c'est normal de vouloir être rassuré. Alors plutôt que de longs discours, voici nos <b>vraies livraisons en vidéo</b>, chez de vrais clients :</p>
<p><a href="${SITE}/videos"><img src="${SITE}/voiture.jpg" alt="Livraisons NeoDrive" width="512" style="width:100%;max-width:512px;border-radius:10px;display:block"></a></p>
${btn(`${SITE}/videos`, "Voir les livraisons de nos clients")}
<p>✔ <b>Entreprise basée à Toulouse</b> (SIREN 908 645 393)<br>✔ <b>0 € d'acompte</b> : vous réglez à la réception de votre voiture<br>✔ <b>Garantie 2 ans</b> et <b>service après-vente national</b>, pièces disponibles<br>✔ Les avis de nos clients : <a href="${SITE}/avis">${SITE.replace("https://", "")}/avis</a></p>
<p>Prêt à franchir le pas ? Votre voiture vous attend : ${btn(`${SITE}/reservation`, "Réserver ma NeoDrive")}</p>
<p>À très vite,<br><b>L'équipe NeoDrive</b></p>`, lead.id),
  };
  return {
    subject: "Votre prix livré en 1 minute (0 € d'acompte)",
    html: layout(`<p>${hello}</p><p>Je reviens vers vous suite à votre demande sur Leboncoin. Pour connaître le <b>prix exact livré chez vous</b>, il suffit de votre code postal :</p>
<p style="background:#fff7ed;border-radius:10px;padding:14px">Exemple : <b>Confort livrée à Bordeaux</b> = 4 990 € + 590 € de livraison + 150 € de carte grise et mise en route = <b>5 730 € tout compris</b>, payés à la livraison.</p>
${btn(`${SITE}/reservation-devis`, "Calculer mon prix livré")}
<p>Vous préférez en parler ? Répondez simplement à cet e-mail, nous vous rappelons.</p><p>Bonne journée,<br><b>L'équipe NeoDrive</b></p>`, lead.id),
  };
}

async function repliedPhones(phones: string[]) {
  const out = new Set<string>(); if (!phones.length) return out;
  const { data } = await crmDatabase().from("whatsapp_ai_processed").select("phone").in("phone", phones).limit(5000);
  for (const r of data || []) out.add(String((r as any).phone));
  return out;
}

export function smsRelanceText(nom: string | null) {
  void nom; const W = "www.easydrive-auto.fr";
  return `Bonjour, dernier petit message de NeoDrive, leader des prix en France de la voiture sans permis neuve, dès 3990 €. Garantie 2 ans, service après-vente national et livraison chez vous. Nos clients livrés en vidéo : ${W}/videos Réservez ici : ${W}/reservation`;
}

export function smsMidText(nom: string | null) {
  void nom; const W = "www.easydrive-auto.fr";
  return `Bonjour, c'est NeoDrive. Avez-vous pu découvrir nos voitures sans permis neuves ? Voici notre catalogue 2026 : ${W}/catalogue-neodrive-2026.pdf La Confort à 4990 € est disponible de suite, livrée chez vous. Nos clients livrés en vidéo : ${W}/videos`;
}

/** Campagne de rappel (une seule fois) pour les anciens contacts jamais relancés par SMS. */
export function smsCampaignText() {
  const W = "www.easydrive-auto.fr";
  return `Bonjour, vous nous aviez contactés au sujet d'une voiture sans permis. NeoDrive, leader des prix en France : modèles neufs dès 3990 €, garantie 2 ans et service après-vente national. Nos clients livrés en vidéo : ${W}/videos Réservez ici : ${W}/reservation`;
}

export function smsText(nom: string | null) {
  void nom; // pas de prénom : le message tient en 2 SMS (accents é/è/à autorisés : alphabet SMS standard, pas de surcoût ; éviter ê, â, î, ô, ç)
  const W = "www.easydrive-auto.fr"; // sans https:// pour tenir en 2 SMS
  return `Bonjour, merci d'avoir contacté NeoDrive, leader des prix en France de la voiture sans permis neuve, dès 3990 €. Garantie 2 ans et service après-vente national. Découvrez nos modèles et clients livrés en vidéo : ${W}/videos Vous pouvez réserver ici : ${W}/reservation`;
}

/** E-mails 1 et 2 + SMS. Renvoie les envois (pour le résumé du fondateur). */
export async function sendEmailsAndSms(limit = Number(process.env.EMAIL_PER_RUN || 25)) {
  if (!brevoReady()) return { skipped: "Brevo pas encore connecté", results: [] as any[] };
  if (isSunday()) return { skipped: "dimanche", results: [] as any[] };
  const db = crmDatabase();
  const { data, error } = await db.from("leads").select("*").is("opted_out_at", null).in("statut", ["Nouveau", "Contacté", "Réfléchit"]).order("id", { ascending: true }).limit(1500);
  if (error) throw new Error(error.message);
  const now = Date.now();
  // Contacts ayant reçu le package WhatsApp, ou nouveaux contacts récents (SMS/e-mail en premier contact si WhatsApp est en pause).
  const recent = Date.now() - Number(process.env.PACKAGE_MAX_AGE_DAYS || 3) * 86400000;
  const rows = (data || []).filter((l: any) => hist(l).some((h: any) => h?.type === "package") || (l.created_at && new Date(l.created_at).getTime() >= recent && !isOffTopicLead(l)));
  const replied = await repliedPhones(rows.map((l: any) => normalizePhone(l.telephone)).filter(Boolean));
  const results: any[] = []; let stopped = "";
  const smsLimit = Number(process.env.SMS_PER_RUN || 20);
  let mailsSent = 0, smsSent = 0;
  for (const l of rows) {
    if (stopped || (mailsSent >= limit && smsSent >= smsLimit)) break;
    if (replied.has(normalizePhone(l.telephone))) continue;
    const pkg = hist(l).find((h: any) => h?.type === "package") || { sent_at: l.created_at, channel: "none" };
    if (l.last_inbound_at && pkg?.sent_at && new Date(l.last_inbound_at) >= new Date(pkg.sent_at)) continue;
    let h = hist(l);
    const mails = h.filter((x: any) => x?.type === "email");
    const sms = h.some((x: any) => x?.type === "sms");
    // E-mail (1 le jour du package, 2 quatre jours après)
    // 4 e-mails : J0 catalogue, J+4 prix livré, J+8 financement, J+13 livraisons clients (écarts : 4, 4, 5 jours).
    const GAPS = [0, 4, 4, 5]; const lastMail = mails.length ? new Date(mails[mails.length - 1].sent_at).getTime() : 0;
    if (mailsSent < limit && validEmail(l.email) && mails.length < 4 && (mails.length === 0 || now - lastMail >= GAPS[mails.length] * 86400000)) {
      try {
        const step = (mails.length + 1) as 1 | 2 | 3 | 4; const at = new Date().toISOString();
        const c = emailContent(step, l); const id = await sendEmail(String(l.email).trim(), String(l.nom || ""), c.subject, c.html);
        await db.from("crm_messages").insert({ lead_id: l.id, direction: "outbound", channel: "email", body: c.subject, provider_message_id: id, status: "sent", ai_generated: false });
        h = [...h, { type: "email", step, sent_at: at }].slice(-60);
        await db.from("leads").update({ history: h, last_contact_at: at, updated_at: at }).eq("id", l.id);
        results.push({ id: l.id, sent: true, type: `email${step}`, nom: l.nom, email: l.email }); mailsSent++;
      } catch (e: any) { results.push({ id: l.id, error: e?.message || "erreur" }); if (e?.fatal) stopped = e.message; }
    }
    // SMS : un seul, à tous (beaucoup de clients ne lisent pas WhatsApp), au moins 1 h après le package.
    if (!stopped && smsSent < smsLimit && !sms && normalizePhone(l.telephone) && pkg?.sent_at && now - new Date(pkg.sent_at).getTime() > 3600000) {
      try {
        const at = new Date().toISOString(); const text = smsText(l.nom);
        const id = await sendSms(l.telephone, text);
        await db.from("crm_messages").insert({ lead_id: l.id, direction: "outbound", channel: "sms", body: text, provider_message_id: id, status: "sent", ai_generated: false });
        h = [...h, { type: "sms", sent_at: at }].slice(-60);
        await db.from("leads").update({ history: h, last_contact_at: at, updated_at: at }).eq("id", l.id);
        results.push({ id: l.id, sent: true, type: "sms", nom: l.nom, tel: l.telephone }); smsSent++;
      } catch (e: any) { results.push({ id: l.id, error: e?.message || "erreur" }); if (e?.fatal) stopped = e.message; }
    }
    // Relance SMS n°1 : J+2 après le premier SMS (catalogue + vidéos).
    const firstSms = h.find((x: any) => x?.type === "sms");
    if (!stopped && smsSent < smsLimit && firstSms && !h.some((x: any) => x?.type === "sms_mid") && now - new Date(firstSms.sent_at).getTime() > 2 * 86400000 && normalizePhone(l.telephone)) {
      try {
        const at = new Date().toISOString(); const text = smsMidText(l.nom);
        const id = await sendSms(l.telephone, text);
        await db.from("crm_messages").insert({ lead_id: l.id, direction: "outbound", channel: "sms", body: text, provider_message_id: id, status: "sent", ai_generated: false });
        h = [...h, { type: "sms_mid", sent_at: at }].slice(-60);
        await db.from("leads").update({ history: h, last_contact_at: at, updated_at: at }).eq("id", l.id);
        results.push({ id: l.id, sent: true, type: "sms_mid", nom: l.nom, tel: l.telephone }); smsSent++;
      } catch (e: any) { results.push({ id: l.id, error: e?.message || "erreur" }); if (e?.fatal) stopped = e.message; }
      continue;
    }
    // Relance SMS n°2 (dernière) : J+5 après le premier SMS.
    if (!stopped && smsSent < smsLimit && firstSms && h.some((x: any) => x?.type === "sms_mid") && !h.some((x: any) => x?.type === "sms2") && now - new Date(firstSms.sent_at).getTime() > 5 * 86400000 && normalizePhone(l.telephone)) {
      try {
        const at = new Date().toISOString(); const text = smsRelanceText(l.nom);
        const id = await sendSms(l.telephone, text);
        await db.from("crm_messages").insert({ lead_id: l.id, direction: "outbound", channel: "sms", body: text, provider_message_id: id, status: "sent", ai_generated: false });
        h = [...h, { type: "sms2", sent_at: at }].slice(-60);
        await db.from("leads").update({ history: h, last_contact_at: at, updated_at: at }).eq("id", l.id);
        results.push({ id: l.id, sent: true, type: "sms2", nom: l.nom, tel: l.telephone }); smsSent++;
      } catch (e: any) { results.push({ id: l.id, error: e?.message || "erreur" }); if (e?.fatal) stopped = e.message; }
    }
  }
  return { sent: results.filter(r => r.sent).length, failed: results.filter(r => r.error).length, stopped, results };
}

/** Copie pour le fondateur, sur sa boîte mail, de chaque e-mail ou SMS envoyé. */
export async function copyToOwner(type: string) {
  if (!brevoReady()) return;
  const fake = { id: 0, nom: "Mansour" };
  if (/^email[1-4]$/.test(type)) {
    const c = emailContent(Number(type.slice(5)) as 1 | 2 | 3 | 4, fake);
    await sendEmail(OWNER_EMAIL, "Mansour", `[Copie envoyée aux clients] ${c.subject}`, c.html);
  } else if (type === "missed_sms") {
    await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", isWeekend() ? MISSED_CALL_SMS_WEEKEND : MISSED_CALL_SMS);
  } else if (type === "sms_mid") {
    await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", smsMidText("Mansour"));
  } else if (type === "sms2") {
    await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", smsRelanceText("Mansour"));
  } else if (type === "sms") {
    await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", smsText("Mansour"));
  } else if (type === "sms_campaign") {
    await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", smsCampaignText());
  }
}

export const MISSED_CALL_SMS = "Bonjour, ici NeoDrive, voitures sans permis electriques. Desoles de ne pas avoir pu repondre, notre equipe est actuellement en livraison et vous rappelle tres vite. Decouvrez nos modeles et prix : https://www.easydrive-auto.fr La Confort est disponible en stock. L'equipe NeoDrive";

export const MISSED_CALL_SMS_WEEKEND = "Bonjour, merci d'avoir appele NeoDrive. Voitures sans permis electriques neuves a partir de 3990 EUR. La version Confort est actuellement en stock, les autres versions sont sur commande. Decouvrez nos modeles : https://www.easydrive-auto.fr Vous pouvez nous rappeler a partir de lundi. L'equipe NeoDrive";
/** Campagne SMS de rappel : anciens contacts jamais relancés par SMS, les plus récents d'abord, quelques-uns par passage. */
export async function sendCampaignSms(limit = Number(process.env.CAMPAIGN_SMS_PER_RUN || 5)) {
  if (!brevoReady() || limit <= 0 || process.env.SMS_CAMPAIGN === "off") return { sent: 0, results: [] as any[] };
  if (isSunday()) return { skipped: "dimanche ou férié", sent: 0, results: [] as any[] };
  const hour = Number(new Date().toLocaleString("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }));
  if (hour < 10 || hour > 19) return { skipped: "hors horaires", sent: 0, results: [] as any[] };
  const db = crmDatabase();
  const { data, error } = await db.from("leads").select("id,nom,telephone,history,created_at,statut,last_inbound_at,besoin,message").is("opted_out_at", null).in("statut", ["Nouveau", "Contacté", "Réfléchit"]).order("created_at", { ascending: false }).limit(2000);
  if (error) throw new Error(error.message);
  const old = Date.now() - Number(process.env.PACKAGE_MAX_AGE_DAYS || 3) * 86400000;
  const cand = (data || []).filter((l: any) => normalizePhone(l.telephone) && !l.last_inbound_at && l.created_at && new Date(l.created_at).getTime() < old && !isOffTopicLead(l)
    && !hist(l).some((x: any) => ["sms", "sms_mid", "sms2", "missed_sms", "sms_campaign"].includes(x?.type)));
  const replied = await repliedPhones(cand.map((l: any) => normalizePhone(l.telephone)).filter(Boolean));
  const results: any[] = []; const text = smsCampaignText();
  for (const l of cand) {
    if (results.filter(r => r.sent).length >= limit) break;
    if (replied.has(normalizePhone(l.telephone))) continue;
    try {
      const id = await sendSms(l.telephone, text); const at = new Date().toISOString();
      await db.from("crm_messages").insert({ lead_id: l.id, direction: "outbound", channel: "sms", body: text, provider_message_id: id, status: "sent", ai_generated: false });
      await db.from("leads").update({ history: [...hist(l), { type: "sms_campaign", sent_at: at }].slice(-60), last_contact_at: at, updated_at: at }).eq("id", l.id);
      results.push({ id: l.id, sent: true, type: "sms_campaign", nom: l.nom, tel: l.telephone });
    } catch (e: any) { results.push({ id: l.id, error: e?.message || "erreur" }); if (e?.fatal) break; }
  }
  return { sent: results.filter(r => r.sent).length, remaining: Math.max(0, cand.length - results.length), results };
}

const isWeekend = () => ["samedi", "dimanche"].includes(new Date().toLocaleDateString("fr-FR", { weekday: "long", timeZone: "Europe/Paris" }));

/** Appels manqués notés dans le CRM (history type "missed_call" sans "missed_sms") : SMS d'excuse + lien WhatsApp, une fois. */
export async function sendMissedCallSms() {
  if (!brevoReady()) return { sent: 0, results: [] as any[] };
  const db = crmDatabase();
  const { data } = await db.from("leads").select("id,nom,telephone,history,opted_out_at").eq("phase", "Appel manqué").is("opted_out_at", null).limit(200);
  const results: any[] = [];
  for (const l of data || []) {
    const h = hist(l);
    const lastCall = h.filter((x: any) => x?.type === "missed_call").map((x: any) => String(x.at || "")).sort().pop();
    const lastSms = h.filter((x: any) => x?.type === "missed_sms").map((x: any) => String(x.sent_at || "")).sort().pop();
    // Un SMS par nouvel appel manqué (pas de doublon pour le même appel).
    if (!lastCall || (lastSms && lastSms >= lastCall) || !normalizePhone(l.telephone)) continue;
    try {
      const text = isWeekend() ? MISSED_CALL_SMS_WEEKEND : MISSED_CALL_SMS;
      const id = await sendSms(l.telephone, text); const at = new Date().toISOString();
      await db.from("crm_messages").insert({ lead_id: l.id, direction: "outbound", channel: "sms", body: text, provider_message_id: id, status: "sent", ai_generated: false });
      await db.from("leads").update({ phase: "À rappeler", history: [...h, { type: "missed_sms", sent_at: at }].slice(-60), last_contact_at: at, updated_at: at }).eq("id", l.id);
      results.push({ id: l.id, sent: true, type: "missed_sms", nom: l.nom, tel: l.telephone });
    } catch (e: any) { results.push({ id: l.id, error: e?.message || "erreur" }); if (e?.fatal) break; }
  }
  return { sent: results.filter(r => r.sent).length, results };
}
