/**
 * Certificat de vente (preuve d'achat pour le dossier d'immatriculation, sans numéro ni signature) et lecture du VIN sur le COC.
 * Partagé par /reservation-carte-grise (vendeur : MK HOLDING SAS) et /carte-grise-partenaire (vendeur : le partenaire).
 */
import type { MandatPdf } from "./mandat";

export type CertificatPdf = MandatPdf & { getTextWidth: (t: string) => number };

/** Coordonnées du vendeur NeoDrive (mêmes mentions que le pack de livraison). */
export const NEODRIVE_SELLER = ["MK HOLDING SAS – NeoDrive", "SIREN 908 645 393", "31 rue Jean Nougaro", "31600 Muret, France"];

/** Texte compatible avec les polices standard de jsPDF (pas d'espaces fines insécables). */
export const pdfText = (v: string) => v.replace(/[  ]/g, " ");
export const pdfEuros = (n: number) => pdfText(new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)) + " €";

export type Certificat = {
  date: string;
  seller: string[];
  buyer: string[];
  /** Lignes du véhicule (modèle, VIN, CNIT…). */
  vehicle: string[];
  /** Lignes de prix [libellé, montant] ; la dernière est le total, en gras. Vide : aucune ligne de prix. */
  prices: [string, string][];
  statement: string;
  footer?: string;
};

/** Écrit le certificat de vente sur `pdf` (sans numéro, sans signature). */
export function writeCertificat<P extends CertificatPdf>(pdf: P, x: Certificat): P {
  pdf.setFontSize(18);
  pdf.text("CERTIFICAT DE VENTE", 20, 22);
  pdf.setFontSize(10);
  pdf.text(`Date : ${x.date}`, 20, 30);

  pdf.setFontSize(12); pdf.text("Vendeur", 20, 50); pdf.text("Acheteur", 110, 50);
  pdf.setFontSize(10);
  x.seller.filter(Boolean).forEach((t, i) => pdf.text(pdfText(t), 20, 58 + i * 6, { maxWidth: 82 }));
  x.buyer.filter(Boolean).forEach((t, i) => pdf.text(pdfText(t), 110, 58 + i * 6, { maxWidth: 82 }));

  pdf.setFontSize(12); pdf.text("Véhicule vendu", 20, 100);
  pdf.setFontSize(10);
  let y = 108;
  for (const t of ["Voiturette électrique neuve (quadricycle léger, catégorie L6e)", ...x.vehicle].filter(Boolean)) { pdf.text(pdfText(t), 20, y, { maxWidth: 170 }); y += 7; }

  // Sans prix (facultatif sur la page partenaire) : aucune ligne de prix.
  if (x.prices.length) { y += 5; pdf.line(20, y, 190, y); y += 8; }
  x.prices.forEach(([label, value], i) => {
    const last = i === x.prices.length - 1;
    if (last && x.prices.length > 1) { pdf.line(20, y - 5, 190, y - 5); y += 2; }
    pdf.setFontSize(last ? 12 : 10);
    pdf.text(pdfText(label), 20, y, { maxWidth: 130 });
    const v = pdfText(value); pdf.text(v, 190 - pdf.getTextWidth(v), y);
    y += 8;
  });
  if (x.prices.length) { pdf.line(20, y - 3, 190, y - 3); y += 9; } else y += 8;

  pdf.setFontSize(10);
  pdf.text(pdfText(x.statement), 20, y, { maxWidth: 170 });
  if (x.footer) { pdf.setFontSize(8.5); pdf.text(pdfText(x.footer), 20, 270, { maxWidth: 170 }); }
  return pdf;
}

/* ───────────── Lecture du VIN sur le COC (/api/carte-grise/read-vin) ───────────── */

/** Taille maximale envoyée à la lecture automatique (limite Vercel ~4,5 Mo). */
const READ_MAX = 4 * 1024 * 1024;
export type CocVin = { ok: boolean; vin: string; marque: string; type: string; cnit: string; error: string };

/** Photo réduite en JPEG (≤ 2000 px) ; PDF envoyé tel quel s'il n'est pas trop lourd. null si illisible (HEIC hors Safari…). */
async function readable(file: File): Promise<File | null> {
  if (file.type === "application/pdf") return file.size <= READ_MAX ? file : null;
  if (!file.type.startsWith("image/")) return null;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    const ctx = cv.getContext("2d"); if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise<Blob | null>(res => cv.toBlob(res, "image/jpeg", 0.85));
    return blob && blob.size <= READ_MAX ? new File([blob], "coc.jpg", { type: "image/jpeg" }) : null;
  } catch { return /^image\/(jpeg|png|webp|gif)$/.test(file.type) && file.size <= READ_MAX ? file : null; }
}

/** VIN (et si visibles marque, type, CNIT) lus sur le COC. Ne lève jamais d'erreur. */
export async function readCocVin(file: File): Promise<CocVin> {
  const fail = (error: string): CocVin => ({ ok: false, vin: "", marque: "", type: "", cnit: "", error });
  const f = await readable(file);
  if (!f) return fail("Nous n’arrivons pas à lire ce fichier automatiquement.");
  try {
    const fd = new FormData(); fd.append("file", f);
    const r = await fetch("/api/carte-grise/read-vin", { method: "POST", body: fd, signal: AbortSignal.timeout(70000) });
    const j = await r.json().catch(() => null) as { ok?: boolean; vin?: string; marque?: string; type?: string; cnit?: string; error?: string } | null;
    if (!j?.ok || !j.vin) return fail(j?.error ? `${j.error}.` : "Lecture impossible.");
    return { ok: true, vin: String(j.vin).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17), marque: j.marque || "", type: j.type || "", cnit: String(j.cnit || "").toUpperCase().slice(0, 40), error: "" };
  } catch { return fail("Lecture trop longue."); }
}

/** Place `file` dans un champ fichier (envoi Formspree + copie privée) ; false si le navigateur ne le permet pas. */
export function putFile(input: HTMLInputElement | null, file: File) {
  try { const dt = new DataTransfer(); dt.items.add(file); if (!input) return false; input.files = dt.files; return input.files?.length === 1; } catch { return false; }
}
