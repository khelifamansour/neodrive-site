import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets, isAuthorized } from "../../../../lib/integrations";
import { OWNER_EMAIL, brevoReady, sendEmail } from "../../../../lib/brevo";
import { MONTH, monthData, previousMonth, summaryEmail } from "../../../../lib/compta-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tâche planifiée (CRON_SECRET), début de chaque mois : résumé comptable du mois écoulé envoyé au fondateur
 * (débits sans justificatif, factures sans paiement, TVA estimée, autoliquidation à déclarer, lien vers l'export Pennylane).
 * ?month=AAAA-MM pour un autre mois, ?dry=1 pour voir le résumé sans l'envoyer. Le bouton de l'onglet Comptabilité fait la même chose.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const month = MONTH.test(q.get("month") || "") ? q.get("month")! : previousMonth();
  const d = await monthData(crmDatabase(), month);
  const { subject, html } = summaryEmail(d);
  if (q.get("dry") === "1") return NextResponse.json({ ok: true, dry: true, month, subject, vat: d.vat, debitsWithout: d.receiptStats.debitsWithout, supplierUnpaid: d.supplierUnpaid.length });
  await applyStoredSecrets();
  if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });
  try { await sendEmail(OWNER_EMAIL, "NeoDrive", subject, html); }
  catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 }); }
  return NextResponse.json({ ok: true, month, sent: true, subject });
}
