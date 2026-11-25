import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { RECEIPT_BUCKET, RECEIPT_FOLDER, applyReceiptRead, matchReceipt, readReceipt } from "../../../../lib/receipts";
import { RC, safeName } from "../../../../lib/compta-server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Dépôt d'un justificatif (photo ou PDF) envoyé par le fondateur dans la conversation avec l'assistant :
 * jeton à usage unique admin_once_tokens.purpose « receipt-upload », payload { name, mime, b64, month? }.
 * Le fichier est rangé dans le stockage privé des justificatifs, lu automatiquement et rapproché des débits bancaires,
 * exactement comme un ticket envoyé depuis la page « Tickets ».
 */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "receipt-upload").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: { name?: string; mime?: string; b64?: string; month?: string } } | undefined)?.payload;
  if (!p?.b64) return NextResponse.json({ ok: false }, { status: 401 });
  const mime = String(p.mime || "image/jpeg");
  if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(mime)) return NextResponse.json({ ok: false, error: "Photo ou PDF seulement" }, { status: 400 });
  const buf = Buffer.from(p.b64, "base64");
  if (!buf.length || buf.length > 15 * 1024 * 1024) return NextResponse.json({ ok: false, error: "Fichier vide ou trop lourd" }, { status: 400 });
  const month = /^\d{4}-\d{2}$/.test(p.month || "") ? p.month! : new Date().toISOString().slice(0, 7);
  const name = safeName(String(p.name || "justificatif.jpg"));
  const path = `${RECEIPT_FOLDER}/${month}/${crypto.randomUUID().slice(0, 8)}-${name}`;
  const up = await db.storage.from(RECEIPT_BUCKET).upload(path, buf, { contentType: mime, upsert: false });
  if (up.error) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 });
  const { data: rc, error } = await db.from("receipts").insert({ path, month, file_name: name, mime, size: buf.length, source: "assistant" }).select("id").single();
  if (error || !rc) return NextResponse.json({ ok: false, error: "Enregistrement impossible" }, { status: 502 });
  try {
    await applyStoredSecrets();
    const o = await readReceipt(new Uint8Array(buf), mime, name);
    await applyReceiptRead(db, rc.id, o, month);
    try { await matchReceipt(db, rc.id); } catch { /* rapprochement plus tard */ }
  } catch (e) {
    await db.from("receipts").update({ status: "erreur", note: (e as Error).message.slice(0, 300), updated_at: new Date().toISOString() }).eq("id", rc.id);
  }
  const { data: out } = await db.from("receipts").select(RC).eq("id", rc.id).single();
  return NextResponse.json({ ok: true, receipt: out || { id: rc.id } });
}
export const GET = run;
export const POST = run;
