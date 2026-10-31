import { NextResponse } from "next/server";
import { isAuthorized } from "../../../lib/integrations";
import { runHealthChecks } from "../../../lib/health";
import { ALERT_ENDPOINT } from "../../../lib/sav";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SITE = "https://www.easydrive-auto.fr";

/** Contrôle quotidien (cron Vercel) : e-mail récapitulatif à NeoDrive. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!isAuthorized(req, url.searchParams.get("passcode") || undefined)) return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  const checks = await runHealthChecks();
  const problems = checks.filter(c => c.ok === false && c.key !== "email");
  const lines = checks.filter(c => c.key !== "info").map(c => `${c.ok === true ? "✅" : c.ok === false ? "❌" : "➖"} ${c.label} : ${c.detail}${c.action ? ` → ${c.action}` : ""}`);
  const subject = problems.length ? `⚠️ NeoDrive : ${problems.length} automatisation${problems.length > 1 ? "s" : ""} à reconnecter` : "✅ NeoDrive : toutes les automatisations fonctionnent";
  let sent = false;
  if (url.searchParams.get("send") !== "0") {
    const r = await fetch(ALERT_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Referer: SITE + "/connexions", Origin: SITE }, body: JSON.stringify({ _subject: subject, etat: lines.join("\n"), a_faire: problems.length ? `Ouvrez ${SITE}/connexions pour reconnecter (code ERP).` : "Rien à faire.", tableau: `${SITE}/connexions` }) }).catch(() => null);
    sent = !!r?.ok;
  }
  return NextResponse.json({ ok: true, problems: problems.length, sent, checks });
}
