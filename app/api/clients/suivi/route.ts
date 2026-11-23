import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { brevoReady } from "../../../../lib/brevo";
import { runSuivi } from "../../../../lib/client-followup";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Tâche planifiée : « comment ça se passe ? » (SMS + e-mail) aux clients livrés il y a 9 à 15 jours, une seule fois par client.
 * Vers 10 h 30 heure de Paris, du lundi au samedi (jamais le dimanche). ?dry=1 : simulation sans envoi ni écriture.
 */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const paris = (o: Intl.DateTimeFormatOptions) => new Date().toLocaleString("en-GB", { ...o, timeZone: "Europe/Paris" });
  // Deux déclenchements UTC (8 h 30 et 9 h 30) pour couvrir l'heure d'été et d'hiver : un seul tombe à 10 h à Paris.
  if (Number(paris({ hour: "2-digit", hour12: false })) !== 10 && !sp.has("force")) return NextResponse.json({ ok: true, skipped: "hors créneau (10 h 30 Paris)" });
  if (paris({ weekday: "short" }) === "Sun") return NextResponse.json({ ok: true, skipped: "dimanche" });
  const dryRun = sp.has("dry");
  if (!dryRun && !brevoReady()) return NextResponse.json({ ok: true, skipped: "Brevo non connecté" });
  try { const r = await runSuivi({ dryRun }); console.log("[CLIENTS-SUIVI]", JSON.stringify(r)); return NextResponse.json({ ok: true, dryRun, ...r }); }
  catch (e) { console.error("[CLIENTS-SUIVI] error", e); return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
