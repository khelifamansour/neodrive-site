/**
 * Suivi automatique des candidatures « Devenir partenaire » (garages, concessions) :
 * e-mail de bienvenue à la candidature, relance 1 à J+4, relance 2 (dernière) à J+10.
 * Aucun chiffre (prix, marges) dans ces e-mails : le fondateur ne veut pas s'engager sur des montants.
 * Suivi enregistré dans partner_applications.followup (jsonb).
 */
import { createHmac } from "crypto";
import { crmDatabase } from "./crm-agent";
import { OWNER_EMAIL, SITE, marketingEmailGate, sendEmail, type MarketingGate } from "./brevo";

export type PartnerFollowup = { welcome_at?: string; relance1_at?: string; relance2_at?: string; unsubscribed_at?: string; legacy?: boolean; manual_at?: string; no_relances?: boolean };
export type PartnerApplication = { id: number; created_at: string; company: string | null; contact_name: string | null; phone: string | null; email: string | null; city: string | null; postal_code: string | null; activity: string | null; formula: string | null; has_showroom: boolean | null; message: string | null; status: string | null; followup: PartnerFollowup | null };

export const CATALOGUE_URL = `${SITE}/catalogue-pro`;
const DAY = 86_400_000;
const validEmail = (e: string | null | undefined) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const short = (u: string) => u.replace("https://", "");

/** Lien de désinscription signé, propre aux candidatures partenaires (distinct de celui des prospects). */
const sign = (id: number) => createHmac("sha256", process.env.CRON_SECRET || "neodrive").update(`partner:${id}`).digest("hex").slice(0, 20);
export const partnerUnsubscribeUrl = (id: number) => `${SITE}/api/partenaires/desinscription?id=${id}&s=${sign(id)}`;
export const checkPartnerUnsubscribe = (id: string, s: string) => Boolean(Number(id)) && s === sign(Number(id));

function layout(a: PartnerApplication, paragraphs: string[]) {
  const first = String(a.contact_name || "").trim().split(/\s+/)[0];
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:560px">
<p>Bonjour${first ? " " + esc(first) : ""},</p>${paragraphs.map(p => `<p>${p}</p>`).join("")}
<p>Bien cordialement,<br>Mansour<br>NeoDrive</p>
<p style="font-size:12px;color:#666">Vous ne souhaitez plus recevoir nos messages ? <a href="${partnerUnsubscribeUrl(a.id)}" style="color:#666">Se désinscrire</a> (ou répondez simplement « STOP »).</p></div>`;
}

export function partnerEmail(step: 0 | 1 | 2, a: PartnerApplication) {
  const company = esc(a.company || "votre entreprise");
  const catalogue = `<a href="${CATALOGUE_URL}">Télécharger le catalogue partenaires NeoDrive</a>`;
  if (step === 0) return {
    subject: "Votre candidature partenaire NeoDrive",
    html: layout(a, [
      `Merci beaucoup pour la candidature de <b>${company}</b> au réseau de partenaires NeoDrive. Elle est bien reçue ✅`,
      `Le réseau NeoDrive <b>ouvre officiellement en avril 2027</b>. Nous reviendrons vers vous avant l'ouverture pour vous présenter nos conditions ; en attendant, vous pouvez découvrir notre catalogue partenaires ci-dessous, et répondre à cet e-mail si vous avez une question.`,
      `Devenir partenaire NeoDrive, c'est :`,
      `• <b>plus de visibilité</b> pour votre commerce, mis en avant auprès des clients de votre secteur ;<br>• <b>une marge en plus</b> sur un produit qui se vend bien ;<br>• <b>des clients de votre région</b> que nous vous envoyons ;<br>• <b>la NeoDrive Confort</b>, une voiture sans permis électrique robuste et bien équipée ;<br>• <b>un pack de pièces de démarrage</b> pour la garantie et le service après-vente ;<br>• <b>une formation</b> et <b>un kit marketing</b> pour bien démarrer.`,
      `Pour tout découvrir tranquillement : ${catalogue}`,
      `Et pour voir nos véhicules : <a href="${SITE}">${short(SITE)}</a>`,
    ]),
  };
  if (step === 1) return {
    subject: "Avez-vous pu consulter notre catalogue partenaires ?",
    html: layout(a, [
      `Je reviens vers vous suite à la candidature de <b>${company}</b> au réseau NeoDrive.`,
      `<b>Avez-vous pu consulter notre catalogue partenaires ?</b> Vous le retrouvez ici : ${catalogue}`,
      `Pour rappel, le réseau <b>ouvre en avril 2027</b> : nous reviendrons vers vous avant l'ouverture. Si vous avez une question d'ici là, répondez simplement à cet e-mail.`,
    ]),
  };
  return {
    subject: "Le réseau NeoDrive ouvre en avril 2027 : on garde le contact ?",
    html: layout(a, [
      `C'est mon dernier message au sujet de la candidature de <b>${company}</b>, je ne veux pas vous déranger.`,
      `Le réseau de partenaires NeoDrive <b>ouvre en avril 2027</b>, et votre place reste ouverte. Dès que vous le souhaitez, répondez à cet e-mail et nous en parlons ensemble.`,
      `Le catalogue partenaires reste disponible ici : ${catalogue}`,
      `Merci encore pour votre intérêt, et belle continuation !`,
    ]),
  };
}

const ownerSummary = (a: PartnerApplication) => `<p><b>${esc(a.company)}</b> (${esc(a.activity || "activité ?")}) à ${esc(a.city || "?")} ${esc(a.postal_code || "")}<br>Contact : ${esc(a.contact_name)} — ${esc(a.phone)}${a.email ? " — " + esc(a.email) : ""}<br>Formule : ${esc(a.formula)} · Showroom : ${a.has_showroom ? "oui" : "non"}</p><p>Message : ${esc(a.message || "—")}</p><p>Candidature n°${a.id}</p>`;

async function saveFollowup(id: number, followup: PartnerFollowup) {
  await crmDatabase().from("partner_applications").update({ followup }).eq("id", id);
}

/** Envoie l'e-mail de bienvenue au candidat (et une alerte au fondateur si notifyOwner). Enregistre welcome_at. */
export async function sendPartnerWelcome(a: PartnerApplication, opts: { notifyOwner?: boolean; manual?: boolean; relances?: boolean; gate?: MarketingGate } = {}) {
  const now = new Date().toISOString();
  const f: PartnerFollowup = { ...(a.followup || {}) };
  let sent = false, error = "";
  if (f.unsubscribed_at) error = "désinscrit";
  else if (!validEmail(a.email)) error = "e-mail invalide ou absent";
  else if (opts.gate && !(await opts.gate.take())) return { id: a.id, sent: false, deferred: true, error: "reporté (quota Brevo)" };
  else {
    try {
      const c = partnerEmail(0, a);
      await sendEmail(String(a.email).trim(), String(a.contact_name || ""), c.subject, c.html);
      sent = true;
      delete f.legacy;
      f.welcome_at = now;
      if (opts.manual) f.manual_at = now;
      if (opts.relances === false) f.no_relances = true; else delete f.no_relances;
      await saveFollowup(a.id, f);
    } catch (e) { error = e instanceof Error ? e.message : "erreur"; console.error("[PARTENAIRE] bienvenue", e); }
  }
  if (opts.notifyOwner) {
    const state = sent ? "E-mail de bienvenue (avec le catalogue) envoyé au candidat ✅ Relances automatiques prévues à J+4 et J+10." : `E-mail de bienvenue non envoyé (${esc(error)}).`;
    try { await sendEmail(OWNER_EMAIL, "Mansour", `Candidature partenaire : ${a.company || "?"} (${a.city || "?"})`, `${ownerSummary(a)}<p>${state}</p>`); } catch (e) { console.error("[PARTENAIRE] alerte fondateur", e); }
  }
  return { id: a.id, sent, error: error || undefined };
}

/** Relances quotidiennes : J+4 puis J+10 après l'e-mail de bienvenue, seulement si la candidature est encore « Nouveau ».
 * Bridées par le budget Brevo (réserve transactionnelle gardée) : une relance reportée reste due et part le lendemain. */
export async function runPartnerRelances(now = new Date()) {
  const db = crmDatabase();
  const { data, error } = await db.from("partner_applications").select("*").eq("status", "Nouveau").not("followup", "is", null).order("id");
  if (error) throw new Error(error.message);
  const results: { id: number; step: number; sent: boolean; error?: string }[] = [];
  const gate = marketingEmailGate("relances-partenaires"); let deferred = 0;
  for (const a of (data || []) as PartnerApplication[]) {
    const f = a.followup || {};
    if (f.legacy || f.unsubscribed_at || f.no_relances || !f.welcome_at || f.relance2_at || !validEmail(a.email)) continue;
    const since = now.getTime() - new Date(f.welcome_at).getTime();
    const step: 1 | 2 | 0 = !f.relance1_at ? (since >= 4 * DAY ? 1 : 0)
      : since >= 10 * DAY && now.getTime() - new Date(f.relance1_at).getTime() >= 3 * DAY ? 2 : 0;
    if (!step) continue;
    if (!(await gate.take())) { deferred++; continue; }
    try {
      const c = partnerEmail(step, a);
      await sendEmail(String(a.email).trim(), String(a.contact_name || ""), c.subject, c.html);
      await saveFollowup(a.id, { ...f, [step === 1 ? "relance1_at" : "relance2_at"]: now.toISOString() });
      results.push({ id: a.id, step, sent: true });
    } catch (e) { results.push({ id: a.id, step, sent: false, error: e instanceof Error ? e.message : "erreur" }); }
  }
  const sent = results.filter(r => r.sent);
  if (sent.length) {
    try { await sendEmail(OWNER_EMAIL, "Mansour", `Relances partenaires : ${sent.length} e-mail(s) envoyé(s)`, `<p>${sent.map(r => `Candidature n°${r.id} : relance ${r.step}`).join("<br>")}</p>`); } catch (e) { console.error("[PARTENAIRE] récap relances", e); }
  }
  const quota = sent.length || deferred ? await gate.finish(deferred) : null;
  return { sent: sent.length, deferred, quota, results };
}
