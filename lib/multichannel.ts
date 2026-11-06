/**
 * E-mails et SMS automatiques (Brevo), en complément de WhatsApp.
 * - E-mail 1 : le jour du package (catalogue + vidéos + réservation).
 * - E-mail 2 : 4 jours après si pas de réponse (prix livré). Puis plus rien.
 * - SMS : un seul, à tous les contacts (1 h après le package WhatsApp).
 * Arrêt dès que le client répond, se désinscrit ou dit STOP. Pas le dimanche.
 */
import { crmDatabase, normalizePhone } from "./crm-agent";
import { brevoReady, sendEmail, sendSms, unsubscribeUrl, SITE, OWNER_EMAIL } from "./brevo";

const hist = (l: any) => (Array.isArray(l?.history) ? l.history : []);
const prenomOf = (nom: string | null) => { const f = String(nom || "").trim().split(/\s+/)[0] || ""; return f ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : ""; };
const validEmail = (e: string | null) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim()) && !/leboncoin/i.test(String(e));
const isSunday = () => new Date().toLocaleDateString("fr-FR", { weekday: "long", timeZone: "Europe/Paris" }) === "dimanche";

function layout(inner: string, leadId: number) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0b1b33;padding:18px 24px"><span style="font-size:24px;font-weight:bold;color:#ffffff">Neo<span style="color:#f97316">Drive</span></span><br><span style="font-size:11px;letter-spacing:2px;color:#cbd5e1">VOITURES SANS PERMIS ÉLECTRIQUES</span></td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">${inner}</td></tr>
<tr><td style="padding:16px 24px;background:#f8fafc;font-size:12px;color:#64748b">NeoDrive — fabricant, vente directe, Toulouse (SIREN 908 645 393). Vous recevez ce message suite à votre demande sur Leboncoin.<br><a href="${unsubscribeUrl(leadId)}" style="color:#64748b">Ne plus recevoir de messages de NeoDrive</a></td></tr>
</table></td></tr></table></body></html>`;
}
const btn = (href: string, label: string) => `<p style="text-align:center;margin:22px 0"><a href="${href}" style="background:#f97316;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;display:inline-block">${label}</a></p>`;

export function emailContent(step: 1 | 2, lead: any) {
  const p = prenomOf(lead?.nom); const hello = p ? `Bonjour ${p},` : "Bonjour,";
  if (step === 1) return {
    subject: "Votre NeoDrive en vidéo + notre catalogue 2026",
    html: layout(`<p>${hello}</p><p>Merci pour votre message sur Leboncoin ! Comme promis, voici tout ce qu'il faut pour découvrir la <b>NeoDrive SWITCH</b>, voiture sans permis 100 % électrique, <b>carrosserie en acier</b>, livrée chez vous partout en France.</p>
<p><a href="${SITE}/videos"><img src="${SITE}/voiture.jpg" alt="NeoDrive SWITCH" width="512" style="width:100%;max-width:512px;border-radius:10px;display:block"></a></p>
<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:8px 0 4px"><tr style="background:#fff7ed"><td><b>Essentielle</b> (sur commande)</td><td align="right"><b>3 990 €</b></td></tr><tr><td><b>Confort</b> ✅ en stock — la plus choisie</td><td align="right"><b>4 990 €</b></td></tr><tr style="background:#fff7ed"><td><b>Confort Plus+</b> (plus d'autonomie)</td><td align="right"><b>5 990 €</b></td></tr></table>
<p>✔ <b>0 € d'acompte</b> : vous payez à la livraison, après avoir vu la voiture<br>✔ Jusqu'à 70 km d'autonomie, recharge sur une prise classique<br>✔ Conception simple et modulaire : peu de composants, entretien facile<br>✔ Garantie 2 ans, pièces disponibles</p>
<p>📄 <a href="${SITE}/catalogue-neodrive-2026.pdf"><b>Télécharger le catalogue 2026 (PDF)</b></a><br>🎬 <a href="${SITE}/videos"><b>Voir toutes les vidéos</b></a> (intérieur, essai sur route, vraies livraisons)</p>
${btn(`${SITE}/reservation-devis`, "Voir mon prix livré et réserver")}
<p>Dites-moi simplement <b>pour qui</b> est la voiture et votre <b>code postal</b> en répondant à cet e-mail : je vous donne le prix tout compris livré chez vous.</p><p>À très vite,<br><b>L'équipe NeoDrive</b><br>WhatsApp : 06 76 19 22 34</p>`, lead.id),
  };
  return {
    subject: "Votre prix livré en 1 minute (0 € d'acompte)",
    html: layout(`<p>${hello}</p><p>Je reviens vers vous suite à votre demande sur Leboncoin. Pour connaître le <b>prix exact livré chez vous</b>, il suffit de votre code postal :</p>
<p style="background:#fff7ed;border-radius:10px;padding:14px">Exemple : <b>Confort livrée à Bordeaux</b> = 4 990 € + 590 € de livraison + 150 € de carte grise et mise en route = <b>5 730 € tout compris</b>, payés à la livraison.</p>
${btn(`${SITE}/reservation-devis`, "Calculer mon prix livré")}
<p>Vous préférez en parler ? Répondez à cet e-mail ou écrivez-nous sur WhatsApp au <b>06 76 19 22 34</b>, nous vous rappelons.</p><p>Bonne journée,<br><b>L'équipe NeoDrive</b></p>`, lead.id),
  };
}

async function repliedPhones(phones: string[]) {
  const out = new Set<string>(); if (!phones.length) return out;
  const { data } = await crmDatabase().from("whatsapp_ai_processed").select("phone").in("phone", phones).limit(5000);
  for (const r of data || []) out.add(String((r as any).phone));
  return out;
}

export function smsText(nom: string | null) {
  const p = prenomOf(nom);
  return `NeoDrive : Bonjour${p ? " " + p : ""}, merci pour votre demande Leboncoin. Voiture sans permis electrique neuve en acier, des 3990 EUR, 0 EUR d'acompte, payee a la livraison. Videos : ${SITE.replace("https://", "")}/videos Prix livre : ${SITE.replace("https://", "")}/reservation-devis`;
}

/** E-mails 1 et 2 + SMS. Renvoie les envois (pour le résumé du fondateur). */
export async function sendEmailsAndSms(limit = Number(process.env.EMAIL_PER_RUN || 25)) {
  if (!brevoReady()) return { skipped: "Brevo pas encore connecté", results: [] as any[] };
  if (isSunday()) return { skipped: "dimanche", results: [] as any[] };
  const db = crmDatabase();
  const { data, error } = await db.from("leads").select("*").is("opted_out_at", null).in("statut", ["Contacté", "Réfléchit"]).order("id", { ascending: true }).limit(1500);
  if (error) throw new Error(error.message);
  const now = Date.now();
  const rows = (data || []).filter((l: any) => hist(l).some((h: any) => h?.type === "package"));
  const replied = await repliedPhones(rows.map((l: any) => normalizePhone(l.telephone)).filter(Boolean));
  const results: any[] = []; let stopped = "";
  const smsLimit = Number(process.env.SMS_PER_RUN || 20);
  let mailsSent = 0, smsSent = 0;
  for (const l of rows) {
    if (stopped || (mailsSent >= limit && smsSent >= smsLimit)) break;
    if (replied.has(normalizePhone(l.telephone))) continue;
    const pkg = hist(l).find((h: any) => h?.type === "package");
    if (l.last_inbound_at && pkg?.sent_at && new Date(l.last_inbound_at) >= new Date(pkg.sent_at)) continue;
    let h = hist(l);
    const mails = h.filter((x: any) => x?.type === "email");
    const sms = h.some((x: any) => x?.type === "sms");
    // E-mail (1 le jour du package, 2 quatre jours après)
    if (mailsSent < limit && validEmail(l.email) && mails.length < 2 && !(mails.length === 1 && now - new Date(mails[0].sent_at).getTime() < 4 * 86400000)) {
      try {
        const step: 1 | 2 = mails.length === 0 ? 1 : 2; const at = new Date().toISOString();
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
  }
  return { sent: results.filter(r => r.sent).length, failed: results.filter(r => r.error).length, stopped, results };
}

/** Copie pour le fondateur, sur sa boîte mail, de chaque e-mail ou SMS envoyé. */
export async function copyToOwner(type: string) {
  if (!brevoReady()) return;
  const fake = { id: 0, nom: "Mansour" };
  if (type === "email1" || type === "email2") {
    const c = emailContent(type === "email1" ? 1 : 2, fake);
    await sendEmail(OWNER_EMAIL, "Mansour", `[Copie envoyée aux clients] ${c.subject}`, c.html);
  } else if (type === "sms") {
    await sendSms("0628261446", smsText("Mansour"));
  }
}
