// @ts-ignore
import PDFDocument from "pdfkit";
import type { ContainerInfo, ExtraLine } from "../../../lib/shipments";

type Ship = Record<string, any>; type Veh = { vin: string; container: string | null };
/** Un jeu de documents = une facture usine (ou une part de facture) : véhicules + lignes de pièces. */
export type DocSet = { invoice_no: string; invoice_date: string; invoice_part: string | null; veh: Veh[]; lines: ExtraLine[]; unit_price: number };

const usd = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kg = (n: number) => `${Math.round(n).toLocaleString("en-US")} kg`;
const SELLER = ["SHANDONG BUS INTERNATIONAL TRADE CO., LTD.", "50 m west of the NW corner of Aokoma Avenue & Yanhe Road,", "Economic Development Zone, Yinan County, Linyi, Shandong, China"];
const BUYER = ["MK HOLDING (NeoDrive)", "31 Rue Jean Nougaro, 31600 Muret, France", "SIREN 908 645 393"];
const HS_VEH = "8703 80";
const COC = (s: Ship) => `COC - EU type-approval ${s.approval || "e13*168/2013*02123*01"}`;

function render(build: (doc: any) => void) {
  return new Promise<Buffer>((resolve, reject) => { const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true }); const c: Buffer[] = []; doc.on("data", (b: Buffer) => c.push(b)); doc.on("end", () => resolve(Buffer.concat(c))); doc.on("error", reject); build(doc); const r = doc.bufferedPageRange(); for (let i = 0; i < r.count; i++) { doc.switchToPage(r.start + i); doc.page.margins.bottom = 0; doc.font("Helvetica").fontSize(7.5).fillColor("#000").text(`MK HOLDING - SIREN 908 645 393 - Page ${i + 1} / ${r.count}`, 40, 812, { width: 515, align: "center", lineBreak: false }); } doc.end(); });
}

/** Conteneurs concernés par ce jeu de documents. */
function containersOf(s: Ship, d: DocSet): ContainerInfo[] {
  const all = (s.container_list || []) as ContainerInfo[];
  const used = new Set([...d.veh.map(v => v.container), ...d.lines.map(l => l.container)].filter(Boolean) as string[]);
  const out = all.filter(c => used.has(c.no) || all.length === 1);
  return out.length ? out : all;
}

function header(doc: any, title: string, s: Ship, d: DocSet) {
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#000").text(title, 40, 40, { width: 515, align: "center" });
  doc.moveTo(40, doc.y + 4).lineTo(555, doc.y + 4).lineWidth(1).stroke("#000"); doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000").text(`Invoice No.: ${d.invoice_no}          Date: ${d.invoice_date || "-"}`, 40, doc.y, { width: 515, align: "center" });
  doc.font("Helvetica").fontSize(8.5).fillColor("#000").text(d.invoice_part ? `Container split of supplier invoice ${d.invoice_no}: ${d.invoice_part}` : `Detail of supplier invoice ${d.invoice_no} (original attached)`, { width: 515 });
  const y = doc.y + 10;
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(9).text("SELLER / EXPORTER", 40, y).font("Helvetica").text(SELLER.join("\n"), 40, y + 12, { width: 255 });
  doc.font("Helvetica-Bold").text("BUYER / IMPORTER", 310, y).font("Helvetica").text(BUYER.join("\n"), 310, y + 12, { width: 245 });
  const conts = containersOf(s, d);
  const info: [string, string][] = [["Incoterm / payment", `${s.incoterm || "EXW YINAN"} / T/T`], ["Bill of lading", String(s.bl_number || "-")], ["Vessel / voyage", String(s.vessel || "-")], ["Route", `Qingdao, China - ${s.port || "-"}, France`], ["Container(s)", conts.map(c => `${c.no}${c.seal ? ` (seal ${c.seal})` : ""}`).join(", ") || String(s.containers || "-")], ["Country of origin", "China"]];
  let iy = y + 58; doc.font("Helvetica").fontSize(8.5);
  for (let i = 0; i < info.length; i += 2) {
    const pair = info.slice(i, i + 2); let h = 0;
    pair.forEach(([k, v], j) => { const x = j ? 310 : 40; doc.fillColor("#000").font("Helvetica-Bold").text(k, x, iy, { width: 85 }); doc.font("Helvetica").text(v, x + 88, iy, { width: 160 }); h = Math.max(h, doc.heightOfString(v, { width: 160 })); });
    iy += h + 3;
  }
  doc.y = iy + 12;
}

function table(doc: any, cols: { h: string; w: number; a?: string }[], rows: string[][], bold: number[] = [], fills: Record<number, string> = {}) {
  const x0 = 40; const draw = (r: string[], b: boolean, bg?: string) => {
    const h = Math.max(16, ...r.map((t, i) => doc.font(b ? "Helvetica-Bold" : "Helvetica").fontSize(8).heightOfString(t, { width: cols[i].w - 8 }) + 7));
    if (doc.y + h > 790) { doc.addPage(); }
    const y = doc.y; let x = x0;
    void bg;
    r.forEach((t, i) => { doc.rect(x, y, cols[i].w, h).lineWidth(0.5).stroke("#000"); doc.fillColor("#000").font(b ? "Helvetica-Bold" : "Helvetica").fontSize(8).text(t, x + 4, y + 4, { width: cols[i].w - 8, align: (cols[i].a as any) || "left" }); x += cols[i].w; });
    doc.y = y + h;
  };
  draw(cols.map(c => c.h), true);
  rows.forEach((r, i) => draw(r, bold.includes(i), fills[i]));
  doc.moveDown(0.8);
}

function section(doc: any, t: string) { if (doc.y > 720) doc.addPage(); doc.x = 40; doc.font("Helvetica-Bold").fontSize(10).fillColor("#000").text(t.toUpperCase(), 40, doc.y); doc.moveDown(0.3); }

/** Résumé : véhicules / pièces détachées / total, avec poids et code SH. */
function summary(doc: any, s: Ship, d: DocSet) {
  const conts = containersOf(s, d);
  const vehAmt = d.veh.length * d.unit_price;
  const partsQty = d.lines.reduce((t, l) => t + l.qty, 0), partsAmt = d.lines.reduce((t, l) => t + l.qty * l.price, 0);
  const partsNet = d.lines.reduce((t, l) => t + Number(l.net || 0) * l.qty, 0), partsGross = d.lines.reduce((t, l) => t + Number(l.gross || 0) * l.qty, 0);
  const hsParts = [...new Set(d.lines.map(l => l.hs).filter(Boolean))].join(", ") || "-";
  const contGross = conts.reduce((t, c) => t + Number(c.gross || 0), 0);
  const vehGross = d.veh.length ? Math.max(0, contGross - (conts.some(c => d.lines.some(l => l.container === c.no)) ? partsGross : 0)) : 0;
  const rows: string[][] = [];
  if (d.veh.length) rows.push(["Electric vehicles (L6e)", HS_VEH, String(d.veh.length), d.veh.length && vehGross ? kg(vehGross) : "-", usd(vehAmt)]);
  if (d.lines.length) rows.push([`Spare parts (${d.lines.length} references)`, hsParts, String(partsQty), partsGross ? `${kg(partsGross)} (net ${kg(partsNet)})` : "-", usd(partsAmt)]);
  rows.push(["TOTAL", "", String(d.veh.length + partsQty), d.veh.length ? (contGross ? kg(contGross) : "-") : (partsGross ? kg(partsGross) : "-"), `USD ${usd(vehAmt + partsAmt)}`]);
  section(doc, "SUMMARY");
  table(doc, [{ h: "Goods", w: 170 }, { h: "HS code", w: 80 }, { h: "Qty", w: 45, a: "right" }, { h: "Gross weight", w: 110, a: "right" }, { h: "Amount USD", w: 110, a: "right" }], rows, [rows.length - 1]);
}

function footer(doc: any, d: DocSet) {
  if (doc.y > 700) doc.addPage();
  doc.x = 40; doc.font("Helvetica").fontSize(7.5).fillColor("#000").text(`Prepared by MK HOLDING (importer) from supplier invoice ${d.invoice_no}, the supplier packing list, the supplier spare-parts list and the EU certificates of conformity (COC). ${d.invoice_part ? "The supplier invoice covers goods shipped in several containers: this document lists only the goods of this container. Unit prices are identical to the supplier's original invoice, which remains the reference document; all parts together equal the original invoice total." : "Quantities, unit prices and amounts are identical to the supplier's original invoice, which remains the reference document."} HS codes of spare parts as declared by the supplier, subject to validation by the customs broker.`, 40, doc.y, { width: 515 });
  doc.moveDown(1.2).font("Helvetica").fontSize(9).fillColor("#000").text(`MK HOLDING (importer) - Muret, France - ${new Date().toLocaleDateString("en-GB")}`, 40);
}

// Le nom chinois reste dans les données (Helvetica ne sait pas l'afficher, et la douane française n'en a pas besoin).
const partDesc = (l: ExtraLine) => l.desc;

export function invoicePdf(s: Ship, d: DocSet) {
  const conts = containersOf(s, d);
  return render(doc => {
    header(doc, "COMMERCIAL INVOICE", s, d);
    let n = 0;
    for (const c of conts) {
      const v = d.veh.filter(x => x.container === c.no || conts.length === 1), l = d.lines.filter(x => x.container === c.no || conts.length === 1);
      if (!v.length && !l.length) continue;
      section(doc, `Container ${c.no}${c.seal ? `  -  seal ${c.seal}` : ""}`);
      const rows: string[][] = [];
      if (v.length) { rows.push(["", `ELECTRIC VEHICLES - ${s.model || "Electric vehicle"}`, "", "", "", ""]); v.forEach(x => rows.push([String(++n), `${COC(s)}\nVIN ${x.vin}`, HS_VEH, "1", usd(d.unit_price), usd(d.unit_price)])); }
      if (l.length) { rows.push(["", "SPARE PARTS", "", "", "", ""]); l.forEach(x => rows.push([String(++n), partDesc(x), x.hs || "-", String(x.qty), usd(x.price), usd(x.qty * x.price)])); }
      const q = v.length + l.reduce((t, x) => t + x.qty, 0), a = v.length * d.unit_price + l.reduce((t, x) => t + x.qty * x.price, 0);
      rows.push(["", `Subtotal container ${c.no}`, "", String(q), "", usd(a)]);
      const heads = rows.map((r, i) => (!r[0] && i < rows.length - 1 ? i : -1)).filter(i => i >= 0);
      table(doc, [{ h: "#", w: 24 }, { h: "Description", w: 215 }, { h: "HS code", w: 66 }, { h: "Qty", w: 34, a: "right" }, { h: "Unit price USD", w: 76, a: "right" }, { h: "Amount USD", w: 100, a: "right" }], rows, [...heads, rows.length - 1]);
    }
    summary(doc, s, d); footer(doc, d);
  });
}

export function packingPdf(s: Ship, d: DocSet) {
  const conts = containersOf(s, d);
  return render(doc => {
    header(doc, "PACKING LIST", s, d);
    let n = 0;
    for (const c of conts) {
      const v = d.veh.filter(x => x.container === c.no || conts.length === 1), l = d.lines.filter(x => x.container === c.no || conts.length === 1);
      if (!v.length && !l.length) continue;
      section(doc, `Container ${c.no}${c.seal ? `  -  seal ${c.seal}` : ""}`);
      if (c.net || c.gross || c.cbm) doc.font("Helvetica").fontSize(8.5).text(`Whole container: net ${c.net ?? "-"} kg  -  gross ${c.gross ?? "-"} kg  -  ${c.cbm ?? "-"} CBM  -  ${v.length + l.reduce((t, x) => t + x.qty, 0)} packages`);
      doc.moveDown(0.3);
      const rows: string[][] = [];
      v.forEach(x => rows.push([String(++n), `${s.model || "Electric vehicle"}\n${COC(s)}`, x.vin, "1 unit", "-", "-"]));
      l.forEach(x => rows.push([String(++n), partDesc(x), "-", `${x.qty} pkg`, x.net ? kg(Number(x.net) * x.qty) : "-", x.gross ? kg(Number(x.gross) * x.qty) : "-"]));
      const pn = l.reduce((t, x) => t + Number(x.net || 0) * x.qty, 0), pg = l.reduce((t, x) => t + Number(x.gross || 0) * x.qty, 0);
      rows.push(["", `Total container ${c.no}`, "", `${v.length + l.reduce((t, x) => t + x.qty, 0)} pkg`, v.length ? (c.net ? kg(c.net) : "-") : kg(pn), v.length ? (c.gross ? kg(c.gross) : "-") : kg(pg)]);
      table(doc, [{ h: "#", w: 24 }, { h: "Description", w: 210 }, { h: "VIN", w: 112 }, { h: "Packages", w: 55, a: "right" }, { h: "Net", w: 57, a: "right" }, { h: "Gross", w: 57, a: "right" }], rows, [rows.length - 1]);
    }
    summary(doc, s, d); footer(doc, d);
  });
}

/** Liste détaillée des pièces détachées (bilingue), une par facture. */
export function partsPdf(s: Ship, d: DocSet) {
  return render(doc => {
    header(doc, "SPARE PARTS LIST", s, d);
    const rows = d.lines.map((x, i) => [String(i + 1), x.desc, x.hs || "-", x.container || "-", String(x.qty), usd(x.price), usd(x.qty * x.price), x.net ? String(Number(x.net) * x.qty) : "-", x.gross ? String(Number(x.gross) * x.qty) : "-"]);
    const q = d.lines.reduce((t, x) => t + x.qty, 0);
    rows.push(["", "TOTAL", "", "", String(q), "", usd(d.lines.reduce((t, x) => t + x.qty * x.price, 0)), String(d.lines.reduce((t, x) => t + Number(x.net || 0) * x.qty, 0)), String(d.lines.reduce((t, x) => t + Number(x.gross || 0) * x.qty, 0))]);
    table(doc, [{ h: "#", w: 22 }, { h: "Description", w: 160 }, { h: "HS code", w: 70 }, { h: "Container", w: 70 }, { h: "Qty", w: 28, a: "right" }, { h: "Unit USD", w: 45, a: "right" }, { h: "Amount USD", w: 55, a: "right" }, { h: "Net kg", w: 33, a: "right" }, { h: "Gross kg", w: 32, a: "right" }], rows, [rows.length - 1]);
    footer(doc, d);
  });
}

/** Découpe un dossier en jeux de documents : véhicules (facture du dossier) + lignes rattachées à d'autres factures. */
export function docSets(s: Ship, veh: Veh[]): DocSet[] {
  const lines = (s.extra_lines || []) as ExtraLine[];
  const own = lines.filter(l => !l.invoice || l.invoice === s.invoice_no);
  const sets: DocSet[] = [];
  if (s.invoice_no && (veh.length || own.length)) sets.push({ invoice_no: s.invoice_no, invoice_date: s.invoice_date || "", invoice_part: s.invoice_part || null, veh, lines: own, unit_price: Number(s.unit_price || 0) });
  const others = [...new Set(lines.filter(l => l.invoice && l.invoice !== s.invoice_no).map(l => l.invoice!))];
  for (const inv of others) {
    const ls = lines.filter(l => l.invoice === inv);
    sets.push({ invoice_no: inv, invoice_date: ls[0].invoice_date || "", invoice_part: ls[0].invoice_part || null, veh: [], lines: ls, unit_price: 0 });
  }
  return sets;
}
