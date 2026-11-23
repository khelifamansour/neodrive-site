/** Dossiers carte grise : stockage privé et envoi au prestataire (NK Services) sur autorisation du fondateur. Serveur uniquement. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyStoredSecrets } from "./integrations";
import { brevoReady, OWNER_EMAIL, sendEmail, type EmailAttachment } from "./brevo";
import { CARTE_GRISE_FILE_LABEL, CARTE_GRISE_PROVIDER_EMAIL, CARTE_GRISE_PROVIDER_NAME, type CarteGriseFile } from "./carte-grise";

export const CARTE_GRISE_BUCKET = "erp-documents";
/** Budget des pièces jointes (taille brute ; ~9,4 Mo une fois encodées en base64, sous la limite Brevo de ~10 Mo par e-mail). */
export const ATTACH_BUDGET = 7 * 1024 * 1024;
/** Au-delà du budget (ou format refusé par Brevo), la pièce est envoyée sous forme de lien privé valable 14 jours. */
export const LINK_TTL = 60 * 60 * 24 * 14;
/** Extensions acceptées en pièce jointe par Brevo (les autres, ex. HEIC/WEBP, passent en lien). */
const BREVO_EXT = new Set(["pdf", "jpg", "jpeg", "png", "gif", "tif", "tiff", "bmp", "doc", "docx", "odt", "txt", "rtf", "zip", "xls", "xlsx", "csv"]);

export type CarteGriseDossier = {
  id: number; ref: string; folder: string; created_at: string; type_demande: string | null; nom: string | null; prenom: string | null;
  telephone: string | null; email: string | null; adresse: string | null; code_postal: string | null; ville: string | null; version: string | null;
  service_carte_grise: string | null; fields: Record<string, string>; files: CarteGriseFile[]; status: string; sent_to_provider_at: string | null; sent_to: string | null; notes: string | null;
};

const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ascii = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
const ext = (name: string) => (name.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1] || "").toLowerCase();
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

/**
 * Envoie le dossier au prestataire carte grise (to, sinon NK Services), copie au fondateur, réponse au fondateur.
 * Pièces jointes tant que le total reste sous ATTACH_BUDGET ; les autres en liens privés valables 14 jours.
 * Refuse un dossier déjà envoyé, sauf force.
 */
export async function sendDossierToProvider(sb: SupabaseClient, d: CarteGriseDossier, opts: { to?: string; force?: boolean } = {}) {
  const to = String(opts.to || CARTE_GRISE_PROVIDER_EMAIL || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("Adresse du prestataire carte grise manquante (CARTE_GRISE_PROVIDER_EMAIL).");
  if (d.sent_to_provider_at && !opts.force) throw Object.assign(new Error(`Dossier déjà envoyé le ${new Date(d.sent_to_provider_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} à ${d.sent_to || "?"} (ajoutez force pour renvoyer).`), { status: 409 });
  if (!(d.files || []).length) throw new Error("Aucune pièce enregistrée pour ce dossier.");
  await applyStoredSecrets();
  if (!brevoReady()) throw new Error("Brevo non connecté");

  const who = fullName(d);
  const slug = ascii(who) || d.ref;
  // Plus petits fichiers d'abord : on joint le maximum de pièces dans le budget.
  const files = [...d.files].sort((a, b) => a.size - b.size);
  const attachments: EmailAttachment[] = []; const attached: CarteGriseFile[] = []; const linked: (CarteGriseFile & { url: string })[] = []; const missing: CarteGriseFile[] = [];
  let used = 0;
  for (const f of files) {
    const e = ext(f.name) || (f.type === "application/pdf" ? "pdf" : "");
    if (used + f.size <= ATTACH_BUDGET && BREVO_EXT.has(e)) {
      const { data: blob, error } = await sb.storage.from(CARTE_GRISE_BUCKET).download(f.path);
      if (error || !blob) { missing.push(f); continue; }
      const buf = Buffer.from(await blob.arrayBuffer());
      used += buf.length;
      attachments.push({ name: `${ascii(CARTE_GRISE_FILE_LABEL[f.key] || f.key).slice(0, 40)}-${slug}.${e}`, content: buf.toString("base64") });
      attached.push(f);
    } else {
      const { data } = await sb.storage.from(CARTE_GRISE_BUCKET).createSignedUrl(f.path, LINK_TTL, { download: f.name });
      if (data?.signedUrl) linked.push({ ...f, url: data.signedUrl }); else missing.push(f);
    }
  }
  if (!attached.length && !linked.length) throw new Error("Pièces introuvables dans le stockage.");

  const row = (k: string, v: unknown) => v ? `<tr><td style="padding:4px 14px 4px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>` : "";
  const order = d.files.map(f => f.key);
  const docs = [...attached.map(f => ({ f, how: "en pièce jointe" })), ...linked.map(f => ({ f, how: `<a href="${esc(f.url)}">télécharger</a> (lien valable 14 jours)` }))]
    .sort((a, b) => order.indexOf(a.f.key) - order.indexOf(b.f.key))
    .map(({ f, how }) => `<li>${esc(f.label)} — ${how}</li>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#141414">
<p>Bonjour,</p>
<p>Veuillez trouver ci-dessous le dossier d’immatriculation de notre client <b>${esc(who)}</b> (référence ${esc(d.ref)}), pour un véhicule NeoDrive (voiturette électrique neuve, catégorie L6e).</p>
<h3 style="margin:18px 0 6px">Titulaire</h3><table>${row("Nom", d.nom)}${row("Prénom", d.prenom)}${row("Téléphone", d.telephone)}${row("E-mail", d.email)}</table>
<h3 style="margin:18px 0 6px">Adresse</h3><table>${row("Adresse", d.adresse)}${row("Code postal", d.code_postal)}${row("Ville", d.ville)}</table>
<h3 style="margin:18px 0 6px">Véhicule</h3><table>${row("Marque", "NeoDrive")}${row("Version", d.version)}${row("Demande", d.type_demande)}</table>
<h3 style="margin:18px 0 6px">Documents</h3><ul>${docs}</ul>
${missing.length ? `<p style="color:#a33">Pièce(s) indisponible(s) : ${missing.map(f => esc(f.label)).join(", ")}. Nous vous les transmettrons séparément.</p>` : ""}
<p>Merci de nous confirmer la bonne réception et de nous tenir informés de l’avancement.<br>Bien cordialement,<br>Mansour Khelifa – NeoDrive (MK HOLDING SAS)</p></div>`;
  const subject = `Dossier carte grise – ${who} – NeoDrive (MK HOLDING)`;
  const toName = to.toLowerCase() === CARTE_GRISE_PROVIDER_EMAIL.toLowerCase() ? CARTE_GRISE_PROVIDER_NAME : "";
  const messageId = await sendEmail(to, toName, subject, html, attachments, { cc: [OWNER_EMAIL], replyTo: OWNER_EMAIL });
  const at = new Date().toISOString();
  const note = `📤 ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} : envoyé à ${to} (${attached.length} pièce(s) jointe(s) ${mo(used)}, ${linked.length} lien(s))`;
  await sb.from("carte_grise_dossiers").update({ sent_to_provider_at: at, sent_to: to, status: "envoyé", notes: [d.notes, note].filter(Boolean).join("\n"), updated_at: at }).eq("id", d.id);
  return { to, cc: [OWNER_EMAIL], subject, messageId, attached: attached.map(f => f.name), linked: linked.map(f => f.name), missing: missing.map(f => f.name), attachedSize: used };
}
