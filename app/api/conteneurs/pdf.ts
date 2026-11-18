// @ts-ignore
import PDFDocument from "pdfkit";
import type { ContainerInfo, ExtraLine } from "../../../lib/shipments";

type Ship = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any; type Veh = { vin: string; container: string | null };
/** Un jeu de documents = une facture usine (ou une part de facture) : véhicules + lignes de pièces. */
export type DocSet = { invoice_no: string; invoice_date: string; invoice_part: string | null; veh: Veh[]; lines: ExtraLine[]; unit_price: number; container?: string };

const usd = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kg = (n: number) => `${Math.round(n).toLocaleString("en-US")} kg`;
const SELLER = ["SHANDONG BUS INTERNATIONAL TRADE CO., LTD.", "50 m west of NW corner of Aokoma Ave. & Yanhe Rd.", "Economic Development Zone, Yinan County", "Linyi, Shandong Province, China", "admin@haibaoev.com  •  +86 539 3226206"];
const BUYER = ["MK HOLDING SAS", "31 rue Jean Nougaro", "31600 Muret, France", "SIREN 908 645 393 – VAT FR93908645393", "Attn: Mansour KHELIFA – +33 6 89 78 17 10"];
const HS_VEH = "8703 80";
const COC = (s: Ship) => `L6e-BP – EU type-approval ${s.approval || "e13*168/2013*02123*01"}`;
const NAVY = "#0f2742", ACC = "#e2552b", GREY = "#5b6573", LINE = "#cfd6df", ZEB = "#f3f6f9", W = 595.28, M = 36;

/** Rendu A4 au format NeoDrive : bandeau, pied de page orange, numéros de page. */
function render(build: (doc: Doc) => void) {
  return new Promise<Buffer>((resolve, reject) => { const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true }); const c: Buffer[] = []; doc.on("data", (b: Buffer) => c.push(b)); doc.on("end", () => resolve(Buffer.concat(c))); doc.on("error", reject); build(doc); const r = doc.bufferedPageRange(); for (let i = 0; i < r.count; i++) { doc.switchToPage(r.start + i); doc.page.margins.bottom = 0; doc.moveTo(M, 812).lineTo(W - M, 812).lineWidth(2).stroke(ACC); doc.font("Helvetica").fontSize(7).fillColor(GREY).text(`MK HOLDING SAS – SIREN 908 645 393 – 31600 Muret, France – contact@easydrive-auto.fr – Page ${i + 1}/${r.count}`, M, 820, { width: W - 2 * M, align: "center", lineBreak: false }); } doc.end(); });
}

/** Conteneurs concernés par ce jeu de documents. */
function containersOf(s: Ship, d: DocSet): ContainerInfo[] {
  const all = (s.container_list || []) as ContainerInfo[];
  if (d.container) return all.filter(c => c.no === d.container).length ? all.filter(c => c.no === d.container) : [{ no: d.container }];
  const used = new Set([...d.veh.map(v => v.container), ...d.lines.map(l => l.container)].filter(Boolean) as string[]);
  const out = all.filter(c => used.has(c.no) || all.length === 1);
  return out.length ? out : all;
}

function box(doc: Doc, x: number, y: number, w: number, h: number, label: string, lines: string[]) {
  doc.roundedRect(x, y, w, h, 4).lineWidth(0.8).stroke(LINE);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(ACC).text(label.toUpperCase(), x + 8, y + 7, { lineBreak: false });
  let yy = y + 20; lines.forEach((l, i) => { doc.font(i ? "Helvetica" : "Helvetica-Bold").fontSize(8.6).fillColor(NAVY).text(l, x + 8, yy, { width: w - 16, lineBreak: false }); yy += 11.5; });
}

function kvBox(doc: Doc, rows: [string, string][]) {
  const y0 = doc.y; let y = y0 + 8;
  rows.forEach(([k, v]) => { doc.font("Helvetica").fontSize(7.8).fillColor(GREY).text(k, M + 8, y, { width: 110, lineBreak: false }); doc.font("Helvetica-Bold").fontSize(8.2).fillColor(NAVY).text(v, M + 120, y, { width: W - 2 * M - 128 }); y = Math.max(y + 15, doc.y + 4); });
  doc.roundedRect(M, y0, W - 2 * M, y - y0 + 2, 4).lineWidth(0.8).stroke(LINE);
  doc.y = y + 14;
}

function header(doc: Doc, title: string, s: Ship, d: DocSet) {
  doc.rect(0, 0, W, 92).fill(NAVY); doc.rect(0, 92, W, 4).fill(ACC);
  doc.fillColor("#fff").font("Helvetica-Bold").fontSize(15).text("MK HOLDING SAS", M, 30, { lineBreak: false });
  doc.font("Helvetica").fontSize(8.5);
  ["NeoDrive – Importer of electric light vehicles", "31 rue Jean Nougaro, 31600 Muret, France", "SIREN 908 645 393  •  VAT FR93908645393  •  +33 6 89 78 17 10"].forEach((l, i) => doc.text(l, M, 50 + i * 12, { lineBreak: false }));
  const conts = containersOf(s, d);
  doc.font("Helvetica-Bold").fontSize(16).text(title, M, 28, { width: W - 2 * M, align: "right" });
  doc.font("Helvetica").fontSize(8.5).text(`Invoice No. ${d.invoice_no} – ${d.invoice_date || "-"} – VIN detail`, M, 50, { width: W - 2 * M, align: "right" });
  doc.font("Helvetica-Bold").fontSize(9).text(conts.length === 1 ? `Container ${conts[0].no}` : `${conts.length} containers`, M, 64, { width: W - 2 * M, align: "right" });
  const bw = (W - 2 * M) / 2 - 6;
  box(doc, M, 112, bw, 82, "Seller / Exporter", SELLER); box(doc, W / 2 + 6, 112, bw, 82, "Buyer / Importer / Consignee", BUYER);
  doc.y = 206;
  const pl = String(s.port || "-");
  kvBox(doc, [
    ["Invoice", `${d.invoice_no} dated ${d.invoice_date || "-"}${d.invoice_part ? ` – ${d.invoice_part.split(" - ")[0]}` : ""} – payment T/T`],
    ["Incoterm / payment", `${s.incoterm || "EXW YINAN"}  /  T/T`],
    ["Bill of lading", String(s.bl_number || "-")],
    ["Container / seal", conts.map(c => `${c.no} (40' HQ)${c.seal ? `  /  seal ${c.seal}` : ""}`).join(" ; ") || String(s.containers || "-")],
    ["Ocean vessel", String(s.vessel || "-")],
    ["Route", `Qingdao, China  →  ${pl}, France${s.eta ? ` – ETA ${String(s.eta).slice(0, 10)}` : ""}`],
    ["Country of origin", "China"],
  ]);
}

type Col = { h: string; w: number; a?: string };
/** Tableau : en-tête bleu marine, lignes zébrées, ligne de total orangée. Une cellule « a|b » s'affiche sur deux lignes (b en gris). */
function table(doc: Doc, cols: Col[], rows: string[][], total?: string[]) {
  const tw = W - 2 * M; const ws = cols.map(c => c.w); const scale = tw / ws.reduce((a, b) => a + b, 0); const cw = ws.map(w => w * scale);
  const head = () => { const y = doc.y; doc.rect(M, y, tw, 18).fill(NAVY); let x = M; cols.forEach((c, i) => { doc.font("Helvetica-Bold").fontSize(8).fillColor("#fff").text(c.h, x + 5, y + 5, { width: cw[i] - 10, align: (c.a as Doc) || "left", lineBreak: false }); x += cw[i]; }); doc.y = y + 18; };
  head();
  rows.forEach((r, ri) => {
    const h = 24; if (doc.y + h > 790) { doc.addPage(); doc.y = M; head(); }
    const y = doc.y; if (ri % 2 === 0) doc.rect(M, y, tw, h).fill(ZEB);
    let x = M;
    r.forEach((t, i) => {
      const [a, b] = String(t).split("|");
      if (b !== undefined) { doc.font("Helvetica-Bold").fontSize(8).fillColor(NAVY).text(a, x + 5, y + 4, { width: cw[i] - 10, lineBreak: false }); doc.font("Helvetica").fontSize(6.8).fillColor(GREY).text(b, x + 5, y + 14, { width: cw[i] - 10, lineBreak: false }); }
      else doc.font(cols[i].h === "VIN" ? "Courier-Bold" : "Helvetica").fontSize(8.2).fillColor(NAVY).text(a, x + 5, y + 8, { width: cw[i] - 10, align: (cols[i].a as Doc) || "left", lineBreak: false });
      x += cw[i];
    });
    doc.y = y + h;
  });
  if (total) {
    const y = doc.y; doc.moveTo(M, y).lineTo(M + tw, y).lineWidth(1.2).stroke(NAVY); doc.rect(M, y, tw, 22).fill("#fff4ec");
    let x = M; total.forEach((t, i) => { if (t) doc.font("Helvetica-Bold").fontSize(8.8).fillColor(NAVY).text(t, x + 5, y + 7, { width: cw[i] - 10, align: (cols[i].a as Doc) || "left", lineBreak: false }); x += cw[i]; });
    doc.y = y + 22;
  }
  doc.y += 14;
}

function section(doc: Doc, t: string) { if (doc.y > 720) { doc.addPage(); doc.y = M; } doc.font("Helvetica-Bold").fontSize(9.5).fillColor(NAVY).text(t.toUpperCase(), M, doc.y); doc.y += 4; }

/** Poids du conteneur : B/L en référence, mention si le colisage usine diffère. */
function weightRows(c: ContainerInfo): [string, string][] {
  const x = c as ContainerInfo & { pl_gross?: number; pl_net?: number; pl_cbm?: number };
  const rows: [string, string][] = [["Gross weight", c.gross ? `${kg(c.gross)}${x.pl_gross && x.pl_gross !== c.gross ? " (as per B/L)" : ""}` : "-"], ["Net weight", c.net ? kg(c.net) : x.pl_net ? `${kg(x.pl_net)} (as per supplier packing list)` : "-"], ["Volume", c.cbm ? `${c.cbm} CBM` : "-"]];
  return rows;
}
function weightNote(c: ContainerInfo) {
  const x = c as ContainerInfo & { pl_gross?: number; pl_cbm?: number };
  return (x.pl_gross && c.gross && x.pl_gross !== c.gross) || (x.pl_cbm && c.cbm && x.pl_cbm !== c.cbm) ? `Note: the supplier packing list states ${x.pl_gross ? kg(x.pl_gross) : "-"} gross${x.pl_cbm ? ` and ${x.pl_cbm} CBM` : ""}; the B/L and the carrier arrival notice state ${c.gross ? kg(c.gross) : "-"}${c.cbm ? ` and ${c.cbm} CBM` : ""}.` : "";
}

/** Mentions de bas de document et zone de signature. */
function footer(doc: Doc, d: DocSet, kind: "invoice" | "packing", notes: string[] = []) {
  if (doc.y > 690) { doc.addPage(); doc.y = M; }
  const txt = [
    `${kind === "invoice" ? "Invoice" : "Packing list"} ${d.invoice_no}${d.invoice_date ? ` dated ${d.invoice_date}` : ""} of Shandong Bus International Trade Co., Ltd., re-issued by MK HOLDING SAS with the seller's authorization in order to state the VIN of each vehicle.${kind === "invoice" ? " Quantities, unit prices and amounts are unchanged." : ""}`,
    ...(d.invoice_part ? [`Invoice split by container: ${d.invoice_part}`] : []),
    ...notes.filter(Boolean),
    ...(kind === "invoice" ? ["VIN numbers are taken from the EU certificates of conformity (COC). HS code given for information, subject to validation by the customs broker."] : []),
  ];
  doc.font("Helvetica").fontSize(7.6).fillColor(GREY); txt.forEach(t => { doc.text(t, M, doc.y, { width: W - 2 * M }); doc.y += 2; });
  const y = doc.y + 16;
  doc.font("Helvetica-Bold").fontSize(8.6).fillColor(NAVY).text("For MK HOLDING SAS", M, y, { lineBreak: false });
  doc.font("Helvetica").text(`Mansour KHELIFA – Muret, ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, M, y + 12, { lineBreak: false });
  doc.moveTo(W - M - 180, y + 14).lineTo(W - M, y + 14).lineWidth(0.8).stroke(LINE);
  doc.font("Helvetica").fontSize(7.5).fillColor(GREY).text("Signature / stamp", W - M - 180, y + 18, { width: 180, align: "right", lineBreak: false });
}

const words = (n: number) => { const u = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"], t = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  const h = (x: number): string => x < 20 ? u[x] : x < 100 ? `${t[Math.floor(x / 10)]}${x % 10 ? "-" + u[x % 10] : ""}` : `${u[Math.floor(x / 100)]} HUNDRED${x % 100 ? " AND " + h(x % 100) : ""}`;
  const i = Math.floor(n), c = Math.round((n - i) * 100); const th = Math.floor(i / 1000), r = i % 1000;
  return `US DOLLARS ${th ? h(th) + " THOUSAND" + (r ? (r < 100 ? " AND " : " ") : "") : ""}${r ? h(r) : ""}${c ? ` AND CENTS ${h(c)}` : ""} ONLY`.replace(/\s+/g, " "); };

// Le nom chinois reste dans les données (Helvetica ne sait pas l'afficher, et la douane française n'en a pas besoin).

export function invoicePdf(s: Ship, d: DocSet) {
  const conts = containersOf(s, d);
  return render(doc => {
    header(doc, "COMMERCIAL INVOICE", s, d);
    let n = 0, qty = 0, amt = 0;
    const rows: string[][] = [];
    for (const c of conts) {
      const v = d.veh.filter(x => x.container === c.no || conts.length === 1), l = d.lines.filter(x => x.container === c.no || conts.length === 1);
      v.forEach(x => { rows.push([String(++n), `${s.model_short || "Electric vehicle HAIBAO HB15W01A"}|${COC(s)}`, x.vin, HS_VEH, "1", usd(d.unit_price), usd(d.unit_price)]); qty++; amt += d.unit_price; });
      l.forEach(x => { rows.push([String(++n), `${x.desc}|Spare parts${conts.length > 1 ? ` – container ${c.no}` : ""}`, "-", x.hs || "-", String(x.qty), usd(x.price), usd(x.qty * x.price)]); qty += x.qty; amt += x.qty * x.price; });
    }
    table(doc, [{ h: "#", w: 18 }, { h: "Description", w: 178 }, { h: "VIN", w: 118 }, { h: "HS code", w: 48 }, { h: "Qty", w: 26, a: "right" }, { h: "Unit price USD", w: 66, a: "right" }, { h: "Amount USD", w: 69, a: "right" }], rows,
      ["", `TOTAL${conts.length === 1 && d.invoice_part ? " THIS CONTAINER" : ""} – ${qty} units – ${s.incoterm || "EXW YINAN"}`, "", "", String(qty), "", `USD ${usd(amt)}`]);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(NAVY).text(`Say: ${words(amt)}`, M, doc.y); doc.y += 14;
    footer(doc, d, "invoice");
  });
}

export function packingPdf(s: Ship, d: DocSet) {
  const conts = containersOf(s, d);
  return render(doc => {
    header(doc, "PACKING LIST", s, d);
    let n = 0; const rows: string[][] = []; let pk = 0;
    for (const c of conts) {
      const v = d.veh.filter(x => x.container === c.no || conts.length === 1), l = d.lines.filter(x => x.container === c.no || conts.length === 1);
      v.forEach(x => { rows.push([String(++n), `${s.model_short || "Electric vehicle HAIBAO HB15W01A"}|L6e-BP – unpacked, secured in container`, x.vin, "1 unit", conts.length > 1 ? c.no : "N/M"]); pk++; });
      l.forEach(x => { rows.push([String(++n), `${x.desc}|Spare parts`, "-", `${x.qty} pkg`, conts.length > 1 ? c.no : "N/M"]); pk += x.qty; });
    }
    table(doc, [{ h: "#", w: 18 }, { h: "Description", w: 200 }, { h: "VIN", w: 130 }, { h: "Package", w: 70 }, { h: conts.length > 1 ? "Container" : "Marks", w: 105 }], rows, ["", `TOTAL – ${d.veh.length} vehicles${d.lines.length ? " + spare parts" : ""}`, "", `${pk} packages`, ""]);
    for (const c of conts) { if (conts.length > 1) section(doc, `Container ${c.no}${c.seal ? `  –  seal ${c.seal}` : ""}`); kvBox(doc, [...weightRows(c), ["Packages", `${d.veh.filter(x => x.container === c.no || conts.length === 1).length} units – 1 container 40' HQ`]]); }
    footer(doc, d, "packing", conts.map(weightNote));
  });
}

/** Liste détaillée des pièces détachées (bilingue), une par facture. */
export function partsPdf(s: Ship, d: DocSet) {
  return render(doc => {
    header(doc, "SPARE PARTS LIST", s, d);
    const rows = d.lines.map((x, i) => [String(i + 1), x.desc, x.hs || "-", x.container || "-", String(x.qty), usd(x.price), usd(x.qty * x.price), x.net ? String(Number(x.net) * x.qty) : "-", x.gross ? String(Number(x.gross) * x.qty) : "-"]);
    const q = d.lines.reduce((t, x) => t + x.qty, 0);
    table(doc, [{ h: "#", w: 18 }, { h: "Description", w: 160 }, { h: "HS code", w: 60 }, { h: "Container", w: 75 }, { h: "Qty", w: 28, a: "right" }, { h: "Unit USD", w: 50, a: "right" }, { h: "Amount USD", w: 60, a: "right" }, { h: "Net kg", w: 36, a: "right" }, { h: "Gross kg", w: 36, a: "right" }], rows,
      ["", "TOTAL", "", "", String(q), "", usd(d.lines.reduce((t, x) => t + x.qty * x.price, 0)), String(d.lines.reduce((t, x) => t + Number(x.net || 0) * x.qty, 0)), String(d.lines.reduce((t, x) => t + Number(x.gross || 0) * x.qty, 0))]);
    footer(doc, d, "packing");
  });
}

/** Un jeu de documents par conteneur : la facture usine est découpée conteneur par conteneur (part i/n). */
export function splitByContainer(s: Ship, d: DocSet): DocSet[] {
  const conts = containersOf(s, d);
  if (conts.length <= 1) return [{ ...d, container: conts[0]?.no }];
  return conts.map((c, i) => {
    const veh = d.veh.filter(v => v.container === c.no), lines = d.lines.filter(l => l.container === c.no);
    const amt = veh.length * d.unit_price + lines.reduce((t, l) => t + l.qty * l.price, 0);
    const part = `part ${i + 1}/${conts.length} – container ${c.no}: ${veh.length} vehicles${lines.length ? ` + ${lines.reduce((t, l) => t + l.qty, 0)} spare parts` : ""} = USD ${usd(amt)}`;
    return { ...d, veh, lines, container: c.no, invoice_part: d.invoice_part ? `${d.invoice_part} ; ${part}` : part };
  }).filter(x => x.veh.length || x.lines.length);
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
