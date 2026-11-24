import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { findDossier } from "../../../../lib/carte-grise-server";
import { checkDocuments, requestMissing } from "../../../../lib/carte-grise-check";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Payload = { dossier_id?: number; id?: number; keys?: string[]; note?: string; sms?: boolean; email?: boolean; auto_resend?: boolean; analyse?: boolean };

/**
 * Demande des pièces manquantes d'un dossier carte grise sans passer par l'admin. Jeton à usage unique
 * (admin_once_tokens.purpose « cg-request-missing », payload = { dossier_id, keys?, note?, sms?, email?, auto_resend?, analyse? }).
 * Sans keys : pièces manquantes ou à refaire selon le contrôle (lancé d'abord si analyse ou si jamais fait).
 */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "cg-request-missing").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: Payload } | undefined)?.payload;
  const id = Number(p?.dossier_id ?? p?.id);
  if (!id) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    let d = await findDossier(db, { id });
    if (!d) return NextResponse.json({ ok: false, error: "Dossier introuvable" }, { status: 404 });
    if (p!.analyse || (!p!.keys?.length && !d.doc_check)) { await checkDocuments(db, id); d = (await findDossier(db, { id }))!; }
    const out = await requestMissing(db, d, { keys: p!.keys, note: p!.note, sms: p!.sms, email: p!.email, auto_resend: p!.auto_resend, by: "jeton" });
    return NextResponse.json({ ok: true, id, ...out });
  } catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
export const GET = run;
