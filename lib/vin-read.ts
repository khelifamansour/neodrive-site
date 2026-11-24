/** Lecture automatique du numéro de série (VIN) sur la photo de la plaque constructeur. Serveur uniquement. */
import { VIN_FORMAT, cleanVin, vinCheckOk } from "./vin";

const INSTRUCTIONS = `Tu lis le numéro de série (VIN, 17 caractères, norme ISO 3779) sur la photo d'une plaque constructeur, d'une étiquette ou d'un marquage frappé sur le châssis d'un véhicule (souvent une voiture sans permis fabriquée en Chine, VIN commençant souvent par L).
Le VIN ne contient jamais les lettres I, O ni Q. Recopie exactement ce que tu vois, caractère par caractère.
Réponds uniquement en JSON : {"vin": "<17 caractères ou chaîne vide si illisible>", "doute": "<positions ou caractères incertains, sinon vide>"}`;

export type VinRead = { vin: string | null; raw: string; check_ok: boolean; doubt: string };

export async function readVinFromImage(buf: Uint8Array, mime: string): Promise<VinRead> {
  const key = process.env.OPENAI_API_KEY; if (!key) throw new Error("Lecture automatique indisponible (clé absente) : tapez le numéro.");
  const type = /^image\/(jpeg|png|webp|gif)$/.test(mime) ? mime : "image/jpeg";
  const image = { type: "input_image", image_url: `data:${type};base64,${Buffer.from(buf).toString("base64")}`, detail: "high" };
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 40_000);
  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", signal: ctl.signal, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_VIN_MODEL || "gpt-4.1-mini", instructions: INSTRUCTIONS, input: [{ role: "user", content: [{ type: "input_text", text: "Lis le VIN sur cette photo. Réponds en json." }, image] }], text: { format: { type: "json_object" } }, max_output_tokens: 300 }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`Lecture impossible (${r.status}) : tapez le numéro.`);
    const txt: string = (j?.output || []).flatMap((x: { content?: unknown[] }) => x.content || []).filter((x: { type?: string }) => x.type === "output_text").map((x: { text?: string }) => x.text || "").join("");
    let o: { vin?: string; doute?: string } = {};
    try { o = JSON.parse(txt); } catch { o = { vin: (txt.match(/[A-Z0-9]{17}/i) || [""])[0] }; }
    const raw = String(o.vin || "").toUpperCase();
    const vin = cleanVin(raw);
    const ok = VIN_FORMAT.test(vin);
    return { vin: ok ? vin : null, raw, check_ok: ok && vinCheckOk(vin), doubt: String(o.doute || "").slice(0, 200) };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("Lecture trop longue : réessayez ou tapez le numéro.");
    throw e;
  } finally { clearTimeout(t); }
}

/** VIN libre le plus proche (au plus 2 caractères différents) : corrige une petite erreur de lecture. */
export function nearestVin(vin: string, list: string[]) {
  let best: { vin: string; d: number } | null = null;
  for (const v of list) {
    if (v.length !== 17) continue;
    let d = 0; for (let i = 0; i < 17 && d <= 2; i++) if (v[i] !== vin[i]) d++;
    if (d <= 2 && (!best || d < best.d)) best = { vin: v, d };
  }
  return best;
}
