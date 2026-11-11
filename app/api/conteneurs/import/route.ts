import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Transfère les documents en zone tampon (ship_staging) vers le stockage privé. Jeton à usage unique « ship-import ». */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data: tk } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "ship-import").is("used_at", null).gt("expires_at", new Date().toISOString()).select("token");
  if (!tk?.length) return NextResponse.json({ ok: false }, { status: 401 });
  const { data } = await db.from("ship_staging").select("path,mime,b64").limit(60);
  let n = 0; const failed: string[] = [];
  for (const f of data || []) {
    const up = await db.storage.from("shipment-docs").upload(f.path, Buffer.from(f.b64, "base64"), { contentType: f.mime || "application/pdf", upsert: true });
    if (up.error) failed.push(f.path); else { n++; await db.from("ship_staging").delete().eq("path", f.path); }
  }
  return NextResponse.json({ ok: true, imported: n, failed });
}
