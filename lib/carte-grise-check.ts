/**
 * Dossiers carte grise : contrôle automatique des pièces (lecture des photos / PDF), demande des pièces manquantes au client
 * (lien /carte-grise/pieces/<jeton>, SMS + e-mail) et renvoi automatique à NK Services d'un dossier déjà envoyé une fois complet.
 * Un nouveau dossier n'est jamais envoyé automatiquement. Serveur uniquement.
 */
import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyStoredSecrets } from "./integrations";
import { brevoReady, OWNER_EMAIL, sendEmail, sendSms, SITE } from "./brevo";
import { CARTE_GRISE_BUCKET, findDossier, fullName, sendDossierToProvider, type CarteGriseDossier } from "./carte-grise-server";
import {
  CARTE_GRISE_CLIENT_TEXT, CARTE_GRISE_FILE_LABEL, CARTE_GRISE_FILES, missingSmsText, missingWaText, pendingKeys, requiredKeys,
  type CarteGriseFile, type DocCheck, type DocPiece, type DocStatus, type MissingRequest,
} from "./carte-grise";
import { visionModel } from "./vin-read";
import { cleanVin } from "./vin";

type DB = SupabaseClient;
const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ext = (name: string) => (name.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1] || "").toLowerCase();
const today = () => new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
const nowFr = () => new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
export const piecesUrl = (token: string) => `${SITE}/carte-grise/pieces/${token}`;
export const adminUrl = (id: number) => `${SITE}/carte-grise-admin?id=${id}`;
const intlPhone = (p: string | null) => { const d = String(p || "").replace(/\D/g, ""); return d.startsWith("00") ? d.slice(2) : d.startsWith("0") ? "33" + d.slice(1) : d; };
export const waLink = (phone: string | null, text: string) => phone ? `https://wa.me/${intlPhone(phone)}?text=${encodeURIComponent(text)}` : null;

/* ───────────── Lecture des pièces ───────────── */

const CRITERIA: Record<string, string> = {
  cni: `Pièce d'identité du titulaire : carte nationale d'identité (ancienne carte papier ou nouvelle carte format bancaire), passeport ou titre de séjour.
- Le nom (et le prénom) doivent correspondre au titulaire du dossier (accents, nom d'usage ou deuxième prénom tolérés).
- Elle doit être en cours de validité aujourd'hui. Attention : les cartes d'identité françaises délivrées à un majeur entre le 2 janvier 2004 et le 31 décembre 2013 restent valables 5 ans de plus que la date imprimée.
- Une carte d'identité doit être fournie recto ET verso (deux photos ou deux pages) ; un passeport : la page avec la photo suffit.
- Elle doit être lisible (pas floue, pas coupée, pas de reflet sur le nom ou les dates).`,
  justificatif_domicile: `Justificatif de domicile : facture d'électricité, de gaz, d'eau, de téléphone fixe ou mobile, d'internet, ou attestation d'assurance habitation (avis d'imposition ou quittance de loyer d'une agence acceptés aussi).
- Daté de moins de 6 mois par rapport à aujourd'hui (date d'émission de la facture ou période de validité de l'attestation).
- Au nom du titulaire du dossier et à l'adresse du dossier (petites différences d'écriture tolérées). S'il est au nom d'une autre personne, statut a_refaire et explique qu'il faut aussi une attestation d'hébergement signée et la pièce d'identité de l'hébergeant.
- Lisible, nom et adresse visibles.`,
  mandat_carte_grise_signe: `Mandat d'immatriculation (cerfa 13757 ou mandat du prestataire) donné par le titulaire.
- Rempli au nom du titulaire du dossier.
- Signé par le titulaire (signature manuscrite ou électronique visible). Un mandat non signé est à refaire.
- Lisible et complet.`,
  coc: `Certificat de conformité européen (COC) du véhicule.
- Lis le numéro d'identification du véhicule (VIN, 17 caractères, rubrique 0.10 ou « numéro d'identification »), sans les lettres I, O, Q.
- Le document doit être complet et lisible (le VIN en particulier).`,
  cnit: `Document d'homologation / fiche CNIT du véhicule.
- Doit être lisible et concerner un véhicule (type, marque, numéro de réception visibles).`,
  devis_signe: `Contrat de vente, bon de commande, facture de vente ou certificat de cession (cerfa 15776) du véhicule.
- Doit concerner le titulaire du dossier.
- Doit être signé par l'acheteur (signature manuscrite ou électronique visible) ; une facture acquittée est acceptée.
- Lisible.`,
  facture_partenaire: `Facture de vente ou certificat de vente du véhicule établi par un partenaire revendeur de NeoDrive (le vendeur est le partenaire, pas NeoDrive).
- L'acheteur doit être le titulaire du dossier.
- Le vendeur (raison sociale du partenaire) et le véhicule (VIN) doivent être indiqués.
- Doit être signé par le vendeur (signature manuscrite ou électronique visible).
- Lisible.`,
};

const INSTRUCTIONS = `Tu es le contrôleur des dossiers de carte grise (immatriculation d'une voiture sans permis neuve) de NeoDrive, en France.
Tu reçois les photos ou PDF d'UNE pièce du dossier et tu vérifies qu'elle est acceptable pour l'ANTS.
Statuts possibles : "ok" (pièce correcte), "a_refaire" (mauvais document, expiré, trop ancien, illisible, incomplet, non signé, au nom d'une autre personne), "a_verifier" (tu n'arrives pas à conclure).
"raison" : une phrase courte en français simple, adressée au client, qui dit quoi refaire (vide si ok). "detail" : note pour l'équipe (type de document lu, nom lu, dates lues, adresse lue).
Réponds uniquement en JSON : {"statut": "ok|a_refaire|a_verifier", "raison": "", "detail": "", "vin": "<VIN lu sur un COC, sinon vide>"}`;

type Part = Record<string, unknown>;
async function filePart(sb: DB, f: CarteGriseFile): Promise<Part | null> {
  const e = ext(f.name); const t = f.type || "";
  const pdf = t === "application/pdf" || e === "pdf";
  const img = /^image\/(jpeg|png|webp|gif)$/.test(t) ? t : e === "png" ? "image/png" : e === "webp" ? "image/webp" : /^jpe?g$/.test(e) ? "image/jpeg" : "";
  if (!pdf && !img) return null;
  const { data: blob } = await sb.storage.from(CARTE_GRISE_BUCKET).download(f.path);
  if (!blob) return null;
  const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
  return pdf ? { type: "input_file", filename: e === "pdf" ? f.name : `${f.name}.pdf`, file_data: `data:application/pdf;base64,${b64}` }
    : { type: "input_image", image_url: `data:${img};base64,${b64}`, detail: "high" };
}

async function ask(text: string, parts: Part[]) {
  const key = process.env.OPENAI_API_KEY; if (!key) throw new Error("Lecture automatique indisponible (clé absente)");
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 70_000);
  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", signal: ctl.signal, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_DOC_MODEL || visionModel(), instructions: INSTRUCTIONS, input: [{ role: "user", content: [{ type: "input_text", text }, ...parts] }], text: { format: { type: "json_object" } }, max_output_tokens: 500 }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`lecture impossible (${r.status})`);
    const txt: string = (j?.output || []).flatMap((x: { content?: unknown[] }) => x.content || []).filter((x: { type?: string }) => x.type === "output_text").map((x: { text?: string }) => x.text || "").join("");
    return JSON.parse(txt) as { statut?: string; raison?: string; detail?: string; vin?: string };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("lecture trop longue");
    throw e;
  } finally { clearTimeout(t); }
}

async function checkPiece(sb: DB, d: CarteGriseDossier, key: string): Promise<DocPiece> {
  const at = new Date().toISOString();
  const files = (d.files || []).filter(f => f.key === key && !f.superseded).sort((a, b) => String(b.added_at || "").localeCompare(String(a.added_at || ""))).slice(0, 4);
  const piece = (status: DocStatus, reason: string, detail = ""): DocPiece => ({ status, reason, detail, files: files.length, checked_at: at });
  const required = requiredKeys(d).includes(key);
  if (!files.length) return piece(required ? "manquant" : "ok", required ? "Pièce non fournie" : "Non fourni (facultatif)");
  const parts: Part[] = []; const skipped: string[] = []; let budget = 30 * 1024 * 1024;
  for (const f of files) {
    if (f.size > 20 * 1024 * 1024 || f.size > budget) { skipped.push(`${f.name} trop lourd`); continue; }
    const p = await filePart(sb, f).catch(() => null);
    if (!p) { skipped.push(`${f.name} : format non lisible automatiquement (HEIC ?)`); continue; }
    parts.push(p); budget -= f.size;
  }
  if (!parts.length) return piece("à vérifier", "À vérifier à la main", skipped.join(" · "));
  const who = `Titulaire du dossier : ${fullName(d)}. Adresse du dossier : ${[d.adresse, d.code_postal, d.ville].filter(Boolean).join(" ") || "non renseignée"}.${d.vin ? ` VIN attendu : ${d.vin}.` : ""}`;
  try {
    const o = await ask(`Pièce attendue : ${CARTE_GRISE_FILE_LABEL[key] || key}.\nCritères :\n${CRITERIA[key] || "Doit être lisible."}\n\n${who}\nDate du jour : ${today()}.\n${parts.length} fichier(s) joint(s). Réponds en json.`, parts);
    let status: DocStatus = o.statut === "ok" ? "ok" : o.statut === "a_refaire" ? "à refaire" : "à vérifier";
    let reason = String(o.raison || "").slice(0, 300); let detail = [String(o.detail || "").slice(0, 400), ...skipped].filter(Boolean).join(" · ");
    if (key === "coc") {
      const vin = cleanVin(String(o.vin || "").toUpperCase());
      if (vin) detail = `VIN lu : ${vin}${detail ? " · " + detail : ""}`;
      if (vin && d.vin && vin !== d.vin && status === "ok") { status = "à vérifier"; reason = `Le VIN lu sur le COC (${vin}) diffère du VIN du dossier (${d.vin})`; }
    }
    return piece(status, status === "ok" ? "" : reason || "À vérifier", detail);
  } catch (e) { return piece("à vérifier", "Lecture automatique impossible : à vérifier à la main", `${(e as Error).message}${skipped.length ? " · " + skipped.join(" · ") : ""}`); }
}

function overallOf(pieces: Record<string, DocPiece>): DocCheck["overall"] {
  const all = Object.values(pieces);
  if (all.some(p => p.status === "manquant" || p.status === "à refaire")) return "incomplet";
  if (all.some(p => p.status === "à vérifier")) return "à vérifier";
  return "complet";
}

/** Contrôle les pièces du dossier (toutes, ou seulement keys) et enregistre le résultat dans doc_check. */
export async function checkDocuments(sb: DB, id: number, opts: { keys?: string[] } = {}): Promise<DocCheck> {
  const d = await findDossier(sb, { id });
  if (!d) throw new Error("Dossier introuvable");
  const present = new Set((d.files || []).filter(f => !f.superseded).map(f => f.key));
  const required = requiredKeys(d);
  const all = CARTE_GRISE_FILES.map(f => f.key as string).filter(k => required.includes(k) || present.has(k));
  const keys = opts.keys?.length && d.doc_check?.pieces ? all.filter(k => opts.keys!.includes(k)) : all;
  const results = await Promise.all(keys.map(async k => [k, await checkPiece(sb, d, k)] as const));
  const pieces: Record<string, DocPiece> = {};
  for (const k of all) { const r = results.find(x => x[0] === k)?.[1] || d.doc_check?.pieces?.[k]; if (r) pieces[k] = r; }
  const check: DocCheck = { at: new Date().toISOString(), overall: overallOf(pieces), pieces };
  const { error } = await sb.from("carte_grise_dossiers").update({ doc_check: check, updated_at: check.at }).eq("id", id);
  if (error) throw new Error(error.message);
  return check;
}

/** Résumé HTML du contrôle des pièces (e-mails au fondateur). */
export function docCheckHtml(check: DocCheck | null | undefined) {
  if (!check) return "<p>Contrôle des pièces : non disponible.</p>";
  const icon: Record<string, string> = { ok: "✅", manquant: "❌", "à refaire": "⚠️", "à vérifier": "🔎" };
  const rows = Object.entries(check.pieces).map(([k, p]) => `<li>${icon[p.status] || ""} <b>${esc(CARTE_GRISE_FILE_LABEL[k] || k)}</b> : ${esc(p.status)}${p.reason ? ` – ${esc(p.reason)}` : ""}${p.detail ? `<br><span style="color:#777">${esc(p.detail)}</span>` : ""}</li>`).join("");
  const color = check.overall === "complet" ? "#15803d" : check.overall === "incomplet" ? "#b91c1c" : "#a16207";
  return `<p>Contrôle des pièces : <b style="color:${color}">${esc(check.overall.toUpperCase())}</b></p><ul>${rows}</ul>`;
}

/* ───────────── Demande de pièces au client ───────────── */

/**
 * Demande au client les pièces manquantes ou à refaire : lien privé, SMS et e-mail.
 * Sur un dossier déjà envoyé à NK Services, active le renvoi automatique une fois le dossier complet.
 */
export async function requestMissing(sb: DB, d: CarteGriseDossier, opts: { keys?: string[]; note?: string; sms?: boolean; email?: boolean; by?: string; auto_resend?: boolean } = {}) {
  const valid = new Set(CARTE_GRISE_FILES.map(f => f.key as string));
  const keys = [...new Set((opts.keys?.length ? opts.keys : pendingKeys(null, d.doc_check)).filter(k => valid.has(k)))];
  if (!keys.length) throw new Error("Aucune pièce à demander : cochez au moins une pièce (ou lancez l'analyse).");
  const token = d.missing_token || randomBytes(24).toString("hex");
  const url = piecesUrl(token);
  const note = String(opts.note || "").trim().slice(0, 500);
  const req: MissingRequest = { keys, ...(note ? { note } : {}), at: new Date().toISOString(), by: opts.by || "Mansour", received: [] };
  const auto = opts.auto_resend ?? (!!d.sent_to_provider_at || d.status === "envoyé");
  const labels = keys.map(k => CARTE_GRISE_FILE_LABEL[k] || k);
  const out: { sms: string; email: string } = { sms: "non envoyé", email: "non envoyé" };
  await applyStoredSecrets();
  if (opts.sms !== false && d.telephone && brevoReady()) {
    try { await sendSms(d.telephone, missingSmsText(d.prenom, url), "transactional"); out.sms = "envoyé"; req.sms = true; } catch (e) { out.sms = `échec : ${(e as Error).message}`; }
  } else if (opts.sms !== false) out.sms = d.telephone ? "Brevo non connecté" : "pas de téléphone";
  if (opts.email !== false && d.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) && brevoReady()) {
    const items = keys.map(k => `<li style="margin-bottom:8px"><b>${esc(CARTE_GRISE_CLIENT_TEXT[k] || CARTE_GRISE_FILE_LABEL[k] || k)}</b>${d.doc_check?.pieces?.[k]?.reason && d.doc_check.pieces[k].status !== "ok" && d.doc_check.pieces[k].status !== "manquant" ? `<br><span style="color:#b45309">${esc(d.doc_check.pieces[k].reason)}</span>` : ""}</li>`).join("");
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#141414">
<p>Bonjour ${esc(d.prenom || "")},</p>
<p>Pour finaliser la carte grise de votre NeoDrive, il nous manque le ou les document(s) suivant(s) :</p><ul>${items}</ul>
${note ? `<p>${esc(note)}</p>` : ""}
<p>Vous pouvez les envoyer en photo (depuis votre téléphone) ou en PDF, en cliquant ici :</p>
<p><a href="${esc(url)}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Envoyer mes documents</a></p>
<p style="color:#666;font-size:13px">Ou copiez ce lien : ${esc(url)}</p>
<p>Merci,<br>L’équipe NeoDrive</p></div>`;
    try { await sendEmail(d.email, fullName(d), "Carte grise NeoDrive : document(s) à nous envoyer", html); out.email = "envoyé"; req.email = true; } catch (e) { out.email = `échec : ${(e as Error).message}`; }
  } else if (opts.email !== false) out.email = d.email ? "Brevo non connecté" : "pas d'e-mail";
  const line = `📨 ${nowFr()} : pièces demandées au client (${labels.join(", ")}) – SMS ${out.sms}, e-mail ${out.email}${auto ? " – renvoi automatique à NK Services quand complet" : ""}`;
  const { error } = await sb.from("carte_grise_dossiers").update({ missing_token: token, missing_request: req, auto_resend: auto, notes: [d.notes, line].filter(Boolean).join("\n"), updated_at: new Date().toISOString() }).eq("id", d.id);
  if (error) throw new Error(error.message);
  return { url, keys, labels, auto_resend: auto, wa: waLink(d.telephone, missingWaText(d.prenom, url, keys.map(k => CARTE_GRISE_CLIENT_TEXT[k] || k))), ...out };
}

/* ───────────── Pièces déposées par le client ───────────── */

/**
 * Ajoute au dossier les pièces déposées via le lien, remplace les anciennes versions, contrôle les nouvelles pièces.
 * Dossier déjà envoyé + renvoi automatique + dossier complet : renvoi à NK Services (copie au fondateur). Sinon e-mail au fondateur.
 */
export async function receivePieces(sb: DB, d: CarteGriseDossier, uploaded: CarteGriseFile[]) {
  const at = new Date().toISOString();
  const keys = [...new Set(uploaded.map(f => f.key))];
  const since = d.missing_request?.at || "";
  // Les versions précédentes d'une pièce redéposée (antérieures à la demande) ne sont plus envoyées.
  const files = [...(d.files || []).map(f => keys.includes(f.key) && !f.superseded && (!f.added_at || f.added_at < since) ? { ...f, superseded: true } : f), ...uploaded.map(f => ({ ...f, added_at: at }))];
  const req: MissingRequest | null = d.missing_request ? { ...d.missing_request, received: [...new Set([...(d.missing_request.received || []), ...keys])] } : null;
  const line = `📥 ${nowFr()} : le client a déposé ${uploaded.length} fichier(s) (${keys.map(k => CARTE_GRISE_FILE_LABEL[k] || k).join(", ")})`;
  const notes = [d.notes, line].filter(Boolean).join("\n");
  const { error } = await sb.from("carte_grise_dossiers").update({ files, missing_request: req, notes, updated_at: at }).eq("id", d.id);
  if (error) throw new Error(error.message);
  const check = await checkDocuments(sb, d.id, { keys });
  const pending = pendingKeys(req, check);
  return { check, pending, keys, notes, req };
}

/** Suite d'un dépôt : renvoi automatique à NK Services si autorisé et complet, sinon e-mail au fondateur. */
export async function afterPieces(sb: DB, id: number, keys: string[]) {
  const d = await findDossier(sb, { id });
  if (!d) return;
  const pending = pendingKeys(d.missing_request, d.doc_check);
  const complete = !pending.length && d.doc_check?.overall === "complet";
  const wasSent = !!d.sent_to_provider_at || d.status === "envoyé";
  if (complete && d.auto_resend && wasSent) {
    try {
      const sent = await sendDossierToProvider(sb, d, { force: true, complement: keys });
      const req = d.missing_request ? { ...d.missing_request, done_at: new Date().toISOString() } : null;
      const fresh = await findDossier(sb, { id });
      await sb.from("carte_grise_dossiers").update({ auto_resend: false, missing_request: req, notes: [fresh?.notes, `🤖 ${nowFr()} : dossier complet, renvoyé automatiquement à ${sent.to} (copie au fondateur)`].filter(Boolean).join("\n") }).eq("id", id);
      return;
    } catch (e) { console.error("[carte-grise] renvoi automatique", e); await founderMail(d, keys, `⚠️ Le renvoi automatique à NK Services a échoué : ${(e as Error).message}`); return; }
  }
  if (complete && d.missing_request && !d.missing_request.done_at) await sb.from("carte_grise_dossiers").update({ missing_request: { ...d.missing_request, done_at: new Date().toISOString() } }).eq("id", id);
  await founderMail(d, keys, complete
    ? (wasSent ? "Dossier complet. Renvoi automatique désactivé : renvoyez-le à NK Services depuis l'admin." : "Dossier complet. Il n'est pas envoyé automatiquement : envoyez-le à NK Services depuis l'admin quand vous êtes prêt.")
    : `Il manque encore : ${(pending.length ? pending : Object.keys(d.doc_check?.pieces || {}).filter(k => d.doc_check?.pieces[k].status !== "ok")).map(k => CARTE_GRISE_FILE_LABEL[k] || k).join(", ") || "à vérifier à la main"}.`);
}

async function founderMail(d: CarteGriseDossier, keys: string[], line: string) {
  try {
    await applyStoredSecrets();
    if (!brevoReady()) return;
    const html = `<p>Le client <b>${esc(fullName(d))}</b> (${esc(d.ref)}) a déposé : ${esc(keys.map(k => CARTE_GRISE_FILE_LABEL[k] || k).join(", "))}.</p><p>${esc(line)}</p>${docCheckHtml(d.doc_check)}<p><a href="${adminUrl(d.id)}">Ouvrir le dossier dans l'admin</a></p>`;
    await sendEmail(OWNER_EMAIL, "Mansour", `Carte grise – pièces reçues – ${fullName(d)}`, html);
  } catch (e) { console.error("[carte-grise] e-mail fondateur", e); }
}
