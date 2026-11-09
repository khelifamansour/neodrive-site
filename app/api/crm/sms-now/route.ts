import { NextResponse } from "next/server";
import { crmDatabase, normalizePhone } from "../../../../lib/crm-agent";
import { sendSms } from "../../../../lib/brevo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Envoi ponctuel d'un SMS à une liste de numéros, déclenché par un jeton à usage unique (admin_once_tokens.payload = { phones, text }). Copie au fondateur. */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "sms-now").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const payload = (data?.[0] as any)?.payload as { phones?: string[]; text?: string } | undefined;
  if (!payload?.phones?.length || !payload.text) return NextResponse.json({ ok: false }, { status: 401 });
  const results: { tel: string; sent: boolean; error?: string }[] = [];
  for (const raw of payload.phones) {
    const tel = normalizePhone(raw);
    try {
      const id = await sendSms(tel, payload.text);
      const { data: lead } = await db.from("leads").select("id,history").eq("telephone", tel).maybeSingle();
      if (lead) {
        const at = new Date().toISOString();
        await db.from("crm_messages").insert({ lead_id: lead.id, direction: "outbound", channel: "sms", body: payload.text, provider_message_id: id, status: "sent", ai_generated: false });
        await db.from("leads").update({ history: [...(Array.isArray(lead.history) ? lead.history : []), { type: "sms_followup", sent_at: at }].slice(-60), last_contact_at: at, updated_at: at }).eq("id", lead.id);
      }
      results.push({ tel, sent: true });
    } catch (e: any) { results.push({ tel, sent: false, error: e?.message || "erreur" }); }
  }
  try { await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", payload.text); } catch (e) { console.error("[SMS-NOW] copie", e); }
  return NextResponse.json({ ok: true, sent: results.filter(r => r.sent).length, results });
}
export const GET = run;
export const POST = run;
