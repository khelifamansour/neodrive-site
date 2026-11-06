import { NextResponse } from "next/server";
import { packageTemplateStatus, sendOwnerTestPackage } from "../../../../lib/package-sender";
import { copyToOwner } from "../../../../lib/multichannel";
import { applyStoredSecrets } from "../../../../lib/integrations";

export const dynamic = "force-dynamic";

/** Vérification sans danger : le relais WhatsApp (Supabase) répond-il ? Renvoie seulement l'état des modèles. */
export async function GET(req: Request) {
  // ?create=1 crée les 2 modèles fixes du package et de la relance s'ils n'existent pas encore (sans effet sinon).
  await applyStoredSecrets();
  const sp = new URL(req.url).searchParams;
  if (sp.get("test") === "brevo") {
    // Envoie au fondateur seulement (hotmail) l'e-mail 1 tel que les clients le recevront.
    try { await copyToOwner("email1"); return NextResponse.json({ ok: true, sent: "e-mail 1 envoyé à khelifamansour@hotmail.fr" }); }
    catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 502 }); }
  }
  if (sp.get("test") === "owner") {
    try { return NextResponse.json({ ok: true, ...(await sendOwnerTestPackage()) }); }
    catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 502 }); }
  }
  const create = sp.get("create") === "1";
  try { return NextResponse.json({ ok: true, templates: await packageTemplateStatus(create) }); }
  catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 502 }); }
}
