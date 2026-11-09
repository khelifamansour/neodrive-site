import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { copyToOwner, sendMissedCallSms } from "../../../../lib/multichannel";
import { notifyOwner } from "../../../../lib/package-sender";

export const dynamic = "force-dynamic";

/** Envoi immédiat des SMS « appel manqué », déclenché par un jeton à usage unique (table admin_once_tokens). */
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "missed-calls").is("used_at", null).gt("expires_at", new Date().toISOString()).select("token");
  if (!data?.length) return NextResponse.json({ ok: false }, { status: 401 });
  const missed = await sendMissedCallSms();
  let owner: unknown = null;
  try { owner = await notifyOwner(missed.results || [], copyToOwner); } catch (e) { console.error("[MISSED-NOW] owner", e); }
  return NextResponse.json({ ok: true, sent: missed.sent, results: (missed.results || []).map((r: any) => ({ tel: r.tel, sent: !!r.sent, error: r.error || null })), owner });
}
export const GET = POST;
