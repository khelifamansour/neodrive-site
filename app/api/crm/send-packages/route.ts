import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { notifyOwner, sendDailyPackages, sendRelances } from "../../../../lib/package-sender";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tâche planifiée : envoie les packages de bienvenue aux nouveaux contacts (8 h – 19 h). */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (process.env.PACKAGE_AUTO_SEND !== "on") return NextResponse.json({ ok: true, skipped: "Envoi automatique désactivé (PACKAGE_AUTO_SEND)" });
  try {
    const r = await sendDailyPackages(); console.log("[PACKAGES]", { sent: r.sent, failed: r.failed, remaining: r.remaining, stopped: r.stopped });
    let relances: any = null;
    if (!r.stopped) { try { relances = await sendRelances(); console.log("[RELANCES]", { sent: relances.sent, failed: relances.failed, answered: relances.answered, stopped: relances.stopped }); } catch (e) { console.error("[RELANCES] error", e); } }
    let owner: any = null;
    try { owner = await notifyOwner([...(r.results || []), ...(relances?.results || [])]); console.log("[OWNER]", owner); } catch (e) { console.error("[OWNER] error", e); }
    return NextResponse.json({ ok: true, ...r, relances, owner });
  }
  catch (e) { console.error("[PACKAGES] error", e); return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
