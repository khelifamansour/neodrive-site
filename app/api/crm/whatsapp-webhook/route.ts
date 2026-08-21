import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { crmDatabase, generateCommercialReply, normalizePhone, sendWhatsApp } from "@/lib/crm-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url); const verify = process.env.WHATSAPP_VERIFY_TOKEN;
  if (verify && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === verify) return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
  return NextResponse.json({ ok: false, error: "Vérification refusée" }, { status: 403 });
}

export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return NextResponse.json({ ok: false, error: "Signature webhook non configurée" }, { status: 503 });
  const raw = await request.text(); const received = request.headers.get("x-hub-signature-256") || "";
  const expected = `sha256=${createHmac("sha256", appSecret).update(raw).digest("hex")}`;
  if (received.length !== expected.length || !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) return NextResponse.json({ ok: false, error: "Signature invalide" }, { status: 401 });
  let payload: any; try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const db = crmDatabase(); let processed = 0;
  for (const entry of payload.entry || []) for (const change of entry.changes || []) for (const message of change.value?.messages || []) {
    const phone = normalizePhone(message.from); const text = String(message.text?.body || "").trim(); if (!phone || !text) continue;
    let { data: lead } = await db.from("leads").select("*").eq("telephone", phone).maybeSingle();
    if (!lead) { const name = change.value?.contacts?.[0]?.profile?.name || "Prospect WhatsApp"; const inserted = await db.from("leads").insert({ nom: name, telephone: phone, source: "whatsapp", statut: "Nouveau", phase: "À contacter", whatsapp_opt_in: true, lead_score: 50 }).select().single(); lead = inserted.data; }
    if (!lead) continue;
    const { data: duplicate } = await db.from("crm_messages").select("id").eq("provider_message_id", String(message.id || "")).maybeSingle(); if (duplicate) continue;
    await db.from("crm_messages").insert({ lead_id: lead.id, direction: "inbound", channel: "whatsapp", body: text, provider_message_id: message.id || null, status: "received" });
    const stop = /^(stop|désabonner|desabonner|unsubscribe|ne plus contacter|non merci)$/i.test(text);
    const now = new Date().toISOString(); await db.from("leads").update({ last_inbound_at: now, whatsapp_opt_in: !stop, opted_out_at: stop ? now : null, next_followup_at: null, statut: stop ? "Perdu" : "Chaud", phase: stop ? "Terminé" : "Attente réponse", updated_at: now }).eq("id", lead.id);
    if (!stop && lead.ai_enabled) {
      const { data: history } = await db.from("crm_messages").select("direction,body").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(8);
      try { const reply = await generateCommercialReply(lead, text, (history || []).reverse()); const id = await sendWhatsApp(phone, reply); await db.from("crm_messages").insert({ lead_id: lead.id, direction: "outbound", channel: "whatsapp", body: reply, provider_message_id: id, status: "sent", ai_generated: true }); } catch (error) { await db.from("crm_messages").insert({ lead_id: lead.id, direction: "draft", channel: "whatsapp", body: `Réponse à préparer : ${text}`, status: "failed", ai_generated: false }); }
    }
    processed++;
  }
  return NextResponse.json({ ok: true, processed });
}
