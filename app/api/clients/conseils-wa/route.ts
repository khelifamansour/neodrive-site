import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { sendBatteryWhatsApp } from "../../../../lib/battery-wa";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tâche planifiée : conseils batterie sur WhatsApp à 3 clients livrés max par jour, vers 11 h 15 heure de Paris, du lundi au samedi. */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const paris = (o: Intl.DateTimeFormatOptions) => new Date().toLocaleString("en-GB", { ...o, timeZone: "Europe/Paris" });
  // Deux déclenchements UTC (9 h 15 et 10 h 15) pour l'heure d'été et d'hiver : un seul tombe à 11 h à Paris.
  if (Number(paris({ hour: "2-digit", hour12: false })) !== 11) return NextResponse.json({ ok: true, skipped: "hors créneau (11 h 15 Paris)" });
  if (paris({ weekday: "short" }) === "Sun") return NextResponse.json({ ok: true, skipped: "dimanche" });
  try { const r = await sendBatteryWhatsApp(); console.log("[CONSEILS-WA]", JSON.stringify(r)); return NextResponse.json({ ok: true, ...r }); }
  catch (e) { console.error("[CONSEILS-WA] error", e); return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
