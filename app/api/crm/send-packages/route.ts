import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { notifyOwner, sendDailyPackages, sendRelances, whatsappSentToday } from "../../../../lib/package-sender";
import { copyToOwner, sendCampaignSms, sendEmailsAndSms, sendMissedCallSms } from "../../../../lib/multichannel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tâche planifiée : envoie les packages de bienvenue aux nouveaux contacts (8 h – 19 h). */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (process.env.PACKAGE_AUTO_SEND !== "on") return NextResponse.json({ ok: true, skipped: "Envoi automatique désactivé (PACKAGE_AUTO_SEND)" });
  try {
    // WhatsApp : 2 créneaux par jour (9 h et 18 h, heure de Paris), 10 messages max par créneau, 20 max par jour.
    const hour = Number(new Date().toLocaleString("fr-FR", { hour: "2-digit", hour12: false, timeZone: "Europe/Paris" }));
    const windows = String(process.env.WHATSAPP_HOURS || "9,18").split(",").map(Number);
    const daily = Number(process.env.WHATSAPP_DAILY_MAX || 10), perRun = Number(process.env.WHATSAPP_PER_RUN || 5);
    let r: any = { sent: 0, failed: 0, remaining: 0, stopped: "", results: [] as any[], skipped: "hors créneau WhatsApp" };
    let relances: any = null;
    if (process.env.WHATSAPP_SENDING === "on" && windows.includes(hour)) {
      const budget = Math.max(0, Math.min(perRun, daily - await whatsappSentToday()));
      if (budget > 0) {
        r = await sendDailyPackages(budget); console.log("[PACKAGES]", { sent: r.sent, failed: r.failed, remaining: r.remaining, stopped: r.stopped });
        const left = budget - r.sent;
        if (!r.stopped && left > 0 && process.env.WHATSAPP_RELANCES === "on") { try { relances = await sendRelances(left); console.log("[RELANCES]", { sent: relances.sent, failed: relances.failed, answered: relances.answered, stopped: relances.stopped }); } catch (e) { console.error("[RELANCES] error", e); } }
      }
    }
    let mails: any = null;
    try { mails = await sendEmailsAndSms(); console.log("[EMAIL-SMS]", { sent: mails.sent, failed: mails.failed, skipped: mails.skipped, stopped: mails.stopped }); } catch (e) { console.error("[EMAIL-SMS] error", e); }
    let missed: any = null;
    try { missed = await sendMissedCallSms(); if (missed.sent) console.log("[MISSED]", missed.sent); } catch (e) { console.error("[MISSED] error", e); }
    let campaign: any = null;
    try { campaign = await sendCampaignSms(); if (campaign.sent || campaign.results?.length) console.log("[CAMPAIGN]", { sent: campaign.sent, remaining: campaign.remaining, skipped: campaign.skipped }); } catch (e) { console.error("[CAMPAIGN] error", e); }
    let owner: any = null;
    try { owner = await notifyOwner([...((r as any).results || []), ...(relances?.results || []), ...(mails?.results || []), ...(missed?.results || []), ...(campaign?.results || [])], copyToOwner); console.log("[OWNER]", owner); } catch (e) { console.error("[OWNER] error", e); }
    return NextResponse.json({ ok: true, ...r, relances, mails, owner });
  }
  catch (e) { console.error("[PACKAGES] error", e); return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
