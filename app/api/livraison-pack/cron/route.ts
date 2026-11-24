import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { runPackCron } from "../../../../lib/delivery-pack";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Tâche planifiée (toutes les 30 min) : pack avant livraison (8 h - 20 h, Paris) et rappel SMS de la veille (18 h - 21 h). */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ ok: false }, { status: 401 });
  await applyStoredSecrets().catch(() => {});
  try { return NextResponse.json({ ok: true, ...(await runPackCron(crmDatabase())) }); }
  catch (e) { console.error("[PACK-CRON]", e); return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
