import type { Extracted } from "../../../lib/shipments";

const MODEL = () => process.env.OPENAI_HIRING_MODEL || "gpt-4.1-mini";

/** Appel OpenAI Responses (JSON) avec un fichier PDF ou une image ; renvoie l'objet JSON ou null. */
export async function aiJson(prompt: string, buf: Buffer, mime: string, name: string, maxTokens = 2500): Promise<Record<string, any> | null> {
  const key = process.env.OPENAI_API_KEY; if (!key) return null;
  const content: any[] = [{ type: "input_text", text: prompt }];
  if (mime === "application/pdf") content.push({ type: "input_file", filename: name || "doc.pdf", file_data: `data:application/pdf;base64,${buf.toString("base64")}` });
  else if (/^image\//.test(mime)) content.push({ type: "input_image", image_url: `data:${mime};base64,${buf.toString("base64")}`, detail: "high" });
  else return null;
  const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ model: MODEL(), input: [{ role: "user", content }], text: { format: { type: "json_object" } }, max_output_tokens: maxTokens, store: false }) });
  if (!r.ok) { console.error("[EXTRACT] openai", r.status, (await r.text().catch(() => "")).slice(0, 300)); return null; }
  const j = await r.json().catch(() => null);
  const txt = (j?.output || []).flatMap((x: any) => x.content || []).filter((x: any) => x.type === "output_text").map((x: any) => x.text).join("");
  try { return JSON.parse(txt); } catch { return null; }
}

const n = (v: unknown) => { if (v == null || v === "") return null; const x = Number(String(v).replace(/[^\d.,-]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", ".")); return Number.isFinite(x) ? x : null; };
const vinList = (a: unknown) => [...new Set((Array.isArray(a) ? a : []).map(v => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "")).filter(v => v.length >= 11 && v.length <= 18))];

/**
 * Lit les données utiles d'un document d'import (facture, proforma, colisage, COC) :
 * VIN, conteneurs, quantité, prix, lignes et total. Les VIN sont recopiés tels quels (le contrôle se fait ensuite).
 */
export async function extractDoc(type: string, buf: Buffer, mime: string, name: string): Promise<Extracted> {
  if (!process.env.OPENAI_API_KEY) return { error: "lecture IA indisponible" };
  if (mime !== "application/pdf" && !/^image\//.test(mime)) return { error: "format non lisible (envoyez un PDF ou une image)" };
  if (buf.length > 25 * 1024 * 1024) return { error: "fichier trop lourd pour la lecture automatique" };
  const what = type === "coc" ? "certificates of conformity (COC), usually one per vehicle" : type === "colisage" ? "packing list" : type === "pi" ? "proforma invoice" : "commercial invoice";
  const o = await aiJson(`This is a ${what} for electric light quadricycles (voitures sans permis) shipped from China to France. Extract the data exactly as printed and answer in json with this shape:
{"invoice_no": string|null, "vins": [every 17-character VIN / chassis / frame number printed, copied character by character, no duplicates], "containers": [{"no": container number like ABCU1234567, "vins": [VIN in that container]}], "quantity": total number of vehicles or null, "unit_price": vehicle unit price or null, "currency": "USD"|"EUR"|"CNY"|null, "lines": [{"desc": short line description, "qty": number, "price": unit price, "amount": line amount}], "total": grand total amount or null}
Use null or [] when an item is not in the document. Do not invent anything.`, buf, mime, name, 4000);
  if (!o) return { error: "lecture automatique échouée" };
  return {
    invoice_no: o.invoice_no ? String(o.invoice_no).slice(0, 60) : null,
    vins: vinList(o.vins).slice(0, 300),
    containers: (Array.isArray(o.containers) ? o.containers : []).slice(0, 20).map((c: any) => ({ no: String(c?.no || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15), vins: vinList(c?.vins) })).filter((c: { no: string }) => c.no),
    quantity: n(o.quantity), unit_price: n(o.unit_price), total: n(o.total), currency: o.currency ? String(o.currency).slice(0, 5) : null,
    lines: (Array.isArray(o.lines) ? o.lines : []).slice(0, 40).map((l: any) => ({ desc: String(l?.desc || "").slice(0, 80), qty: n(l?.qty), price: n(l?.price), amount: n(l?.amount) })),
  };
}

/** Lecture d'une plaque constructeur / d'un VIN frappé sur une photo prise par le chauffeur. */
export async function readVinPhoto(buf: Buffer, mime: string): Promise<{ vin: string; candidates: string[]; text: string } | null> {
  const o = await aiJson(`This photo shows a vehicle identification plate (manufacturer plate) or a VIN stamped on the chassis of a small electric car. Read the VIN (17 characters, letters I, O and Q are never used). Answer in json: {"vin": the VIN exactly as read or "", "candidates": [other possible readings if some characters are unclear], "text": other text visible on the plate (brand, model, date), "readable": true|false}`, buf, mime, "plate.jpg", 400);
  if (!o) return null;
  return { vin: String(o.vin || ""), candidates: (Array.isArray(o.candidates) ? o.candidates : []).map(String).slice(0, 5), text: String(o.text || "").slice(0, 200) };
}
