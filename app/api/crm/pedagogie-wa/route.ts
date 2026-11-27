import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { pedagogyTemplateStatus, sendPedagogy } from "../../../../lib/client-pedagogy";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Vidéos « Pédagogie client » sur WhatsApp aux clients qui attendent leur livraison (voir lib/client-pedagogy.ts).
 * Accès : tâche planifiée (Authorization: Bearer CRON_SECRET) ou jeton à usage unique admin_once_tokens.purpose « wa-pedagogie »
 * (?token=…, payload { dry?: boolean, create?: boolean }).
 * ?dry=1 : liste qui recevrait quelle vidéo, sans rien envoyer. create : soumet le modèle à Meta s'il n'existe pas (jeton seulement).
 * Rien n'est envoyé si le modèle n'est pas APPROVED, ou si l'interrupteur est coupé (PEDAGOGIE_WA=off ou marketing_settings « pedagogie_wa ».enabled=false).
 */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const url = new URL(req.url); const token = url.searchParams.get("token") || "";
  const db = crmDatabase();
  let ok = !!process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  let payload: { dry?: boolean; create?: boolean } = {};
  if (!ok && /^[a-f0-9]{48}$/.test(token)) {
    const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "wa-pedagogie").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
    if (data?.length) { ok = true; payload = ((data[0] as { payload?: typeof payload }).payload) || {}; }
  }
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const dry = url.searchParams.get("dry") === "1" || !!payload.dry;
    let created: unknown = null;
    if (payload.create) created = await pedagogyTemplateStatus(true).catch(e => ({ status: "ERREUR", reason: (e as Error).message }));
    const r = await sendPedagogy(db, { dry: dry || !!payload.create });
    return NextResponse.json(created ? { ...r, created } : r);
  } catch (e) {
    console.error("[PEDAGOGIE-WA]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 });
  }
}
