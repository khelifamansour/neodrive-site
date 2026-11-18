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
type Res = { id: number; prenom: string | null; nom: string | null; telephone: string | null; email: string | null; vin: string | null; modele: string | null; paiement_confirme_at: string | null; paiement_en_attente: boolean | null; accuse_token: string | null; confirm_token: string | null };
export class AccuseError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

async function ready(db: SupabaseClient, id: number): Promise<Res> {
  const { data: r } = await db.from("reservations").select("id,prenom,nom,telephone,email,vin,modele,paiement_confirme_at,paiement_en_attente,accuse_token,confirm_token").eq("id", id).maybeSingle();
  if (!r) throw new AccuseError("Réservation introuvable", 404);
  if (r.accuse_token) throw new AccuseError("Le client a déjà signé l'accusé de réception.", 409);
  if (!r.vin) throw new AccuseError("Chargez d'abord le véhicule (numéro de série) pour ce client.");
  if (!r.paiement_confirme_at && !r.paiement_en_attente) throw new AccuseError("Le paiement n'est pas encore confirmé par Mansour : ne remettez pas les clés, appelez Mansour.", 409);
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
  const sent = { sms: false, email: false, errors: [] as string[] };
  await applyStoredSecrets();
  if (!brevoReady()) throw new AccuseError("Envoi indisponible : faites signer sur ce téléphone.", 503);
  if (r.telephone) { try { sent.sms = !!(await sendSms(r.telephone, `Bonjour ${first}, NeoDrive : merci de confirmer la reception de votre vehicule en 30 secondes sur ce lien : ${link}`, "transactional")); } catch (e) { sent.errors.push("SMS : " + (e as Error).message); } }
  if (r.email) { try { sent.email = !!(await sendEmail(r.email, `${r.prenom || ""} ${r.nom || ""}`.trim(), "Confirmez la réception de votre NeoDrive", `<p>Bonjour ${esc(first)},</p><p>Votre NeoDrive ${esc(r.modele || "")} (n° de série ${esc(r.vin)}) vient de vous être remise. Merci de confirmer sa réception en 30 secondes :</p><p><a href="${link}" style="display:inline-block;background:#e8592a;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Je confirme la réception</a></p><p>Vous recevrez ensuite votre accusé de réception en PDF.</p><p>Merci,<br>Mansour - NeoDrive</p>`)); } catch (e) { sent.errors.push("E-mail : " + (e as Error).message); } }
  if (!sent.sms && !sent.email) throw new AccuseError("Envoi impossible : " + sent.errors.join(" · "), 502);
  const at = new Date().toISOString();
  await db.from("reservations").update({ confirm_token: token, confirm_sent_at: at, updated_at: at }).eq("id", id);
  return sent;
}
