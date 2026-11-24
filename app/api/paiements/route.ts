import { NextResponse } from "next/server";
import { isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { linkPayment, payMatchReady, rejectPayment, reviewList, runPaymentMatch } from "../../../lib/payment-match";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Tâche planifiée (CRON_SECRET), toutes les heures : rapproche les encaissements Revolut des réservations. */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await runPaymentMatch(crmDatabase())); }
  catch (e) { console.error("[PAIEMENTS] cron", e); return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 }); }
}

/** Fondateur : liste « à vérifier », confirmer le bon client, rejeter, relancer le rapprochement. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isAuthorized(req, typeof b.passcode === "string" ? b.passcode : "")) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  try {
    if (b.action === "list") {
      if (!await payMatchReady(db)) return NextResponse.json({ ok: true, ready: false, items: [] });
      return NextResponse.json({ ok: true, ready: true, items: await reviewList(db) });
    }
    if (b.action === "run") return NextResponse.json(await runPaymentMatch(db));
    if (b.action === "confirm") {
      const tx = Number(b.tx_id), res = Number(b.reservation_id);
      if (!tx || !res) return NextResponse.json({ ok: false, error: "Choisissez une réservation." }, { status: 400 });
      const r = await linkPayment(db, tx, res, { by: "manuel" });
      return NextResponse.json({ ok: true, ...r });
    }
    if (b.action === "reject") { await rejectPayment(db, Number(b.tx_id)); return NextResponse.json({ ok: true }); }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[PAIEMENTS]", b.action, e);
    return NextResponse.json({ ok: false, error: (e as Error).message || "Erreur serveur" }, { status: 500 });
  }
}
