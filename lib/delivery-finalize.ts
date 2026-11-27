/** Fin de livraison : PDF du bon de livraison (document unique), mise à jour de la réservation et du stock, envoi au client. Serveur uniquement. */
import { randomBytes } from "crypto";
import { crmDatabase } from "./crm-agent";
import { listJson } from "./datastore";
import { PLAN_TOURS } from "./fleet";
import { applyStoredSecrets } from "./integrations";
import { brevoReady, OWNER_EMAIL, sendEmail, sendSms, SITE } from "./brevo";
import { DRIVER_BUCKET } from "./driver-docs";
import { RECEIPT_FOLDER, receiptPdf, type ReceiptData } from "./delivery-receipt";
import type { PlanTour } from "./planif";
import { onDelivered } from "./stock";

type DB = ReturnType<typeof crmDatabase>;
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const OWNER_SMS = () => process.env.OWNER_SMS_PHONE || "0689781710";
export const intlPhone = (p: string) => { const d = String(p || "").replace(/\D/g, ""); return d.startsWith("0") ? "33" + d.slice(1) : d; };
export const GUIDE_URL = `${SITE}/guide-batterie`;
const GUIDE_HTML = `<p style="background:#fff1ea;border:1px solid #f8c9b4;border-radius:10px;padding:10px 12px"><b>🔋 Très important : le guide batterie.</b> Pour préserver vos batteries et votre garantie (recharge, temps de charge, stockage), lisez nos consignes avant votre première recharge : <a href="${GUIDE_URL}">${GUIDE_URL}</a></p>`;
/** SMS client (caractères GSM uniquement) : lien vers le guide batterie, envoyé à chaque remise du véhicule. */
export async function sendGuideSms(phone: string) {
  if (!phone) return false;
  const d = intlPhone(phone);
  await sendSms("+" + d, `NeoDrive : bienvenue ! TRES IMPORTANT pour vos batteries et votre garantie : lisez nos consignes de recharge et de stockage avant la 1re recharge : easydrive-auto.fr/guide-batterie`, "transactional");
  return true;
}
/** Lien personnel « carte grise » (/carte-grise/preparer/<jeton>, jeton reservations.cg_prep_token créé au besoin) ; null si le dossier est déjà signé ou la colonne absente. */
export async function cgPrepLink(db: DB, id: number): Promise<string | null> {
  try {
    const { data: r, error } = await db.from("reservations").select("id,cg_prep_token").eq("id", id).maybeSingle();
    if (error || !r) return null;
    const { data: ds } = await db.from("carte_grise_dossiers").select("id,fields,status").eq("reservation_id", id).neq("status", "annulé").order("created_at", { ascending: false }).limit(1);
    const d = (ds || [])[0] as { fields?: Record<string, unknown> | null } | undefined;
    if (d?.fields?.prep_signed_at) return null;
    let token = r.cg_prep_token as string | null;
    if (!token) {
      token = randomBytes(20).toString("hex");
      await db.from("reservations").update({ cg_prep_token: token }).eq("id", id).is("cg_prep_token", null);
      const { data: again } = await db.from("reservations").select("cg_prep_token").eq("id", id).maybeSingle();
      token = (again?.cg_prep_token as string | null) || token;
    }
    return `${SITE}/carte-grise/preparer/${token}`;
  } catch (e) { console.error("[LIVRAISON] lien carte grise", e); return null; }
}
const cgHtml = (url: string) => `<p style="background:#eef4ff;border:1px solid #c7d7fe;border-radius:10px;padding:10px 12px"><b>🪪 Dernière étape : votre carte grise.</b> Votre véhicule est livré : prenez en photo la plaque du numéro de série (sous le capot ou au bas du pare-brise) et signez le mandat d'immatriculation au doigt, en 2 minutes (si ce n'est pas encore fait, ajoutez aussi votre pièce d'identité et un justificatif de domicile) :<br><a href="${url}" style="display:inline-block;margin-top:8px;background:#1849a9;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:bold">Finaliser ma carte grise</a></p>`;
const eur = (n: number | null | undefined) => n == null ? "" : `${Math.round(Number(n)).toLocaleString("fr-FR")} €`;

/** Statut affiché : « Livrée – paiement en attente » tant que le paiement n'est pas confirmé (réserve de propriété en cours). */
export const deliveryLabel = (r: { statut?: string | null; livre_at?: string | null; paiement_en_attente?: boolean | null; paiement_confirme_at?: string | null }) =>
  r.livre_at && r.paiement_en_attente && !r.paiement_confirme_at ? "Livrée – paiement en attente" : r.statut || "";

/**
 * Enregistre le bon de livraison unique (signature sur le téléphone du livreur ou via le lien personnel du client) :
 * PDF, statut « Livrée » dès la signature (paiement suivi à part : paiement_en_attente / paiement_confirme_at),
 * stock, tournée, e-mail au client avec copie au fondateur. Aucune autre signature n'est demandée ensuite.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function finalizeDelivery(db: DB, r: any, data: ReceiptData, signature: Buffer | null) {
  const id = Number(r.id);
  const pdf = await receiptPdf(data, signature);
  const base = `${RECEIPT_FOLDER}/${id}/accuse-${Date.now()}`;
  const up = await db.storage.from(DRIVER_BUCKET).upload(`${base}.pdf`, pdf, { contentType: "application/pdf", upsert: false });
  if (up.error) throw new Error("Enregistrement du PDF impossible : " + up.error.message);
  if (signature) await db.storage.from(DRIVER_BUCKET).upload(`${base}-signature.png`, signature, { contentType: "image/png", upsert: false });
  const token = randomBytes(24).toString("hex");
  const at = data.signed_at;
  const paid = !!r.paiement_confirme_at;
  const how = data.mode === "distance" ? `signé par ${data.signer} via son lien` : `signé par ${data.signer}`;
  const line = `[${new Date(at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}] Livrée${paid ? "" : " – paiement en attente, réserve de propriété jusqu'au paiement" + (data.pending?.montant_du ? ` (${eur(data.pending.montant_du)} dus)` : "")}, bon de livraison ${how} (VIN ${r.vin})${data.reserves ? " · réserves : " + data.reserves : ""}`;
  // Livrée dès la signature du bon ; le paiement reste suivi à part (paiement_en_attente jusqu'à paiement_confirme_at).
  const patch: Record<string, unknown> = { livre_at: at, statut: "Livrée", accuse_path: `${base}.pdf`, accuse_token: token, accuse_data: data, notes: [r.notes, line].filter(Boolean).join("\n"), updated_at: at };
  if (!paid) patch.paiement_en_attente = true;
  const { data: upd, error } = await db.from("reservations").update(patch).eq("id", id).is("accuse_token", null).is("reserve_token", null).select("id");
  if (error) throw new Error(error.message);
  if (!upd?.length) throw new Error("Cette livraison est déjà confirmée.");
  await db.from("shipment_vehicles").update({ status: "livrée", client_name: data.client, delivered_at: at, driver: data.livreur, updated_at: at }).eq("vin", r.vin);
  // Stock et facturation : la voiture est reliée à la réservation (ajoutée au stock si besoin) et un brouillon de facture est préparé.
  await onDelivered(db, r, data.livreur, at);
  if (r.plan_client_id) {
    try {
      const tours = await listJson<PlanTour>(db, PLAN_TOURS);
      const t = tours.filter(x => x.clientIds?.includes(r.plan_client_id)).sort((a, z) => String(z.date).localeCompare(String(a.date)))[0];
      if (t) await db.from("tour_events").insert({ tour_id: t.id, kind: "accuse_signe", client_id: r.plan_client_id, lat: data.lat ?? null, lng: data.lng ?? null, note: `Bon de livraison ${how} · VIN ${r.vin}`, author: data.livreur, data: { reservation_id: id, vin: r.vin, reserves: data.reserves, mode: data.mode || "signature" } });
    } catch (e) { console.error("[LIVRAISON] tour_event", e); }
  }
  const url = `${SITE}/api/accuse/${token}`;
  // Carte grise : lien personnel (étape 2 débloquée par la livraison), envoyé avec le bon de livraison (e-mail, SMS si crédit, WhatsApp via le livreur).
  const cg = await cgPrepLink(db, id);
  let emailed = false;
  await applyStoredSecrets();
  if (brevoReady()) {
    const first = String(r.prenom || "").split(/\s+/)[0];
    const html = `<p>Bonjour ${esc(first)},</p><p>Bienvenue dans la famille NeoDrive ! Vous trouverez ci-joint le bon de livraison de votre véhicule (n° de série ${esc(r.vin)}), que vous avez signé.</p><p>C'est le seul document à signer pour la livraison.</p><p>Vous pouvez aussi le consulter ici : <a href="${url}">${url}</a></p>${cg ? cgHtml(cg) : ""}${GUIDE_HTML}<p>Une question, un souci ? Répondez simplement à cet e-mail ou appelez-nous au 06 89 78 17 10.</p><p>Bonne route !<br>L'équipe NeoDrive</p>`;
    const att = [{ name: `Bon-de-livraison-${data.numero}.pdf`, content: pdf.toString("base64") }];
    try {
      if (r.email) emailed = !!(await sendEmail(r.email, data.client, "Votre bon de livraison NeoDrive", html, att, { cc: [OWNER_EMAIL], replyTo: OWNER_EMAIL }));
      else await sendEmail(OWNER_EMAIL, "Mansour", `Bon de livraison – ${data.client} (VIN ${r.vin})`, `<p>Bon de livraison ${esc(how)} pour ${esc(data.client)} (pas d'e-mail client connu).</p>${paid ? "" : "<p>Paiement pas encore confirmé : réserve de propriété en cours.</p>"}<p><a href="${url}">${url}</a></p>${cg ? `<p>Lien carte grise du client (à lui transmettre par WhatsApp) : <a href="${cg}">${cg}</a></p>` : ""}`, att);
    } catch (e) { console.error("[LIVRAISON] email bon de livraison", e); }
    try { if (r.telephone) await sendGuideSms(r.telephone); } catch (e) { console.error("[LIVRAISON] SMS guide", e); }
    try { if (r.telephone && cg) await sendSms("+" + intlPhone(r.telephone), `NeoDrive : derniere etape pour votre carte grise : photo de la plaque du numero de serie + signature du mandat (2 min) : ${cg}`, "transactional"); } catch (e) { console.error("[LIVRAISON] SMS carte grise", e); }
    try { await sendSms(OWNER_SMS(), `NeoDrive : livraison de ${data.client} ${paid ? "terminee" : "faite, PAIEMENT EN ATTENTE (reserve de propriete)"}, bon de livraison signe (VIN ${r.vin}).`, "transactional"); } catch (e) { console.error("[LIVRAISON] SMS fondateur", e); }
  }
  const wa = r.telephone ? `https://wa.me/${intlPhone(r.telephone)}?text=${encodeURIComponent(`Bonjour, voici votre bon de livraison NeoDrive : ${url}\n\n${cg ? `🪪 Dernière étape pour votre carte grise (2 minutes) : photo de la plaque du numéro de série + signature du mandat : ${cg}\n\n` : ""}🔋 TRÈS IMPORTANT : avant votre première recharge, lisez notre guide batterie (recharge, temps de charge, stockage) pour préserver vos batteries et votre garantie : ${GUIDE_URL}\n\nBonne route ! NeoDrive`)}` : null;
  const waCg = r.telephone && cg ? `https://wa.me/${intlPhone(r.telephone)}?text=${encodeURIComponent(`Bonjour${r.prenom ? " " + String(r.prenom).split(/\s+/)[0] : ""}, dernière étape pour votre carte grise (2 minutes) : prenez en photo la plaque du numéro de série et signez le mandat au doigt ici : ${cg}\n\nL'équipe NeoDrive`)}` : null;
  return { url, emailed, whatsapp: wa, paid, carte_grise_url: cg, carte_grise_whatsapp: waCg };
}
