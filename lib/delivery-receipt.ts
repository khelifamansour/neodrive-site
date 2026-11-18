/** Accusé de réception du véhicule : signé par le client sur le téléphone du livreur, ou confirmé à distance par le client (lien SMS / e-mail). Serveur uniquement. */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PDFDocument from "pdfkit";

export const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
export const RECEIPT_FOLDER = "livraisons";

/** Points contrôlés avec le client à la remise des clés. */
export const CHECKS = [
  { id: "conforme", label: "Le véhicule correspond à ma commande (modèle, couleur)" },
  { id: "etat", label: "J'ai fait le tour du véhicule : état extérieur et intérieur vérifiés" },
  { id: "demo", label: "La démonstration de prise en main m'a été faite" },
  { id: "cles", label: "J'ai reçu les clés (2)" },
  { id: "documents", label: "J'ai reçu les documents du véhicule" },
  { id: "chargeur", label: "J'ai reçu le câble de recharge" },
] as const;
export type CheckId = typeof CHECKS[number]["id"];
/** Livraison avec paiement en attente : le livreur garde les clés et les documents jusqu'au paiement. */
export const PENDING_KEPT = ["cles", "documents"] as const;
export const checksFor = (pending: boolean) => CHECKS.filter(c => !pending || !(PENDING_KEPT as readonly string[]).includes(c.id));

export type ReceiptData = {
  numero: string; // ex. LIV-2026-000063
  client: string; adresse: string; telephone: string; email: string;
  modele: string; couleur: string; vin: string;
  checks: Record<string, boolean>; reserves: string;
  signer: string; signed_at: string; livreur: string;
  paiement_confirme_at: string | null;
  lat?: number | null; lng?: number | null;
  /** « signature » : signé du doigt sur le téléphone du livreur ; « distance » : confirmé par le client depuis son téléphone. */
  mode?: "signature" | "distance";
  remote?: { at: string; ip: string | null; phone: string; ua: string } | null;
  /** Paiement en attente : montant restant dû ; clés et documents conservés par NeoDrive. */
  pending?: { montant_du: number | null } | null;
};

const SELLER = ["MK HOLDING - NeoDrive", "31600 Muret, France", "SIREN 908 645 393", "Tél. 06 89 78 17 10 · contact.neodrivefrance@gmail.com"];
const fr = (iso: string | null) => iso ? new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** PDF « Accusé de réception du véhicule » avec la signature manuscrite du client (PNG). */
export function receiptPdf(d: ReceiptData, signaturePng: Buffer | null): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Accusé de réception ${d.numero}`, Author: "MK HOLDING - NeoDrive" } });
    const chunks: Buffer[] = [];
    doc.on("data", (b: Buffer) => chunks.push(b)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    const ink = "#111", grey = "#666", accent = "#ff5a1f";

    doc.font("Helvetica-Bold").fontSize(18).fillColor(ink).text("NeoDrive", 40, 40);
    doc.font("Helvetica").fontSize(8.5).fillColor(grey).text(SELLER.join("\n"), 40, 62, { width: 260 });
    doc.font("Helvetica-Bold").fontSize(15).fillColor(accent).text("ACCUSÉ DE RÉCEPTION DU VÉHICULE", 250, 40, { width: 305, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(ink).text(`N° ${d.numero}`, 250, 62, { width: 305, align: "right" }).text(`Livré le ${fr(d.signed_at)}`, 250, 74, { width: 305, align: "right" });

    let y = 128;
    const box = (title: string, lines: string[], x: number, w: number, h: number) => {
      doc.roundedRect(x, y, w, h, 6).lineWidth(0.6).stroke("#bbb");
      doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text(title, x + 10, y + 8);
      doc.font("Helvetica").fontSize(9).fillColor(ink).text(lines.filter(Boolean).join("\n"), x + 10, y + 21, { width: w - 20, height: h - 26, ellipsis: true });
    };
    box("CLIENT", [d.client, d.adresse, d.telephone ? `Tél. ${d.telephone}` : "", d.email], 40, 250, 96);
    box("VÉHICULE", [d.modele, d.couleur ? `Couleur : ${d.couleur}` : "", `N° de série (VIN) : ${d.vin}`], 305, 250, 96);
    y += 112;

    doc.font("Helvetica-Bold").fontSize(10).fillColor(ink).text("Contrôles à la remise du véhicule", 40, y); y += 16;
    for (const c of checksFor(!!d.pending)) {
      const ok = !!d.checks[c.id];
      doc.rect(44, y + 1, 9, 9).lineWidth(0.8).stroke(ok ? "#067647" : "#999");
      if (ok) doc.font("Helvetica-Bold").fontSize(9).fillColor("#067647").text("X", 46, y + 1.5);
      doc.font("Helvetica").fontSize(9.5).fillColor(ok ? ink : grey).text(c.label, 60, y, { width: 490 });
      y += 16;
    }
    y += 6;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(ink).text("Réserves ou remarques du client", 40, y); y += 14;
    doc.roundedRect(40, y, 515, 54, 6).lineWidth(0.6).stroke("#bbb");
    doc.font("Helvetica").fontSize(9).fillColor(d.reserves ? ink : grey).text(d.reserves || "Aucune réserve.", 50, y + 8, { width: 495, height: 42, ellipsis: true });
    y += 66;

    doc.font("Helvetica-Bold").fontSize(10).fillColor(ink).text("Paiement", 40, y); y += 14;
    const eur = (n: number | null | undefined) => n == null ? "" : `${Math.round(n).toLocaleString("fr-FR")} €`;
    const payText = d.paiement_confirme_at ? `Paiement reçu : confirmé par NeoDrive le ${fr(d.paiement_confirme_at)}.`
      : d.pending ? `Paiement en attente${d.pending.montant_du ? ` : ${eur(d.pending.montant_du)} restant dus` : ""}. Les clés et les documents du véhicule sont conservés par NeoDrive et seront remis ou envoyés au client dès réception du paiement.`
      : "Paiement : non confirmé.";
    doc.font("Helvetica").fontSize(9.5).fillColor(d.pending && !d.paiement_confirme_at ? "#b42318" : ink).text(payText, 40, y, { width: 515 });
    y += d.pending ? 36 : 24;

    doc.font("Helvetica").fontSize(9.5).fillColor(ink).text(
      `Je soussigné(e) ${d.signer} reconnais avoir reçu ce jour le véhicule décrit ci-dessus, avec les éléments cochés, sous réserve des remarques indiquées.${d.pending && !d.paiement_confirme_at ? " Je m'engage à régler le montant restant dû ; les clés et les documents me seront remis dès réception du paiement." : ""} La garantie légale de conformité de 2 ans s'applique à compter de cette date.`,
      40, y, { width: 515 });
    y += 46;

    const remote = d.mode === "distance";
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text(remote ? "Confirmation du client" : "Signature du client", 40, y).text("Remis par", 330, y);
    doc.roundedRect(40, y + 14, 270, 110, 6).lineWidth(0.6).stroke("#bbb");
    if (remote) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#067647").text("CONFIRMÉ À DISTANCE PAR LE CLIENT", 48, y + 24, { width: 254 });
      doc.font("Helvetica").fontSize(8.5).fillColor(ink).text(`Case « J'ai bien reçu mon véhicule » cochée et nom saisi par le client sur son téléphone, via le lien sécurisé envoyé au ${d.remote?.phone || d.telephone || "numéro du client"}.${d.remote?.ip ? `\nAdresse IP : ${d.remote.ip}` : ""}`, 48, y + 42, { width: 254 });
    } else if (signaturePng) { try { doc.image(signaturePng, 48, y + 20, { fit: [254, 84], align: "center", valign: "center" }); } catch { /* signature illisible : le nom reste */ } }
    doc.font("Helvetica").fontSize(8.5).fillColor(grey).text(`${d.signer} · ${fr(remote ? d.remote?.at || d.signed_at : d.signed_at)}`, 48, y + 108, { width: 254 });
    doc.font("Helvetica").fontSize(9.5).fillColor(ink).text(`${d.livreur || "NeoDrive"}\npour MK HOLDING - NeoDrive`, 330, y + 18, { width: 225 });
    y += 140;

    doc.font("Helvetica").fontSize(7.5).fillColor(grey).text(
      `${remote ? "Confirmation électronique simple recueillie sur l'appareil du client (lien personnel à usage unique)" : "Signature électronique simple recueillie sur l'appareil du livreur"}${d.lat != null && d.lng != null ? `, position du livreur ${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}` : ""}. Document généré automatiquement par NeoDrive ; un exemplaire est remis au client par e-mail ou lien sécurisé.`,
      40, Math.min(y, 770), { width: 515 });
    doc.end();
  });
}
