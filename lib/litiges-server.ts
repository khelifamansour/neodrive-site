/** Litiges : stockage privé des pièces et transcription automatique de leur contenu. Serveur uniquement. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { unzipSync, strFromU8 } from "fflate";
import { applyStoredSecrets } from "./integrations";
import { fileExt, PIECE_CATEGORIES } from "./litiges";

export const LITIGE_BUCKET = "erp-documents";
/** Plafond de texte conservé par pièce. */
const MAX_TEXT = 200_000;

export type LitigePiece = {
  id: number; litige_id: number; created_at: string; label: string; categorie: string; date_piece: string | null;
  path: string; name: string; size: number | null; mime: string | null; extracted_text: string | null; extracted_at: string | null;
};

const INSTRUCTIONS = `Tu reçois une pièce d'un dossier de litige commercial (courrier d'avocat, facture, bon de livraison / lettre de voiture, e-mail imprimé ou capture d'écran, photo, plainte, certificat médical…).
Transcris fidèlement tout le texte du document, en français, sans résumer ; pour une photo sans texte, décris précisément ce qu'on voit.
Conserve les montants, dates, noms, adresses, immatriculations et numéros de série (VIN) exactement comme écrits ; indique les signatures, cachets et mentions manuscrites entre crochets, ex. [signature], [cachet du garage]. Sépare les pages par « --- page N --- ».
Réponds uniquement en json : {"titre": intitulé court de la pièce (ex. « Lettre de Me Marc à Garage Morrève »), "date": date principale du document au format AAAA-MM-JJ ou null, "categorie": une valeur parmi ${PIECE_CATEGORIES.map(c => `"${c}"`).join(", ")}, "texte": la transcription complète}.`;

const decodeXml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");

/** Texte d'un .docx (paragraphes de word/document.xml). */
export function docxText(buf: Uint8Array) {
  const xml = strFromU8(unzipSync(buf, { filter: f => f.name === "word/document.xml" })["word/document.xml"] || new Uint8Array());
  return decodeXml(xml.replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n").replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "")).replace(/\n{3,}/g, "\n\n").trim();
}

/** Texte lisible d'un e-mail brut (.eml) : en-têtes utiles + corps texte, quoted-printable / base64 décodés, pièces jointes binaires ignorées. */
export function emlText(raw: string) {
  const qp = (s: string) => Buffer.from(s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))), "latin1").toString("utf8");
  const mimeWord = (s: string) => s.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, _cs, enc, t) => enc.toUpperCase() === "B" ? Buffer.from(t, "base64").toString("utf8") : qp(t.replace(/_/g, " ")));
  const split = (s: string) => { const i = s.search(/\r?\n\r?\n/); return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i).replace(/^\r?\n\r?\n/, "")]; };
  const headers = (h: string) => Object.fromEntries(h.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/).map(l => { const i = l.indexOf(":"); return [l.slice(0, i).trim().toLowerCase(), l.slice(i + 1).trim()]; }).filter(([k]) => k));
  const bodies: string[] = [];
  const walk = (part: string, depth = 0) => {
    const [h, body] = split(part); const hd = headers(h); const ct = (hd["content-type"] || "text/plain").toLowerCase();
    const boundary = ct.includes("multipart/") ? (hd["content-type"].match(/boundary="?([^";]+)"?/i)?.[1] || "") : "";
    if (boundary && depth < 6) { body.split(`--${boundary}`).slice(1).filter(p => !p.startsWith("--")).forEach(p => walk(p.replace(/^\r?\n/, ""), depth + 1)); return; }
    if (!ct.startsWith("text/")) { if (/attachment|filename/i.test(hd["content-disposition"] || ct)) bodies.push(`[pièce jointe : ${mimeWord((hd["content-disposition"] || ct).match(/(?:file)?name="?([^";]+)"?/i)?.[1] || ct)}]`); return; }
    const enc = (hd["content-transfer-encoding"] || "").toLowerCase();
    let t = enc === "base64" ? Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8") : enc === "quoted-printable" ? qp(body) : body;
    if (ct.startsWith("text/html")) t = decodeXml(t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n");
    bodies.push(t.trim());
  };
  walk(raw);
  const [h] = split(raw); const hd = headers(h);
  const head = ["from", "to", "cc", "date", "subject"].filter(k => hd[k]).map(k => `${{ from: "De", to: "À", cc: "Cc", date: "Date", subject: "Objet" }[k]} : ${mimeWord(hd[k])}`).join("\n");
  // Un e-mail en text/plain + text/html répète le même contenu : on garde le texte brut s'il existe.
  const plain = bodies.filter(b => b && !b.startsWith("[pièce jointe"));
  const att = bodies.filter(b => b.startsWith("[pièce jointe"));
  return [head, plain[0] || "", ...att].filter(Boolean).join("\n\n");
}

/** Transcription d'un PDF ou d'une image par OpenAI (même API et modèle que l'import des CV). */
async function aiTranscribe(name: string, mime: string, buf: Uint8Array) {
  const key = process.env.OPENAI_API_KEY; if (!key) throw new Error("Clé OpenAI absente");
  const e = fileExt(name); const b64 = Buffer.from(buf).toString("base64");
  const imgType = /^image\/(jpeg|png|webp|gif)$/.test(mime) ? mime : e === "png" ? "image/png" : e === "webp" ? "image/webp" : /^jpe?g$/.test(e) ? "image/jpeg" : "";
  const file = e === "pdf" || mime === "application/pdf" ? { type: "input_file", filename: name.endsWith(".pdf") ? name : `${name}.pdf`, file_data: `data:application/pdf;base64,${b64}` }
    : imgType ? { type: "input_image", image_url: `data:${imgType};base64,${b64}`, detail: "high" } : null;
  if (!file) return null;
  const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_LITIGE_MODEL || process.env.OPENAI_HIRING_MODEL || "gpt-4.1-mini", instructions: INSTRUCTIONS, input: [{ role: "user", content: [{ type: "input_text", text: `Pièce : ${name}. Réponds en json.` }, file] }], text: { format: { type: "json_object" } }, max_output_tokens: 30000 }) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`OpenAI ${r.status} : ${String(j?.error?.message || "").slice(0, 160)}`);
  const txt: string = (j?.output || []).flatMap((x: { content?: unknown[] }) => x.content || []).filter((x: { type?: string }) => x.type === "output_text").map((x: { text?: string }) => x.text || "").join("");
  try {
    const o = JSON.parse(txt) as { titre?: string; date?: string; categorie?: string; texte?: string };
    return { text: String(o.texte || "").trim(), titre: String(o.titre || "").trim().slice(0, 160), date: /^\d{4}-\d{2}-\d{2}$/.test(String(o.date)) ? String(o.date) : null, categorie: (PIECE_CATEGORIES as readonly string[]).includes(String(o.categorie)) ? String(o.categorie) : null };
  } catch {
    // Réponse tronquée (document très long) : on garde le texte brut reçu.
    const raw = txt.replace(/^[\s\S]*?"texte"\s*:\s*"/, "").replace(/\\n/g, "\n").replace(/\\"/g, "\"");
    return { text: `${raw.trim()}\n[… transcription interrompue : document trop long]`, titre: "", date: null, categorie: null };
  }
}

/**
 * Lit une pièce et enregistre son texte dans extracted_text (et, si l'IA les trouve, l'intitulé, la date et la catégorie
 * quand ils n'ont pas été renseignés à la main). Ne lève pas d'erreur : l'échec est noté dans extracted_text.
 */
export async function extractPiece(sb: SupabaseClient, pieceId: number) {
  const { data: p } = await sb.from("litige_pieces").select("*").eq("id", pieceId).maybeSingle();
  if (!p) return { ok: false, error: "Pièce introuvable" };
  const piece = p as LitigePiece; const e = fileExt(piece.name); const mime = (piece.mime || "").toLowerCase();
  const patch: Record<string, unknown> = { extracted_at: new Date().toISOString() };
  try {
    const { data: blob, error } = await sb.storage.from(LITIGE_BUCKET).download(piece.path);
    if (error || !blob) throw new Error("Fichier introuvable dans le stockage");
    const buf = new Uint8Array(await blob.arrayBuffer());
    if (e === "txt" || mime === "text/plain") patch.extracted_text = new TextDecoder("utf-8").decode(buf);
    else if (e === "eml" || mime === "message/rfc822") patch.extracted_text = emlText(Buffer.from(buf).toString("utf8"));
    else if (e === "docx") patch.extracted_text = docxText(buf);
    else if (e === "heic" || e === "heif" || /hei[cf]/.test(mime)) patch.extracted_text = "[Photo HEIC : lecture automatique impossible. Renvoyer la photo en JPEG (réglage iPhone « Le plus compatible » ou capture d'écran).]";
    else {
      await applyStoredSecrets();
      const ai = await aiTranscribe(piece.name, mime, buf);
      if (!ai) patch.extracted_text = "[Format non lisible automatiquement]";
      else {
        patch.extracted_text = ai.text || "[Aucun texte détecté]";
        const auto = piece.label === piece.name.replace(/\.[^.]+$/, "");
        if (ai.titre && auto) patch.label = ai.titre;
        if (ai.date && !piece.date_piece) patch.date_piece = ai.date;
        if (ai.categorie && piece.categorie === "autre") patch.categorie = ai.categorie;
      }
    }
    patch.extracted_text = String(patch.extracted_text).slice(0, MAX_TEXT);
  } catch (err) {
    patch.extracted_text = `[Lecture impossible : ${(err as Error).message || "erreur"}]`;
  }
  await sb.from("litige_pieces").update(patch).eq("id", piece.id);
  return { ok: !String(patch.extracted_text).startsWith("[Lecture impossible"), chars: String(patch.extracted_text).length };
}
