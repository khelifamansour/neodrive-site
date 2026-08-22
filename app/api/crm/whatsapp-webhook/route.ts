import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { crmDatabase, generateCommercialReply, normalizePhone, sendWhatsApp } from "@/lib/crm-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const verify = process.env.WHATSAPP_VERIFY_TOKEN;
  console.log("[WA-WEBHOOK] GET verification received", {
    mode: url.searchParams.get("hub.mode"),
    hasChallenge: Boolean(url.searchParams.get("hub.challenge")),
    verifyTokenConfigured: Boolean(verify),
    tokenMatches: Boolean(verify && url.searchParams.get("hub.verify_token") === verify),
  });
  if (verify && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === verify) {
    console.log("[WA-WEBHOOK] GET verification accepted");
    return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
  }
  console.error("[WA-WEBHOOK] GET verification refused");
  return NextResponse.json({ ok: false, error: "Vérification refusée" }, { status: 403 });
}

export async function POST(request: Request) {
  console.log("[WA-WEBHOOK] POST received", { at: new Date().toISOString(), contentType: request.headers.get("content-type"), hasSignature: Boolean(request.headers.get("x-hub-signature-256")) });
  try {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) return NextResponse.json({ ok: false, error: "Signature webhook non configurée" }, { status: 503 });
    const raw = await request.text();
    const received = request.headers.get("x-hub-signature-256") || "";
    const expected = `sha256=${createHmac("sha256", appSecret).update(raw).digest("hex")}`;
    const signatureValid = received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
    if (!signatureValid) return NextResponse.json({ ok: false, error: "Signature invalide" }, { status: 401 });
    const payload = JSON.parse(raw);
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    const db = crmDatabase();
    let processed = 0;
    let messagesSeen = 0;

    for (const entry of entries) for (const change of entry.changes || []) for (const message of change.value?.messages || []) {
      messagesSeen++;
      const phone = normalizePhone(message.from);
      const text = String(message.text?.body || "").trim();
      console.log("[WA-WEBHOOK] inbound", { messageId: message.id || null, type: message.type, phone, textLength: text.length });
      if (!phone || !text) continue;

      const lookup = await db.from("leads").select("*").eq("telephone", phone).maybeSingle();
      let lead = lookup.data;
      if (!lead) {
        const name = change.value?.contacts?.[0]?.profile?.name || "Prospect WhatsApp";
        const inserted = await db.from("leads").insert({ nom: name, telephone: phone, source: "whatsapp", statut: "Nouveau", phase: "À contacter", whatsapp_opt_in: true, ai_enabled: true, lead_score: 50 }).select().single();
        lead = inserted.data;
        if (inserted.error) console.error("[WA-WEBHOOK] lead creation error", inserted.error);
      }
      if (!lead) continue;

      const duplicateCheck = await db.from("crm_messages").select("id").eq("provider_message_id", String(message.id || "")).maybeSingle();
      if (duplicateCheck.data) continue;

      await db.from("crm_messages").insert({ lead_id: lead.id, direction: "inbound", channel: "whatsapp", body: text, provider_message_id: message.id || null, status: "received" });
      const stop = /^(stop|désabonner|desabonner|unsubscribe|ne plus contacter|non merci)$/i.test(text);
      const now = new Date().toISOString();
      await db.from("leads").update({ last_inbound_at: now, whatsapp_opt_in: !stop, opted_out_at: stop ? now : null, next_followup_at: null, statut: stop ? "Perdu" : "Chaud", phase: stop ? "Terminé" : "Attente réponse", updated_at: now }).eq("id", lead.id);

      // WhatsApp inbound conversations should be answered automatically by default.
      // Only an explicit ai_enabled=false disables the agent.
      const aiEnabled = lead.ai_enabled !== false;
      if (!stop && aiEnabled) {
        console.log("[WA-WEBHOOK] AI reply starting", { leadId: lead.id });
        const historyResult = await db.from("crm_messages").select("direction,body").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(8);
        try {
          const reply = await generateCommercialReply(lead, text, (historyResult.data || []).reverse());
          const id = await sendWhatsApp(phone, reply);
          await db.from("crm_messages").insert({ lead_id: lead.id, direction: "outbound", channel: "whatsapp", body: reply, provider_message_id: id, status: "sent", ai_generated: true });
          console.log("[WA-WEBHOOK] AI reply sent", { leadId: lead.id, providerMessageId: id });
        } catch (error) {
          console.error("[WA-WEBHOOK] AI/send failure", error);
          await db.from("crm_messages").insert({ lead_id: lead.id, direction: "draft", channel: "whatsapp", body: `Réponse à préparer : ${text}`, status: "failed", ai_generated: false });
        }
      } else console.log("[WA-WEBHOOK] no automatic reply", { leadId: lead.id, stop, aiEnabled });
      processed++;
    }
    console.log("[WA-WEBHOOK] POST completed", { processed, messagesSeen });
    return NextResponse.json({ ok: true, processed, messagesSeen });
  } catch (error) {
    console.error("[WA-WEBHOOK] UNHANDLED ERROR", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur webhook inconnue" }, { status: 500 });
  }
}
