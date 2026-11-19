/**
 * Lien de signature de l'accusé de réception (/accuse/confirmer/<token>), partagé par l'espace livreur
 * et la page chauffeur (/chauffeur). Le client y déclare son mode de règlement puis signe.
 */
import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyStoredSecrets } from "./integrations";
import { brevoReady, sendEmail, sendSms } from "./brevo";

const SITE = "https://www.easydrive-auto.fr";
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type Res = { id: number; prenom: string | null; nom: string | null; telephone: string | null; email: string | null; vin: string | null; modele: string | null; paiement_confirme_at: string | null; paiement_en_attente: boolean | null; accuse_token: string | null; confirm_token: string | null; reserve_token: string | null };
export class AccuseError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

async function ready(db: SupabaseClient, id: number): Promise<Res> {
  const { data: r } = await db.from("reservations").select("id,prenom,nom,telephone,email,vin,modele,paiement_confirme_at,paiement_en_attente,accuse_token,confirm_token,reserve_token").eq("id", id).maybeSingle();
  if (!r) throw new AccuseError("Réservation introuvable", 404);
  if (r.accuse_token) throw new AccuseError("Le client a déjà signé l'accusé de réception.", 409);
  if (!r.vin) throw new AccuseError("Chargez d'abord le véhicule (numéro de série) pour ce client.");
  if (!r.paiement_confirme_at && !r.paiement_en_attente) throw new AccuseError("Le paiement n'est pas encore confirmé par Mansour : ne remettez pas les clés, appelez Mansour.", 409);
  if (!r.paiement_confirme_at && r.reserve_token) throw new AccuseError("Le client a déjà signé la remise avec réserve de propriété : attendez que Mansour confirme le paiement, puis faites signer l'accusé final.", 409);
  return r as Res;
}

/** Lien personnel du client (créé si besoin), sans rien envoyer : pour faire signer sur le téléphone du chauffeur. */
export async function accuseLink(db: SupabaseClient, id: number) {
  const r = await ready(db, id);
  const token = r.confirm_token || randomBytes(24).toString("hex");
  if (!r.confirm_token) await db.from("reservations").update({ confirm_token: token, updated_at: new Date().toISOString() }).eq("id", id);
  return `${SITE}/accuse/confirmer/${token}`;
}

/** Envoie le lien au client par SMS (transactionnel, envoyé à toute heure) et par e-mail. */
export async function sendAccuseLink(db: SupabaseClient, id: number) {
  const r = await ready(db, id);
  if (!r.telephone && !r.email) throw new AccuseError("Ni téléphone ni e-mail pour ce client : faites signer sur ce téléphone.");
  const token = r.confirm_token || randomBytes(24).toString("hex");
  const link = `${SITE}/accuse/confirmer/${token}`;
  const first = String(r.prenom || "").split(/\s+/)[0];
  const reserve = !r.paiement_confirme_at && !!r.paiement_en_attente;
  const sent = { sms: false, email: false, errors: [] as string[] };
  await applyStoredSecrets();
  if (!brevoReady()) throw new AccuseError("Envoi indisponible : faites signer sur ce téléphone.", 503);
  if (r.telephone) { try { sent.sms = !!(await sendSms(r.telephone, reserve ? `Bonjour ${first}, NeoDrive : votre paiement n'est pas encore recu. Merci de signer la remise de votre vehicule (paiement en attente) sur ce lien : ${link}` : `Bonjour ${first}, NeoDrive : merci de confirmer la reception de votre vehicule en 30 secondes sur ce lien : ${link}`, "transactional")); } catch (e) { sent.errors.push("SMS : " + (e as Error).message); } }
  if (r.email) { try { sent.email = !!(await sendEmail(r.email, `${r.prenom || ""} ${r.nom || ""}`.trim(), reserve ? "Remise de votre NeoDrive – paiement en attente : à signer" : "Confirmez la réception de votre NeoDrive", reserve ? `<p>Bonjour ${esc(first)},</p><p>Votre NeoDrive ${esc(r.modele || "")} (n° de série ${esc(r.vin)}) vous est remise alors que votre paiement n'est pas encore reçu. Merci de lire et signer le document de remise (réserve de propriété) :</p><p><a href="${link}" style="display:inline-block;background:#e8592a;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Lire et signer</a></p><p>Les clés et les documents vous seront remis dès réception du paiement.</p><p>Merci,<br>Mansour - NeoDrive</p>` : `<p>Bonjour ${esc(first)},</p><p>Votre NeoDrive ${esc(r.modele || "")} (n° de série ${esc(r.vin)}) vient de vous être remise. Merci de confirmer sa réception en 30 secondes :</p><p><a href="${link}" style="display:inline-block;background:#e8592a;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Je confirme la réception</a></p><p>Vous recevrez ensuite votre accusé de réception en PDF.</p><p>Merci,<br>Mansour - NeoDrive</p>`)); } catch (e) { sent.errors.push("E-mail : " + (e as Error).message); } }
  if (!sent.sms && !sent.email) throw new AccuseError("Envoi impossible : " + sent.errors.join(" · "), 502);
  const at = new Date().toISOString();
  await db.from("reservations").update({ confirm_token: token, confirm_sent_at: at, updated_at: at }).eq("id", id);
  return sent;
}

/** Remise avec paiement en attente : le chauffeur l'active (montant dû, échéance) ; il ne confirme jamais un paiement. */
export async function startReserve(db: SupabaseClient, id: number, o: { montant: unknown; due: unknown; by: string }) {
  const { data: r } = await db.from("reservations").select("id,total,vin,paiement_confirme_at,accuse_token,reserve_token,notes").eq("id", id).maybeSingle();
  if (!r) throw new AccuseError("Réservation introuvable", 404);
  if (r.accuse_token || r.reserve_token) throw new AccuseError("Ce client a déjà signé.", 409);
  if (r.paiement_confirme_at) throw new AccuseError("Le paiement est déjà confirmé : livraison normale.", 409);
  if (!r.vin) throw new AccuseError("Chargez d'abord le véhicule (numéro de série) pour ce client.");
  const m = Number(String(o.montant ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
  const montant = Number.isFinite(m) && m > 0 ? Math.round(m * 100) / 100 : (r.total == null ? null : Number(r.total));
  const due = /^\d{4}-\d{2}-\d{2}$/.test(String(o.due || "")) ? String(o.due) : null;
  const at = new Date().toISOString();
  const line = `[${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}] Remise avec réserve de propriété préparée par ${o.by}${montant ? ` : ${montant} € dus` : ""}${due ? `, échéance ${due}` : ""}`;
  const { error } = await db.from("reservations").update({ paiement_en_attente: true, montant_du: montant, reserve_due: due, remise_data: { kept: { cles: true, documents: true }, by: o.by, at }, notes: [r.notes, line].filter(Boolean).join("\n"), updated_at: at }).eq("id", id);
  if (error) throw new Error(error.message);
  return { montant, due };
}
