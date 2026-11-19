/** Accusé de réception du véhicule : signé par le client sur le téléphone du livreur, ou confirmé à distance par le client (lien SMS / e-mail). Serveur uniquement. */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PDFDocument from "pdfkit";

import { safeText } from "./pdf-text";
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

/** Modes de règlement déclarés par le client au moment de signer (preuve, notamment des espèces remises au chauffeur). */
export const PAY_MODES = [
  { id: "virement", label: "Virement bancaire" },
  { id: "especes", label: "Espèces remises au chauffeur" },
  { id: "carte", label: "Carte bancaire" },
  { id: "autre", label: "Autre" },
] as const;
export type PayMode = typeof PAY_MODES[number]["id"];
export type PayLine = { mode: PayMode; amount: number };
/** Nettoie la déclaration envoyée par le navigateur ; null si aucun mode avec un montant positif. */
export function cleanPayment(raw: unknown): PayLine[] | null {
  if (!Array.isArray(raw)) return null;
  const ids = PAY_MODES.map(m => m.id) as string[];
  const out: PayLine[] = [];
  for (const x of raw.slice(0, 8)) {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    const mode = String(o.mode || ""); const amount = Math.round(Number(String(o.amount ?? "").replace(",", ".")) * 100) / 100;
    if (ids.includes(mode) && Number.isFinite(amount) && amount > 0 && amount < 100000 && !out.some(l => l.mode === mode)) out.push({ mode: mode as PayMode, amount });
  }
  return out.length ? out : null;
}
/** Nom affiché du chauffeur (sans « (test) »). */
export const driverDisplay = (name: string | null | undefined) => String(name || "").replace(/\s*\(test\)\s*$/i, "").trim();
/** « Virement 4 490 € ; Espèces remises au chauffeur Serge : 1 000 € » */
export function paymentText(lines: PayLine[], driver: string) {
  const eur = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
  return lines.map(l => l.mode === "especes" ? `Espèces remises au chauffeur${driver ? ` ${driver}` : ""} : ${eur(l.amount)}` : `${PAY_MODES.find(m => m.id === l.mode)?.label || l.mode} : ${eur(l.amount)}`).join(" ; ");
}

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
  /** Règlement déclaré par le client avant de signer. */
  reglement?: PayLine[] | null;
  /** Chauffeur à qui d'éventuelles espèces ont été remises. */
  driver_name?: string | null;
  /** Remise avec paiement en attente (réserve de propriété) : échéance du paiement et lieu de remise. */
  reserve?: { due: string | null; montant_du: number | null; lieu: string } | null;
};

const dateFr = (iso: string | null | undefined) => iso ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const eurFr = (n: number | null | undefined) => n == null ? "le montant restant dû" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
/** Échéance par défaut : 3 jours ouvrés après la remise (AAAA-MM-JJ). */
export function defaultDue(from = new Date()) {
  const d = new Date(from); let n = 0;
  while (n < 3) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) n++; }
  return d.toISOString().slice(0, 10);
}
/** Clauses de la remise avec réserve de propriété (affichées au client avant de signer, puis dans le PDF). */
export function reserveClauses(x: { modele: string; couleur: string; vin: string; date: string; lieu: string; montant_du: number | null; due: string | null }) {
  const veh = `${x.modele}${x.couleur ? `, ${x.couleur}` : ""}, n° de série ${x.vin}`;
  return [
    `Le client reconnaît que le véhicule ${veh} lui a été remis le ${new Date(x.date).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}${x.lieu ? ` à l'adresse suivante : ${x.lieu}` : ""}, alors que le paiement de ${eurFr(x.montant_du)} n'a pas encore été reçu par MK HOLDING (NeoDrive).`,
    `Il déclare avoir effectué, ou s'engage à effectuer, le virement de cette somme, et s'engage à ce qu'elle soit reçue par MK HOLDING au plus tard le ${dateFr(x.due)}.`,
    `Réserve de propriété (articles 2367 et suivants du Code civil) : le véhicule reste la propriété de MK HOLDING jusqu'au paiement intégral du prix.`,
    `Les clés et les documents du véhicule (certificat de conformité, carte grise ou documents d'immatriculation) sont conservés par NeoDrive et seront remis ou envoyés au client dès réception du paiement. Le véhicule est laissé fermé à clé.`,
    `Jusqu'au paiement, le client s'engage à ne pas utiliser, déplacer, prêter, vendre ou modifier le véhicule, à en assurer la garde, et à le restituer à NeoDrive sur simple demande. Il autorise NeoDrive à venir le récupérer à son adresse en cas de non-paiement à l'échéance.`,
    `À défaut de paiement à l'échéance, NeoDrive pourra reprendre le véhicule et engager toute action en justice pour obtenir le paiement ou la restitution. Le fait de disposer du véhicule (vente, cession, dissimulation) avant paiement peut constituer une infraction pénale.`,
  ];
}

const SELLER = ["MK HOLDING - NeoDrive", "31600 Muret, France", "SIREN 908 645 393", "Tél. 06 89 78 17 10 · contact.neodrivefrance@gmail.com"];
const fr = (iso: string | null) => iso ? new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** PDF « Accusé de réception du véhicule » avec la signature manuscrite du client (PNG). */
export function receiptPdf(d: ReceiptData, signaturePng: Buffer | null): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = safeText(new PDFDocument({ size: "A4", margin: 40, info: { Title: `Accusé de réception ${d.numero}`, Author: "MK HOLDING - NeoDrive" } }));
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
    if (d.reglement?.length) {
      const t = `Mode de règlement déclaré par le client : ${paymentText(d.reglement, driverDisplay(d.driver_name))}.`;
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(ink).text(t, 40, y, { width: 515 });
      y += doc.heightOfString(t, { width: 515 }) + 8;
    }

    doc.font("Helvetica").fontSize(9.5).fillColor(ink).text(
      `Je soussigné(e) ${d.signer} reconnais avoir reçu ce jour le véhicule décrit ci-dessus, avec les éléments cochés, sous réserve des remarques indiquées.${d.pending && !d.paiement_confirme_at ? " Je m'engage à régler le montant restant dû ; les clés et les documents me seront remis dès réception du paiement." : ""} La garantie légale de conformité de 2 ans s'applique à compter de cette date.`,
      40, y, { width: 515 });
    y += 46;

    const remote = d.mode === "distance";
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("Signature du client", 40, y).text("Remis par", 330, y);
    doc.roundedRect(40, y + 14, 270, 112, 6).lineWidth(0.6).stroke("#bbb");
    if (signaturePng) { try { doc.image(signaturePng, 48, y + 18, { fit: [254, remote ? 56 : 84], align: "center", valign: "center" }); } catch { /* signature illisible : le nom reste */ } }
    if (remote) {
      const top = signaturePng ? y + 76 : y + 24;
      doc.font("Helvetica-Bold").fontSize(signaturePng ? 8 : 10).fillColor("#067647").text(signaturePng ? "SIGNÉ À DISTANCE PAR LE CLIENT" : "CONFIRMÉ À DISTANCE PAR LE CLIENT", 48, top, { width: 254 });
      doc.font("Helvetica").fontSize(7.5).fillColor(ink).text(`${signaturePng ? "Signature manuscrite tracée" : "Case cochée et nom saisi"} par le client sur son téléphone, via le lien sécurisé envoyé au ${d.remote?.phone || d.telephone || "numéro du client"}.${d.remote?.ip ? ` Adresse IP : ${d.remote.ip}` : ""}`, 48, top + 10, { width: 254 });
    }
    doc.font("Helvetica").fontSize(8.5).fillColor(grey).text(`${d.signer} · ${fr(remote ? d.remote?.at || d.signed_at : d.signed_at)}`, 48, y + 112, { width: 254 });
    const remis = driverDisplay(d.driver_name) || (d.livreur && d.livreur !== "NeoDrive" ? driverDisplay(d.livreur) : "");
    doc.font("Helvetica").fontSize(9.5).fillColor(ink).text(remis ? `${remis}${/mansour/i.test(remis) ? "" : " (chauffeur)"}\npour MK HOLDING – NeoDrive` : "MK HOLDING – NeoDrive", 330, y + 18, { width: 225 });
    y += 140;

    doc.font("Helvetica").fontSize(7.5).fillColor(grey).text(
      `${remote ? "Confirmation électronique simple recueillie sur l'appareil du client (lien personnel à usage unique)" : "Signature électronique simple recueillie sur l'appareil du livreur"}${d.lat != null && d.lng != null ? `, position du livreur ${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}` : ""}. Document généré automatiquement par NeoDrive ; un exemplaire est remis au client par e-mail ou lien sécurisé.`,
      40, Math.min(y, 770), { width: 515 });
    doc.end();
  });
}

/** PDF « Remise du véhicule – paiement en attente (réserve de propriété) », signé par le client. */
export function reservePdf(d: ReceiptData, signaturePng: Buffer | null): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = safeText(new PDFDocument({ size: "A4", margin: 40, info: { Title: `Remise avec réserve de propriété ${d.numero}`, Author: "MK HOLDING - NeoDrive" } }));
    const chunks: Buffer[] = [];
    doc.on("data", (b: Buffer) => chunks.push(b)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    const ink = "#111", grey = "#666", accent = "#b42318";
    const rv = d.reserve || { due: null, montant_du: d.pending?.montant_du ?? null, lieu: d.adresse };
    doc.font("Helvetica-Bold").fontSize(18).fillColor(ink).text("NeoDrive", 40, 40);
    doc.font("Helvetica").fontSize(8.5).fillColor(grey).text(SELLER.join("\n"), 40, 62, { width: 230 });
    doc.font("Helvetica-Bold").fontSize(13).fillColor(accent).text("REMISE DU VÉHICULE – PAIEMENT EN ATTENTE", 230, 40, { width: 325, align: "right" });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(ink).text("Réserve de propriété", 230, 58, { width: 325, align: "right" });
    doc.font("Helvetica").fontSize(9).text(`N° ${d.numero}`, 230, 74, { width: 325, align: "right" }).text(`Remis le ${fr(d.signed_at)}`, 230, 86, { width: 325, align: "right" });
    let y = 128;
    const box = (title: string, lines: string[], x: number, w: number, h: number) => {
      doc.roundedRect(x, y, w, h, 6).lineWidth(0.6).stroke("#bbb");
      doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text(title, x + 10, y + 8);
      doc.font("Helvetica").fontSize(9).fillColor(ink).text(lines.filter(Boolean).join("\n"), x + 10, y + 21, { width: w - 20, height: h - 26, ellipsis: true });
    };
    box("CLIENT", [d.client, d.adresse, d.telephone ? `Tél. ${d.telephone}` : "", d.email], 40, 250, 86);
    box("VÉHICULE", [d.modele, d.couleur ? `Couleur : ${d.couleur}` : "", `N° de série (VIN) : ${d.vin}`, `Montant restant dû : ${eurFr(rv.montant_du)}`, `Échéance du paiement : ${dateFr(rv.due)}`], 305, 250, 86);
    y += 100;
    const clauses = reserveClauses({ modele: d.modele, couleur: d.couleur, vin: d.vin, date: d.signed_at, lieu: rv.lieu, montant_du: rv.montant_du, due: rv.due });
    clauses.forEach((t, i) => {
      doc.font("Helvetica").fontSize(9.2).fillColor(ink).text(`${i + 1}. ${t}`, 40, y, { width: 515 });
      y += doc.heightOfString(`${i + 1}. ${t}`, { width: 515 }) + 6;
    });
    if (d.reglement?.length) {
      const t = `Règlement déclaré par le client : ${paymentText(d.reglement, driverDisplay(d.driver_name))}.`;
      doc.font("Helvetica-Bold").fontSize(9.2).fillColor(ink).text(t, 40, y, { width: 515 }); y += doc.heightOfString(t, { width: 515 }) + 6;
    }
    if (d.reserves) { const t = `Remarques du client : ${d.reserves}`; doc.font("Helvetica").fontSize(9).fillColor(ink).text(t, 40, y, { width: 515 }); y += doc.heightOfString(t, { width: 515 }) + 6; }
    doc.font("Helvetica-Bold").fontSize(9.2).fillColor(ink).text(`Je soussigné(e) ${d.signer} déclare avoir lu et accepté les conditions ci-dessus.`, 40, y, { width: 515 });
    y += 22;
    const remote = d.mode === "distance";
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("Signature du client", 40, y).text("Remis par", 330, y);
    doc.roundedRect(40, y + 14, 270, 112, 6).lineWidth(0.6).stroke("#bbb");
    if (signaturePng) { try { doc.image(signaturePng, 48, y + 18, { fit: [254, remote ? 56 : 84], align: "center", valign: "center" }); } catch { /* le nom reste */ } }
    if (remote) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#067647").text("SIGNÉ À DISTANCE PAR LE CLIENT", 48, y + 76, { width: 254 });
      doc.font("Helvetica").fontSize(7.5).fillColor(ink).text(`Signature tracée par le client sur son téléphone, via le lien sécurisé envoyé au ${d.remote?.phone || d.telephone || "numéro du client"}.${d.remote?.ip ? ` Adresse IP : ${d.remote.ip}` : ""}`, 48, y + 86, { width: 254 });
    }
    doc.font("Helvetica").fontSize(8.5).fillColor(grey).text(`${d.signer} · ${fr(remote ? d.remote?.at || d.signed_at : d.signed_at)}`, 48, y + 112, { width: 254 });
    const remis = driverDisplay(d.driver_name) || (d.livreur && d.livreur !== "NeoDrive" ? driverDisplay(d.livreur) : "");
    doc.font("Helvetica").fontSize(9.5).fillColor(ink).text(remis ? `${remis}${/mansour/i.test(remis) ? "" : " (chauffeur)"}\npour MK HOLDING – NeoDrive` : "MK HOLDING – NeoDrive", 330, y + 18, { width: 225 });
    doc.font("Helvetica").fontSize(8.5).fillColor(accent).text("Clés et documents conservés par NeoDrive jusqu'au paiement.", 330, y + 60, { width: 225 });
    y += 140;
    doc.font("Helvetica").fontSize(7.5).fillColor(grey).text("Signature électronique simple recueillie sur l'appareil du client ou du livreur. Document généré automatiquement par NeoDrive ; un exemplaire est remis au client par e-mail.", 40, Math.min(y, 790), { width: 515 });
    doc.end();
  });
}
