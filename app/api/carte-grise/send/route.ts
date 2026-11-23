import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { findDossier, sendDossierToProvider } from "../../../../lib/carte-grise-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Envoi d'un dossier carte grise au prestataire (NK Services par défaut), sur autorisation du fondateur :
 * jeton à usage unique admin_once_tokens.purpose « carte-grise-send », payload = { dossier_id | ref, to?, force? }.
 * Le jeton est rendu réutilisable si l'envoi échoue.
 */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "carte-grise-send").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: { dossier_id?: number; ref?: string; to?: string; force?: boolean } } | undefined)?.payload;
  if (!p || (!p.dossier_id && !p.ref)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const d = await findDossier(db, p);
    if (!d) throw Object.assign(new Error("Dossier introuvable"), { status: 404 });
    const r = await sendDossierToProvider(db, d, { to: p.to, force: Boolean(p.force) });
    return NextResponse.json({ ok: true, ref: d.ref, ...r });
  } catch (e) {
    await db.from("admin_once_tokens").update({ used_at: null }).eq("token", token);
    const err = e as Error & { status?: number };
    return NextResponse.json({ ok: false, error: err.message || "erreur" }, { status: err.status || 500 });
  }
}
export const GET = run;
export const POST = run;
