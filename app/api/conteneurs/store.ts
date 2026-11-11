import { crmDatabase } from "../../../lib/crm-agent";
import { guessType, isDocType } from "../../../lib/shipments";
import { classifyDoc } from "./classify";

const BUCKET = "shipment-docs";
const clean = (v: unknown, max = 500) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);

/** Enregistre les fichiers d'un formulaire dans le dossier conteneur, avec classement automatique si le type n'est pas choisi. */
export async function storeFiles(shipmentId: number, fd: FormData, by: string) {
  const db = crmDatabase(); const asked = clean(fd.get("doc_type"), 20); const version = clean(fd.get("version"), 20) === "corrigée" ? "corrigée" : "originale";
  const saved: { name: string; type: string }[] = [];
  for (const f of fd.getAll("files")) {
    if (typeof f === "string" || !f.size) continue;
    if (f.size > 20 * 1024 * 1024) continue;
    const buf = Buffer.from(await f.arrayBuffer());
    const ext = (f.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
    const path = `${shipmentId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: f.type || "application/octet-stream" });
    if (up.error) continue;
    let type = isDocType(asked) && asked !== "autre" ? asked : guessType(f.name); let ref = "", note = "";
    if (!isDocType(asked) || asked === "autre") { const ai = await classifyDoc(buf, f.type, f.name).catch(() => null); if (ai) { type = ai.type; ref = ai.ref; note = ai.note; } }
    await db.from("shipment_docs").insert({ shipment_id: shipmentId, doc_type: type, version, file_path: path, file_name: f.name.slice(0, 160), uploaded_by: by, ref, ai_note: note });
    saved.push({ name: f.name, type });
  }
  return { saved };
}

