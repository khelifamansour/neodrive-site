import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { buildDailyReport, sendReportEmail } from "../../../../lib/daily-report";

export const dynamic = "force-dynamic";

/** Tâche planifiée du soir : rapport de la journée envoyé par e-mail au fondateur. */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try { const report = await buildDailyReport(); const email = await sendReportEmail(report); console.log("[REPORT]", { date: report.date, email }); return NextResponse.json({ ok: true, report, email }); }
  catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
