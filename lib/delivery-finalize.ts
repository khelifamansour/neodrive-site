/** Fin de livraison : PDF de l'accusé, mise à jour de la réservation et du stock, envoi au client. Serveur uniquement. */
import { randomBytes } from "crypto";
import { crmDatabase } from "./crm-agent";
import { listJson } from "./datastore";
import { PLAN_TOURS } from "./fleet";
import { applyStoredSecrets } from "./integrations";
import { brevoReady, OWNER_EMAIL, sendEmail, sendSms, SITE } from "./brevo";
import { DRIVER_BUCKET } from "./driver-docs";
import { RECEIPT_FOLDER, receiptPdf, type ReceiptData } from "./delivery-receipt";
import type { PlanTour } from "./planif";

type DB = ReturnType<typeof crmDatabase>;
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const OWNER_SMS = () => process.env.OWNER_SMS_PHONE || "0689781710";
export const intlPhone = (p: string) => { const d = String(p || "").replace(/\D/g, ""); return d.startsWith("0") ? "33" + d.slice(1) : d; };
const eur = (n: number | null | undefined) => n == null ? "" : `${Math.round(Number(n)).toLocaleString("fr-FR")} €`;

/** Statut affiché : « Livrée – paiement en attente » tant que le paiement n'est pas confirmé. */
export const deliveryLabel = (r: { statut?: string | null; livre_at?: string | null; paiement_en_attente?: boolean | null; paiement_confirme_at?: string | null }) =>
  r.livre_at && r.paiement_en_attente && !r.paiement_confirme_at ? "Livrée – paiement en attente" : r.statut || "";

/**
 * Enregistre l'accusé (signature sur le téléphone du livreur ou confirmation à distance du client) :
 * PDF, statut « Livrée » (seulement si le paiement est confirmé), stock, tournée, e-mail au client avec copie au fondateur.
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
  const how = data.mode === "distance" ? `confirmé à distance par ${data.signer}` : `signé par ${data.signer}`;
  const line = `[${new Date(at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}] Livrée${paid ? "" : " – paiement en attente" + (data.pending?.montant_du ? ` (${eur(data.pending.montant_du)} dus)` : "")}, accusé ${how} (VIN ${r.vin})${data.reserves ? " · réserves : " + data.reserves : ""}`;
  const patch: Record<string, unknown> = { livre_at: at, accuse_path: `${base}.pdf`, accuse_token: token, accuse_data: data, notes: [r.notes, line].filter(Boolean).join("\n"), updated_at: at };
  if (paid) patch.statut = "Livrée";
  const { data: upd, error } = await db.from("reservations").update(patch).eq("id", id).is("accuse_token", null).select("id");
  if (error) throw new Error(error.message);
  if (!upd?.length) throw new Error("Cette livraison est déjà confirmée.");
  await db.from("shipment_vehicles").update({ status: "livrée", client_name: data.client, delivered_at: at, driver: data.livreur, updated_at: at }).eq("vin", r.vin);
  if (r.plan_client_id) {
    try {
      const tours = await listJson<PlanTour>(db, PLAN_TOURS);
      const t = tours.filter(x => x.clientIds?.includes(r.plan_client_id)).sort((a, z) => String(z.date).localeCompare(String(a.date)))[0];
      if (t) await db.from("tour_events").insert({ tour_id: t.id, kind: "accuse_signe", client_id: r.plan_client_id, lat: data.lat ?? null, lng: data.lng ?? null, note: `Accusé ${how} · VIN ${r.vin}`, author: data.livreur, data: { reservation_id: id, vin: r.vin, reserves: data.reserves, mode: data.mode || "signature" } });
    } catch (e) { console.error("[LIVRAISON] tour_event", e); }
  }
  const url = `${SITE}/api/accuse/${token}`;
  let emailed = false;
  await applyStoredSecrets();
  if (brevoReady()) {
    const first = String(r.prenom || "").split(/\s+/)[0];
    const pendingTxt = !paid ? `<p><b>Paiement en attente${data.pending?.montant_du ? ` (${esc(eur(data.pending.montant_du))})` : ""}</b> : les clés et les documents du véhicule vous seront remis ou envoyés par courrier suivi dès réception de votre virement.</p>` : "";
    const html = `<p>Bonjour ${esc(first)},</p><p>Bienvenue dans la famille NeoDrive ! Vous trouverez ci-joint l'accusé de réception de votre véhicule (n° de série ${esc(r.vin)}).</p>${pendingTxt}<p>Vous pouvez aussi le consulter ici : <a href="${url}">${url}</a></p><p>Une question, un souci ? Répondez simplement à cet e-mail ou appelez-nous au 06 89 78 17 10.</p><p>Bonne route !<br>Mansour - NeoDrive</p>`;
    const att = [{ name: `Accuse-reception-${data.numero}.pdf`, content: pdf.toString("base64") }];
    try {
      if (r.email) emailed = !!(await sendEmail(r.email, data.client, "Votre accusé de réception NeoDrive", html, att, { cc: [OWNER_EMAIL], replyTo: OWNER_EMAIL }));
      else await sendEmail(OWNER_EMAIL, "Mansour", `Accusé de réception – ${data.client} (VIN ${r.vin})`, `<p>Accusé ${esc(how)} pour ${esc(data.client)} (pas d'e-mail client connu).</p><p><a href="${url}">${url}</a></p>`, att);
    } catch (e) { console.error("[LIVRAISON] email accusé", e); }
    try { await sendSms(OWNER_SMS(), `NeoDrive : livraison de ${data.client} ${paid ? "terminee" : "faite, PAIEMENT EN ATTENTE"}, accuse ${data.mode === "distance" ? "confirme a distance" : "signe"} (VIN ${r.vin}).`); } catch (e) { console.error("[LIVRAISON] SMS fondateur", e); }
  }
  const wa = r.telephone ? `https://wa.me/${intlPhone(r.telephone)}?text=${encodeURIComponent(`Bonjour, voici votre accusé de réception NeoDrive : ${url} Bonne route ! NeoDrive`)}` : null;
  return { url, emailed, whatsapp: wa, paid };
}
