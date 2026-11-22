/**
 * Confirmation immédiate d'une réservation faite sur le site (serveur uniquement).
 * - Client : SMS + e-mail tout de suite (Brevo) ; WhatsApp par modèle Meta « neodrive_reservation_confirmee »
 *   (en attente tant que Meta ne l'a pas approuvé, ou texte libre si le client nous a écrit il y a moins de 24 h).
 * - Fiche prospect : « Chaud », phase « Réservation », événement + note lisibles par l'équipe (et par Hana si elle lit la fiche).
 * - Fondateur : alerte SMS + e-mail.
 * Ne bloque jamais la réservation : chaque canal est indépendant, les erreurs sont journalisées.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone } from "./crm-agent";
import { brevoReady, sendEmail, sendSms, OWNER_EMAIL, SITE } from "./brevo";
import { applyStoredSecrets } from "./integrations";
import { relay, templateStatus } from "./package-sender";
import type { Reservation } from "./reservations";

export const RESERVATION_TEMPLATE = "neodrive_reservation_confirmee";
const HANA = "676192234";
const OWNER_SMS = () => process.env.OWNER_SMS_PHONE || "0689781710";

/** Modèle hors stock (fabriqué sur commande) : Essentielle ou Confort Plus. */
export const isOnOrder = (modele: string) => /essentiel|plus/i.test(modele || "");
const prenomOf = (r: Pick<Reservation, "prenom" | "nom">) => {
  const p = (r.prenom || r.nom || "").trim().split(/\s+/)[0] || "";
  return p.toLowerCase().replace(/(^|[-'])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()).slice(0, 25);
};
const modeleOf = (m: string) => (m || "NeoDrive Confort").replace(/^neodrive\s*/i, "").trim() || "Confort";
const euro = (n: number | null) => (n == null ? "" : `${Math.round(n).toLocaleString("fr-FR")} €`);

/** Corps du modèle WhatsApp (catégorie « Utilité ») : {{1}} prénom, {{2}} modèle. */
export const TEMPLATE_BODY = [
  "Bonjour {{1}}, merci pour votre réservation NeoDrive {{2}} ✅ Elle est bien enregistrée, vous n'avez rien d'autre à faire.",
  "",
  "Délai indicatif de préparation et de livraison jusqu'à votre porte : entre 7 et 27 jours selon votre secteur. Un conseiller vous appelle pour vous donner la date exacte dès que la tournée de votre région est planifiée.",
  "",
  "Paiement uniquement à la livraison.",
  "Mansour - NeoDrive",
].join("\n");

export async function reservationTemplateStatus(create = false) {
  return templateStatus(RESERVATION_TEMPLATE, create, [
    { type: "BODY", text: TEMPLATE_BODY, example: { body_text: [["Marie", "Confort"]] } },
    { type: "BUTTONS", buttons: [{ type: "URL", text: "Préparer ma livraison", url: `${SITE}/preparer-ma-livraison` }] },
  ], "UTILITY");
}

/** Équipements de la Confort absents de l'Essentielle (arguments de passage à la Confort). */
export const CONFORT_EXTRAS = [
  "le chauffage",
  "la caméra de recul et le radar de recul",
  "l'assistance en côte : dans une montée, par exemple à un feu rouge, la voiture se bloque automatiquement pour ne pas reculer sur celle de derrière",
  "une alerte au siège si vous oubliez de couper le contact",
  "la radio, le Bluetooth et la prise USB",
  "le toit ouvrant avec ventilateurs",
  "les pare-soleil",
  "les enjoliveurs de roues",
];
export const PLUS_ARGS = "La Confort est déjà très bien équipée : chauffage, caméra et radar de recul, assistance en côte, alerte au siège, radio, Bluetooth et prise USB, toit ouvrant avec ventilateurs, pare-soleil et enjoliveurs. Vous avez le confort au quotidien, vous économisez 1 000 € et vous roulez dans quelques semaines au lieu d'attendre plusieurs mois.";
export const UPGRADE_ARGS = "Elle est beaucoup plus confortable au quotidien, elle sera aussi plus facile à revendre le jour où vous voudrez changer, et son prix reste déjà très bas pour une voiture aussi équipée.";

/** Textes envoyés au client (SMS sans émoji ni caractère hors GSM, pour tenir en 2 SMS). */
export function confirmationTexts(r: Pick<Reservation, "prenom" | "nom" | "modele" | "ville" | "total">) {
  const p = prenomOf(r); const m = modeleOf(r.modele); const bonjour = `Bonjour${p ? " " + p : ""}`;
  const onOrder = isOnOrder(r.modele);
  const ess = /essentiel/i.test(r.modele || "");
  const smsEss = `${bonjour}, merci pour votre réservation NeoDrive Essentielle. Ce modèle est fabriqué sur commande : 6 à 8 mois. La Confort est livrée en 2 à 3 semaines, pour 1 000 € de plus : chauffage, caméra et radar de recul, assistance en montée, alerte au siège, radio Bluetooth USB, toit ouvrant avec ventilateurs, pare-soleil, enjoliveurs. Plus confortable, plus facile à revendre, et un prix déjà très bas. Un conseiller vous appelle sous 48 h. Paiement à la livraison. NeoDrive`;
  const smsPlus = `${bonjour}, merci pour votre réservation NeoDrive Confort Plus. Ce modèle est fabriqué sur commande, avec un délai de plusieurs mois. La Confort, elle, est livrée en 2 à 3 semaines et coute 1 000 € de moins : chauffage, caméra et radar de recul, assistance en montée, radio Bluetooth USB, toit ouvrant avec ventilateurs. Un conseiller vous appelle sous 48 h. Paiement à la livraison. NeoDrive`;
  const smsConfort = `${bonjour}, votre commande NeoDrive ${m} est bien reçue. Nous la mettons en production : délai approximatif de 2 à 3 semaines. Nous revenons vers vous dès que votre véhicule est prêt pour fixer la livraison. Paiement à la livraison. NeoDrive`;
  const sms0 = ess ? smsEss : onOrder ? smsPlus : smsConfort;
  // 2 SMS maximum (306 caractères GSM) : sans le prénom si besoin.
  const sms = sms0.length > (onOrder ? 612 : 306) ? sms0.replace(`${bonjour},`, "Bonjour,") : sms0;
  const whatsapp = ess
    ? `${bonjour}, merci pour votre réservation NeoDrive Essentielle ✅ Elle est bien enregistrée.\n\nL'Essentielle est fabriquée sur commande, avec un délai de 6 à 8 mois. La NeoDrive Confort, elle, peut vous être livrée en 2 à 3 semaines, pour seulement 1 000 € de plus (4 990 € au lieu de 3 990 €).\n\nVoici tout ce qu'elle a en plus :\n${CONFORT_EXTRAS.map(x => "- " + x).join("\n")}\n\n${UPGRADE_ARGS}\n\nUn conseiller vous appelle sous 48 h pour en parler.\nPaiement uniquement à la livraison.\nMansour - NeoDrive`
    : onOrder
    ? `${bonjour}, merci pour votre réservation NeoDrive Confort Plus ✅ Elle est bien enregistrée.\n\nLa Confort Plus est fabriquée sur commande, avec un délai de plusieurs mois. La NeoDrive Confort, elle, peut vous être livrée en 2 à 3 semaines, et elle coûte 1 000 € de moins (4 990 € au lieu de 5 990 €).\n\n${PLUS_ARGS}\n\nUn conseiller vous appelle sous 48 h pour en parler.\nPaiement uniquement à la livraison.\nMansour - NeoDrive`
    : `${bonjour}, votre commande NeoDrive ${m} est bien reçue ✅\n\nNous la mettons en production : le délai est d'environ 2 à 3 semaines. Nous revenons vers vous dès que votre véhicule est prêt pour fixer ensemble la livraison.\n\nPaiement uniquement à la livraison.\nMansour - NeoDrive`;
  const lines = ess
    ? [`Merci pour votre réservation NeoDrive <b>Essentielle</b> ✅ Elle est bien enregistrée.`,
       `L'Essentielle est <b>fabriquée sur commande</b>, avec un délai de <b>6 à 8 mois environ</b>. La <b>NeoDrive Confort</b>, elle, peut vous être <b>livrée en 2 à 3 semaines</b>, pour seulement <b>1 000 € de plus</b> (4 990 € au lieu de 3 990 €).`,
       `Voici tout ce qu'elle a en plus :<br>${CONFORT_EXTRAS.map(x => "• " + x).join("<br>")}`,
       UPGRADE_ARGS,
       `Un conseiller vous appelle <b>sous 48 h</b> pour en parler.`]
    : onOrder
    ? [`Merci pour votre réservation NeoDrive <b>Confort Plus</b> ✅ Elle est bien enregistrée.`,
       `La Confort Plus est <b>fabriquée sur commande</b>, avec un délai de <b>plusieurs mois</b>. La <b>NeoDrive Confort</b>, elle, peut vous être <b>livrée en 2 à 3 semaines</b>, et elle coûte <b>1 000 € de moins</b> (4 990 € au lieu de 5 990 €).`,
       PLUS_ARGS,
       `Un conseiller vous appelle <b>sous 48 h</b> pour en parler.`]
    : [`Votre commande NeoDrive <b>${m}</b> est bien reçue ✅`,
       `Nous la <b>mettons en production</b> : le délai est d'environ <b>2 à 3 semaines</b>.`,
       `Nous revenons vers vous <b>dès que votre véhicule est prêt</b> pour fixer ensemble la livraison.`];
  const recap = [r.modele ? `Modèle : ${r.modele}` : "", r.total != null ? `Prix total livré : ${euro(r.total)}` : "", r.ville ? `Livraison : ${r.ville}` : ""].filter(Boolean);
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:560px">
<p>${bonjour},</p>${lines.map(l => `<p>${l}</p>`).join("")}
${recap.length ? `<p style="background:#f4f4f5;border-radius:10px;padding:12px 14px">${recap.join("<br>")}<br>Paiement uniquement à la livraison, aucun acompte.</p>` : `<p>Paiement uniquement à la livraison, aucun acompte.</p>`}
<p>En attendant, préparez sereinement votre livraison : <a href="${SITE}/preparer-ma-livraison">${SITE.replace("https://", "")}/preparer-ma-livraison</a></p>
<p>Merci pour votre confiance,<br>Mansour<br>NeoDrive</p></div>`;
  const subject = ess ? `Votre réservation NeoDrive Essentielle : livrée en 2 à 3 semaines avec la Confort ?` : onOrder ? `Votre réservation NeoDrive ${m} : la Confort disponible en 2 à 3 semaines` : `Commande NeoDrive ${m} bien reçue ✅`;
  const note = onOrder ? (ess ? "Essentielle : 6 à 8 mois annoncés, arguments Confort envoyés (+1 000 €, équipements, revente) ; " : "Confort Plus sur commande, arguments Confort envoyés (-1 000 €, délai) ; ") + "un conseiller rappelle sous 48 h (proposition Confort)" : "commande bien reçue, mise en production, délai 2 à 3 semaines ; on revient vers le client quand le véhicule est prêt";
  return { sms, whatsapp, html, subject, note, onOrder };
}

type Ch = { sms?: string; email?: string; whatsapp?: string; owner?: string };

/** Envoie la confirmation (une seule fois par numéro sur 24 h) et met à jour la réservation et la fiche prospect. */
export async function confirmReservation(sb: SupabaseClient, r: Reservation, opts: { dry?: boolean } = {}) {
  await applyStoredSecrets().catch(() => {});
  const phone = normalizePhone(r.telephone);
  const t = confirmationTexts(r);
  const ch: Ch = {};
  const now = new Date().toISOString();

  // Déjà confirmé pour ce numéro dans les 24 h (ex. devis puis contrat) : on n'envoie pas deux fois au client.
  let already = false;
  if (phone && !opts.dry) {
    const { data } = await sb.from("reservations").select("id,confirm").eq("telephone", r.telephone).neq("id", r.id).gte("created_at", new Date(Date.now() - 86400000).toISOString()).limit(5);
    already = (data || []).some((x: { confirm?: { at?: string } }) => !!x.confirm?.at);
  }
  // Liste noire / STOP / numéro de Hana.
  let blocked = !phone || phone.endsWith(HANA);
  let lead: { id: number; history: unknown[]; last_inbound_at: string | null; notes: string | null } | null = null;
  if (phone) {
    const variants = [phone, `+${phone}`, phone.startsWith("33") ? `0${phone.slice(2)}` : phone];
    const [{ data: bl }, { data: ld }] = await Promise.all([
      sb.from("whatsapp_blacklist").select("phone").in("phone", variants).limit(1),
      sb.from("leads").select("id,history,last_inbound_at,opted_out_at,notes").in("telephone", variants).order("id", { ascending: false }).limit(1),
    ]);
    if (bl?.length || ld?.[0]?.opted_out_at) blocked = true;
    if (ld?.[0]) lead = { id: ld[0].id, history: Array.isArray(ld[0].history) ? ld[0].history : [], last_inbound_at: ld[0].last_inbound_at, notes: ld[0].notes };
  }

  if (opts.dry) return { texts: t, blocked, already, lead: lead?.id ?? null };

  const ready = brevoReady();
  if (!already && !blocked && ready) {
    try { await sendSms(r.telephone, t.sms); ch.sms = "envoyé"; } catch (e) { ch.sms = `erreur : ${e instanceof Error ? e.message : e}`; console.error("[RES-CONFIRM] sms", e); }
  } else ch.sms = already ? "déjà confirmé (24 h)" : blocked ? "bloqué (STOP / liste noire)" : "Brevo non connecté";
  if (!already && /@/.test(r.email || "") && ready) {
    try { await sendEmail(r.email, `${r.prenom} ${r.nom}`.trim(), t.subject, t.html); ch.email = "envoyé"; } catch (e) { ch.email = `erreur : ${e instanceof Error ? e.message : e}`; console.error("[RES-CONFIRM] email", e); }
  } else ch.email = already ? "déjà confirmé (24 h)" : !/@/.test(r.email || "") ? "pas d'e-mail" : "Brevo non connecté";

  // WhatsApp : texte libre si le client nous a écrit il y a moins de 24 h, sinon modèle Meta (envoyé plus tard par la tâche planifiée).
  if (already || blocked) ch.whatsapp = already ? "déjà confirmé (24 h)" : "bloqué";
  else if (process.env.WHATSAPP_SENDING === "on" && lead?.last_inbound_at && Date.now() - new Date(lead.last_inbound_at).getTime() < 23 * 3600000) {
    const x = await relay("send-text", { to: phone, text: t.whatsapp }).catch(e => ({ ok: false, j: { error: String(e) } }));
    ch.whatsapp = x.ok ? "envoyé (texte libre)" : "en attente";
  } else ch.whatsapp = t.onOrder ? "non prévu (modèle sur commande : SMS + e-mail)" : "en attente";

  // Alerte au fondateur.
  if (ready) {
    const who = `${r.prenom} ${r.nom}`.trim() || "Client";
    const msg = `NeoDrive : nouvelle réservation ${modeleOf(r.modele)} - ${who} (${r.telephone}) ${r.ville || ""} ${r.code_postal || ""}${r.total != null ? " - " + euro(r.total) : ""}. Confirmation client : SMS ${ch.sms}, e-mail ${ch.email}.`;
    try { await sendSms(OWNER_SMS(), msg.slice(0, 300)); ch.owner = "SMS"; } catch (e) { console.error("[RES-CONFIRM] owner sms", e); }
    try { await sendEmail(OWNER_EMAIL, "Mansour", `🆕 Réservation ${modeleOf(r.modele)} — ${who} (${r.ville || r.code_postal || "?"})`, `<p>${msg}</p><p><a href="${SITE}/reservations-admin">Ouvrir les réservations</a></p>`); ch.owner = (ch.owner ? ch.owner + " + " : "") + "e-mail"; } catch (e) { console.error("[RES-CONFIRM] owner email", e); }
  }

  const date = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  const confirm = { at: now, ...ch, whatsapp_template: ch.whatsapp === "en attente" ? RESERVATION_TEMPLATE : undefined };
  const line = `[${date}] Confirmation automatique : SMS ${ch.sms} · e-mail ${ch.email} · WhatsApp ${ch.whatsapp}`;
  await sb.from("reservations").update({ confirm, notes: [r.notes, line].filter(Boolean).join(" · ").slice(0, 2000), updated_at: now }).eq("id", r.id);

  // Fiche prospect : contexte pour l'équipe et pour Hana.
  if (lead) {
    const note = `Réservation enregistrée le ${date} (${r.modele || "modèle ?"}, ${r.ville || r.code_postal || "ville ?"}) : ${t.note}.`;
    const ev = { type: "reservation_confirmation", at: now, sent_at: now, modele: r.modele, ville: r.ville, channels: ch, reservation_id: r.id };
    const { data: cur } = await sb.from("leads").select("statut").eq("id", lead.id).maybeSingle();
    await sb.from("leads").update({
      statut: cur?.statut === "Client" ? "Client" : "Chaud", phase: "Réservation",
      notes: [lead.notes, note].filter(Boolean).join("\n").slice(-4000),
      history: [...lead.history, ev], last_contact_at: now, updated_at: now,
    }).eq("id", lead.id);
  }
  return { channels: ch, already, blocked };
}

/** Tâche planifiée : envoie les confirmations WhatsApp en attente dès que Meta a approuvé le modèle. */
export async function sendPendingReservationWhatsapp(sb: SupabaseClient, limit = 20) {
  let tpl: { status: string; reason?: string | null };
  try { tpl = await reservationTemplateStatus(true); } catch (e) { return { template: "ERREUR", error: e instanceof Error ? e.message : String(e), sent: 0 }; }
  if (tpl.status !== "APPROVED") return { template: tpl.status, sent: 0 };
  if (process.env.WHATSAPP_SENDING !== "on") return { template: tpl.status, sent: 0, skipped: "WHATSAPP_SENDING off" };
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data } = await sb.from("reservations").select("*").gte("created_at", since).eq("confirm->>whatsapp", "en attente").limit(limit);
  let sent = 0;
  for (const r of (data || []) as (Reservation & { confirm: Record<string, unknown> })[]) {
    const phone = normalizePhone(r.telephone); if (!phone) continue;
    const x = await relay("send-template", { to: phone, name: RESERVATION_TEMPLATE, language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr", params: [prenomOf(r) || "et merci", modeleOf(r.modele)] }).catch(e => ({ ok: false, j: { error: String(e) } }));
    const status = x.ok ? "envoyé (modèle)" : `erreur : ${String((x.j as { error?: { message?: string } | string })?.error && typeof (x.j as { error?: unknown }).error === "object" ? ((x.j as { error: { message?: string } }).error.message || "") : (x.j as { error?: string }).error || "")}`.slice(0, 200);
    await sb.from("reservations").update({ confirm: { ...r.confirm, whatsapp: status, whatsapp_at: new Date().toISOString() } }).eq("id", r.id);
    if (x.ok) sent++;
  }
  return { template: tpl.status, sent };
}
