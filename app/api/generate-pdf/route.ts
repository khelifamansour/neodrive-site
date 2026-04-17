
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export async function POST(req: Request) {
  const { name, phone, city } = await req.json();

  const doc = new PDFDocument();
  let buffers: any[] = [];

  doc.on("data", buffers.push.bind(buffers));

  doc.on("end", () => {});

  doc.fontSize(20).text("DEVIS OFFICIEL", { align: "center" });

  doc.moveDown();
  doc.text(`Nom: ${name}`);
  doc.text(`Téléphone: ${phone}`);
  doc.text(`Ville: ${city}`);

  doc.moveDown();
  doc.text("Produit: NeoDrive SWITCH");
  doc.text("Prix: 4 490 €");
  doc.text("Acompte: 200 €");

  doc.moveDown();
  doc.text("IBAN: FRXX XXXX XXXX XXXX");
  doc.text("Nom société: Microdrive");

  doc.end();

  const pdfBuffer = await new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
  });

  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=devis.pdf",
    },
  });
}
