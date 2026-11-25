/**
 * Pack standard envoyé à NK Services : toujours les mêmes pièces, dans le même ordre, en vraies pièces jointes aux noms normalisés
 * (1-certificat-vente-NOM.pdf, 2-COC-VIN.pdf, 3-mandat-NOM.pdf, 4-contrat-NOM.pdf, 5-identite-NOM.jpg, 6-domicile-NOM.pdf).
 * Les photos sont réduites (JPEG) pour tenir dans la limite d'un e-mail ; un fichier n'est mis en lien qu'en tout dernier recours.
 * Serveur uniquement.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailAttachment } from "./brevo";
import type { CarteGriseFile } from "./carte-grise";

/** Ordre et noms du pack (une seule pièce par emplacement ; la CNIT et les autres pièces ne sont pas jointes). */
export const PACK_SLOTS = [
  { key: "certificat_vente", name: "certificat-vente", label: "Certificat de vente" },
  { key: "coc", name: "COC", label: "Certificat de conformité (COC)" },
  { key: "mandat_carte_grise_signe", name: "mandat", label: "Mandat d’immatriculation signé (cachet MK HOLDING)" },
  { key: "devis_signe", name: "contrat", label: "Contrat / bon de commande signé" },
  { key: "cni", name: "identite", label: "Pièce d’identité" },
  { key: "justificatif_domicile", name: "domicile", label: "Justificatif de domicile" },
] as const;

const ext = (name: string) => (name.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1] || "").toLowerCase();
const ascii = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
const BREVO_EXT = new Set(["pdf", "jpg", "jpeg", "png", "gif", "tif", "tiff", "bmp"]);
const isImage = (f: CarteGriseFile) => /^image\//.test(f.type || "") || /^(jpe?g|png|webp|heic|heif|gif|tiff?|bmp|avif)$/.test(ext(f.name));

export type PackItem = { slot: number; key: string; label: string; name: string; file: CarteGriseFile; size: number; isNew: boolean; url?: string };
export type Pack = { attachments: EmailAttachment[]; attached: PackItem[]; linked: PackItem[]; unavailable: CarteGriseFile[]; used: number };

/** Photo → JPEG réduit (orientation corrigée). null si le format n'est pas lisible (HEIC sans décodeur…). */
async function shrinkImage(buf: Buffer, max: number, quality: number): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buf, { failOn: "none" }).rotate().resize({ width: max, height: max, fit: "inside", withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toBuffer();
  } catch { return null; }
}

/** PDF ré-enregistré (flux d'objets compressés) : gain modeste, jamais plus lourd que l'original. */
async function repackPdf(buf: Buffer): Promise<Buffer> {
  try {
    const { PDFDocument } = await import("pdf-lib");
    const out = Buffer.from(await (await PDFDocument.load(buf, { ignoreEncryption: true })).save({ useObjectStreams: true }));
    return out.length < buf.length ? out : buf;
  } catch { return buf; }
}

/**
 * Construit le pack. files : pièces actuelles (non remplacées). budget : taille brute maximale des pièces jointes.
 * isNew : pièce complémentaire mise en avant dans l'e-mail. linkFor : lien privé de secours si une pièce ne tient vraiment pas.
 */
export async function buildPack(sb: SupabaseClient, bucket: string, files: CarteGriseFile[], o: { nom: string; vin?: string | null; budget: number; isNew: (f: CarteGriseFile) => boolean; linkFor: (f: CarteGriseFile) => Promise<string | null> }): Promise<Pack> {
  const nom = ascii(o.nom).toUpperCase() || "CLIENT";
  type Raw = { slot: number; key: string; label: string; base: string; file: CarteGriseFile; buf: Buffer; e: string; img: boolean };
  const raws: Raw[] = []; const unavailable: CarteGriseFile[] = [];
  for (const [i, s] of PACK_SLOTS.entries()) {
    const list = files.filter(f => f.key === s.key);
    const base = `${i + 1}-${s.name}-${s.key === "coc" && o.vin ? ascii(o.vin).toUpperCase() : nom}`;
    for (const [j, f] of list.entries()) {
      const { data: blob, error } = await sb.storage.from(bucket).download(f.path);
      if (error || !blob) { unavailable.push(f); continue; }
      const img = isImage(f);
      raws.push({ slot: i + 1, key: s.key, label: s.label, base: list.length > 1 ? `${base}-${j + 1}` : base, file: f, buf: Buffer.from(await blob.arrayBuffer()), e: ext(f.name) || (f.type === "application/pdf" ? "pdf" : ""), img });
    }
  }
  // 1er passage : photos en JPEG 2200 px (lisibles), PDF ré-enregistrés.
  const out = await Promise.all(raws.map(async r => {
    if (r.img) { const j = await shrinkImage(r.buf, 2200, 80); return j && (j.length < r.buf.length || !BREVO_EXT.has(r.e)) ? { r, buf: j, e: "jpg" } : { r, buf: r.buf, e: r.e }; }
    return { r, buf: r.e === "pdf" && r.buf.length > 1024 * 1024 ? await repackPdf(r.buf) : r.buf, e: r.e };
  }));
  const total = () => out.reduce((s, x) => s + x.buf.length, 0);
  // 2e et 3e passages si le pack dépasse la limite : photos plus petites.
  for (const [max, q] of [[1700, 70], [1300, 60]] as const) {
    if (total() <= o.budget) break;
    for (const x of out) if (x.r.img) { const j = await shrinkImage(x.r.buf, max, q); if (j && j.length < x.buf.length) { x.buf = j; x.e = "jpg"; } }
  }
  const attachments: EmailAttachment[] = []; const attached: PackItem[] = []; const linked: PackItem[] = [];
  let used = 0;
  for (const x of out) {
    const item: PackItem = { slot: x.r.slot, key: x.r.key, label: x.r.label, name: `${x.r.base}.${x.e}`, file: x.r.file, size: x.buf.length, isNew: o.isNew(x.r.file) };
    if (BREVO_EXT.has(x.e) && used + x.buf.length <= o.budget) {
      used += x.buf.length; attachments.push({ name: item.name, content: x.buf.toString("base64") }); attached.push(item);
    } else {
      const url = await o.linkFor(x.r.file);
      if (url) linked.push({ ...item, url }); else unavailable.push(x.r.file);
    }
  }
  return { attachments, attached, linked, unavailable, used };
}
