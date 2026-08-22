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
  console.log("[WA-WEBHOOK] POST received", {
    at: new Date().toISOString(),
    contentType: request.headers.get("content-type"),
    hasSignature: Boolean(request.headers.get("x-hub-signature-256")),
  });

  try {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      console.error("[WA-WEBHOOK] WHATSAPP_APP_SECRET missing");
      return NextResponse.json({ ok: false, error: "Signature webhook non configurée" }, { status: 503 });
    }

    const raw = await request.text();
    const received = request.headers.get("x-hub-signature-256") || "";
    const expected = `sha256=${createHmac("sha256", appSecret).update(raw).digest("hex")}`;
    const signatureValid = received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
    console.log("[WA-WEBHOOK] signature check", { valid: signatureValid, payloadBytes: raw.length });
    if (!signatureValid) {
      console.error("[WA-WEBHOOK] invalid Meta signature");
      return NextResponse.json({ ok: false, error: "Signature invalide" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      console.error("[WA-WEBHOOK] invalid JSON", error);
      return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
    }

    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    console.log("[WA-WEBHOOK] payload accepted", { object: payload?.object, entries: entries.length });

    const db = crmDatabase();
    let processed = 0;
    let messagesSeen = 0;

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        console.log("[WA-WEBHOOK] change received", {
          field: change?.field,
          phoneNumberId: change?.value?.metadata?.phone_number_id,
          messages: Array.isArray(change?.value?.messages) ? change.value.messages.length : 0,
          statuses: Array.isArray(change?.value?.statuses) ? change.value.statuses.length : 0,
        });

        for (const message of change.value?.messages || []) {
          messagesSeen++;
          const phone = normalizePhone(message.from);
          const text = String(message.text?.body || "").trim();
          console.log("[WA-WEBHOOK] inbound message", {
            messageId: message.id || null,
            type: message.type || null,
            from: phone ? `${phone.slice(0, 4)}***${phone.slice(-3)}` : null,
            hasText: Boolean(text),
          });
          if (!phone || !text) {
            console.warn("[WA-WEBHOOK] message skipped: unsupported/empty message");
            continue;
          }

          const lookup = await db.from("leads").select("*").eq("telephone", phone).maybeSingle();
          if (lookup.error) console.error("[WA-WEBHOOK] lead lookup error", lookup.error);
          let lead = lookup.data;

          if (!lead) {
            const name = change.value?.contacts?.[0]?.profile?.name || "Prospect WhatsApp";
            const inserted = await db.from("leads").insert({ nom: name, telephone: phone, source: "whatsapp", statut: "Nouveau", phase: "À contacter", whatsapp_opt_in: true, lead_score: 50 }).select().single();
            if (inserted.error) console.error("[WA-WEBHOOK] lead creation error", inserted.error);
            lead = inserted.data;
          }
          if (!lead) {
            console.error("[WA-WEBHOOK] unable to resolve/create lead");
            continue;
          }

          const duplicateCheck = await db.from("crm_messages").select("id").eq("provider_message_id", String(message.id || "")).maybeSingle();
          if (duplicateCheck.error) console.error("[WA-WEBHOOK] duplicate lookup error", duplicateCheck.error);
          if (duplicateCheck.data) {
            console.log("[WA-WEBHOOK] duplicate message ignored", { messageId: message.id });
            continue;
          }

          const inboundInsert = await db.from("crm_messages").insert({ lead_id: lead.id, direction: "inbound", channel: "whatsapp", body: text, provider_message_id: message.id || null, status: "received" });
          if (inboundInsert.error) console.error("[WA-WEBHOOK] inbound insert error", inboundInsert.error);

          const stop = /^(stop|désabonner|desabonner|unsubscribe|ne plus contacter|non merci)$/i.test(text);
          const now = new Date().toISOString();
          const leadUpdate = await db.from("leads").update({ last_inbound_at: now, whatsapp_opt_in: !stop, opted_out_at: stop ? now : null, next_followup_at: null, statut: stop ? "Perdu" : "Chaud", phase: stop ? "Terminé" : "Attente réponse", updated_at: now }).eq("id", lead.id);
          if (leadUpdate.error) console.error("[WA-WEBHOOK] lead update error", leadUpdate.error);

          if (!stop && lead.ai_enabled) {
            console.log("[WA-WEBHOOK] AI reply enabled", { leadId: lead.id });
            const historyResult = await db.from("crm_messages").select("direction,body").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(8);
            if (historyResult.error) console.error("[WA-WEBHOOK] history load error", historyResult.error);
            try {
              const reply = await generateCommercialReply(lead, text, (historyResult.data || []).reverse());
              const id = await sendWhatsApp(phone, reply);
              const outboundInsert = await db.from("crm_messages").insert({ lead_id: lead.id, direction: "outbound", channel: "whatsapp", body: reply, provider_message_id: id, status: "sent", ai_generated: true });
              if (outboundInsert.error) console.error("[WA-WEBHOOK] outbound insert error", outboundInsert.error);
              console.log("[WA-WEBHOOK] AI reply sent", { leadId: lead.id, providerMessageId: id });
            } catch (error) {
              console.error("[WA-WEBHOOK] AI/send failure", error);
              await db.from("crm_messages").insert({ lead_id: lead.id, direction: "draft", channel: "whatsapp", body: `Réponse à préparer : ${text}`, status: "failed", ai_generated: false });
            }
          } else {
            console.log("[WA-WEBHOOK] no automatic reply", { leadId: lead.id, stop, aiEnabled: Boolean(lead.ai_enabled) });
          }
          processed++;
        }
      }
    }

    console.log("[WA-WEBHOOK] POST completed", { processed, messagesSeen });
    return NextResponse.json({ ok: true, processed, messagesSeen });
  } catch (error) {
    console.error("[WA-WEBHOOK] UNHANDLED ERROR", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur webhook inconnue" }, { status: 500 });
  }
}
