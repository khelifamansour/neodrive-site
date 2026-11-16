import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { hanaRelances } from "../../../../lib/hana-relance";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Relance des conversations Hana sans réponse.
 * Accès : tâche planifiée (Authorization: Bearer CRON_SECRET) ou jeton à usage unique « hana-relance » (?token=…).
 * ?dry=1 : liste les contacts qui seraient relancés, sans rien envoyer.
 */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const url = new URL(req.url); const token = url.searchParams.get("token") || "";
  let ok = !!process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!ok && /^[a-f0-9]{48}$/.test(token)) {
    const { data } = await crmDatabase().from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "hana-relance").is("used_at", null).gt("expires_at", new Date().toISOString()).select("token");
    ok = !!data?.length;
  }
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  const dry = url.searchParams.get("dry") === "1";
  if (!dry && (process.env.WHATSAPP_SENDING !== "on" || process.env.HANA_RELANCES !== "on")) return NextResponse.json({ ok: true, skipped: "Relances Hana désactivées (HANA_RELANCES / WHATSAPP_SENDING)" });
  try { return NextResponse.json({ ok: true, ...(await hanaRelances({ dry })) }); }
  catch (e) { console.error("[HANA-RELANCE]", e); return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
