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
  CARTE_GRISE_CLIENT_TEXT, CARTE_GRISE_FILE_LABEL, CARTE_GRISE_FILES, missingSmsText, missingWaText, overallLabel, pendingKeys, requiredKeys,
  type CarteGriseFile, type DocCheck, type DocPiece, type DocStatus, type MissingRequest,
} from "./carte-grise";
import { visionModel } from "./vin-read";
import { compareVin, fmtFr, ID_EXPIRED_TOLERANCE_YEARS, idValidity, matchName } from "./carte-grise-rules";
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
  cni: `Pièce d'identité du titulaire : carte nationale d'identité (ancienne carte papier ou nouvelle carte format bancaire), passeport, titre de séjour, ou permis de conduire format carte bancaire.
- Recopie dans "titulaire_lu" TOUS les noms et prénoms imprimés (nom de naissance, nom d'usage, « épouse X »…). Ne juge PAS toi-même la correspondance du nom avec le titulaire du dossier : elle est contrôlée ensuite (noms d'épouse / de jeune fille tolérés).
- Recopie les dates exactement : "date_delivrance" (« délivrée le », souvent au verso de l'ancienne carte), "date_expiration" (« valable jusqu'au » / « date d'expiration » imprimée), "date_naissance", au format JJ/MM/AAAA (vide si absente ou illisible).
- Ne juge PAS la date de validité toi-même (elle est calculée ensuite : les CNI délivrées entre 2004 et 2013 sont prolongées de 5 ans). Un document expiré n'est donc jamais un motif de "a_refaire" ici.
- "type_piece" : cni, passeport, titre_sejour, permis ou autre.
- a_refaire seulement si ce n'est clairement pas une pièce d'identité, ou si le nom et la photo sont totalement illisibles. Verso manquant d'une carte d'identité, léger flou, reflet ou coin coupé : a_verifier (remarque), pas a_refaire.`,
  justificatif_domicile: `Justificatif de domicile : facture d'électricité, de gaz, d'eau, de téléphone fixe ou mobile, d'internet, ou attestation d'assurance habitation (avis d'imposition ou quittance de loyer d'une agence acceptés aussi).
- Daté de moins de 6 mois par rapport à aujourd'hui (date d'émission de la facture ou période de validité de l'attestation). Entre 6 et 8 mois : a_verifier. Plus ancien : a_refaire.
- Recopie dans "titulaire_lu" le ou les noms et prénoms imprimés comme destinataire. Ne juge PAS toi-même la correspondance du nom avec le titulaire du dossier : elle est contrôlée ensuite (nom d'épouse / de jeune fille, nom d'usage, ordre des noms, couple « M. ou Mme » tolérés). Ne demande JAMAIS d'attestation d'hébergement.
- Adresse : doit correspondre à l'adresse du dossier (abréviations, complément, numéro d'appartement, petites différences d'écriture tolérés ; en cas de doute : a_verifier).
- Lisible, nom et adresse visibles.`,
  mandat_carte_grise_signe: `Mandat d'immatriculation (cerfa 13757 ou mandat du prestataire) donné par le titulaire.
- Rempli au nom du titulaire du dossier.
- Signé par le titulaire (signature manuscrite ou électronique visible). Un mandat non signé est à refaire.
- Lisible et complet.`,
  coc: `Certificat de conformité européen (COC) du véhicule.
- Les COC sont très souvent des photocopies ou des scans grisés, pâles ou de qualité moyenne : c'est NORMAL et ce n'est jamais un motif de refus.
- Lis le numéro d'identification du véhicule (VIN, 17 caractères, rubrique 0.10 ou « numéro d'identification »), sans les lettres I, O, Q. Si tu n'es pas sûr de quelques caractères, donne ta meilleure lecture (le VIN attendu peut t'aider à lever un doute, mais ne l'invente pas).
- ok dès que le document est bien un COC (ou certificat de conformité équivalent) et que le VIN lu est compatible avec le VIN attendu, même partiellement lu. Qualité moyenne : ok avec une "remarque".
- a_refaire seulement si ce n'est clairement pas un COC, ou si le VIN est nettement lisible et différent du VIN attendu.`,
  cnit: `Document d'homologation / fiche CNIT du véhicule.
- Doit être lisible et concerner un véhicule (type, marque, numéro de réception visibles).`,
  devis_signe: `Contrat de vente, bon de commande, facture de vente ou certificat de cession (cerfa 15776) du véhicule.
- Doit concerner le titulaire du dossier.
- Doit être signé par l'acheteur (signature manuscrite ou électronique visible) ; une facture acquittée est acceptée.
- Lisible.`,
  certificat_vente: `Certificat de vente du véhicule généré par le formulaire en ligne (preuve d'achat pour l'immatriculation, ne vaut pas facture, pas de signature attendue).
Le vendeur est MK HOLDING SAS (NeoDrive), ou un partenaire revendeur de NeoDrive pour le client d'un partenaire.
- L'acheteur doit être le titulaire du dossier.
- Le vendeur, le véhicule et le prix TTC doivent être indiqués. Le VIN peut être remplacé par « voir COC » si le COC est joint.
- Lisible.`,
};

const INSTRUCTIONS = `Tu es le contrôleur des dossiers de carte grise (immatriculation d'une voiture sans permis neuve) de NeoDrive, en France.
Tu reçois les photos ou PDF d'UNE pièce du dossier et tu vérifies qu'elle est acceptable pour l'ANTS. Sois bienveillant : une fausse alerte fait perdre du temps au client et à l'équipe.
Statuts possibles :
- "ok" : pièce correcte (une petite remarque non bloquante peut aller dans "remarque").
- "a_refaire" : UNIQUEMENT pour un problème clair et bloquant : mauvais document, autre personne de façon certaine, document trop ancien au-delà des tolérances, non signé quand une signature est exigée, totalement illisible.
- "a_verifier" : doute, qualité moyenne, information partiellement lisible, petite incohérence : l'équipe vérifiera, ce n'est pas bloquant.
Dans le doute, choisis "a_verifier" plutôt que "a_refaire", et "ok" avec une remarque plutôt que "a_verifier" si le doute est mineur.
"raison" : une phrase courte en français simple, adressée au client, qui dit quoi refaire (vide si ok). "remarque" : remarque courte non bloquante pour l'équipe (vide sinon). "detail" : note pour l'équipe (type de document lu, nom lu, dates lues, adresse lue).
Réponds uniquement en JSON : {"statut": "ok|a_refaire|a_verifier", "raison": "", "remarque": "", "detail": "", "document_attendu": true, "titulaire_lu": "", "type_piece": "", "date_delivrance": "", "date_expiration": "", "date_naissance": "", "vin": "<VIN lu sur un COC, sinon vide>"}
"document_attendu" : false seulement si le fichier n'est clairement pas le type de pièce attendu.`;

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

type AiRead = {
  statut?: string; raison?: string; remarque?: string; detail?: string; vin?: string; document_attendu?: boolean | string;
  titulaire_lu?: string; type_piece?: string; date_delivrance?: string; date_expiration?: string; date_naissance?: string;
};

async function ask(text: string, parts: Part[]) {
  const key = process.env.OPENAI_API_KEY; if (!key) throw new Error("Lecture automatique indisponible (clé absente)");
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 70_000);
  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", signal: ctl.signal, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_DOC_MODEL || visionModel(), instructions: INSTRUCTIONS, input: [{ role: "user", content: [{ type: "input_text", text }, ...parts] }], text: { format: { type: "json_object" } }, max_output_tokens: 900 }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`lecture impossible (${r.status})`);
    const txt: string = (j?.output || []).flatMap((x: { content?: unknown[] }) => x.content || []).filter((x: { type?: string }) => x.type === "output_text").map((x: { text?: string }) => x.text || "").join("");
    return JSON.parse(txt) as AiRead;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("lecture trop longue");
    throw e;
  } finally { clearTimeout(t); }
}

async function checkPiece(sb: DB, d: CarteGriseDossier, key: string): Promise<DocPiece> {
  const at = new Date().toISOString();
  const files = (d.files || []).filter(f => f.key === key && !f.superseded).sort((a, b) => String(b.added_at || "").localeCompare(String(a.added_at || ""))).slice(0, 4);
  const piece = (status: DocStatus, reason: string, detail = "", remark?: string): DocPiece => ({ status, reason, detail, ...(remark ? { remark } : {}), files: files.length, checked_at: at });
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
    const r = applyRules(d, key, o);
    const detail = [r.detail, ...skipped].filter(Boolean).join(" · ");
    return piece(r.status, r.status === "ok" ? "" : r.reason || "À vérifier", detail, r.remark);
  } catch (e) { return piece("à vérifier", "Lecture automatique impossible : à vérifier à la main", `${(e as Error).message}${skipped.length ? " · " + skipped.join(" · ") : ""}`); }
}

const NAME_REMARK = "Nom différent : probablement nom d’épouse / de jeune fille (prénom identique) – livret de famille si le bureau le demande";
const ID_HINT = "permis de conduire format carte ou passeport valable acceptés";
/** Lecture automatique → statut, avec les règles de tolérance (validité des CNI, noms d'épouse, scans de COC). */
export function applyRules(d: Pick<CarteGriseDossier, "prenom" | "nom" | "vin">, key: string, o: AiRead, now = new Date()) {
  let status: DocStatus = o.statut === "ok" ? "ok" : o.statut === "a_refaire" ? "à refaire" : "à vérifier";
  let reason = String(o.raison || "").slice(0, 300);
  const remarks: string[] = [String(o.remarque || "").trim()].filter(Boolean);
  const notes: string[] = [];
  const wrongDoc = o.document_attendu === false || o.document_attendu === "false";
  const aboutName = (t: string) => /\bnom\b|h[ée]berg|autre personne|titulaire|épouse|jeune fille/i.test(t);

  if (key === "cni" || key === "justificatif_domicile") {
    const m = matchName(o.titulaire_lu, d.prenom, d.nom);
    if (o.titulaire_lu) notes.push(`Nom lu : ${String(o.titulaire_lu).slice(0, 80)}`);
    if (m === "different" && !wrongDoc) {
      status = "à refaire";
      reason = key === "cni" ? "La pièce d’identité n’est pas au nom du titulaire du dossier"
        : "Le justificatif est au nom d’une autre personne : joindre aussi une attestation d’hébergement signée et la pièce d’identité de l’hébergeant";
    } else if (m === "prenom_seul") {
      // Prénom identique, nom différent : nom d'épouse / de jeune fille probable, jamais bloquant ni d'attestation d'hébergement.
      if (status === "ok" || aboutName(reason)) { status = "à vérifier"; reason = NAME_REMARK; }
      remarks.push(NAME_REMARK);
    } else if (status !== "ok" && aboutName(reason)) {
      // Nom identique (ou non relu) : une simple différence d'écriture n'est pas un motif de refus.
      if (m === "identique") { status = "ok"; reason = ""; } else { status = "à vérifier"; reason = "Nom à vérifier sur la pièce"; }
    }
  }

  if (key === "cni" && !wrongDoc) {
    const v = idValidity({ kind: o.type_piece, issued: o.date_delivrance, printedExpiry: o.date_expiration, birth: o.date_naissance }, now);
    if (v.expiry) notes.push(`Valable jusqu’au ${fmtFr(v.expiry)}${v.extended ? " (CNI 2004-2013 : +5 ans)" : ""}`);
    if (v.state === "expirée") { status = "à refaire"; reason = `Pièce d’identité expirée depuis le ${fmtFr(v.expiry!)} : merci d’envoyer une pièce valable (${ID_HINT})`; }
    else if (v.state === "expirée_tolérée") {
      const msg = `Pièce d’identité expirée depuis le ${fmtFr(v.expiry!)} (moins de ${ID_EXPIRED_TOLERANCE_YEARS} ans) – ${ID_HINT}`;
      if (status !== "à refaire") { status = "à vérifier"; reason = msg; }
      remarks.push(msg);
    } else if (status === "à refaire" && /expir|validit|périm/i.test(reason)) {
      // La validité est calculée ici, pas par le modèle : valable → ok ; dates illisibles → à vérifier.
      if (v.state === "valide") { status = "ok"; reason = ""; } else { status = "à vérifier"; reason = "Date de validité de la pièce d’identité à vérifier"; }
    }
  }

  if (key === "coc") {
    const vin = cleanVin(String(o.vin || "").toUpperCase());
    if (vin) notes.push(`VIN lu : ${vin}`);
    const exp = cleanVin(String(d.vin || "").toUpperCase());
    const cmp = vin && exp ? compareVin(vin, exp) : null;
    const okWith = (r: string) => { status = "ok"; reason = ""; remarks.push(r); };
    if (wrongDoc) { status = "à refaire"; reason = reason || "Le document envoyé n’est pas le certificat de conformité (COC) du véhicule"; }
    else if (cmp?.kind === "different") { status = "à refaire"; reason = `Le VIN lu sur le COC (${vin}) diffère du VIN du véhicule (${exp})`; }
    else if (cmp?.kind === "proche") { status = "à vérifier"; reason = `VIN lu (${vin}) légèrement différent du VIN attendu (${exp}) : à contrôler à l’œil`; }
    else if (cmp?.kind === "confusion") okWith(`VIN lu ${vin} : écart de lecture (caractères proches) avec ${exp}, qualité moyenne`);
    else if (cmp?.kind === "partiel") okWith("VIN partiellement lu, compatible avec le VIN attendu");
    else if (cmp?.kind === "incompatible") { status = "à vérifier"; reason = `VIN partiellement lu (${vin}), à comparer au VIN attendu (${exp})`; }
    else if (status !== "ok") okWith("Qualité moyenne du scan" + (vin ? "" : " (VIN non lu automatiquement, à contrôler à l’œil)"));
  }

  const remark = [...new Set(remarks)].filter(r => r !== reason).join(" · ").slice(0, 300) || undefined;
  return { status, reason, remark, detail: [...notes, String(o.detail || "").slice(0, 400)].filter(Boolean).join(" · ") };
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

/** Résumé HTML du contrôle des pièces (e-mails au fondateur). Bloquant : manquant / à refaire ; le reste n'est qu'une remarque. */
export function docCheckHtml(check: DocCheck | null | undefined) {
  if (!check) return "<p>Contrôle des pièces : non disponible.</p>";
  const icon: Record<string, string> = { ok: "✅", manquant: "❌", "à refaire": "⚠️", "à vérifier": "🔎" };
  const label: Record<string, string> = { ok: "ok", manquant: "manquant", "à refaire": "à refaire", "à vérifier": "à vérifier (non bloquant)" };
  const rows = Object.entries(check.pieces).map(([k, p]) => `<li>${icon[p.status] || ""} <b>${esc(CARTE_GRISE_FILE_LABEL[k] || k)}</b> : ${esc(label[p.status] || p.status)}${p.reason ? ` – ${esc(p.reason)}` : ""}${p.remark && p.remark !== p.reason ? `<br><span style="color:#a16207">Remarque : ${esc(p.remark)}</span>` : ""}${p.detail ? `<br><span style="color:#777">${esc(p.detail)}</span>` : ""}</li>`).join("");
  const color = check.overall === "complet" ? "#15803d" : check.overall === "incomplet" ? "#b91c1c" : "#a16207";
  return `<p>Contrôle des pièces : <b style="color:${color}">${esc(overallLabel(check))}</b></p><ul>${rows}</ul>`;
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
