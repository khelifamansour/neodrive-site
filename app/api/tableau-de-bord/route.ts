import { NextResponse } from "next/server";
import { applyStoredSecrets, isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { OWNER_EMAIL, brevoReady, sendEmail } from "../../../lib/brevo";
import { buildDashboard, digestEmail, parisHour } from "../../../lib/founder-dashboard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tâche planifiée (CRON_SECRET), du lundi au samedi : e-mail du matin au fondateur à 7 h (heure de Paris).
 * Planifiée à 5 h et 6 h UTC : seul le passage de 7 h à Paris envoie (heure d'hiver comme d'été).
 * ?force=1 pour envoyer tout de suite, ?dry=1 pour voir le sujet sans envoyer.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  if (q.get("force") !== "1" && q.get("dry") !== "1" && parisHour() !== 7) return NextResponse.json({ ok: true, skipped: "pas 7 h à Paris" });
  try {
    const d = await buildDashboard(crmDatabase());
    const { subject, html } = digestEmail(d);
    if (q.get("dry") === "1") return NextResponse.json({ ok: true, dry: true, subject, html });
    await applyStoredSecrets();
    if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });
    await sendEmail(OWNER_EMAIL, "Mansour", subject, html);
    return NextResponse.json({ ok: true, sent: true, subject });
  } catch (e) {
    console.error("[TABLEAU] e-mail", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

/** Fondateur : données du tableau de bord ; « send » renvoie l'e-mail du matin maintenant. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isAuthorized(req, typeof b.passcode === "string" ? b.passcode : "")) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  try {
    const d = await buildDashboard(crmDatabase());
    if (b.action === "send") {
      await applyStoredSecrets();
      if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo n'est pas connecté (page /connexions)" }, { status: 503 });
      const { subject, html } = digestEmail(d);
      await sendEmail(OWNER_EMAIL, "Mansour", subject, html);
      return NextResponse.json({ ok: true, sent: true, to: OWNER_EMAIL });
    }
    return NextResponse.json({ ok: true, ...d });
  } catch (e) {
    console.error("[TABLEAU]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
