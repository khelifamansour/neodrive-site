import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { brevoReady, marketingEmailGate } from "../../../../lib/brevo";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { sendPartnerWelcome, type PartnerApplication } from "../../../../lib/partner-followup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Envoi manuel de l'e-mail de bienvenue partenaire, par jeton à usage unique (admin_once_tokens.purpose « partner-welcome », payload = { application_ids, relances? }). Les relances J+4 / J+10 suivent, sauf relances: false.
 * Envoi groupé bridé par le budget Brevo : s'il reste des candidatures, le jeton est libéré pour relancer le même lien plus tard (celles déjà envoyées sont retenues dans le jeton et ignorées). */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  await applyStoredSecrets();
  if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "partner-welcome").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const payload = ((data?.[0] as { payload?: { application_ids?: unknown[]; relances?: boolean; done_ids?: number[] } } | undefined)?.payload) || {};
  const ids = (payload.application_ids || []).map(Number).filter(Boolean) as number[];
  if (!ids.length) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: apps } = await db.from("partner_applications").select("*").in("id", ids);
  const results = []; const gate = marketingEmailGate("bienvenue-partenaires"); const done = new Set((payload.done_ids || []).map(Number));
  for (const a of (apps || []) as PartnerApplication[]) {
    if (done.has(a.id)) { results.push({ id: a.id, sent: false, error: "déjà envoyé au passage précédent" }); continue; }
    results.push(await sendPartnerWelcome(a, { manual: true, relances: payload.relances !== false, gate }));
  }
  const deferred = results.filter(r => "deferred" in r && r.deferred).length;
  const quota = await gate.finish(deferred);
  // Il reste des candidatures : jeton libéré pour un prochain passage, en retenant celles déjà envoyées (pas de doublon).
  if (deferred > 0) await db.from("admin_once_tokens").update({ used_at: null, payload: { ...payload, done_ids: [...done, ...results.filter(r => r.sent).map(r => r.id)] } }).eq("token", token).eq("purpose", "partner-welcome");
  return NextResponse.json({ ok: true, sent: results.filter(r => r.sent).length, deferred, quota, results });
}
export const GET = run;
export const POST = run;
