import { NextResponse } from "next/server";
import { packageTemplateStatus, sendOwnerTestPackage, waAdmin } from "../../../../lib/package-sender";
import { copyToOwner, smsText } from "../../../../lib/multichannel";
import { sendNewsletterPreview } from "../../../../lib/newsletter";
import { brevoAccount, brevoDomains, brevoEvents, sendSms, setSenderOverride } from "../../../../lib/brevo";
import { applyStoredSecrets } from "../../../../lib/integrations";

export const dynamic = "force-dynamic";

/** Vérification sans danger : le relais WhatsApp (Supabase) répond-il ? Renvoie seulement l'état des modèles. */
export async function GET(req: Request) {
  // ?create=1 crée les 2 modèles fixes du package et de la relance s'ils n'existent pas encore (sans effet sinon).
  await applyStoredSecrets();
  const sp = new URL(req.url).searchParams;
  if (sp.get("test") === "newsletter") {
    try { return NextResponse.json({ ok: true, ...(await sendNewsletterPreview()), to: "khelifamansour@hotmail.fr" }); }
    catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 502 }); }
  }
  if (sp.get("test") === "sms") {
    // SMS de test vers les numéros du fondateur uniquement.
    const to = sp.get("to") === "0689781710" ? "0689781710" : "0628261446";
    try { const id = await sendSms(to, smsText("Mansour")); return NextResponse.json({ ok: true, to, id }); }
    catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 502 }); }
  }
  if (sp.get("brevo") === "events") return NextResponse.json({ ok: true, events: await brevoEvents("khelifamansour@hotmail.fr") });
  if (sp.get("brevo") === "account") return NextResponse.json({ ok: true, account: await brevoAccount() });
  if (sp.get("wa") === "health" || sp.get("wa") === "subscribe") {
    try { return NextResponse.json({ ok: true, result: await waAdmin(sp.get("wa") as "health" | "subscribe") }); }
    catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 502 }); }
  }
  if (sp.get("brevo") === "domains") return NextResponse.json({ ok: true, domains: await brevoDomains() });
  if (sp.get("test") === "brevo") {
    const from = sp.get("from") || "";
    if (/^[a-z0-9._-]+@easydrive-auto\.(store|fr)$/i.test(from)) setSenderOverride(from);
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
