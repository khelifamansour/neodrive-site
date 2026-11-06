import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { sendNewsletterBatch } from "../../../../lib/newsletter";
import { whatsappOwner } from "../../../../lib/package-sender";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Newsletter mensuelle : un lot par jour (à partir du 5 du mois), résumé au fondateur sur WhatsApp. */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const r = await sendNewsletterBatch();
    console.log("[NEWSLETTER]", r);
    if ((r as any).sent > 0) await whatsappOwner(`📰 Newsletter ${(r as any).edition} « ${(r as any).subject} » : ${(r as any).sent} e-mails envoyés aujourd'hui. Copie dans votre boîte hotmail.`, "Newsletter").catch(() => false);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) { console.error("[NEWSLETTER] error", e); return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
