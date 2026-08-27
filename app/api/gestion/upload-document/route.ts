import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

function safe(s: string) { return s.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 140); }
function num(v: any) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function categoryFor(type: string, extracted: any) {
  if (extracted?.cost_category) return extracted.cost_category;
  const m: Record<string,string> = { ocean_freight: "ocean_freight", sea_freight: "ocean_freight", customs: "customs", customs_invoice: "customs", road_transport: "road_transport", transport_routier: "road_transport", unloading: "unloading", depotage: "unloading", port_fees: "port", supplier_invoice: "supplier", pai: "supplier", other_cost: "other" };
  return m[type] || "other";
}
function isCostType(type: string) { return ["ocean_freight","sea_freight","customs","customs_invoice","road_transport","transport_routier","unloading","depotage","port_fees","other_cost"].includes(type); }

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const secret = process.env.CRON_SECRET;
    if (!secret || String(fd.get("passcode") || "") !== secret) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) return NextResponse.json({ ok: false, error: "Configuration Supabase manquante" }, { status: 503 });
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) return NextResponse.json({ ok: false, error: "Document manquant" }, { status: 400 });
    const documentType = String(fd.get("document_type") || "other");
    let containerId = String(fd.get("container_id") || "") || null;
    let vehicleId = String(fd.get("vehicle_id") || "") || null;
    const sb = createClient(SB, key, { auth: { persistSession: false } });
    const path = `gestion/${new Date().getFullYear()}/${Date.now()}-${safe(file.name)}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await sb.storage.from("erp-documents").upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
    if (uploadError) throw uploadError;

    let extracted: any = {};
    if (process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const b64 = bytes.toString("base64");
        const prompt = `Tu analyses un document de gestion automobile de type ${documentType}. Retourne UNIQUEMENT un JSON valide, sans markdown, avec: {supplier_name,invoice_number,invoice_date,net_amount,vat_amount,total_amount,currency,container_number,vin,cost_category,cost_basis_amount,model,color,notes}. Pour cost_basis_amount, indique le coût réellement incorporable au coût de revient hors TVA récupérable; pour une facture de douane privilégie les droits/taxes non récupérables et exclue la TVA import récupérable si identifiable. Pour un COC, recopie le VIN exactement. Mets null si une donnée est absente et n'invente rien.`;
        const r = await client.responses.create({ model: process.env.OPENAI_DOCUMENT_MODEL || "gpt-5-mini", input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_file", filename: file.name, file_data: `data:${file.type || "application/pdf"};base64,${b64}` }] }] as any, max_output_tokens: 1800 });
        extracted = JSON.parse((r.output_text || "{}").trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
      } catch (e) {
        extracted = { extraction_error: e instanceof Error ? e.message : "Analyse impossible" };
      }
    }

    if (!containerId && extracted?.container_number) {
      const { data } = await sb.from("containers").select("id").eq("container_number", String(extracted.container_number).trim()).maybeSingle();
      containerId = data?.id || null;
    }
    if (!vehicleId && extracted?.vin) {
      const vin = String(extracted.vin).replace(/\s+/g, "").toUpperCase();
      const { data } = await sb.from("vehicles").select("id").or(`vin.eq.${vin},chassis_number.eq.${vin}`).maybeSingle();
      vehicleId = data?.id || null;
    }

    const { data: doc, error: docError } = await sb.from("import_documents").insert({
      container_id: containerId,
      vehicle_id: vehicleId,
      document_type: documentType,
      filename: file.name,
      storage_path: path,
      mime_type: file.type || null,
      supplier_name: extracted?.supplier_name || null,
      invoice_number: extracted?.invoice_number || null,
      invoice_date: extracted?.invoice_date || null,
      net_amount: num(extracted?.net_amount),
      vat_amount: num(extracted?.vat_amount),
      total_amount: num(extracted?.total_amount),
      currency: extracted?.currency || "EUR",
      ai_extracted: extracted,
      verified: false,
    }).select().single();
    if (docError) throw docError;

    let cost: any = null;
    if (containerId && isCostType(documentType)) {
      const amount = num(extracted?.cost_basis_amount) ?? num(extracted?.net_amount) ?? num(extracted?.total_amount);
      if (amount != null && amount >= 0) {
        const category = categoryFor(documentType, extracted);
        const allocationMethod = category === "customs" ? "factory_value" : "equal";
        const { data, error } = await sb.from("container_cost_items").insert({ container_id: containerId, document_id: doc.id, category, label: `${documentType.replace(/_/g," ")} · ${extracted?.supplier_name || file.name}`, amount, allocation_method: allocationMethod, include_in_landed_cost: true }).select().single();
        if (error) throw error;
        cost = data;
        await sb.rpc("recalculate_container_costs", { p_container_id: containerId });
      }
    }

    if (vehicleId && ["coc","certificate_of_conformity"].includes(documentType)) {
      await sb.from("vehicles").update({ coc_url: path, coc_extracted: extracted, coc_verified: false, updated_at: new Date().toISOString() }).eq("id", vehicleId);
    }

    return NextResponse.json({ ok: true, document: doc, extracted, cost, container_id: containerId, vehicle_id: vehicleId });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Import impossible" }, { status: 500 });
  }
}
