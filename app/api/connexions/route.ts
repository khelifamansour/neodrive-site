import { NextResponse } from "next/server";
import { isAuthorized, writeIntegrations } from "../../../lib/integrations";
import { checkWhatsApp, discoverMeta, runHealthChecks } from "../../../lib/health";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Page privée /connexions : état des accès et enregistrement des jetons (jamais renvoyés au navigateur). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!isAuthorized(req, b.passcode)) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });

  if (b.action === "status") return NextResponse.json({ ok: true, checks: await runHealthChecks() });

  if (b.action === "save_meta") {
    const token = String(b.token || "").trim();
    if (token.length < 30) return NextResponse.json({ ok: false, error: "Collez l’accès Meta complet." }, { status: 400 });
    try {
      const { me, pages } = await discoverMeta(token);
      if (!pages.length) return NextResponse.json({ ok: false, error: `Accès valide (${me.name}) mais aucune Page Facebook n’y est rattachée. Ajoutez la Page NeoDrive à l’utilisateur système (Actifs → Pages → Contrôle total).` }, { status: 400 });
      const page = pages.find(p => p.id === String(b.pageId || process.env.FACEBOOK_PAGE_ID || "")) || pages.find(p => p.instagram_business_account) || pages[0];
      const patch: Record<string, string | null> = { FACEBOOK_PAGE_ID: page.id, FACEBOOK_PAGE_ACCESS_TOKEN: page.access_token, INSTAGRAM_ACCESS_TOKEN: null };
      if (page.instagram_business_account?.id) patch.INSTAGRAM_BUSINESS_ACCOUNT_ID = page.instagram_business_account.id;
      // Le même accès sert souvent aussi à WhatsApp : on l'essaie.
      let whatsapp = false;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "421337944404719";
      try { await checkWhatsApp(token, phoneId); patch.WHATSAPP_ACCESS_TOKEN = token; patch.WHATSAPP_PHONE_NUMBER_ID = phoneId; whatsapp = true; } catch { /* accès WhatsApp séparé possible */ }
      await writeIntegrations(patch, { meta_saved_at: new Date().toISOString(), meta_user: me.name, page_name: page.name });
      return NextResponse.json({ ok: true, page: page.name, instagram: page.instagram_business_account?.username || null, whatsapp, pages: pages.map(p => ({ id: p.id, name: p.name })), checks: await runHealthChecks() });
    } catch (e) { return NextResponse.json({ ok: false, error: "Meta refuse cet accès : " + (e as Error).message }, { status: 400 }); }
  }

  if (b.action === "save_whatsapp") {
    const token = String(b.token || "").trim();
    const phoneId = String(b.phoneId || process.env.WHATSAPP_PHONE_NUMBER_ID || "421337944404719").trim();
    if (token.length < 30) return NextResponse.json({ ok: false, error: "Collez l’accès WhatsApp complet." }, { status: 400 });
    try {
      const w = await checkWhatsApp(token, phoneId);
      const wabaId = String(b.wabaId || "").replace(/\D/g, "");
      await writeIntegrations({ WHATSAPP_ACCESS_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: phoneId, ...(wabaId ? { WHATSAPP_BUSINESS_ACCOUNT_ID: wabaId } : {}) }, { whatsapp_saved_at: new Date().toISOString() });
      return NextResponse.json({ ok: true, number: w.display_phone_number, checks: await runHealthChecks() });
    } catch (e) { return NextResponse.json({ ok: false, error: "WhatsApp refuse cet accès : " + (e as Error).message }, { status: 400 }); }
  }

  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
