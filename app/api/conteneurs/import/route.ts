import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { genDocs } from "../gen";
import { sendDossier } from "../send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Transfère les documents en zone tampon vers le stockage privé (« ship-import »), regénère les documents (« ship-gen ») ou envoie un dossier au transitaire (« ship-send »). Jetons à usage unique. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data: tk } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).in("purpose", ["ship-import", "ship-gen", "ship-send"]).is("used_at", null).gt("expires_at", new Date().toISOString()).select("token,purpose,payload");
  if (!tk?.length) return NextResponse.json({ ok: false }, { status: 401 });
  // Jeton « ship-send » : envoie le dossier (payload { id, to }) au destinataire choisi par le fondateur.
  if (tk[0].purpose === "ship-send") {
    const p = (tk[0].payload || {}) as { id?: number; to?: string };
    try { const out = await sendDossier(db, Number(p.id), p.to); return NextResponse.json({ ok: true, sent: out.sent, missing: out.missing, mails: out.mails }); }
    catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }); }
  }
  // Jeton « ship-gen » : regénère les documents des dossiers ?ids=1,2,3
  if (tk[0].purpose === "ship-gen") {
    const ids = (new URL(req.url).searchParams.get("ids") || "").split(",").map(Number).filter(n => n > 0).slice(0, 10);
    const results: Record<number, unknown> = {};
    for (const id of ids) { const r = await genDocs(db, id); results[id] = { ok: r.ok, error: r.error, docs: r.paths?.length || 0 }; }
    return NextResponse.json({ ok: true, results });
  }
  const { data } = await db.from("ship_staging").select("path,mime,b64").limit(60);
  let n = 0; const failed: string[] = [];
  for (const f of data || []) {
    const up = await db.storage.from("shipment-docs").upload(f.path, Buffer.from(f.b64, "base64"), { contentType: f.mime || "application/pdf", upsert: true });
    if (up.error) failed.push(f.path); else { n++; await db.from("ship_staging").delete().eq("path", f.path); }
  }
  return NextResponse.json({ ok: true, imported: n, failed });
}
