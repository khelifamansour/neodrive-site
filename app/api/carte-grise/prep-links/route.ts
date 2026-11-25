import { NextResponse } from "next/server";
import { dataClient } from "../../../../lib/datastore";
import { prepLinks } from "../../../../lib/carte-grise-prep";

export const dynamic = "force-dynamic";

/**
 * Liens « préparer ma carte grise » pour l'assistant, par jeton à usage unique : admin_once_tokens.purpose « cg-prep-links »,
 * payload { reservation_ids: [...] } → [{ reservation_id, name, phone, link, message }] (jetons créés au besoin). N'envoie rien.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = dataClient();
  if (!db) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "cg-prep-links").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: { reservation_ids?: unknown } } | undefined)?.payload;
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  const ids = (Array.isArray(p.reservation_ids) ? p.reservation_ids : []).map(Number);
  if (!ids.length) return NextResponse.json({ ok: false, error: "reservation_ids vide" }, { status: 400 });
  try {
    const links = await prepLinks(db, ids);
    const found = new Set(links.map(l => l.reservation_id));
    return NextResponse.json({ ok: true, links, not_found: ids.filter(id => !found.has(id)) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
