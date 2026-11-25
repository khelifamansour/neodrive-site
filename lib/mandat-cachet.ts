/**
 * Cachet et signature de MK HOLDING (mandataire) apposés côté serveur sur le mandat d'immatriculation du dossier carte grise.
 * L'image (erp-documents/entreprise/cachet-et-signature.png) ne passe jamais par le navigateur. Idempotent : fields.mandat_cachet
 * garde le chemin du mandat déjà tamponné. Serveur uniquement.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CARTE_GRISE_BUCKET, type CarteGriseDossier } from "./carte-grise-server";
import { CACHET_FILE, getCompanyDoc } from "./company-docs";
import { MANDAT_CACHET_BOX, MANDAT_PDF_SUBJECT } from "../app/reservation-carte-grise/mandat";

const MM = 72 / 25.4;
const MISSING_NOTE = "⚠️ cachet manquant : déposez entreprise/cachet-et-signature.png puis réappliquez le cachet";
const nowFr = () => new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
const todayFr = () => new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

export type CachetResult = { status: "stamped" | "already" | "no_mandat" | "not_generated" | "missing_stamp" | "error"; message: string };

/**
 * Appose le cachet sur le mandat signé du dossier. Par défaut, seulement sur un mandat signé à l'écran (PDF généré par le site) ;
 * anyPdf : aussi sur un mandat PDF importé (action de l'admin pour les anciens dossiers). Ne lève jamais d'erreur.
 */
export async function stampMandat(sb: SupabaseClient, d: CarteGriseDossier, opts: { anyPdf?: boolean } = {}): Promise<CachetResult> {
  try {
    const mandat = [...(d.files || [])].filter(f => f.key === "mandat_carte_grise_signe" && !f.superseded).pop();
    if (!mandat) return { status: "no_mandat", message: "Pas de mandat signé dans le dossier" };
    if (d.fields?.mandat_cachet === mandat.path) return { status: "already", message: "Cachet déjà apposé" };
    const isPdf = mandat.type === "application/pdf" || /\.pdf$/i.test(mandat.name);
    const onScreen = /^signé à l’écran/.test(d.fields?.mandat_carte_grise_signe_mode || "") && !mandat.added_at;
    if (!isPdf || (!onScreen && !opts.anyPdf)) return { status: "not_generated", message: "Mandat importé (photo ou scan) : cachet non apposé automatiquement" };

    const stamp = await getCompanyDoc(sb, CACHET_FILE);
    if (!stamp) {
      if (!(d.notes || "").includes("cachet manquant")) await sb.from("carte_grise_dossiers").update({ notes: [d.notes, `${MISSING_NOTE} (${nowFr()})`].filter(Boolean).join("\n") }).eq("id", d.id);
      return { status: "missing_stamp", message: "Cachet manquant (entreprise/cachet-et-signature.png)" };
    }
    const { data: blob, error } = await sb.storage.from(CARTE_GRISE_BUCKET).download(mandat.path);
    if (error || !blob) return { status: "error", message: "Mandat introuvable dans le stockage" };
    const pdf = await PDFDocument.load(await blob.arrayBuffer());
    const page = pdf.getPage(0);
    const H = page.getHeight();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const { x, y, w, h } = MANDAT_CACHET_BOX;
    // Anciens mandats (sans cadre) : bordure et libellés ajoutés ici.
    if (pdf.getSubject() !== MANDAT_PDF_SUBJECT) {
      page.drawRectangle({ x: x * MM, y: H - (y + h) * MM, width: w * MM, height: h * MM, borderColor: rgb(0, 0, 0), borderWidth: 0.6 });
      page.drawText("Le mandataire – MK HOLDING (Neodrive)", { x: (x + 3) * MM, y: H - (y + 6) * MM, size: 9, font, maxWidth: (w - 6) * MM });
      page.drawText("Cachet et signature", { x: (x + 3) * MM, y: H - (y + 15) * MM, size: 8.5, font });
    }
    const png = stamp[0] === 0x89 && stamp[1] === 0x50;
    const img = png ? await pdf.embedPng(stamp) : await pdf.embedJpg(stamp);
    // Environ 45 mm de large, proportions gardées, entre les libellés et la date.
    const k = Math.min((45 * MM) / img.width, (30 * MM) / img.height);
    const iw = img.width * k, ih = img.height * k;
    const top = H - (y + 18) * MM;
    page.drawImage(img, { x: (x + w / 2) * MM - iw / 2, y: top - ih, width: iw, height: ih });
    page.drawText(`Fait à Muret, le ${todayFr()}`, { x: (x + 3) * MM, y: H - (y + h - 3) * MM, size: 8.5, font });
    const out = await pdf.save();
    const up = await sb.storage.from(CARTE_GRISE_BUCKET).upload(mandat.path, out, { contentType: "application/pdf", upsert: true });
    if (up.error) return { status: "error", message: up.error.message };
    const files = (d.files || []).map(f => f.path === mandat.path ? { ...f, size: out.length } : f);
    const fields = { ...(d.fields || {}), mandat_cachet: mandat.path };
    await sb.from("carte_grise_dossiers").update({ files, fields, notes: [d.notes, `🖋️ ${nowFr()} : cachet MK HOLDING apposé sur le mandat`].filter(Boolean).join("\n"), updated_at: new Date().toISOString() }).eq("id", d.id);
    Object.assign(d, { files, fields, notes: [d.notes, `🖋️ ${nowFr()} : cachet MK HOLDING apposé sur le mandat`].filter(Boolean).join("\n") });
    return { status: "stamped", message: "Cachet apposé sur le mandat" };
  } catch (e) {
    console.error("[carte-grise] cachet mandat", e);
    return { status: "error", message: (e as Error).message };
  }
}
