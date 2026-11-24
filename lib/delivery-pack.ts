/**
 * « Pack avant livraison » (serveur uniquement).
 * Dès qu'une date de livraison est fixée, le client reçoit tout ce qu'il faut : date (et créneau), montant,
 * devis PDF, coordonnées bancaires, étapes de la livraison et un lien vers sa page /livraison/<jeton>
 * (confirmer sa présence ou demander une autre date). Rappel SMS la veille vers 18 h.
 * Chaque envoi est noté dans les notes de la réservation.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
// @ts-ignore pdfkit n'a pas de types dans le projet
import PDFDocument from "pdfkit";
import { safeText } from "./pdf-text";
import { brevoReady, sendEmail, sendSms, OWNER_EMAIL, SITE } from "./brevo";
import { applyStoredSecrets } from "./integrations";
import { VEHICLES, REGISTRATION_PRICE, quoteDelivery, type VehicleKey } from "./neodrive-pricing";
import type { Reservation } from "./reservations";

export const RIB = {
  titulaire: "MK HOLDING",
  banque: "Revolut",
  iban: "FR76 2823 3000 0142 1307 1051 008",
  ibanCompact: "FR7628233000014213071051008",
  bic: "REVOFRP2",
};
export const SELLER = { name: "MK HOLDING SAS", brand: "NeoDrive", siren: "908 645 393", address: "31 rue Jean Nougaro", city: "31600 Muret" };
const CG_DEBOURS = 100; // taxes d'immatriculation reversées à l'État : débours, sans TVA
const CG_FRAIS = REGISTRATION_PRICE - CG_DEBOURS; // frais de dossier NeoDrive TTC (50 €)

export type PackReservation = Reservation & {
  raw?: Record<string, unknown> | null;
  creneau?: string | null;
  pack_token?: string | null;
  pack_sent_at?: string | null;
  pack_reminded_at?: string | null;
  pack_confirmed_at?: string | null;
  paiement_confirme_at?: string | null;
  livre_at?: string | null;
  livraison_mode?: string | null;
  verrouillage?: boolean | null;
};
export type PackLine = { label: string; detail?: string; amount: number };
type PackMeta = { date?: string; sent?: string[]; reminded_for?: string; change_requests?: { at: string; message: string }[] };

/* ---------- Outils ---------- */

const nb = (s: string) => s.replace(/[    ]/g, " ");
export const euro = (n: number) => nb(`${Math.round(n).toLocaleString("fr-FR")} €`);
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const prenomOf = (r: Pick<Reservation, "prenom" | "nom">) => {
  const p = (r.prenom || r.nom || "").trim().split(/\s+/)[0] || "";
  return p.toLowerCase().replace(/(^|[-'])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()).slice(0, 25);
};
/** Texte compatible SMS (alphabet GSM) : retire les accents absents du GSM et les caractères spéciaux. */
export function gsm(s: string) {
  const map: Record<string, string> = { "â": "a", "ä": "a", "á": "a", "ê": "e", "ë": "e", "î": "i", "ï": "i", "ô": "o", "ö": "o", "û": "u", "ü": "u", "ç": "c", "œ": "oe", "Â": "A", "Ê": "E", "É": "E", "È": "E", "Î": "I", "Ô": "O", "Û": "U", "À": "A", "’": "'", "‘": "'", "«": '"', "»": '"', "–": "-", "—": "-", "…": "..." };
  return nb(s).replace(/[^\x00-\x7F]/g, c => map[c] ?? (/[éèàùìòÇÄÖÑÜßäöñüåÅæÆøØ€£¥]/.test(c) ? c : ""));
}
/** « mardi 2 décembre » à partir de « 2026-12-02 ». */
export function frDate(d: string | null | undefined, withYear = false) {
  if (!d || !/^\d{4}-\d{2}-\d{2}/.test(d)) return "";
  return new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}) });
}
/** Date et heure de Paris : { day: "2026-11-24", hour: 18 }. */
export function parisNow(at = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(at).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
}
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
export const packUrl = (token: string) => `${SITE}/livraison/${token}`;
export const reference = (r: Pick<Reservation, "id">) => `RES-${r.id}`;
const metaOf = (r: PackReservation): PackMeta => ((r.raw && typeof r.raw === "object" ? (r.raw as Record<string, unknown>).pack : null) || {}) as PackMeta;

export const vehicleKey = (modele: string): VehicleKey => (/essentiel/i.test(modele || "") ? "essentielle" : /plus/i.test(modele || "") ? "confortPlus" : "confort");

/* ---------- Mode de livraison ---------- */

export const WHATSAPP_NUMBER = "06 76 19 22 34";
export const WHATSAPP_URL = "https://wa.me/33676192234";
/** livraison_mode = 'transporteur' : voiture livrée par le transporteur partenaire (le chauffeur ne peut pas attendre).
 *  verrouillage = true : voiture livrée verrouillée, activée dès réception du paiement. */
export const packMode = (r: Pick<PackReservation, "livraison_mode" | "verrouillage">) => ({ transporteur: r.livraison_mode === "transporteur", verrouillage: r.verrouillage === true });
export const TRANSPORTEUR_TEXT = "La voiture est livrée par notre transporteur partenaire : le chauffeur dépose la voiture et repart aussitôt pour ses autres livraisons, il ne peut pas attendre.";
export const VERROUILLAGE_TEXT = "Votre voiture est activée dès réception de votre paiement, et vous recevez vos documents.";
/** Bloc « À faire avant le jour J » (page, e-mail) : bénéficiaire, plafond de virement instantané, capture le jour J. */
export function avantJourJ(total: number | null) {
  return [
    "Ajoutez dès aujourd'hui notre RIB comme bénéficiaire dans votre application bancaire : certaines banques demandent jusqu'à 48 h pour l'activer.",
    `Vérifiez que le virement instantané est possible pour le montant total${total != null ? ` (${euro(total)})` : ""} : si besoin, votre banque peut relever votre plafond.`,
    "Le jour J, faites le virement instantané et envoyez-nous la capture d'écran de la confirmation.",
  ];
}
/** Phrases propres au mode de livraison (vides pour une livraison faite par NeoDrive sans verrouillage). */
export function modeNotes(r: Pick<PackReservation, "livraison_mode" | "verrouillage">) {
  const m = packMode(r);
  return [m.transporteur ? TRANSPORTEUR_TEXT : "", m.verrouillage ? VERROUILLAGE_TEXT : ""].filter(Boolean);
}

/* ---------- Montant et lignes du devis ---------- */

/** Lignes du devis : véhicule, livraison, carte grise (débours + frais TTC), ajustement éventuel ; total = reservation.total si renseigné. */
export function packLines(r: PackReservation): { lines: PackLine[]; total: number | null; carteGrise: boolean } {
  const key = vehicleKey(r.modele); const q = Math.max(1, Number(r.quantite) || 1);
  const vehicle = VEHICLES[key].price * q;
  const quote = quoteDelivery(r.code_postal || "");
  let delivery: number | null = r.delivery_price ?? (quote.status === "estimated" ? quote.price : null);
  const opts = `${r.options || ""} ${r.message || ""}`;
  const noCg = /sans\s+carte\s*grise/i.test(opts);
  let cg: boolean;
  if (r.total != null) {
    if (delivery == null) { delivery = r.total - vehicle - (noCg ? 0 : REGISTRATION_PRICE); if (delivery < 0) delivery = null; }
    cg = delivery != null && !noCg && r.total - vehicle - delivery >= REGISTRATION_PRICE;
  } else cg = !noCg;
  const lines: PackLine[] = [{ label: `${VEHICLES[key].label}${q > 1 ? ` x ${q}` : ""}${r.couleur ? ` (${r.couleur})` : ""}`, detail: "Véhicule neuf, garantie constructeur", amount: vehicle }];
  if (delivery != null) lines.push({ label: "Livraison à domicile", detail: `${[r.code_postal, r.ville].filter(Boolean).join(" ")}`.trim() || undefined, amount: delivery });
  if (cg) {
    lines.push({ label: "Carte grise : taxes d'immatriculation", detail: "Débours reversés à l'État, sans TVA", amount: CG_DEBOURS });
    lines.push({ label: "Carte grise : frais de dossier NeoDrive", detail: "TTC", amount: CG_FRAIS });
  }
  const sum = lines.reduce((a, l) => a + l.amount, 0);
  if (r.total != null && delivery != null && Math.round(r.total - sum) !== 0) lines.push({ label: r.total < sum ? "Remise" : "Options et frais complémentaires", amount: r.total - sum });
  const total = r.total != null ? r.total : delivery != null ? sum : null;
  return { lines, total, carteGrise: cg };
}

/* ---------- Devis PDF (pdfkit) ---------- */

const NAVY = "#16202e", ACC = "#e8592a", GREY = "#5b6573", LINE = "#dfe3ea", SOFT = "#f4f6fa", W = 595.28, M = 42;

export function devisPdf(r: PackReservation): Promise<Buffer> {
  const { lines, total, carteGrise } = packLines(r);
  return new Promise<Buffer>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = safeText(new PDFDocument({ size: "A4", margin: M, info: { Title: `Devis NeoDrive ${reference(r)}`, Author: "MK HOLDING SAS - NeoDrive" } }));
    const chunks: Buffer[] = []; doc.on("data", (b: Buffer) => chunks.push(b)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    // Bandeau
    doc.rect(0, 0, W, 88).fill(NAVY); doc.rect(0, 88, W, 4).fill(ACC);
    doc.roundedRect(M, 26, 34, 34, 7).fill(ACC);
    doc.fillColor("#fff").font("Helvetica-Bold").fontSize(20).text("N", M + 10, 33, { lineBreak: false });
    doc.fontSize(20).text("NeoDrive", M + 46, 28, { lineBreak: false });
    doc.font("Helvetica").fontSize(8.5).text("MK HOLDING SAS - 31 rue Jean Nougaro, 31600 Muret - SIREN 908 645 393", M + 46, 52, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(15).text("DEVIS", M, 28, { width: W - 2 * M, align: "right" });
    doc.font("Helvetica").fontSize(9).text(`Référence ${reference(r)}`, M, 50, { width: W - 2 * M, align: "right" });
    doc.text(`Date : ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`, M, 63, { width: W - 2 * M, align: "right" });
    // Vendeur / client
    const bw = (W - 2 * M) / 2 - 8; let y = 112;
    const box = (x: number, title: string, rows: string[]) => {
      doc.roundedRect(x, y, bw, 86, 5).lineWidth(0.8).stroke(LINE);
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(ACC).text(title, x + 10, y + 9, { lineBreak: false });
      rows.filter(Boolean).slice(0, 5).forEach((t, i) => doc.font(i ? "Helvetica" : "Helvetica-Bold").fontSize(9).fillColor(NAVY).text(t, x + 10, y + 23 + i * 12, { width: bw - 20, lineBreak: false, ellipsis: true }));
    };
    box(M, "VENDEUR", ["MK HOLDING SAS - NeoDrive", "31 rue Jean Nougaro", "31600 Muret", "SIREN 908 645 393", "contact.neodrivefrance@gmail.com"]);
    box(W / 2 + 8, "CLIENT", [`${r.prenom || ""} ${r.nom || ""}`.trim() || "Client", r.adresse || "", `${r.code_postal || ""} ${r.ville || ""}`.trim(), r.telephone || "", r.email || ""]);
    y += 104;
    if (r.date_promise) {
      doc.roundedRect(M, y, W - 2 * M, 30, 5).fill("#fff4ec");
      doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY).text(`Livraison prévue : ${frDate(r.date_promise, true)}${r.creneau ? ` - créneau ${r.creneau}` : ""}`, M + 12, y + 10, { width: W - 2 * M - 24, lineBreak: false });
      y += 44;
    }
    // Tableau
    const tw = W - 2 * M;
    doc.rect(M, y, tw, 22).fill(NAVY);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#fff").text("DÉSIGNATION", M + 10, y + 7, { lineBreak: false }).text("MONTANT", M, y + 7, { width: tw - 10, align: "right" });
    y += 22;
    lines.forEach((l, i) => {
      const h = l.detail ? 32 : 24; if (i % 2 === 0) doc.rect(M, y, tw, h).fill(SOFT);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(NAVY).text(l.label, M + 10, y + 7, { width: tw - 130, lineBreak: false });
      if (l.detail) doc.font("Helvetica").fontSize(7.8).fillColor(GREY).text(l.detail, M + 10, y + 19, { width: tw - 130, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(NAVY).text(l.amount < 0 ? `- ${euro(-l.amount)}` : euro(l.amount), M, y + 7, { width: tw - 10, align: "right" });
      y += h;
    });
    doc.rect(M, y, tw, 34).fill(NAVY);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#fff").text("TOTAL TTC", M + 10, y + 11, { lineBreak: false });
    doc.fontSize(15).text(total == null ? "À confirmer" : euro(total), M, y + 9, { width: tw - 10, align: "right" });
    y += 42;
    if (carteGrise) { doc.font("Helvetica").fontSize(7.8).fillColor(GREY).text(`Les ${euro(CG_DEBOURS)} de taxes d'immatriculation sont des débours (montant reversé à l'État pour votre compte) : ils ne sont pas soumis à la TVA.`, M, y, { width: tw }); y = doc.y + 10; }
    else y += 4;
    // RIB
    doc.roundedRect(M, y, tw, 96, 6).lineWidth(1.2).stroke(ACC);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ACC).text("RÈGLEMENT PAR VIREMENT INSTANTANÉ LE JOUR DE LA LIVRAISON", M + 12, y + 10, { lineBreak: false });
    const rib: [string, string][] = [["Titulaire", RIB.titulaire], ["Banque", RIB.banque], ["IBAN", RIB.iban], ["IBAN (à copier)", RIB.ibanCompact], ["BIC", RIB.bic]];
    rib.forEach(([k, v], i) => {
      doc.font("Helvetica").fontSize(8.5).fillColor(GREY).text(k, M + 12, y + 27 + i * 12.5, { width: 90, lineBreak: false });
      doc.font(k.startsWith("IBAN") ? "Courier-Bold" : "Helvetica-Bold").fontSize(9.2).fillColor(NAVY).text(v, M + 108, y + 27 + i * 12.5, { lineBreak: false });
    });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(NAVY).text(`Libellé du virement : ${reference(r)}`, M + 310, y + 27, { width: tw - 322, lineBreak: false });
    y += 108;
    // Modalités
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(NAVY).text("MODALITÉS", M, y); y = doc.y + 3;
    doc.font("Helvetica").fontSize(8.6).fillColor(GREY).text(
      "Paiement le jour de la livraison par virement instantané, aucun acompte. Pensez à vérifier avec votre banque votre plafond de virement instantané : il doit être au moins égal au total. "
      + "Ce sont nos seules coordonnées bancaires : nous ne vous enverrons jamais un autre RIB. En cas de doute, appelez-nous avant de payer. "
      + (packMode(r).verrouillage ? "Le véhicule est activé dès réception du paiement intégral ; ses clés, son certificat de conformité (COC) et la facture vous sont remis. " : "Le véhicule vous est remis avec ses clés et son certificat de conformité (COC). ")
      + "Conditions générales de vente : easydrive-auto.fr/cgv",
      M, y, { width: tw, lineGap: 2 });
    doc.page.margins.bottom = 0;
    doc.moveTo(M, 800).lineTo(W - M, 800).lineWidth(2).stroke(ACC);
    doc.font("Helvetica").fontSize(7).fillColor(GREY).text("MK HOLDING SAS - NeoDrive - SIREN 908 645 393 - 31 rue Jean Nougaro, 31600 Muret - www.easydrive-auto.fr", M, 808, { width: tw, align: "center", lineBreak: false });
    doc.end();
  });
}

/* ---------- Textes ---------- */

const whenText = (r: PackReservation) => `${frDate(r.date_promise)}${r.creneau ? ` (${r.creneau})` : ""}`;

const smsModeNotes = (r: PackReservation) => {
  const m = packMode(r);
  return `${m.transporteur ? " Notre transporteur partenaire depose la voiture et repart aussitot, il ne peut pas attendre." : ""}${m.verrouillage ? " Voiture activee et documents remis des reception du paiement." : ""}`;
};

export function packSms(r: PackReservation, url: string, total: number | null) {
  const p = prenomOf(r);
  const pay = r.paiement_confirme_at ? " Paiement deja recu, merci."
    : ` A faire des aujourd'hui : ajoutez notre RIB en beneficiaire (jusqu'a 48 h selon les banques) et verifiez que le virement instantane${total != null ? ` de ${euro(total)}` : " du montant total"} est possible. Le jour J : virement instantane puis capture par WhatsApp au ${WHATSAPP_NUMBER}.`;
  const t = `Bonjour${p ? " " + p : ""}, votre NeoDrive sera livree le ${whenText(r)}.${pay}${smsModeNotes(r)} Tout est ici, merci de confirmer : ${url} L'equipe NeoDrive`;
  return gsm(t.replace(/\s+/g, " "));
}
export function reminderSms(r: PackReservation, url: string, total: number | null) {
  const p = prenomOf(r);
  const pay = r.paiement_confirme_at ? "" : ` Verifiez que notre RIB est bien actif en beneficiaire. Le jour J : virement instantane${total != null ? ` de ${euro(total)}` : ""} puis capture par WhatsApp au ${WHATSAPP_NUMBER}.`;
  return gsm(`Bonjour${p ? " " + p : ""}, rappel : votre NeoDrive arrive demain${r.creneau ? ` (${r.creneau})` : ""}.${pay}${smsModeNotes(r)} Infos et RIB : ${url} L'equipe NeoDrive`.replace(/\s+/g, " "));
}

export function ribHtml(r: Pick<Reservation, "id">) {
  const row = (k: string, v: string, mono = false) => `<tr><td style="padding:3px 12px 3px 0;color:#5b6573">${k}</td><td style="padding:3px 0;font-weight:bold;${mono ? "font-family:Consolas,Menlo,monospace;" : ""}">${v}</td></tr>`;
  return `<div style="border:2px solid #e8592a;border-radius:12px;padding:14px 16px;margin:18px 0">
<p style="margin:0 0 8px;font-weight:bold;color:#e8592a">Coordonnées bancaires (virement instantané)</p>
<table style="border-collapse:collapse;font-size:14px">${row("Titulaire", RIB.titulaire)}${row("Banque", RIB.banque)}${row("IBAN", RIB.iban, true)}${row("BIC", RIB.bic, true)}${row("Libellé", reference(r))}</table>
<p style="margin:10px 0 4px;font-size:13px;color:#5b6573">IBAN sur une seule ligne, à copier-coller :</p>
<p style="margin:0;font-family:Consolas,Menlo,monospace;font-size:16px;font-weight:bold;background:#f4f6fa;border-radius:8px;padding:8px 10px;word-break:break-all">${RIB.ibanCompact}</p>
<p style="margin:6px 0 0;font-size:12px;color:#5b6573">🔒 Ce sont nos seules coordonnées bancaires : nous ne vous enverrons jamais un autre RIB. En cas de doute, appelez-nous avant de payer.</p></div>`;
}

/** Encadré « À faire avant le jour J » + phrases du mode de livraison, pour l'e-mail. */
export function avantJourJHtml(r: PackReservation, total: number | null) {
  const notes = modeNotes(r);
  const todo = r.paiement_confirme_at ? "" : `<p style="margin:0 0 6px;font-weight:bold;color:#e8592a">À faire avant le jour J</p>
<ol style="padding-left:20px;margin:0">${avantJourJ(total).map(t => `<li style="margin-bottom:6px">${esc(t)}</li>`).join("")}</ol>
<p style="margin:6px 0 0;font-size:13px;color:#5b6573">Pour la capture : répondez simplement à cet e-mail ou écrivez-nous sur WhatsApp au ${WHATSAPP_NUMBER}.</p>`;
  if (!todo && !notes.length) return "";
  return `<div style="background:#f4f6fa;border-radius:12px;padding:14px 16px;margin:16px 0">${todo}${notes.map(t => `<p style="margin:${todo ? "10px" : "0"} 0 0">${esc(t)}</p>`).join("")}</div>`;
}

export function packEmail(r: PackReservation, url: string, lines: PackLine[], total: number | null) {
  const p = prenomOf(r); const when = whenText(r); const mode = packMode(r);
  const rows = lines.map(l => `<tr><td style="padding:6px 0;border-bottom:1px solid #eef0f4">${esc(l.label)}${l.detail ? `<br><span style="font-size:12px;color:#5b6573">${esc(l.detail)}</span>` : ""}</td><td style="padding:6px 0;border-bottom:1px solid #eef0f4;text-align:right;white-space:nowrap">${l.amount < 0 ? "- " + euro(-l.amount) : euro(l.amount)}</td></tr>`).join("");
  const steps = [
    ["Avant le jour J", "Ajoutez MK HOLDING comme bénéficiaire et vérifiez votre plafond de virement instantané avec votre banque."],
    ["La veille", "Nous vous envoyons un rappel. Le transporteur peut vous appeler pour préciser l'heure : gardez votre téléphone à portée de main."],
    ["Le jour de la livraison", mode.transporteur
      ? "Notre transporteur partenaire dépose la voiture devant chez vous, puis repart aussitôt pour ses autres livraisons. Vous faites le virement instantané et vous nous envoyez la capture."
      : "Le véhicule est déchargé devant chez vous. Vous le regardez, on vous montre comment il marche, puis vous faites le virement instantané."],
    ["La remise", mode.verrouillage
      ? "Votre voiture est activée dès réception de votre paiement, et vous recevez vos documents, dont le certificat de conformité (COC) qui sert à faire la carte grise."
      : "Vous recevez les clés et le certificat de conformité (COC), le document qui sert à faire la carte grise. Gardez-le précieusement."],
  ];
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#16202e;max-width:580px">
<p>Bonjour${p ? " " + esc(p) : ""},</p>
<p>Bonne nouvelle : votre <b>${esc(r.modele || "NeoDrive")}</b> sera livrée le <b>${esc(when)}</b>${r.adresse || r.ville ? ` à l'adresse : ${esc([r.adresse, r.code_postal, r.ville].filter(Boolean).join(" "))}` : ""}.</p>
<p style="background:#fff4ec;border-radius:12px;padding:12px 14px;margin:16px 0"><b>👉 Merci de confirmer votre présence</b> (ou de demander une autre date) sur votre page de livraison :<br><a href="${url}" style="color:#e8592a;font-weight:bold">${url.replace("https://", "")}</a></p>
${avantJourJHtml(r, total)}
<h3 style="margin:22px 0 6px">Ce qui est compris</h3>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}<tr><td style="padding:10px 0;font-weight:bold;font-size:16px">Total TTC</td><td style="padding:10px 0;text-align:right;font-weight:bold;font-size:16px">${total == null ? "à confirmer" : euro(total)}</td></tr></table>
${r.paiement_confirme_at ? `<p>✅ Nous avons bien reçu votre paiement, merci.</p>` : `<p>Règlement <b>par virement instantané le jour de la livraison</b>, aucun acompte. Votre devis est joint en PDF (référence ${reference(r)}).</p>`}
<h3 style="margin:22px 0 6px">Comment se passe la livraison, en 4 étapes</h3>
<ol style="padding-left:20px;margin:0">${steps.map(([t, d]) => `<li style="margin-bottom:8px"><b>${t}</b> : ${d}</li>`).join("")}</ol>
${r.paiement_confirme_at ? "" : ribHtml(r)}
<p>Tous les conseils pour préparer ce jour (paiement, prise en main, carte grise) : <a href="${SITE}/preparer-ma-livraison">${SITE.replace("https://", "")}/preparer-ma-livraison</a></p>
<p>Une question ? Répondez simplement à cet e-mail.</p>
<p>À très bientôt,<br>L'équipe NeoDrive</p>
<p style="font-size:12px;color:#888">MK HOLDING SAS - SIREN 908 645 393 - 31 rue Jean Nougaro, 31600 Muret · <a href="${SITE}/cgv">CGV</a></p></div>`;
  return { subject: `Votre livraison NeoDrive le ${frDate(r.date_promise)} : tout ce qu'il faut savoir`, html };
}

/* ---------- Pack complet ---------- */

export async function buildPack(r: PackReservation) {
  const token = r.pack_token || "";
  const url = token ? packUrl(token) : `${SITE}/preparer-ma-livraison`;
  const { lines, total } = packLines(r);
  const pdf = await devisPdf(r);
  return { reference: reference(r), url, lines, total, pdf, sms: packSms(r, url, total), email: packEmail(r, url, lines, total) };
}

/* ---------- Base de données ---------- */

export async function appendNote(sb: SupabaseClient, id: number, line: string) {
  const { data } = await sb.from("reservations").select("notes").eq("id", id).maybeSingle();
  const stamp = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const notes = [data?.notes, `[${stamp}] ${line}`].filter(Boolean).join("\n").slice(-4000);
  await sb.from("reservations").update({ notes, updated_at: new Date().toISOString() }).eq("id", id);
}

async function setMeta(sb: SupabaseClient, r: PackReservation, patch: Partial<PackMeta>, extra: Record<string, unknown> = {}) {
  const { data } = await sb.from("reservations").select("raw").eq("id", r.id).maybeSingle();
  const raw = (data?.raw && typeof data.raw === "object" ? data.raw : {}) as Record<string, unknown>;
  const pack = { ...((raw.pack as PackMeta) || {}), ...patch };
  await sb.from("reservations").update({ raw: { ...raw, pack }, ...extra }).eq("id", r.id);
  r.raw = { ...raw, pack };
}

/** Donne un jeton public (32 caractères hexadécimaux) à la réservation si elle n'en a pas. */
export async function ensurePackToken(sb: SupabaseClient, r: PackReservation) {
  if (r.pack_token && /^[a-f0-9]{32}$/.test(r.pack_token)) return r.pack_token;
  const token = randomBytes(16).toString("hex");
  const { error } = await sb.from("reservations").update({ pack_token: token }).eq("id", r.id);
  if (error) throw new Error(`jeton : ${error.message}`);
  r.pack_token = token; return token;
}

export async function reservationByToken(sb: SupabaseClient, token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const { data } = await sb.from("reservations").select("*").eq("pack_token", token).maybeSingle();
  return (data as PackReservation) || null;
}

/** Envoie le pack (SMS + e-mail avec devis) et le note dans la réservation. */
export async function sendPack(sb: SupabaseClient, r: PackReservation, opts: { by?: string } = {}) {
  await applyStoredSecrets().catch(() => {});
  if (!r.date_promise) return { ok: false, error: "pas de date de livraison" };
  if (!brevoReady()) return { ok: false, error: "Brevo non connecté" };
  await ensurePackToken(sb, r);
  const pack = await buildPack(r);
  const ch: { sms?: string; email?: string } = {};
  if (r.telephone) { try { await sendSms(r.telephone, pack.sms, "transactional"); ch.sms = "envoyé"; } catch (e) { ch.sms = `erreur (${e instanceof Error ? e.message : e})`; } }
  else ch.sms = "pas de numéro";
  if (/@/.test(r.email || "")) {
    try { await sendEmail(r.email, `${r.prenom} ${r.nom}`.trim(), pack.email.subject, pack.email.html, [{ name: `devis-neodrive-${pack.reference}.pdf`, content: pack.pdf.toString("base64") }]); ch.email = "envoyé"; }
    catch (e) { ch.email = `erreur (${e instanceof Error ? e.message : e})`; }
  } else ch.email = "pas d'e-mail";
  const ok = ch.sms === "envoyé" || ch.email === "envoyé";
  const now = new Date().toISOString(); const meta = metaOf(r);
  const dateChanged = !!meta.date && meta.date !== r.date_promise;
  if (ok) await setMeta(sb, r, { date: r.date_promise, sent: [...(meta.sent || []), now].slice(-10) }, { pack_sent_at: now, ...(dateChanged ? { pack_confirmed_at: null, pack_reminded_at: null } : {}) });
  await appendNote(sb, r.id, `Pack avant livraison${dateChanged ? " (nouvelle date)" : ""} pour le ${frDate(r.date_promise)}${r.creneau ? ` ${r.creneau}` : ""}${opts.by ? ` (${opts.by})` : ""} : SMS ${ch.sms} · e-mail ${ch.email} · total ${pack.total == null ? "à confirmer" : euro(pack.total)}`);
  return { ok, channels: ch, total: pack.total, url: pack.url };
}

/** Rappel SMS de la veille. */
export async function sendReminder(sb: SupabaseClient, r: PackReservation) {
  await applyStoredSecrets().catch(() => {});
  if (!brevoReady() || !r.telephone || !r.date_promise) return { ok: false };
  await ensurePackToken(sb, r);
  const { total } = packLines(r);
  let res = "envoyé";
  try { await sendSms(r.telephone, reminderSms(r, packUrl(r.pack_token!), total), "transactional"); } catch (e) { res = `erreur (${e instanceof Error ? e.message : e})`; }
  const now = new Date().toISOString();
  if (res === "envoyé") await setMeta(sb, r, { reminded_for: r.date_promise }, { pack_reminded_at: now });
  await appendNote(sb, r.id, `Rappel SMS veille de livraison : ${res}`);
  return { ok: res === "envoyé" };
}

/** Tâche planifiée : packs (8 h - 20 h, livraison dans les 10 jours) et rappels de la veille (à partir de 18 h). */
export async function runPackCron(sb: SupabaseClient, at = new Date()) {
  const { day, hour } = parisNow(at);
  const out = { packs: [] as unknown[], reminders: [] as unknown[], hour };
  const { data, error } = await sb.from("reservations").select("*")
    .not("date_promise", "is", null).gte("date_promise", day).lte("date_promise", addDays(day, 10))
    .not("statut", "in", '("Livrée","Annulée")').is("livre_at", null).limit(200);
  if (error) throw new Error(error.message);
  const list = (data || []) as PackReservation[];
  if (hour >= 8 && hour < 20) {
    for (const r of list) {
      const meta = metaOf(r);
      const due = !r.pack_sent_at || (!!meta.date && meta.date !== r.date_promise);
      if (!due || (!r.telephone && !/@/.test(r.email || ""))) continue;
      out.packs.push({ id: r.id, ...(await sendPack(sb, r, { by: "automatique" }).catch(e => ({ ok: false, error: String(e) }))) });
    }
  }
  if (hour >= 18 && hour < 21) {
    const tomorrow = addDays(day, 1);
    for (const r of list) {
      if (r.date_promise?.slice(0, 10) !== tomorrow || !r.telephone) continue;
      const meta = metaOf(r);
      if (r.pack_reminded_at && meta.reminded_for === r.date_promise) continue;
      // Pack envoyé il y a moins de 6 h : il vaut rappel.
      if (r.pack_sent_at && at.getTime() - Date.parse(r.pack_sent_at) < 6 * 3600000) { await setMeta(sb, r, { reminded_for: r.date_promise }, { pack_reminded_at: at.toISOString() }); continue; }
      out.reminders.push({ id: r.id, ...(await sendReminder(sb, r).catch(e => ({ ok: false, error: String(e) }))) });
    }
  }
  return out;
}

/* ---------- Réponses du client ---------- */

async function alertFounder(subject: string, text: string, r: PackReservation) {
  await applyStoredSecrets().catch(() => {});
  if (!brevoReady()) return;
  const who = `${r.prenom} ${r.nom}`.trim() || "Client";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px"><p>${esc(text)}</p><p>${esc(who)} · ${esc(r.telephone)} · ${esc(r.email)}<br>${esc([r.adresse, r.code_postal, r.ville].filter(Boolean).join(" "))}<br>${esc(r.modele)} · livraison prévue le ${esc(frDate(r.date_promise))}${r.creneau ? ` (${esc(r.creneau)})` : ""} · ${reference(r)}</p><p><a href="${SITE}/reservations-admin">Ouvrir les réservations</a></p></div>`;
  try { await sendEmail(OWNER_EMAIL, "Mansour", subject, html); } catch (e) { console.error("[PACK] alerte e-mail", e); }
}

export async function clientConfirm(sb: SupabaseClient, r: PackReservation) {
  if (r.pack_confirmed_at) return { ok: true, already: true };
  const now = new Date().toISOString();
  await sb.from("reservations").update({ pack_confirmed_at: now }).eq("id", r.id);
  await appendNote(sb, r.id, `Le client confirme sa présence pour la livraison du ${frDate(r.date_promise)} (page de livraison)`);
  await alertFounder(`✅ Présence confirmée : ${`${r.prenom} ${r.nom}`.trim()} le ${frDate(r.date_promise)}`, "Le client a confirmé sa présence pour la livraison.", r);
  return { ok: true };
}

export async function clientChangeDate(sb: SupabaseClient, r: PackReservation, message: string) {
  const meta = metaOf(r); const reqs = meta.change_requests || [];
  const last = reqs[reqs.length - 1];
  if (last && Date.now() - Date.parse(last.at) < 10 * 60000) return { ok: true, already: true };
  const msg = message.replace(/\s+/g, " ").trim().slice(0, 500);
  const now = new Date().toISOString();
  await setMeta(sb, r, { change_requests: [...reqs, { at: now, message: msg }].slice(-10) }, { pack_confirmed_at: null });
  await appendNote(sb, r.id, `Le client souhaite changer la date de livraison (prévue le ${frDate(r.date_promise)})${msg ? ` : « ${msg} »` : ""}`);
  await alertFounder(`📅 Changement de date demandé : ${`${r.prenom} ${r.nom}`.trim()}`, `Le client souhaite changer la date de livraison prévue le ${frDate(r.date_promise)}.${msg ? ` Son message : « ${msg} »` : ""} Rappelez-le pour fixer une nouvelle date.`, r);
  return { ok: true };
}

/** Données affichées sur la page publique (sans rien de sensible au-delà de ce que le client a donné). */
export function publicView(r: PackReservation) {
  const { lines, total, carteGrise } = packLines(r);
  const meta = metaOf(r);
  return {
    reference: reference(r), prenom: prenomOf(r), modele: r.modele || "NeoDrive", couleur: r.couleur || "",
    date: r.date_promise, dateText: frDate(r.date_promise, true), creneau: r.creneau || "",
    adresse: [r.adresse, [r.code_postal, r.ville].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    lines, total, carteGrise, paid: !!r.paiement_confirme_at, delivered: !!r.livre_at || r.statut === "Livrée", cancelled: r.statut === "Annulée",
    confirmedAt: r.pack_confirmed_at || null, changeRequestedAt: meta.change_requests?.slice(-1)[0]?.at || null,
    rib: RIB,
    ...packMode(r), avantJourJ: avantJourJ(total), modeNotes: modeNotes(r), whatsapp: { number: WHATSAPP_NUMBER, url: WHATSAPP_URL },
  };
}
export type PackPublicView = ReturnType<typeof publicView>;
