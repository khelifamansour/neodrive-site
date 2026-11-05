import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { agentTurn, crmDatabase, crmPatchFromTurn, normalizePhone, sendWhatsApp, sendWhatsAppVideo } from "@/lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  await applyStoredSecrets();
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
  await applyStoredSecrets();
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
      const text = String(message.text?.body || message.button?.text || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "").trim()
        || (message.type === "audio" ? "[Le client a envoyé un message vocal]" : message.type === "image" ? "[Le client a envoyé une photo]" : message.type === "video" ? "[Le client a envoyé une vidéo]" : message.type ? `[Message ${message.type}]` : "");
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
      const stop = /^(stop|arr[eê]t|d[ée]sabonner|unsubscribe|ne plus (me )?contacter|non merci|pas int[ée]ress[ée]e?)\b/i.test(text);
      const now = new Date().toISOString();
      await db.from("leads").update({ last_inbound_at: now, whatsapp_opt_in: !stop, opted_out_at: stop ? now : null, next_followup_at: null, followup_step: 0, statut: stop ? "Perdu" : (lead.statut === "Nouveau" || lead.statut === "Contacté" ? "Chaud" : lead.statut), phase: stop ? "Terminé" : "Attente réponse", updated_at: now }).eq("id", lead.id);

      if (stop) {
        try {
          const bye = "C'est noté, nous ne vous recontacterons plus. Merci et belle journée ! — NeoDrive";
          const id = await sendWhatsApp(phone, bye);
          await db.from("crm_messages").insert({ lead_id: lead.id, direction: "outbound", channel: "whatsapp", body: bye, provider_message_id: id, status: "sent", ai_generated: false });
        } catch (error) { console.error("[WA-WEBHOOK] stop confirmation failed", error); }
      } else if (lead.ai_enabled !== false) {
        // L'agent répond automatiquement, sauf si l'IA a été coupée pour ce client (ai_enabled=false).
        const historyResult = await db.from("crm_messages").select("direction,body").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(16);
        const history = (historyResult.data || []).reverse();
        const videosSent = history.map((m: any) => String(m.body || "").match(/^\[vidéo:(\w+)\]/)?.[1]).filter(Boolean) as string[];
        try {
          const turn = await agentTurn(lead, text, history, videosSent);
          const id = await sendWhatsApp(phone, turn.reply);
          await db.from("crm_messages").insert({ lead_id: lead.id, direction: "outbound", channel: "whatsapp", body: turn.reply, provider_message_id: id, status: "sent", ai_generated: true });
          if (turn.video) {
            try {
              const vid = await sendWhatsAppVideo(phone, turn.video);
              await db.from("crm_messages").insert({ lead_id: lead.id, direction: "outbound", channel: "whatsapp", body: `[vidéo:${turn.video}]`, provider_message_id: vid, status: "sent", ai_generated: true });
            } catch (error) { console.error("[WA-WEBHOOK] video failed", error); }
          }
          const fresh = await db.from("leads").select("*").eq("id", lead.id).single();
          await db.from("leads").update({ ...crmPatchFromTurn(fresh.data || lead, turn), last_contact_at: new Date().toISOString() }).eq("id", lead.id);
          console.log("[WA-WEBHOOK] AI reply sent", { leadId: lead.id, providerMessageId: id, video: turn.video, statut: turn.crm.statut, humain: turn.crm.besoin_humain });
        } catch (error) {
          console.error("[WA-WEBHOOK] AI/send failure", error);
          await db.from("crm_messages").insert({ lead_id: lead.id, direction: "draft", channel: "whatsapp", body: `Réponse à préparer : ${text}`, status: "failed", ai_generated: false });
        }
      } else console.log("[WA-WEBHOOK] no automatic reply (IA coupée)", { leadId: lead.id });
      processed++;
    }
    console.log("[WA-WEBHOOK] POST completed", { processed, messagesSeen });
    return NextResponse.json({ ok: true, processed, messagesSeen });
  } catch (error) {
    console.error("[WA-WEBHOOK] UNHANDLED ERROR", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur webhook inconnue" }, { status: 500 });
  }
}
