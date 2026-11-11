// @ts-ignore
import PDFDocument from "pdfkit";
import type { ContainerInfo, ExtraLine } from "../../../lib/shipments";

type Ship = Record<string, any>; type Veh = { vin: string; container: string | null };
const usd = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SELLER = ["SHANDONG BUS INTERNATIONAL TRADE CO., LTD.", "50 m west of the NW corner of Aokoma Avenue & Yanhe Road,", "Economic Development Zone, Yinan County, Linyi, Shandong, China"];
const BUYER = ["MK HOLDING (NeoDrive)", "31 Rue Jean Nougaro, 31600 Muret, France", "SIREN 908 645 393"];

function render(build: (doc: any) => void) {
  return new Promise<Buffer>((resolve, reject) => { const doc = new PDFDocument({ size: "A4", margin: 40 }); const c: Buffer[] = []; doc.on("data", (b: Buffer) => c.push(b)); doc.on("end", () => resolve(Buffer.concat(c))); doc.on("error", reject); build(doc); doc.end(); });
}

function header(doc: any, title: string, s: Ship) {
  doc.font("Helvetica-Bold").fontSize(17).fillColor("#111").text(title, 40, 40);
  doc.font("Helvetica").fontSize(9).fillColor("#555").text(`VIN detail of supplier invoice ${s.invoice_no || "-"} dated ${s.invoice_date || "-"} (original attached)`);
  const y = doc.y + 10;
  doc.fillColor("#111").font("Helvetica-Bold").fontSize(9).text("SELLER / EXPORTER", 40, y).font("Helvetica").text(SELLER.join("\n"), 40, y + 12, { width: 255 });
  doc.font("Helvetica-Bold").text("BUYER / IMPORTER", 310, y).font("Helvetica").text(BUYER.join("\n"), 310, y + 12, { width: 245 });
  const info: [string, string][] = [["Invoice ref.", String(s.invoice_no || "-")], ["Invoice date", String(s.invoice_date || "-")], ["Incoterm / payment", `${s.incoterm || "EXW YINAN"} / T/T`], ["B/L", String(s.bl_number || "-")], ["Vessel / voyage", String(s.vessel || "-")], ["Route", `Qingdao, China - ${s.port || "-"}, France`], ["Container(s)", ((s.container_list || []) as ContainerInfo[]).map(c => c.no).join(", ") || String(s.containers || "-")]];
  let iy = y + 58; doc.font("Helvetica").fontSize(8.5);
  for (let i = 0; i < info.length; i += 2) {
    const pair = info.slice(i, i + 2); let h = 0;
    pair.forEach(([k, v], j) => { const x = j ? 310 : 40; doc.fillColor("#666").text(k, x, iy, { width: 85 }); doc.fillColor("#111").text(v, x + 88, iy, { width: 160 }); h = Math.max(h, doc.heightOfString(v, { width: 160 })); });
    iy += h + 3;
  }
  doc.y = iy + 12;
}

function table(doc: any, cols: { h: string; w: number; a?: string }[], rows: string[][], bold: number[] = []) {
  const x0 = 40; const draw = (r: string[], b: boolean, bg?: string) => {
    const h = Math.max(16, ...r.map((t, i) => doc.font(b ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).heightOfString(t, { width: cols[i].w - 8 }) + 7));
    if (doc.y + h > 790) { doc.addPage(); }
    const y = doc.y; let x = x0;
    if (bg) doc.rect(x0, y, cols.reduce((s, c) => s + c.w, 0), h).fill(bg);
    r.forEach((t, i) => { doc.rect(x, y, cols[i].w, h).lineWidth(0.5).stroke("#999"); doc.fillColor("#111").font(b ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).text(t, x + 4, y + 4, { width: cols[i].w - 8, align: (cols[i].a as any) || "left" }); x += cols[i].w; });
    doc.y = y + h;
  };
  draw(cols.map(c => c.h), true, "#e8eef7");
  rows.forEach((r, i) => draw(r, bold.includes(i)));
  doc.moveDown(0.8);
}

function footer(doc: any, s: Ship, warn: string) {
  if (doc.y > 700) doc.addPage();
  doc.x = 40; doc.font("Helvetica").fontSize(8).fillColor("#555").text(`Prepared by MK HOLDING (importer) from supplier invoice ${s.invoice_no || "-"}, the supplier packing list and the EU certificates of conformity (COC). Quantities, unit prices and amounts are identical to the supplier's original invoice, which remains the reference document.${warn}`, 40, doc.y, { width: 515 });
  doc.moveDown(1.5).fillColor("#111").fontSize(9).text("MK HOLDING - Mansour Khelifa, President", 40);
}

const COC = (s: Ship) => `COC - EU type-approval ${s.approval || "e13*168/2013*02123*01"}`;

export function invoicePdf(s: Ship, veh: Veh[]) {
  const price = Number(s.unit_price || 0); const extra = (s.extra_lines || []) as ExtraLine[];
  const rows = veh.map((v, i) => [String(i + 1), `${s.model || "Electric vehicle"}\n${COC(s)}`, v.vin, "1", usd(price), usd(price)]);
  extra.forEach((e, i) => rows.push([String(veh.length + i + 1), e.desc, "-", String(e.qty), usd(e.price), usd(e.qty * e.price)]));
  const qty = veh.length + extra.reduce((t, e) => t + e.qty, 0); const total = veh.length * price + extra.reduce((t, e) => t + e.qty * e.price, 0);
  rows.push(["", "TOTAL", "", String(qty), "", `USD ${usd(total)}`]);
  return render(doc => { header(doc, "COMMERCIAL INVOICE - VIN DETAIL", s); table(doc, [{ h: "#", w: 24 }, { h: "Description", w: 190 }, { h: "VIN", w: 115 }, { h: "Qty", w: 34, a: "right" }, { h: "Unit price USD", w: 72, a: "right" }, { h: "Amount USD", w: 80, a: "right" }], rows, [rows.length - 1]); footer(doc, s, ""); });
}

export function packingPdf(s: Ship, veh: Veh[]) {
  const conts = ((s.container_list || []) as ContainerInfo[]); const extra = (s.extra_lines || []) as ExtraLine[];
  const groups = [...conts.map(c => ({ c, v: veh.filter(x => x.container === c.no || conts.length === 1), e: extra.filter(e => e.container === c.no || conts.length === 1) })), ...(conts.length > 1 ? [{ c: { no: "CONTAINER TO BE CONFIRMED" } as ContainerInfo, v: veh.filter(x => !conts.some(c => c.no === x.container)), e: extra.filter(e => !conts.some(c => c.no === e.container)) }] : [])].filter(g => g.v.length || g.e.length || g.c.seal);
  let n = 0;
  return render(doc => {
    header(doc, "PACKING LIST - VIN DETAIL", s);
    for (const g of groups) {
      doc.x = 40; doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#111").text(`Container ${g.c.no}${g.c.seal ? `  -  seal ${g.c.seal}` : ""}`, 40, doc.y);
      if (g.c.net || g.c.gross || g.c.cbm) doc.font("Helvetica").fontSize(8.5).text(`Net ${g.c.net ?? "-"} kg  -  Gross ${g.c.gross ?? "-"} kg  -  ${g.c.cbm ?? "-"} CBM`);
      doc.moveDown(0.3);
      const rows = g.v.map(v => [String(++n), `${s.model || "Electric vehicle"}`, v.vin, COC(s), "1"]);
      g.e.forEach(e => rows.push([String(++n), e.desc, "-", "-", String(e.qty)]));
      rows.push(["", "Total container", "", "", String(g.v.length + g.e.reduce((t, e) => t + e.qty, 0))]);
      table(doc, [{ h: "#", w: 24 }, { h: "Description", w: 150 }, { h: "VIN", w: 115 }, { h: "Certificate of conformity", w: 180 }, { h: "Qty", w: 46, a: "right" }], rows, [rows.length - 1]);
    }
    const net = conts.reduce((t, c) => t + Number(c.net || 0), 0), gross = conts.reduce((t, c) => t + Number(c.gross || 0), 0), cbm = conts.reduce((t, c) => t + Number(c.cbm || 0), 0);
    doc.x = 40; doc.font("Helvetica-Bold").fontSize(10).text(`TOTAL: ${veh.length} vehicles${extra.length ? ` + ${extra.reduce((t, e) => t + e.qty, 0)} accessories` : ""}  -  Net ${net} kg  -  Gross ${gross} kg  -  ${Math.round(cbm * 100) / 100} CBM`, 40); doc.moveDown();
    footer(doc, s, "");
  });
}
