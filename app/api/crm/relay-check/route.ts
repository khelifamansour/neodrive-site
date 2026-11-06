import { NextResponse } from "next/server";
import { packageTemplateStatus } from "../../../../lib/package-sender";

export const dynamic = "force-dynamic";

/** Vérification sans danger : le relais WhatsApp (Supabase) répond-il ? Renvoie seulement l'état des modèles. */
export async function GET() {
  try { return NextResponse.json({ ok: true, templates: await packageTemplateStatus(false) }); }
  catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 502 }); }
}
