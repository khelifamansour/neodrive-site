import { DOC_TYPES, guessType, isDocType, type DocType } from "../../../lib/shipments";

/** Classement IA d'un document d'import (type + référence principale + résumé court). */
export async function classifyDoc(buf: Buffer, mime: string, name: string): Promise<{ type: DocType; ref: string; note: string } | null> {
  const key = process.env.OPENAI_API_KEY; if (!key) return null;
  const content: any[] = [{ type: "input_text", text: `Document d'import (voitures sans permis électriques, Chine → France). Fichier : ${name}. Types possibles : ${DOC_TYPES.map(d => `${d.key} = ${d.fr}`).join(" ; ")}. Réponds en JSON : {"type": une des clés, "ref": numéro principal (n° de facture, de B/L…), "note": résumé en français, 1 phrase avec quantités, montants, conteneurs et dates}` }];
  if (mime === "application/pdf") content.push({ type: "input_file", filename: name || "doc.pdf", file_data: `data:application/pdf;base64,${buf.toString("base64")}` });
  else if (/^image\//.test(mime)) content.push({ type: "input_image", image_url: `data:${mime};base64,${buf.toString("base64")}` });
  else return null;
  const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_HIRING_MODEL || "gpt-4.1-mini", input: [{ role: "user", content }], text: { format: { type: "json_object" } }, max_output_tokens: 300, store: false }) });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  const txt = (j?.output || []).flatMap((x: any) => x.content || []).filter((x: any) => x.type === "output_text").map((x: any) => x.text).join("");
  try { const o = JSON.parse(txt); return { type: isDocType(o.type) ? o.type : guessType(name), ref: String(o.ref || "").slice(0, 80), note: String(o.note || "").slice(0, 400) }; } catch { return null; }
}
