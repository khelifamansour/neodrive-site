/** Relevé d'heures mensuel d'un salarié (CDD) : heures normales et supplémentaires par semaine, PDF pour la paie. */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PDFDocument from "pdfkit";
import { safeText } from "./pdf-text";
import { COMPANY } from "./driver-docs";

export type HourRow = { date: string; kind: string; start_time: string; end_time: string; pause_min: number; worked_min: number; note: string | null };
export type WeekLine = { week: string; from: string; to: string; total_min: number; normal_min: number; ot25_min: number; ot50_min: number };
export type MonthReport = { month: string; rows: HourRow[]; weeks: WeekLine[]; total_min: number; normal_min: number; ot25_min: number; ot50_min: number; weekly_hours: number };

/** Lundi (AAAA-MM-JJ) de la semaine d'une date. */
const mondayOf = (d: string) => { const x = new Date(d + "T12:00:00Z"); const wd = (x.getUTCDay() + 6) % 7; x.setUTCDate(x.getUTCDate() - wd); return x.toISOString().slice(0, 10); };

/** Découpe par semaine (lundi → dimanche) : au-delà de la durée hebdomadaire, +25 % pour les 8 premières heures, +50 % ensuite. */
export function monthReport(month: string, rows: HourRow[], weeklyHours = 35): MonthReport {
  const inMonth = rows.filter(r => String(r.date).slice(0, 7) === month).sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.start_time).localeCompare(String(b.start_time)));
  const by = new Map<string, HourRow[]>();
  for (const r of inMonth) { const k = mondayOf(String(r.date)); by.set(k, [...(by.get(k) || []), r]); }
  const base = weeklyHours * 60;
  const weeks: WeekLine[] = [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([wk, rs]) => {
    const total = rs.reduce((a, r) => a + (r.worked_min || 0), 0);
    const over = Math.max(0, total - base);
    const ot25 = Math.min(over, 8 * 60), ot50 = Math.max(0, over - 8 * 60);
    return { week: wk, from: String(rs[0].date), to: String(rs[rs.length - 1].date), total_min: total, normal_min: total - over, ot25_min: ot25, ot50_min: ot50 };
  });
  const sum = (f: (w: WeekLine) => number) => weeks.reduce((a, w) => a + f(w), 0);
  return { month, rows: inMonth, weeks, total_min: sum(w => w.total_min), normal_min: sum(w => w.normal_min), ot25_min: sum(w => w.ot25_min), ot50_min: sum(w => w.ot50_min), weekly_hours: weeklyHours };
}

export const hmTxt = (min: number) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")}`;
const dTxt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
export const monthLabel = (m: string) => new Date(m + "-15T12:00:00Z").toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

export function monthReportPdf(r: MonthReport, employee: string, issued = new Date().toISOString()): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = safeText(new PDFDocument({ size: "A4", margin: 40, info: { Title: `Relevé d'heures ${r.month} – ${employee}`, Author: COMPANY.name } }));
    const chunks: Buffer[] = [];
    doc.on("data", (b: Buffer) => chunks.push(b)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    const ink = "#111", grey = "#666", accent = "#ff5a1f";
    doc.font("Helvetica-Bold").fontSize(14).fillColor(ink).text(COMPANY.name, 40, 40, { width: 300 });
    doc.font("Helvetica").fontSize(9).fillColor(grey).text(`SIREN ${COMPANY.siren}\n${COMPANY.address}`, 40, 58, { width: 300 });
    doc.font("Helvetica-Bold").fontSize(17).fillColor(accent).text("RELEVÉ D'HEURES", 300, 40, { width: 255, align: "right" });
    doc.font("Helvetica").fontSize(10).fillColor(ink).text(`${monthLabel(r.month)}\nSalarié : ${employee}\nÉtabli le ${new Date(issued).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`, 300, 62, { width: 255, align: "right" });
    let y = 120;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(ink).text("Détail des heures déclarées", 40, y); y += 18;
    const cols = [40, 115, 260, 320, 380, 450];
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(grey);
    ["Date", "Mission", "Début", "Fin", "Pause", "Travail"].forEach((h, i) => doc.text(h, cols[i], y, { width: i === 1 ? 140 : 70 }));
    y += 14; doc.moveTo(40, y - 3).lineTo(555, y - 3).strokeColor("#ddd").stroke();
    doc.font("Helvetica").fontSize(8.5).fillColor(ink);
    for (const row of r.rows) {
      if (y > 740) { doc.addPage(); y = 40; }
      const mission = `${row.kind}${row.note ? " – " + row.note : ""}`.slice(0, 60);
      const h = Math.max(12, doc.heightOfString(mission, { width: 140 }));
      doc.text(dTxt(row.date), cols[0], y, { width: 70 }); doc.text(mission, cols[1], y, { width: 140 });
      doc.text(row.start_time, cols[2], y); doc.text(row.end_time, cols[3], y); doc.text(`${row.pause_min || 0} min`, cols[4], y); doc.text(hmTxt(row.worked_min), cols[5], y);
      y += h + 4;
    }
    if (!r.rows.length) { doc.fillColor(grey).text("Aucune heure déclarée sur ce mois.", 40, y); y += 16; }
    y += 10; if (y > 640) { doc.addPage(); y = 40; }
    doc.font("Helvetica-Bold").fontSize(11).fillColor(ink).text(`Par semaine (base ${r.weekly_hours} h)`, 40, y); y += 18;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(grey);
    ["Semaine du", "Total", "Normales", "Sup. +25 %", "Sup. +50 %"].forEach((h, i) => doc.text(h, [40, 160, 250, 340, 440][i], y)); y += 14;
    doc.font("Helvetica").fontSize(9).fillColor(ink);
    for (const w of r.weeks) { doc.text(new Date(w.week + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }), 40, y); doc.text(hmTxt(w.total_min), 160, y); doc.text(hmTxt(w.normal_min), 250, y); doc.text(hmTxt(w.ot25_min), 340, y); doc.text(hmTxt(w.ot50_min), 440, y); y += 14; }
    y += 8; doc.moveTo(40, y).lineTo(555, y).strokeColor("#ddd").stroke(); y += 8;
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(ink).text(`Total du mois : ${hmTxt(r.total_min)}  ·  heures normales : ${hmTxt(r.normal_min)}  ·  heures supplémentaires : ${hmTxt(r.ot25_min)} à +25 %, ${hmTxt(r.ot50_min)} à +50 %`, 40, y, { width: 515 });
    y += 34;
    doc.font("Helvetica").fontSize(8).fillColor(grey).text("Heures déclarées par le salarié dans l'application NeoDrive (pauses déduites). Les heures supplémentaires sont calculées par semaine civile, du lundi au dimanche, au-delà de la durée contractuelle ; une semaine à cheval sur deux mois est comptée dans le mois de ses jours déclarés. Document servant à l'établissement de la paie, à vérifier par l'employeur.", 40, y, { width: 515 });
    doc.end();
  });
}
