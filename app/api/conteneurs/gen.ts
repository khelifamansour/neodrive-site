import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import { docSets, invoicePdf, packingPdf, partsPdf, splitByContainer } from "./pdf";

const BUCKET = "shipment-docs";
type GenResult = { ok: boolean; error?: string; status?: number; paths?: string[] };

/**
 * COC regroupés : un seul PDF par conteneur, fait uniquement des pages des COC déposés (aucune page n'est modifiée).
 * Si des COC sont marqués « corrigée », ce sont eux qui sont pris ; sinon les originaux. Les COC rattachés à un conteneur
 * ne vont que dans le fichier de ce conteneur ; les autres vont dans tous les fichiers (dossier à un seul conteneur).
 */
export async function mergeCocs(db: SupabaseClient, s: { id: number; name?: string | null }, containers: string[]) {
  const { data: docs } = await db.from("shipment_docs").select("id,file_path,file_name,version,container,uploaded_by,created_at").eq("shipment_id", s.id).eq("doc_type", "coc").order("created_at");
  const own = (docs || []).filter(d => d.uploaded_by !== "plateforme");
  const out: string[] = [];
  for (const cont of containers.length ? containers : [""]) {
    const mine = own.filter(d => !d.container || d.container === cont || !cont);
    const corr = mine.filter(d => d.version === "corrigée"); const pick = corr.length && corr.length >= mine.length - corr.length ? corr : mine;
    if (!pick.length) continue;
    const merged = await PDFDocument.create();
    for (const d of pick) {
      const { data: blob } = await db.storage.from(BUCKET).download(d.file_path); if (!blob) continue;
      const bytes = new Uint8Array(await blob.arrayBuffer()); const name = String(d.file_name || d.file_path).toLowerCase();
      if (name.endsWith(".pdf")) { const src = await PDFDocument.load(bytes, { ignoreEncryption: true }); (await merged.copyPages(src, src.getPageIndices())).forEach(p => merged.addPage(p)); }
      else if (/\.(jpe?g|png)$/.test(name)) { const img = name.endsWith(".png") ? await merged.embedPng(bytes) : await merged.embedJpg(bytes); const page = merged.addPage([595.28, 841.89]); const sc = Math.min(595.28 / img.width, 841.89 / img.height); page.drawImage(img, { x: (595.28 - img.width * sc) / 2, y: (841.89 - img.height * sc) / 2, width: img.width * sc, height: img.height * sc }); }
    }
    if (!merged.getPageCount()) continue;
    const buf = Buffer.from(await merged.save());
    const path = `${s.id}/gen-coc-${cont || "all"}-${Date.now()}.pdf`;
    const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: "application/pdf" }); if (up.error) throw new Error(up.error.message);
    await db.from("shipment_docs").insert({ shipment_id: s.id, doc_type: "coc", version: "corrigée", file_path: path, file_name: `COC-${merged.getPageCount()}-pages${cont ? "-" + cont : ""}.pdf`, uploaded_by: "plateforme", container: cont || null, ai_note: `COC regroupés le ${new Date().toLocaleDateString("fr-FR")} : ${pick.length} fichier(s), ${merged.getPageCount()} page(s), pages d'origine non modifiées.` });
    out.push(path);
  }
  return out;
}

/** Génère (ou regénère), conteneur par conteneur : facture et colisage avec VIN au format NeoDrive, liste des pièces, COC regroupés. */
export async function genDocs(db: SupabaseClient, id: number): Promise<GenResult> {
  const { data: s } = await db.from("shipments").select("*").eq("id", id).single();
  const { data: veh } = await db.from("shipment_vehicles").select("vin,container").eq("shipment_id", id).order("vin");
  if (!s) return { ok: false, error: "Dossier introuvable", status: 404 };
  const sets = docSets(s, veh || []);
  if (!sets.length) return { ok: false, error: (veh || []).length ? "Renseignez le n° de facture usine et le prix unitaire" : "Ajoutez d'abord les numéros de série (VIN) ou des pièces détachées", status: 400 };
  if (sets.some(d => d.veh.length && !d.unit_price)) return { ok: false, error: "Renseignez le prix unitaire des véhicules", status: 400 };
  // On remplace toutes les versions générées par la plateforme (facture, colisage, pièces, COC regroupés).
  const { data: old } = await db.from("shipment_docs").select("id,file_path").eq("shipment_id", id).eq("uploaded_by", "plateforme");
  if (old?.length) { await db.storage.from(BUCKET).remove(old.map(o => o.file_path)); await db.from("shipment_docs").delete().in("id", old.map(o => o.id)); }
  const out: string[] = []; const conts = new Set<string>();
  for (const whole of sets) for (const d of splitByContainer(s, whole)) {
    if (d.container) conts.add(d.container);
    const docs: [string, Buffer, string][] = [["facture", await invoicePdf(s, d), "Commercial-invoice"], ["colisage", await packingPdf(s, d), "Packing-list"]];
    if (d.lines.length) docs.push(["pieces", await partsPdf(s, d), "Spare-parts-list"]);
    for (const [type, buf, label] of docs) {
      const name = `${label}-${d.invoice_no}${d.container ? "-" + d.container : ""}.pdf`; const path = `${id}/gen-${type}-${d.invoice_no}-${d.container || "all"}-${Date.now()}.pdf`;
      const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: "application/pdf" }); if (up.error) return { ok: false, error: up.error.message, status: 500 };
      const parts = d.lines.reduce((t, l) => t + l.qty, 0);
      await db.from("shipment_docs").insert({ shipment_id: id, doc_type: type, version: "corrigée", file_path: path, file_name: name, uploaded_by: "plateforme", ref: d.invoice_no, container: d.container || null, ai_note: `Générée le ${new Date().toLocaleDateString("fr-FR")}${d.container ? ` pour ${d.container}` : ""} : ${d.veh.length ? `${d.veh.length} véhicules avec VIN` : ""}${d.veh.length && parts ? " + " : ""}${parts ? `${parts} pièces détachées` : ""}, refaite avec l'autorisation du vendeur (mêmes quantités, prix et montants).` });
      out.push(path);
    }
  }
  try { out.push(...await mergeCocs(db, s, [...conts])); } catch (e) { return { ok: false, error: `COC : ${(e as Error).message}`, status: 500 }; }
  return { ok: true, paths: out };
}
