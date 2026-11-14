/** Pièces détachées NeoDrive : base de données, facture pro forma (PDF) et e-mails. Serveur uniquement. */
// @ts-ignore
import PDFDocument from "pdfkit";
import { crmDatabase } from "./crm-agent";
import { brevoReady, OWNER_EMAIL, sendEmail, SITE } from "./brevo";
import seed from "./parts-seed.json";
import { eur, orderTotals, SHIPPING_LABEL, STATUS_TEXT, TVA_RATE, type Part, type PartsOrder } from "./parts";

export const SELLER = {
  name: "MK HOLDING - NeoDrive",
  lines: ["31 rue Jean Nougaro, 31600 Muret, France", "SIREN 908 645 393", "Tél. 06 89 78 17 10", "contact.neodrivefrance@gmail.com"],
  owner: "Mansour Khelifa",
};
/** Coordonnées bancaires déjà publiées sur le site (/preparer-ma-livraison, /facturation). */
export const BANK = { holder: "MK HOLDING", bank: "REVOLUT", iban: "FR76 2823 3000 0142 1307 1051 008", bic: "REVOFRP2" };

export const ORDER_COLUMNS = "id,created_at,updated_at,order_number,public_token,customer_first_name,customer_last_name,customer_phone,customer_email,shipping_address,vin,lines,total_ht,tva,total_ttc,shipping_mode,shipping_ht,status,customer_message,notes,history";

export const db = () => crmDatabase();
export const statusUrl = (token: string) => `${SITE}/pieces/commande/${token}`;

/** Catalogue public (pièces actives). Si la base est indisponible, liste tirée du catalogue PDF. */
export async function loadCatalogue(): Promise<{ parts: Part[]; source: "db" | "pdf" }> {
  try {
    const { data, error } = await db().from("parts").select("id,sku,name,category,sale_price,image_url,notes").eq("active", true).order("category").order("name").limit(1000);
    if (error) throw error;
    if (data?.length) return { parts: data.map(p => ({ ...p, sale_price: p.sale_price === null ? null : Number(p.sale_price) })), source: "db" };
  } catch (e) { console.error("[pieces] catalogue", (e as Error).message); }
  return { parts: (seed as Part[]).map(p => ({ sku: p.sku, name: p.name, category: p.category, sale_price: p.sale_price, image_url: p.image_url })), source: "pdf" };
}

export const normOrder = (o: Record<string, unknown>) => ({ ...o, total_ht: Number(o.total_ht), tva: Number(o.tva), total_ttc: Number(o.total_ttc), shipping_ht: o.shipping_ht === null || o.shipping_ht === undefined ? null : Number(o.shipping_ht), lines: (o.lines || []) as PartsOrder["lines"], history: (o.history || []) as PartsOrder["history"] }) as PartsOrder;

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" });

/** PDF « FACTURE PRO FORMA » (pdfkit, polices standard). */
export function proformaPdf(o: PartsOrder): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Facture pro forma ${o.order_number}`, Author: "MK HOLDING - NeoDrive" } });
    const chunks: Buffer[] = [];
    doc.on("data", (b: Buffer) => chunks.push(b)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    const ink = "#111", grey = "#666", accent = "#ff5a1f";

    // En-tête
    doc.font("Helvetica-Bold").fontSize(18).fillColor(ink).text("NeoDrive", 40, 40);
    doc.font("Helvetica-Bold").fontSize(9).text(SELLER.name, 40, 64);
    doc.font("Helvetica").fontSize(9).fillColor(grey).text(SELLER.lines.join("\n"), 40, 76, { width: 250 });
    doc.font("Helvetica-Bold").fontSize(17).fillColor(accent).text("FACTURE PRO FORMA", 300, 40, { width: 255, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(ink)
      .text(`N° ${o.order_number}`, 300, 64, { width: 255, align: "right" })
      .text(`Date : ${fmtDate(o.created_at)}`, 300, 76, { width: 255, align: "right" });

    // Client
    const cy = 140;
    doc.roundedRect(300, cy, 255, 96, 6).lineWidth(0.6).stroke("#bbb");
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("CLIENT", 310, cy + 8);
    const client = [`${o.customer_first_name} ${o.customer_last_name}`, o.shipping_address || "", `Tél. ${o.customer_phone}`, o.customer_email, o.vin ? `VIN / n° de série : ${o.vin}` : ""].filter(Boolean).join("\n");
    doc.font("Helvetica").fontSize(9).text(client, 310, cy + 21, { width: 235, height: 70, ellipsis: true });
    doc.font("Helvetica-Bold").fontSize(9).text("LIVRAISON", 40, cy + 8);
    doc.font("Helvetica").fontSize(9).text(SHIPPING_LABEL[o.shipping_mode] || o.shipping_mode, 40, cy + 21, { width: 240 });

    // Lignes
    const cols = [{ h: "Référence", w: 110 }, { h: "Désignation", w: 195 }, { h: "Qté", w: 40, a: "right" }, { h: "PU HT", w: 80, a: "right" }, { h: "Total HT", w: 90, a: "right" }];
    let y = cy + 115;
    const row = (cells: string[], bold = false, bg?: string) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      const h = Math.max(18, ...cells.map((t, i) => doc.heightOfString(t, { width: cols[i].w - 10 }) + 8));
      if (y + h > 780) { doc.addPage(); y = 40; }
      let x = 40;
      if (bg) doc.rect(40, y, 515, h).fill(bg);
      cells.forEach((t, i) => { doc.fillColor(ink).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).text(t, x + 5, y + 4, { width: cols[i].w - 10, align: (cols[i].a as "right") || "left" }); x += cols[i].w; });
      doc.moveTo(40, y + h).lineTo(555, y + h).lineWidth(0.4).stroke("#ccc");
      y += h;
    };
    row(cols.map(c => c.h), true, "#f1f1f1");
    o.lines.forEach(l => row([l.sku, l.name, String(l.qty), eur(l.unit_ht), eur(l.qty * l.unit_ht)]));
    if (o.shipping_mode === "envoi") row(["", "Frais d'envoi", "1", o.shipping_ht === null ? "à confirmer" : eur(o.shipping_ht), o.shipping_ht === null ? "à confirmer" : eur(o.shipping_ht)]);
    else row(["", "Retrait à Muret", "1", eur(0), eur(0)]);

    // Totaux
    const t = orderTotals(o.lines, o.shipping_ht);
    y += 10; if (y > 700) { doc.addPage(); y = 40; }
    const tot = (k: string, v: string, b = false) => { doc.font(b ? "Helvetica-Bold" : "Helvetica").fontSize(b ? 11 : 9.5).fillColor(ink).text(k, 340, y, { width: 120 }).text(v, 460, y, { width: 95, align: "right" }); y += b ? 18 : 14; };
    tot("Total HT", eur(t.total_ht)); tot(`TVA ${Math.round(TVA_RATE * 100)} %`, eur(t.tva)); tot("Total TTC", eur(t.total_ttc), true);
    if (o.shipping_mode === "envoi" && o.shipping_ht === null) {
      doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(grey).text("Frais d'envoi non compris : ils vous seront confirmés avant paiement.", 300, y, { width: 255, align: "right" }); y += 16;
    }

    // Paiement
    y += 14; if (y > 680) { doc.addPage(); y = 40; }
    doc.roundedRect(40, y, 515, 92, 6).lineWidth(0.6).stroke("#bbb");
    doc.font("Helvetica-Bold").fontSize(10).fillColor(ink).text("Paiement par virement bancaire", 52, y + 10);
    doc.font("Helvetica").fontSize(9).text(`Titulaire : ${BANK.holder}\nBanque : ${BANK.bank}\nIBAN : ${BANK.iban}\nBIC : ${BANK.bic}`, 52, y + 26, { width: 250 });
    doc.font("Helvetica-Bold").fontSize(9).text("Référence du virement :", 320, y + 26, { width: 225 }).font("Helvetica").text(o.order_number, 320, y + 38, { width: 225 });
    doc.font("Helvetica").fontSize(8.5).fillColor(grey).text("Les pièces sont préparées dès réception du paiement.", 320, y + 56, { width: 225 });
    y += 106;

    doc.font("Helvetica").fontSize(8).fillColor(grey).text(`Document provisoire : cette facture pro forma n'est pas une facture définitive. La facture vous sera remise après paiement. Suivi de commande : ${statusUrl(o.public_token)}`, 40, y, { width: 515 });
    doc.end();
  });
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

function linesHtml(o: PartsOrder) {
  const t = orderTotals(o.lines, o.shipping_ht);
  const rows = o.lines.map(l => `<tr><td style="padding:6px;border-bottom:1px solid #eee">${l.image_url ? `<img src="${SITE}${esc(l.image_url)}" alt="" width="56" style="border-radius:6px;vertical-align:middle;margin-right:8px">` : ""}${esc(l.name)}<br><small style="color:#777">Réf. ${esc(l.sku)}</small></td><td style="padding:6px;border-bottom:1px solid #eee;text-align:center">${l.qty}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${eur(l.qty * l.unit_ht)}</td></tr>`).join("");
  const ship = o.shipping_mode === "envoi" ? (o.shipping_ht === null ? `<p style="color:#b45309">Envoi par transporteur : frais d'envoi confirmés sur la facture pro forma.</p>` : `<p>Frais d'envoi : ${eur(o.shipping_ht)} HT</p>`) : `<p>Retrait à Muret (31600).</p>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:14px"><tr style="background:#f5f5f5"><th style="padding:6px;text-align:left">Pièce</th><th style="padding:6px">Qté</th><th style="padding:6px;text-align:right">Total HT</th></tr>${rows}</table>${ship}<p style="text-align:right">Total HT : <b>${eur(t.total_ht)}</b><br>TVA 20 % : ${eur(t.tva)}<br>Total TTC : <b style="font-size:17px">${eur(t.total_ttc)}</b></p>`;
}

function customerHtml(o: PartsOrder) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#111"><h2>Merci pour votre commande ${esc(o.order_number)}</h2><p>Bonjour ${esc(o.customer_first_name)},</p><p>Nous avons bien reçu votre commande de pièces détachées NeoDrive. Vous trouverez la <b>facture pro forma</b> en pièce jointe.</p>${linesHtml(o)}<h3>Paiement par virement</h3><p>Titulaire : ${BANK.holder}<br>Banque : ${BANK.bank}<br>IBAN : <b>${BANK.iban}</b><br>BIC : ${BANK.bic}<br>Référence à indiquer : <b>${esc(o.order_number)}</b></p><p style="color:#555;font-size:13px">Ce sont nos seules coordonnées bancaires. En cas de doute, appelez-nous au 06 89 78 17 10 avant de payer.</p><p><a href="${statusUrl(o.public_token)}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Suivre ma commande</a></p><p>À bientôt,<br>L'équipe NeoDrive<br>31 rue Jean Nougaro, 31600 Muret</p></div>`;
}

function ownerHtml(o: PartsOrder) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#111"><h2>Nouvelle commande de pièces ${esc(o.order_number)}</h2><p><b>${esc(o.customer_first_name)} ${esc(o.customer_last_name)}</b><br>Tél. ${esc(o.customer_phone)}<br>${esc(o.customer_email)}<br>${esc(o.shipping_address || "")}${o.vin ? `<br>VIN : ${esc(o.vin)}` : ""}</p><p>Mode : <b>${esc(SHIPPING_LABEL[o.shipping_mode])}</b></p>${o.customer_message ? `<p>Message : ${esc(o.customer_message)}</p>` : ""}${linesHtml(o)}<p><a href="${SITE}/pieces/admin">Ouvrir le suivi des commandes</a></p></div>`;
}

/** Génère la pro forma et l'envoie au client et/ou au fondateur. Ne lève jamais d'erreur. */
export async function sendProforma(o: PartsOrder, to: { customer?: boolean; owner?: boolean } = { customer: true, owner: true }) {
  const res = { customer: false, owner: false, error: null as string | null };
  if (!brevoReady()) { res.error = "Brevo n'est pas connecté : aucun e-mail envoyé."; return res; }
  try {
    const pdf = await proformaPdf(o);
    const att = [{ name: `Pro-forma-${o.order_number}.pdf`, content: pdf.toString("base64") }];
    if (to.customer) { await sendEmail(o.customer_email, `${o.customer_first_name} ${o.customer_last_name}`, `NeoDrive - Facture pro forma ${o.order_number}`, customerHtml(o), att); res.customer = true; }
    if (to.owner) { await sendEmail(OWNER_EMAIL, "NeoDrive", `Nouvelle commande de pièces ${o.order_number} - ${eur(o.total_ttc)} TTC`, ownerHtml(o), att); res.owner = true; }
  } catch (e) { res.error = (e as Error).message; console.error("[pieces] e-mail", res.error); }
  return res;
}

/** Texte WhatsApp pré-rempli pour le client. */
export function whatsappText(o: PartsOrder) {
  return `Bonjour ${o.customer_first_name}, ici NeoDrive au sujet de votre commande de pièces ${o.order_number} (${eur(o.total_ttc)} TTC). ${STATUS_TEXT[o.status]} Suivi : ${statusUrl(o.public_token)}`;
}
