/** Mandat d'immatriculation (PDF jsPDF) partagé par /reservation-carte-grise et /carte-grise-partenaire. */
import type { Signature } from "./SignOnScreen";

export type MandatClient = { nom: string; prenom: string; telephone: string; email: string; adresse: string; code_postal: string; ville: string };

/** Méthodes jsPDF utilisées pour le mandat. */
export type MandatPdf = {
  setFontSize: (n: number) => void;
  text: (t: string, x: number, y: number, o?: { maxWidth?: number }) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  addImage: (data: string, format: string, x: number, y: number, w: number, h: number, alias?: string, compression?: "NONE" | "FAST" | "MEDIUM" | "SLOW") => void;
};

/** Signature au doigt placée dans un cadre (mm) en gardant ses proportions. */
export const fitSignature = (sig: Signature, maxW: number, maxH: number) => { const k = Math.min(maxW / sig.w, maxH / sig.h); return { w: sig.w * k, h: sig.h * k }; };

/**
 * Écrit le mandat (MK HOLDING / Neodrive mandataire) sur `pdf`, pré-rempli avec le titulaire.
 * Avec `sig` : signature au doigt du titulaire, « Lu et approuvé », lieu et date. Avec `vin` : numéro d'identification du véhicule.
 */
export function writeMandat<P extends MandatPdf>(pdf: P, m: MandatClient, today: string, sig?: Signature, vin?: string): P {
  pdf.setFontSize(16);
  pdf.text("MANDAT D’IMMATRICULATION", 20, 20);

  pdf.setFontSize(11);
  pdf.text(`Nom : ${m.nom}`, 20, 42);
  pdf.text(`Prénom : ${m.prenom}`, 20, 52);
  pdf.text(`Adresse : ${m.adresse}`, 20, 62);
  pdf.text(`${m.code_postal} ${m.ville}`, 20, 72);
  pdf.text(`Téléphone : ${m.telephone}`, 20, 82);
  pdf.text(`Email : ${m.email}`, 20, 92);
  if (vin) pdf.text(`Véhicule (VIN) : ${vin}`, 20, 101);
  pdf.text(`Date : ${today}`, 20, 110);

  pdf.text(
    "Je soussigné(e), donne mandat à la société MK HOLDING, exploitant la marque Neodrive, afin d’effectuer en mon nom les démarches nécessaires à l’immatriculation de mon véhicule.",
    20, 130, { maxWidth: 170 }
  );
  pdf.text(
    "Je certifie l’exactitude des informations communiquées et m’engage à fournir les justificatifs nécessaires au traitement du dossier.",
    20, 158, { maxWidth: 170 }
  );

  if (sig) {
    pdf.text("Mention : Lu et approuvé", 20, 195);
    pdf.text(`Fait à ${m.ville}, le ${today}`, 20, 203);
    pdf.text("Signature :", 20, 215);
    const size = fitSignature(sig, 90, 20);
    pdf.addImage(sig.png, "PNG", 22, 238.5 - size.h, size.w, size.h, undefined, "FAST");
    pdf.line(20, 240, 120, 240);
    pdf.setFontSize(9);
    pdf.text(`Signé à l’écran par ${m.prenom} ${m.nom} le ${today}, précédé de la mention « Lu et approuvé ».`, 20, 246, { maxWidth: 170 });
  } else {
    pdf.text("Mention manuscrite : Lu et approuvé", 20, 195);
    pdf.text("Signature :", 20, 215);
    pdf.line(20, 240, 120, 240);
  }
  return pdf;
}
