/** Dossiers carte grise : stockage privé et envoi au prestataire (NK Services) sur autorisation du fondateur. Serveur uniquement. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyStoredSecrets } from "./integrations";
import { brevoReady, OWNER_EMAIL, sendEmail } from "./brevo";
import { payState, type PayState } from "./stock-shared";
import { buildPack, PACK_SLOTS } from "./carte-grise-pack";
import { CARTE_GRISE_FILE_LABEL, CARTE_GRISE_PROVIDER_EMAIL, CARTE_GRISE_PROVIDER_NAME, requiredKeys, type CarteGriseFile, type DocCheck, type MissingRequest } from "./carte-grise";

export const CARTE_GRISE_BUCKET = "erp-documents";
/** Budget des pièces jointes (taille brute ; ~9,4 Mo une fois encodées en base64, sous la limite Brevo de ~10 Mo par e-mail). */
export const ATTACH_BUDGET = 7 * 1024 * 1024;
/** Au-delà du budget (ou format refusé par Brevo), la pièce est envoyée sous forme de lien privé valable 14 jours. */
export const LINK_TTL = 60 * 60 * 24 * 14;

export type CarteGriseDossier = {
  id: number; ref: string; folder: string; created_at: string; type_demande: string | null; nom: string | null; prenom: string | null;
  telephone: string | null; email: string | null; adresse: string | null; code_postal: string | null; ville: string | null; version: string | null;
  service_carte_grise: string | null; fields: Record<string, string>; files: CarteGriseFile[]; status: string; sent_to_provider_at: string | null; sent_to: string | null; notes: string | null;
  vin?: string | null; reservation_id?: number | null; doc_check?: DocCheck | null; missing_token?: string | null; missing_request?: MissingRequest | null; auto_resend?: boolean | null;
};

const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const mo = (n: number) => `${(n / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
export const fullName = (d: Pick<CarteGriseDossier, "prenom" | "nom">) => [d.prenom, d.nom].map(s => (s || "").trim()).filter(Boolean).join(" ") || "client";

export async function findDossier(sb: SupabaseClient, sel: { dossier_id?: unknown; id?: unknown; ref?: unknown }) {
  const id = Number(sel.dossier_id ?? sel.id);
  const q = sb.from("carte_grise_dossiers").select("*");
  const { data, error } = id ? await q.eq("id", id).maybeSingle() : await q.eq("ref", String(sel.ref || "")).maybeSingle();
  if (error) throw new Error(error.message);
  return data as CarteGriseDossier | null;
}

/** Liens privés (14 jours) vers chaque pièce du dossier. */
export async function dossierLinks(sb: SupabaseClient, d: CarteGriseDossier, ttl = LINK_TTL) {
  const out: { key: string; label: string; name: string; url: string }[] = [];
  for (const f of d.files || []) {
    const { data } = await sb.storage.from(CARTE_GRISE_BUCKET).createSignedUrl(f.path, ttl, { download: f.name });
    if (data?.signedUrl) out.push({ key: f.key, label: f.label, name: f.name, url: data.signedUrl });
  }
  return out;
}

export const UNPAID_ERROR = "Paiement non confirmé : carte grise bloquée tant que le virement n'est pas reçu";
const PAY_COLS = "id,statut,paiement_confirme_at,paiement_en_attente,reserve_path,reserve_token,montant_du";

/** État du paiement de la réservation reliée au dossier (par reservation_id, sinon par VIN) ; « inconnu » sans réservation. */
export async function dossierPayState(sb: SupabaseClient, d: Pick<CarteGriseDossier, "reservation_id" | "vin">): Promise<{ state: PayState; reservation_id: number | null }> {
  let r: Record<string, unknown> | null = null;
  if (d.reservation_id) r = (await sb.from("reservations").select(PAY_COLS).eq("id", d.reservation_id).maybeSingle()).data as Record<string, unknown> | null;
  if (!r && d.vin) r = ((await sb.from("reservations").select(PAY_COLS).eq("vin", d.vin).order("id", { ascending: false }).limit(1)).data || [])[0] as Record<string, unknown> | null ?? null;
  return { state: payState(r as never), reservation_id: r ? Number(r.id) : null };
}

/**
 * Envoie le dossier au prestataire carte grise (to, sinon NK Services), copie au fondateur, réponse au fondateur.
 * Pack standard (lib/carte-grise-pack) : certificat de vente, COC, mandat tamponné, contrat, identité, domicile, en pièces jointes
 * aux noms normalisés (photos réduites pour tenir sous ATTACH_BUDGET ; lien privé 14 jours en dernier recours).
 * Refuse un dossier déjà envoyé, sauf force. Refuse aussi un dossier dont la réservation reliée n'est pas payée (réserve de propriété,
 * paiement en attente), sauf allowUnpaid (clic explicite du fondateur) ; sans réservation reliée, l'envoi reste possible.
 * Le mandat est toujours tamponné (cachet MK HOLDING) avant l'envoi. complement : renvoi après une pièce complémentaire (objet « RE: … », nouvelles pièces en premier).
 */
export async function sendDossierToProvider(sb: SupabaseClient, d: CarteGriseDossier, opts: { to?: string; force?: boolean; complement?: string[]; allowUnpaid?: boolean; allowMissing?: boolean } = {}) {
  const to = String(opts.to || CARTE_GRISE_PROVIDER_EMAIL || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("Adresse du prestataire carte grise manquante (CARTE_GRISE_PROVIDER_EMAIL).");
  if (d.sent_to_provider_at && !opts.force) throw Object.assign(new Error(`Dossier déjà envoyé le ${new Date(d.sent_to_provider_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} à ${d.sent_to || "?"} (ajoutez force pour renvoyer).`), { status: 409 });
  if (!opts.allowUnpaid) {
    const pay = await dossierPayState(sb, d);
    if (pay.state !== "payé" && pay.state !== "inconnu") throw Object.assign(new Error(`${UNPAID_ERROR} (réservation n° ${pay.reservation_id} : ${pay.state}).`), { status: 409, code: "unpaid", pay: pay.state });
  }
  // Pack standard : une pièce obligatoire absente bloque l'envoi, sauf envoi forcé par le fondateur (la pièce manquante est alors signalée).
  const has = (k: string) => (d.files || []).some(f => f.key === k && !f.superseded);
  const absent = PACK_SLOTS.filter(s => requiredKeys(d).includes(s.key) && !has(s.key));
  if (absent.length && !opts.allowMissing) throw Object.assign(new Error(`Pièce(s) manquante(s) : ${absent.map(s => s.label).join(", ")}. Forcez l'envoi pour l'envoyer quand même (la pièce manquante sera signalée à ${CARTE_GRISE_PROVIDER_NAME}).`), { status: 409, code: "missing" });
  // Cachet MK HOLDING sur le mandat (signé à l'écran ou PDF importé), toujours avant que NK ne voie le dossier (idempotent ; met d à jour).
  const { stampMandat } = await import("./mandat-cachet");
  const cachet = await stampMandat(sb, d, { anyPdf: true });
  if (cachet.status === "missing_stamp" || cachet.status === "error") throw Object.assign(new Error(`Cachet MK HOLDING non apposé sur le mandat (${cachet.message}) : envoi annulé.`), { status: 409, code: "cachet" });
  const current = (d.files || []).filter(f => !f.superseded);
  if (!current.length) throw new Error("Aucune pièce enregistrée pour ce dossier.");
  await applyStoredSecrets();
  if (!brevoReady()) throw new Error("Brevo non connecté");

  const who = fullName(d);
  const isNew = (f: CarteGriseFile) => !!opts.complement?.includes(f.key) && !!f.added_at;
  const linkFor = async (f: CarteGriseFile) => (await sb.storage.from(CARTE_GRISE_BUCKET).createSignedUrl(f.path, LINK_TTL, { download: f.name })).data?.signedUrl || null;
  const { attachments, attached, linked, unavailable, used } = await buildPack(sb, CARTE_GRISE_BUCKET, current, { nom: d.nom || who, vin: d.vin, budget: ATTACH_BUDGET, isNew, linkFor });
  if (!attached.length && !linked.length) throw new Error("Pièces introuvables dans le stockage.");
  const missing = unavailable;

  const row = (k: string, v: unknown) => v ? `<tr><td style="padding:4px 14px 4px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>` : "";
  const docs = [...attached.map(it => ({ it, how: "en pièce jointe" })), ...linked.map(it => ({ it, how: `<a href="${esc(it.url)}">télécharger</a> (fichier trop lourd pour l’e-mail, lien valable 14 jours)` }))]
    .sort((a, b) => a.it.slot - b.it.slot || a.it.name.localeCompare(b.it.name))
    .map(({ it, how }) => `<li>${it.isNew ? "<b>NOUVELLE PIÈCE</b> – " : ""}${it.slot}. ${esc(it.label)} : <b>${esc(it.name)}</b> — ${how}</li>`).join("")
    + absent.map(s => `<li style="color:#a33">${PACK_SLOTS.indexOf(s) + 1}. ${esc(s.label)} : <b>pièce manquante</b>, nous vous la transmettrons dès réception.</li>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#141414">
<p>Bonjour,</p>
${opts.complement ? `<p>Suite à votre demande, voici la ou les pièce(s) complémentaire(s) : <b>${esc(opts.complement.map(k => CARTE_GRISE_FILE_LABEL[k] || k).join(", "))}</b>. Le dossier complet est de nouveau joint ci-dessous.</p>` : ""}
<p>Veuillez trouver ci-dessous le dossier d’immatriculation de notre client <b>${esc(who)}</b> (référence ${esc(d.ref)}), pour un véhicule NeoDrive (voiturette électrique neuve, catégorie L6e).</p>
<h3 style="margin:18px 0 6px">Titulaire</h3><table>${row("Nom", d.nom)}${row("Prénom", d.prenom)}${row("Téléphone", d.telephone)}${row("E-mail", d.email)}</table>
<h3 style="margin:18px 0 6px">Adresse</h3><table>${row("Adresse", d.adresse)}${row("Code postal", d.code_postal)}${row("Ville", d.ville)}</table>
<h3 style="margin:18px 0 6px">Véhicule</h3><table>${row("Marque", "NeoDrive")}${row("Version", d.version)}${row("Demande", d.type_demande)}${row("CNIT", d.fields?.cnit_code)}${row("Vendu par", d.fields?.partenaire ? `${d.fields.partenaire} (partenaire revendeur NeoDrive, certificat de vente joint)` : "")}</table>
<h3 style="margin:18px 0 6px">Documents</h3><ul>${docs}</ul>
${missing.length ? `<p style="color:#a33">Fichier(s) indisponible(s) : ${missing.map(f => esc(f.label)).join(", ")}. Nous vous les transmettrons séparément.</p>` : ""}
<p>Merci de nous confirmer la bonne réception et de nous tenir informés de l’avancement.<br>Bien cordialement,<br>Mansour Khelifa – NeoDrive (MK HOLDING SAS)</p></div>`;
  const subject = opts.complement ? `RE: Dossier carte grise – ${who} – pièce complémentaire` : `Dossier carte grise – ${who} – NeoDrive (MK HOLDING)`;
  const toName = to.toLowerCase() === CARTE_GRISE_PROVIDER_EMAIL.toLowerCase() ? CARTE_GRISE_PROVIDER_NAME : "";
  const messageId = await sendEmail(to, toName, subject, html, attachments, { cc: [OWNER_EMAIL], replyTo: OWNER_EMAIL });
  const at = new Date().toISOString();
  const note = `📤 ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} : ${opts.complement ? `pièce(s) complémentaire(s) (${opts.complement.map(k => CARTE_GRISE_FILE_LABEL[k] || k).join(", ")}) renvoyée(s) avec le dossier complet` : "envoyé"} à ${to} (${attached.length} pièce(s) jointe(s) ${mo(used)}, ${linked.length} lien(s))${cachet.status === "not_generated" ? " – ⚠️ mandat en photo : cachet MK HOLDING non apposé" : ""}`;
  await sb.from("carte_grise_dossiers").update({ sent_to_provider_at: at, sent_to: to, status: "envoyé", notes: [d.notes, note].filter(Boolean).join("\n"), updated_at: at }).eq("id", d.id);
  return { to, cc: [OWNER_EMAIL], subject, messageId, cachet: cachet.status, attached: attached.map(it => it.name), linked: linked.map(it => it.name), missing: [...absent.map(s => s.label), ...missing.map(f => f.name)], attachedSize: used };
}
