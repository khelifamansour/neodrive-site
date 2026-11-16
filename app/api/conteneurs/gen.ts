import type { SupabaseClient } from "@supabase/supabase-js";
import { docSets, invoicePdf, packingPdf, partsPdf } from "./pdf";

const BUCKET = "shipment-docs";
type GenResult = { ok: boolean; error?: string; status?: number; paths?: string[] };

/** Génère (ou regénère) facture, colisage et liste des pièces de chaque facture usine du dossier. */
export async function genDocs(db: SupabaseClient, id: number): Promise<GenResult> {
    const { data: s } = await db.from("shipments").select("*").eq("id", id).single();
    const { data: veh } = await db.from("shipment_vehicles").select("vin,container").eq("shipment_id", id).order("vin");
    if (!s) return { ok: false, error: "Dossier introuvable", status: 404 };
    const sets = docSets(s, veh || []);
    if (!sets.length) return { ok: false, error: (veh || []).length ? "Renseignez le n° de facture usine et le prix unitaire" : "Ajoutez d'abord les numéros de série (VIN) ou des pièces détachées", status: 400 };
    if (sets.some(d => d.veh.length && !d.unit_price)) return { ok: false, error: "Renseignez le prix unitaire des véhicules", status: 400 };
    // On remplace toutes les versions générées par la plateforme (facture, colisage, pièces).
    const { data: old } = await db.from("shipment_docs").select("id,file_path").eq("shipment_id", id).eq("uploaded_by", "plateforme");
    if (old?.length) { await db.storage.from(BUCKET).remove(old.map(o => o.file_path)); await db.from("shipment_docs").delete().in("id", old.map(o => o.id)); }
    const out: string[] = [];
    for (const d of sets) {
      const conts = [...new Set([...d.veh.map(v => v.container), ...d.lines.map(l => l.container)].filter(Boolean))].join("-");
      const docs: [string, Buffer, string][] = [["facture", await invoicePdf(s, d), "Invoice"], ["colisage", await packingPdf(s, d), "Packing-list"]];
      if (d.lines.length) docs.push(["pieces", await partsPdf(s, d), "Spare-parts-list"]);
      for (const [type, buf, label] of docs) {
        const name = `${label}-${d.invoice_no}${conts ? "-" + conts : ""}.pdf`; const path = `${id}/gen-${type}-${d.invoice_no}-${Date.now()}.pdf`;
        const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: "application/pdf" }); if (up.error) return { ok: false, error: up.error.message, status: 500 };
        const parts = d.lines.reduce((t, l) => t + l.qty, 0);
        await db.from("shipment_docs").insert({ shipment_id: id, doc_type: type, version: "corrigée", file_path: path, file_name: name, uploaded_by: "plateforme", ref: d.invoice_no, ai_note: `Générée le ${new Date().toLocaleDateString("fr-FR")} : ${d.veh.length ? `${d.veh.length} véhicules avec VIN et COC` : ""}${d.veh.length && parts ? " + " : ""}${parts ? `${parts} pièces détachées détaillées` : ""}, résumé par conteneur (${d.invoice_part ? "part de la facture usine découpée par conteneur" : "montants identiques à la facture usine"}).` });
        out.push(path);
      }
    }
    return { ok: true, paths: out } as GenResult;
  }
