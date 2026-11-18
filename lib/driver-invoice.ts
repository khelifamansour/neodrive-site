/** Facture d'autofacturation du livreur (émise par MK HOLDING au nom et pour le compte du livreur, mandat dans le contrat). */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PDFDocument from "pdfkit";
import { COMPANY } from "./driver-docs";

export type Billing = { legal_name?: string; siret?: string; address?: string; iban?: string; bic?: string };
export type InvDay = { date: string; depart: string; start: string; end: string; pause_min: number; worked_min: number };
export type InvDelivery = { client: string; vin: string; date: string | null; accuse: boolean };
/** Contrôle de fin de tournée : prévu / réel, livraisons, dépenses carte (hors facture). */
export type Control = { planned_h: number; real_h: number; gap_h: number; planned_km: number; planned_stops: number; delivered: number; missing: string[]; no_vin: string[]; no_receipt: string[]; card_total: number; perso_total: number; tickets: number; days_without_receipt: string[]; cap_alerts: string[]; tickets_no_photo: number };

/** IBAN : format et clé de contrôle (mod 97). */
export function ibanOk(raw: string) {
  const s = String(raw || "").toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  if (s.startsWith("FR") && s.length !== 27) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  let m = 0; for (const ch of r) m = (m * 10 + Number(ch)) % 97;
  return m === 1;
}
export const bicOk = (s: string) => /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(String(s || "").toUpperCase().replace(/\s+/g, ""));
export const siretOk = (s: string) => /^\d{14}$/.test(String(s || "").replace(/\s+/g, ""));
export const fmtIban = (s: string) => String(s || "").toUpperCase().replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

/** "08:30" → minutes depuis minuit (null si invalide). */
export const toMin = (t: string) => { const m = /^(\d{1,2})[:h](\d{2})$/.exec(String(t || "").trim()); if (!m) return null; const h = Number(m[1]), mi = Number(m[2]); return h < 24 && mi < 60 ? h * 60 + mi : null; };
/** Durée travaillée d'une journée saisie (fin après minuit acceptée), pauses déduites. */
export const dayWorked = (start: string, end: string, pause: number) => { const a = toMin(start), b = toMin(end); if (a == null || b == null) return 0; const span = b >= a ? b - a : b + 1440 - a; return Math.max(0, span - Math.max(0, Math.round(pause || 0))); };

const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
const hm = (min: number) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")}`;
const dTxt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

export type InvoicePdf = { number: string; issued: string; driver: string; billing: Billing; tour: string; days: InvDay[]; deliveries: InvDelivery[]; rate: number; worked_min: number; total: number };

export function invoicePdf(d: InvoicePdf): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Facture ${d.number}`, Author: d.billing.legal_name || d.driver } });
    const chunks: Buffer[] = [];
    doc.on("data", (b: Buffer) => chunks.push(b)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    const ink = "#111", grey = "#666", accent = "#ff5a1f";
    const name = d.billing.legal_name || d.driver;

    doc.font("Helvetica-Bold").fontSize(14).fillColor(ink).text(name, 40, 40, { width: 260 });
    doc.font("Helvetica").fontSize(9).fillColor(ink).text([`Entrepreneur individuel`, d.billing.address || "", d.billing.siret ? `SIRET ${d.billing.siret}` : ""].filter(Boolean).join("\n"), 40, 60, { width: 260 });
    doc.font("Helvetica-Bold").fontSize(18).fillColor(accent).text("FACTURE", 300, 40, { width: 255, align: "right" });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(ink).text("AUTOFACTURATION", 300, 112, { width: 255, align: "right" });
    doc.font("Helvetica").fontSize(9.5).fillColor(ink).text(`N° ${d.number}\nDate : ${new Date(d.issued).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}\nTournée : ${d.tour}`, 300, 64, { width: 255, align: "right" });

    let y = 130;
    doc.roundedRect(300, y, 255, 70, 6).lineWidth(0.6).stroke("#bbb");
    doc.font("Helvetica-Bold").fontSize(9).text("CLIENT", 310, y + 8);
    doc.font("Helvetica").fontSize(9).text(`${COMPANY.name}\nSIREN ${COMPANY.siren}\n${COMPANY.address}`, 310, y + 21, { width: 235 });
    doc.font("Helvetica").fontSize(9).fillColor(grey).text("Prestation : conduite du véhicule et de la remorque porte-voitures de MK HOLDING, chargement et livraisons de véhicules.", 40, y + 4, { width: 245 });
    y += 88;

    const cols = [40, 160, 300, 400, 470];
    const head = ["Jour", "Départ", "Horaires", "Pauses", "Heures"];
    doc.rect(40, y, 515, 18).fill("#f3efe9");
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(ink); head.forEach((h, i) => doc.text(h, cols[i] + 4, y + 5, { width: (cols[i + 1] || 555) - cols[i] - 8 }));
    y += 22;
    doc.font("Helvetica").fontSize(8.5);
    for (const x of d.days) {
      if (y > 700) { doc.addPage(); y = 40; }
      const cells = [dTxt(x.date), x.depart || "—", `${x.start} - ${x.end}`, x.pause_min ? hm(x.pause_min) : "—", hm(x.worked_min)];
      cells.forEach((v, i) => doc.fillColor(ink).text(v, cols[i] + 4, y, { width: (cols[i + 1] || 555) - cols[i] - 8 }));
      y += 18;
    }
    doc.moveTo(40, y).lineTo(555, y).lineWidth(0.5).stroke("#ccc"); y += 10;

    const line = (label: string, val: string, bold = false) => { doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9.5).fillColor(ink).text(label, 280, y, { width: 190 }).text(val, 470, y, { width: 85, align: "right" }); y += bold ? 18 : 15; };
    line(`Heures : ${hm(d.worked_min)} x ${eur(d.rate)} / h`, eur(d.total));
    y += 4; line("TOTAL À PAYER", eur(d.total), true);
    doc.font("Helvetica").fontSize(8.5).fillColor(grey).text("TVA non applicable, art. 293 B du CGI.", 280, y, { width: 275 }); y += 22;

    if (d.deliveries.length) {
      if (y > 640) { doc.addPage(); y = 40; }
      doc.font("Helvetica-Bold").fontSize(10).fillColor(ink).text(`Livraisons effectuées (${d.deliveries.length}), pour information`, 40, y); y += 15;
      doc.font("Helvetica").fontSize(8.5);
      for (const v of d.deliveries) { if (y > 760) { doc.addPage(); y = 40; } doc.fillColor(ink).text(`• ${v.client} · VIN ${v.vin || "non saisi"}${v.date ? ` · ${new Date(v.date).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}` : ""}${v.accuse ? " · accusé de réception" : ""}`, 44, y, { width: 510 }); y += 13; }
      y += 8;
    }
    if (y > 700) { doc.addPage(); y = 40; }
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("Paiement", 40, y); y += 13;
    doc.font("Helvetica").fontSize(9).text(`Par virement à réception. IBAN ${fmtIban(d.billing.iban || "")}${d.billing.bic ? ` · BIC ${String(d.billing.bic).toUpperCase()}` : ""} · titulaire ${name}.`, 40, y, { width: 515 }); y += 26;
    doc.font("Helvetica").fontSize(7.5).fillColor(grey).text(`Facture émise par ${COMPANY.name} au nom et pour le compte de ${name}, en application du mandat d'autofacturation prévu au contrat de prestation (article 11). Le prestataire dispose de 15 jours pour la contester. Pénalités de retard : 3 fois le taux d'intérêt légal ; indemnité forfaitaire pour frais de recouvrement : 40 € (prestataire et client professionnels).`, 40, Math.min(y, 760), { width: 515 });
    doc.end();
  });
}
