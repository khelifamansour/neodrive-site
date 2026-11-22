import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { brevoReady } from "../../../../lib/brevo";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { sendPartnerWelcome, type PartnerApplication } from "../../../../lib/partner-followup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Envoi manuel de l'e-mail de bienvenue partenaire, par jeton à usage unique (admin_once_tokens.purpose « partner-welcome », payload = { application_ids, relances? }). Les relances J+4 / J+10 suivent, sauf relances: false. */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  await applyStoredSecrets();
  if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "partner-welcome").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const payload = ((data?.[0] as { payload?: { application_ids?: unknown[]; relances?: boolean } } | undefined)?.payload) || {};
  const ids = (payload.application_ids || []).map(Number).filter(Boolean) as number[];
  if (!ids.length) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: apps } = await db.from("partner_applications").select("*").in("id", ids);
  const results = [];
  for (const a of (apps || []) as PartnerApplication[]) results.push(await sendPartnerWelcome(a, { manual: true, relances: payload.relances !== false }));
  return NextResponse.json({ ok: true, sent: results.filter(r => r.sent).length, results });
}
export const GET = run;
export const POST = run;
