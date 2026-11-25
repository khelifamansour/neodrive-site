import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { dataClient } from "../../../../lib/datastore";
import { COMPANY_BUCKET, COMPANY_FOLDER, safeCompanyName } from "../../../../lib/company-docs";

export const dynamic = "force-dynamic";
const MAX = 10 * 1024 * 1024;
const TYPES = /^(image\/(png|jpeg|webp)|application\/pdf)$/;

/**
 * Dépôt d'un document privé de l'entreprise (ex. cachet-et-signature.png), par jeton à usage unique :
 * admin_once_tokens.purpose « company-doc », payload { name, type, content (base64) } → erp-documents/entreprise/<name> (remplace l'existant).
 */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "company-doc").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: { name?: string; type?: string; content?: string } } | undefined)?.payload;
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  const name = safeCompanyName(p.name);
  const type = String(p.type || "");
  if (!name) return NextResponse.json({ ok: false, error: "Nom de fichier invalide" }, { status: 400 });
  if (!TYPES.test(type)) return NextResponse.json({ ok: false, error: "Type non accepté (PNG, JPEG, WEBP ou PDF)" }, { status: 400 });
  const buf = Buffer.from(String(p.content || "").replace(/^data:[^,]*,/, ""), "base64");
  if (!buf.length || buf.length > MAX) return NextResponse.json({ ok: false, error: "Contenu vide ou trop lourd" }, { status: 400 });
  const sb = dataClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  const path = `${COMPANY_FOLDER}/${name}`;
  const { error } = await sb.storage.from(COMPANY_BUCKET).upload(path, buf, { contentType: type, upsert: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true, bucket: COMPANY_BUCKET, path, size: buf.length });
}
export const GET = run;
export const POST = run;
