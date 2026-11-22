import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { brevoReady } from "../../../../lib/brevo";
import { runPartnerRelances } from "../../../../lib/partner-followup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tâche planifiée : relances des candidats partenaires (J+4, J+10), vers 9 h 40 heure de Paris, du lundi au samedi. */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const paris = (o: Intl.DateTimeFormatOptions) => new Date().toLocaleString("en-GB", { ...o, timeZone: "Europe/Paris" });
  // Deux déclenchements UTC (7 h 40 et 8 h 40) pour couvrir l'heure d'été et d'hiver : un seul tombe à 9 h à Paris.
  if (Number(paris({ hour: "2-digit", hour12: false })) !== 9 && !new URL(req.url).searchParams.has("force")) return NextResponse.json({ ok: true, skipped: "hors créneau (9 h Paris)" });
  if (paris({ weekday: "short" }) === "Sun") return NextResponse.json({ ok: true, skipped: "dimanche" });
  if (!brevoReady()) return NextResponse.json({ ok: true, skipped: "Brevo non connecté" });
  try { const r = await runPartnerRelances(); console.log("[PARTENAIRE-RELANCES]", r); return NextResponse.json({ ok: true, ...r }); }
  catch (e) { console.error("[PARTENAIRE-RELANCES] error", e); return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
