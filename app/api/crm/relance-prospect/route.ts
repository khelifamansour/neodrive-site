import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { sendProspectRelances } from "../../../../lib/prospect-relance";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tâche planifiée (toutes les heures, lundi – samedi) : relance WhatsApp des prospects de Hana qui n'ont pas réservé.
 * Envoi seulement de 10 h à 19 h (heure de Paris), jamais le dimanche. Règles et plafonds : lib/prospect-relance.ts.
 * Accès : Authorization: Bearer CRON_SECRET, ou jeton à usage unique « relance-prospect » (?token=…).
 * ?dry=1 : liste qui serait relancé et pourquoi (et qui est exclu), sans rien envoyer, à toute heure.
 */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const url = new URL(req.url); const token = url.searchParams.get("token") || "";
  let ok = !!process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!ok && /^[a-f0-9]{48}$/.test(token)) {
    const { data } = await crmDatabase().from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "relance-prospect").is("used_at", null).gt("expires_at", new Date().toISOString()).select("token");
    ok = !!data?.length;
  }
  if (!ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const dry = url.searchParams.get("dry") === "1";
  if (!dry) {
    const paris = (o: Intl.DateTimeFormatOptions) => new Date().toLocaleString("en-GB", { ...o, timeZone: "Europe/Paris" });
    const hour = Number(paris({ hour: "2-digit", hour12: false }));
    if (paris({ weekday: "short" }) === "Sun") return NextResponse.json({ ok: true, skipped: "dimanche" });
    if (hour < 10 || hour >= 19) return NextResponse.json({ ok: true, skipped: "hors créneau (10 h – 19 h Paris)" });
  }
  try { const r = await sendProspectRelances({ dry }); if (!dry) console.log("[RELANCE-PROSPECT]", JSON.stringify(r)); return NextResponse.json({ ok: true, ...r }); }
  catch (e) { console.error("[RELANCE-PROSPECT] error", e); return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
