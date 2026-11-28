/**
 * Carte grise préparée avant la livraison, par lien personnel (/carte-grise/preparer/<jeton>, sans connexion) :
 * étape 1 (avant livraison) pièce d'identité + justificatif de domicile ; étape 2 (véhicule chargé ou livré) photo de la plaque VIN
 * + mandat signé au doigt. Le certificat de vente est généré et le COC est joint automatiquement par VIN ; le dossier complet part
 * au fondateur (« Carte grise à valider »), jamais à NK Services sans son clic. Serveur uniquement.
 */
import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { SITE } from "./brevo";
import { CARTE_GRISE_BUCKET, type CarteGriseDossier } from "./carte-grise-server";
import { CARTE_GRISE_FILE_LABEL, PLATE_PHOTO_KEY, PREP_KEYS, prepMessage, type CarteGriseFile } from "./carte-grise";
import { compareVin } from "./carte-grise-rules";
import { readVinFromImage } from "./vin-read";
import { VIN_FORMAT, cleanVin } from "./vin";
import { payState } from "./stock-shared";
import { NEODRIVE_SELLER, pdfEuros, writeCertificat, type CertificatPdf } from "../app/reservation-carte-grise/certificat";

type DB = SupabaseClient;
export const RES_PREP_COLS = "id,prenom,nom,telephone,email,adresse,code_postal,ville,modele,couleur,vin,statut,livre_at,total,delivery_price,paiement_confirme_at,paiement_en_attente,montant_du,reserve_path,reserve_token,cg_prep_token";
export type PrepReservation = {
  id: number; prenom: string | null; nom: string | null; telephone: string | null; email: string | null; adresse: string | null; code_postal: string | null; ville: string | null;
  modele: string | null; couleur: string | null; vin: string | null; statut: string | null; livre_at: string | null; total: number | null; delivery_price: number | null;
  paiement_confirme_at: string | null; paiement_en_attente: boolean | null; montant_du: number | null; reserve_path: string | null; reserve_token: string | null; cg_prep_token: string | null;
};
export type PrepStage = "pieces" | "attente" | "signature" | "termine";

export const prepUrl = (token: string) => `${SITE}/carte-grise/preparer/${token}`;
const nowFr = () => new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
const todayFr = () => new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
const ascii = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
const MIGRATION_HINT = "colonne reservations.cg_prep_token absente : appliquez la migration 20261127090000_carte_grise_preparation.sql";
const missingColumn = (m?: string) => /cg_prep_token/.test(m || "");

/** Réservation du lien (null : lien inconnu ou réservation annulée). */
export async function reservationByToken(sb: DB, token: string): Promise<PrepReservation | null> {
  const { data, error } = await sb.from("reservations").select(RES_PREP_COLS).eq("cg_prep_token", token).maybeSingle();
  if (error) throw new Error(missingColumn(error.message) ? MIGRATION_HINT : error.message);
  const r = data as PrepReservation | null;
  return r && r.statut !== "Annulée" ? r : null;
}

/** Jetons des réservations (créés au besoin) → liens personnels et message prêt à envoyer. */
export async function prepLinks(sb: DB, ids: number[]) {
  const clean = [...new Set(ids.map(Number).filter(n => Number.isInteger(n) && n > 0))].slice(0, 200);
  if (!clean.length) return [];
  const { data, error } = await sb.from("reservations").select("id,prenom,nom,telephone,statut,cg_prep_token").in("id", clean);
  if (error) throw new Error(missingColumn(error.message) ? MIGRATION_HINT : error.message);
  const out: { reservation_id: number; name: string; phone: string | null; link: string; message: string }[] = [];
  for (const r of (data || []) as { id: number; prenom: string | null; nom: string | null; telephone: string | null; statut: string | null; cg_prep_token: string | null }[]) {
    if (r.statut === "Annulée") continue;
    let token = r.cg_prep_token;
    if (!token) {
      token = randomBytes(20).toString("hex");
      const { error: e } = await sb.from("reservations").update({ cg_prep_token: token }).eq("id", r.id).is("cg_prep_token", null);
      if (e) throw new Error(missingColumn(e.message) ? MIGRATION_HINT : e.message);
      // Jeton créé en parallèle par un autre appel : on reprend celui qui est enregistré.
      const { data: again } = await sb.from("reservations").select("cg_prep_token").eq("id", r.id).maybeSingle();
      token = (again?.cg_prep_token as string | null) || token;
    }
    const link = prepUrl(token);
    out.push({ reservation_id: r.id, name: [r.prenom, r.nom].map(s => (s || "").trim()).filter(Boolean).join(" "), phone: r.telephone, link, message: prepMessage(r.prenom, link) });
  }
  return out.sort((a, b) => clean.indexOf(a.reservation_id) - clean.indexOf(b.reservation_id));
}

/** Dossier carte grise relié à la réservation (le plus récent, hors annulés). */
export async function prepDossier(sb: DB, reservationId: number): Promise<CarteGriseDossier | null> {
  const { data } = await sb.from("carte_grise_dossiers").select("*").eq("reservation_id", reservationId).neq("status", "annulé").order("created_at", { ascending: false }).limit(1);
  return ((data || [])[0] as CarteGriseDossier | undefined) || null;
}

/** Véhicule de la réservation : prêt pour l'étape 2 dès qu'il est chargé (VIN scanné par le livreur) ou livré. */
export async function prepVehicle(sb: DB, r: PrepReservation) {
  const or = [`reservation_id.eq.${r.id}`, ...(r.vin && VIN_FORMAT.test(r.vin) ? [`vin.eq.${r.vin}`] : [])].join(",");
  const { data } = await sb.from("shipment_vehicles").select("id,vin,status,picked_at,model,delivered_at").or(or).limit(5);
  const list = (data || []) as { id: number; vin: string | null; status: string | null; picked_at: string | null; model: string | null; delivered_at: string | null }[];
  const scanned = list.find(v => v.status === "chargée" || v.status === "livrée" || v.picked_at || v.delivered_at);
  const delivered = !!r.livre_at || r.statut === "Livrée";
  const vin = (r.vin && VIN_FORMAT.test(r.vin) ? r.vin : null) || (scanned?.vin && VIN_FORMAT.test(scanned.vin) ? scanned.vin : null);
  // Étape 2 (plaque + mandat) : véhicule livré ou chargé ET numéro de série connu (livraison possible sans VIN, ajouté ensuite).
  return { ready: !!vin && (delivered || !!scanned), delivered, vin, model: r.modele || scanned?.model || "NeoDrive" };
}

const current = (d: Pick<CarteGriseDossier, "files"> | null, key: string) => (d?.files || []).filter(f => f.key === key && !f.superseded);
/** Étape du lien : pièces à envoyer, attente du véhicule, signature, ou dossier complet. */
export function prepStage(d: CarteGriseDossier | null, vehicleReady: boolean): PrepStage {
  if (d?.fields?.prep_signed_at || current(d, "mandat_carte_grise_signe").length) return "termine";
  if (!d || PREP_KEYS.some(k => !current(d, k).length)) return "pieces";
  return vehicleReady ? "signature" : "attente";
}

/* ───────────── Certificat de vente (même mise en page que le formulaire, PDF écrit côté serveur) ───────────── */

const MM = 72 / 25.4;
/** Adaptateur pdf-lib des quelques méthodes jsPDF utilisées par writeCertificat (mm, origine en haut à gauche). */
function pdfLibAdapter(page: PDFPage, font: PDFFont): CertificatPdf {
  let size = 16;
  const H = page.getHeight();
  const safe = (t: string) => { try { font.encodeText(t); return t; } catch { return [...t].map(ch => { try { font.encodeText(ch); return ch; } catch { return ch.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E]/g, "-"); } }).join(""); } };
  const width = (t: string) => font.widthOfTextAtSize(safe(t), size) / MM;
  const wrap = (t: string, max?: number) => {
    if (!max) return [t];
    const lines: string[] = []; let line = "";
    for (const w of t.split(/\s+/)) { const next = line ? `${line} ${w}` : w; if (line && width(next) > max) { lines.push(line); line = w; } else line = next; }
    if (line) lines.push(line);
    return lines;
  };
  return {
    setFontSize: n => { size = n; },
    text: (t, x, y, o) => wrap(t, o?.maxWidth).forEach((l, i) => page.drawText(safe(l), { x: x * MM, y: H - (y * MM + i * size * 1.15), size, font, color: rgb(0, 0, 0) })),
    line: (x1, y1, x2, y2) => page.drawLine({ start: { x: x1 * MM, y: H - y1 * MM }, end: { x: x2 * MM, y: H - y2 * MM }, thickness: 0.57, color: rgb(0, 0, 0) }),
    addImage: () => undefined,
    getTextWidth: t => width(t),
  };
}

/** Certificat de vente MK HOLDING SAS au nom du titulaire, prix de la réservation (jamais affiché au client sur la page). */
export async function certificatPdf(r: PrepReservation, d: CarteGriseDossier, vin: string | null) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.setTitle("Certificat de vente"); pdf.setAuthor("MK HOLDING SAS – NeoDrive");
  const name = [d.prenom, d.nom].map(s => (s || "").trim()).filter(Boolean).join(" ") || "le client";
  const total = Number(r.total) || 0; const delivery = Number(r.delivery_price) || 0;
  const prices: [string, string][] = !total ? [] : delivery > 0 && delivery < total
    ? [[`Véhicule ${r.modele || "NeoDrive"}${r.couleur ? ` (${r.couleur})` : ""}, options et formalités`, pdfEuros(total - delivery)], ["Livraison à domicile", pdfEuros(delivery)], ["Total TTC", pdfEuros(total)]]
    : [["Total TTC", pdfEuros(total)]];
  const paid = payState(r as never) === "payé";
  writeCertificat(pdfLibAdapter(page, font), {
    date: todayFr(),
    seller: NEODRIVE_SELLER,
    buyer: [name, (d.adresse || "").trim(), `${d.code_postal || ""} ${(d.ville || "").trim()}`.trim(), (d.telephone || "").trim(), (d.email || "").trim()],
    vehicle: [`Modèle : ${r.modele || "NeoDrive"}${r.couleur ? ` – ${r.couleur}` : ""}`, `Numéro d’identification (VIN) : ${vin || "voir COC"}`, d.fields?.cnit_code ? `CNIT : ${d.fields.cnit_code}` : ""],
    prices,
    statement: paid
      ? `MK HOLDING SAS (NeoDrive) certifie avoir vendu le véhicule désigné ci-dessus à ${name}, au prix indiqué.`
      : `MK HOLDING SAS (NeoDrive) certifie la vente à ${name} du véhicule désigné ci-dessus, au prix indiqué (réserve de propriété jusqu’au paiement intégral).`,
  });
  return pdf.save();
}

/* ───────────── COC joint automatiquement par VIN ───────────── */

const SHIP_BUCKET = "shipment-docs";
type ShipDoc = { id: number; file_path: string; file_name: string | null; uploaded_by: string | null; version: string | null; extracted: { vins?: string[] } | null; created_at: string };

/**
 * COC du véhicule, jamais demandé au client : COC d'un autre dossier carte grise du même VIN, sinon COC du conteneur (shipment_docs)
 * qui contient ce VIN (document d'un seul véhicule, ou page isolée quand le PDF a une page par VIN lu). null si introuvable.
 */
export async function findCocByVin(sb: DB, vin: string, exceptDossier?: number): Promise<{ buf: Uint8Array; ext: string; type: string; note: string } | { buf: null; note: string }> {
  const { data: others } = await sb.from("carte_grise_dossiers").select("id,ref,files").eq("vin", vin).limit(10);
  for (const o of (others || []) as { id: number; ref: string; files: CarteGriseFile[] | null }[]) {
    if (o.id === exceptDossier) continue;
    const f = (o.files || []).filter(x => x.key === "coc" && !x.superseded).pop();
    if (!f) continue;
    const { data: blob } = await sb.storage.from(CARTE_GRISE_BUCKET).download(f.path);
    if (blob) { const ext = (f.name.match(/\.([a-z0-9]{1,5})$/i)?.[1] || "pdf").toLowerCase(); return { buf: new Uint8Array(await blob.arrayBuffer()), ext, type: f.type || blob.type || "application/pdf", note: `COC repris du dossier ${o.ref}` }; }
  }
  const { data: veh } = await sb.from("shipment_vehicles").select("shipment_id").eq("vin", vin).limit(1);
  const sid = (veh || [])[0]?.shipment_id;
  if (!sid) return { buf: null, note: `VIN ${vin} absent du stock : COC à joindre à la main` };
  const { data: docs } = await sb.from("shipment_docs").select("id,file_path,file_name,uploaded_by,version,extracted,created_at").eq("shipment_id", sid).eq("doc_type", "coc").order("created_at", { ascending: false });
  const vinsOf = (x: ShipDoc) => (x.extracted?.vins || []).map(v => cleanVin(v));
  const named = (x: ShipDoc) => cleanVin(x.file_name || "").includes(vin);
  // Originaux d'abord (les COC regroupés par la plateforme mélangent plusieurs véhicules), documents d'un seul VIN en tête.
  const list = ((docs || []) as ShipDoc[]).filter(x => named(x) || vinsOf(x).includes(vin))
    .sort((a, b) => Number(a.uploaded_by === "plateforme") - Number(b.uploaded_by === "plateforme") || vinsOf(a).length - vinsOf(b).length);
  let multi = false;
  for (const x of list) {
    const { data: blob } = await sb.storage.from(SHIP_BUCKET).download(x.file_path);
    if (!blob) continue;
    const buf = new Uint8Array(await blob.arrayBuffer());
    const name = String(x.file_name || x.file_path).toLowerCase();
    const ext = (name.match(/\.([a-z0-9]{1,5})$/)?.[1] || "pdf");
    const vins = vinsOf(x);
    if (named(x) || vins.length <= 1) return { buf, ext, type: ext === "pdf" ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`, note: `COC du conteneur (${x.file_name || "document"})` };
    if (ext !== "pdf") { multi = true; continue; }
    try {
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      if (src.getPageCount() !== vins.length) { multi = true; continue; }
      const i = vins.indexOf(vin);
      const out = await PDFDocument.create();
      const [p] = await out.copyPages(src, [i]); out.addPage(p);
      return { buf: await out.save(), ext: "pdf", type: "application/pdf", note: `COC isolé : page ${i + 1}/${vins.length} de ${x.file_name || "COC du conteneur"} (ordre des VIN lus, à contrôler)` };
    } catch { multi = true; }
  }
  return { buf: null, note: multi ? "COC du conteneur trouvé mais regroupé (plusieurs véhicules) : page du VIN à joindre à la main" : "Aucun COC du conteneur pour ce VIN : à joindre à la main" };
}

/* ───────────── Étape 2 : finalisation du dossier (après la réponse au client) ───────────── */

/** Photo de la plaque → JPEG réduit puis lecture du VIN. Ne lève jamais d'erreur. */
async function readPlate(sb: DB, f: CarteGriseFile): Promise<{ vin: string | null; raw: string; error?: string }> {
  try {
    const { data: blob } = await sb.storage.from(CARTE_GRISE_BUCKET).download(f.path);
    if (!blob) return { vin: null, raw: "", error: "photo introuvable" };
    let buf: Uint8Array = new Uint8Array(await blob.arrayBuffer()); let mime = f.type || blob.type || "image/jpeg";
    try { const sharp = (await import("sharp")).default; buf = await sharp(buf, { failOn: "none" }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(); mime = "image/jpeg"; } catch { /* format non converti : envoyé tel quel */ }
    const out = await readVinFromImage(buf, mime);
    return { vin: out.vin, raw: out.raw };
  } catch (e) { return { vin: null, raw: "", error: (e as Error).message }; }
}

/**
 * Après la signature : lecture de la plaque (comparée au VIN attendu, écart signalé au fondateur sans bloquer), certificat de vente,
 * COC par VIN. Met à jour le dossier et renvoie les remarques pour l'e-mail « Carte grise à valider ».
 */
export async function finalizePrep(sb: DB, dossierId: number, r: PrepReservation, expectedVin: string | null): Promise<string[]> {
  const { data } = await sb.from("carte_grise_dossiers").select("*").eq("id", dossierId).maybeSingle();
  const d = data as CarteGriseDossier | null;
  if (!d) return [];
  const warn: string[] = []; const lines: string[] = [];
  const add: CarteGriseFile[] = [];
  const fields = { ...(d.fields || {}) };
  // 1. Plaque constructeur.
  const plate = current(d, PLATE_PHOTO_KEY).pop();
  let vin = expectedVin || d.vin || null;
  if (plate) {
    const p = await readPlate(sb, plate);
    if (p.vin || p.raw) fields.plaque_vin_lu = p.vin || p.raw;
    if (!p.vin) { warn.push(`⚠️ VIN non lu sur la photo de la plaque${p.error ? ` (${p.error})` : ""} : à contrôler à l’œil`); fields.plaque_vin_controle = "non lu"; }
    else if (!vin) { vin = p.vin; warn.push(`ℹ️ Aucun VIN scanné pour la réservation : VIN pris sur la photo de la plaque (${p.vin}), à confirmer`); fields.plaque_vin_controle = "VIN pris sur la plaque"; }
    else {
      const c = compareVin(p.vin, vin);
      fields.plaque_vin_controle = c.kind;
      if (c.kind === "different" || c.kind === "incompatible") warn.push(`⛔ VIN de la plaque (${p.vin}) DIFFÉRENT du VIN scanné (${vin}) : vérifiez le véhicule avant d'envoyer le dossier`);
      else if (c.kind === "proche") warn.push(`⚠️ VIN de la plaque (${p.vin}) proche du VIN scanné (${vin}) : ${c.diff} caractère(s) d'écart, à contrôler`);
      else lines.push(`✅ Plaque VIN conforme (${c.kind === "identique" ? "identique" : "lecture compatible"})`);
    }
  } else warn.push("⚠️ Pas de photo de la plaque VIN");
  const folder = `carte-grise/${d.folder}`;
  const upload = async (key: string, name: string, buf: Uint8Array, type: string) => {
    const path = `${folder}/${key}-auto-${crypto.randomUUID().slice(0, 8)}-${name}`;
    const { error } = await sb.storage.from(CARTE_GRISE_BUCKET).upload(path, buf, { contentType: type, upsert: false });
    if (error) throw new Error(error.message);
    add.push({ key, label: CARTE_GRISE_FILE_LABEL[key] || key, path, name, size: buf.length, type });
  };
  // 2. Certificat de vente (preuve d'achat : remplace le contrat signé quand il n'y en a pas).
  if (!current(d, "certificat_vente").length) {
    try { await upload("certificat_vente", `certificat-vente-${ascii(d.nom || "client") || "client"}.pdf`, await certificatPdf(r, d, vin), "application/pdf"); lines.push("📄 Certificat de vente généré"); }
    catch (e) { warn.push(`⚠️ Certificat de vente non généré : ${(e as Error).message}`); }
  }
  // 3. COC par VIN.
  if (!current(d, "coc").length) {
    if (!vin) warn.push("⚠️ COC non joint : VIN inconnu");
    else {
      try {
        const coc = await findCocByVin(sb, vin, d.id);
        if (coc.buf) { await upload("coc", `COC-${vin}.${coc.ext}`, coc.buf, coc.type); lines.push(`📎 ${coc.note}`); } else warn.push(`⚠️ ${coc.note}`);
      } catch (e) { warn.push(`⚠️ COC non joint : ${(e as Error).message}`); }
    }
  }
  const { data: fresh } = await sb.from("carte_grise_dossiers").select("files,notes").eq("id", d.id).maybeSingle();
  const files = [...((fresh?.files || d.files || []) as CarteGriseFile[]), ...add];
  const notes = [fresh?.notes ?? d.notes, ...[...lines, ...warn].map(l => `🤖 ${nowFr()} : ${l}`)].filter(Boolean).join("\n");
  const at = new Date().toISOString();
  await sb.from("carte_grise_dossiers").update({ files, fields, notes, ...(vin && !d.vin ? { vin, vin_source: expectedVin ? "scan livraison" : "photo plaque (client)" } : {}), updated_at: at }).eq("id", d.id);
  return warn;
}
