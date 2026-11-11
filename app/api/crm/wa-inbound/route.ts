import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { crmDatabase, normalizePhone } from "../../../../lib/crm-agent";
import { brevoReady, sendSms } from "../../../../lib/brevo";

export const dynamic = "force-dynamic";

const CALLBACK = /rappel|conseill|appelez|m.appeler|me joindre|t[ée]l[ée]phon|un humain|une personne/i;

/**
 * Appelé par l'agent WhatsApp (Hana) à chaque message reçu : crée ou met à jour la fiche du contact dans le CRM
 * (source « whatsapp » ou « pub_meta »), et prévient le fondateur par SMS quand le client demande à être rappelé.
 * La fiche est marquée comme déjà en conversation pour ne pas recevoir le package WhatsApp automatique en double.
 */
export async function POST(req: Request) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || req.headers.get("authorization") !== `Bearer ${key}`) return NextResponse.json({ ok: false }, { status: 401 });
  await applyStoredSecrets();
  const b = await req.json().catch(() => null) as { phone?: string; name?: string; text?: string; fromAd?: boolean } | null;
  const phone = normalizePhone(b?.phone);
  if (!phone) return NextResponse.json({ ok: false, error: "phone" }, { status: 400 });
  const text = String(b?.text || "").slice(0, 500);
  const now = new Date().toISOString();
  const db = crmDatabase();
  const { data: lead } = await db.from("leads").select("id,nom,source,phase,history,commentaire").eq("telephone", phone).maybeSingle();
  const wantsCall = CALLBACK.test(text);
  let id = lead?.id as number | undefined;
  if (!lead) {
    const ins = await db.from("leads").insert({
      nom: String(b?.name || "").slice(0, 80) || "Contact WhatsApp", telephone: phone,
      source: b?.fromAd ? "pub_meta" : "whatsapp", statut: "Contacté", phase: wantsCall ? "À rappeler" : "Attente réponse",
      whatsapp_opt_in: true, ai_enabled: true, lead_score: b?.fromAd ? 60 : 50, last_inbound_at: now, last_contact_at: now,
      commentaire: `1er message WhatsApp : ${text}`.slice(0, 500),
      history: [{ type: "package", channel: "whatsapp_inbound", sent_at: now }, { type: "whatsapp_inbound", at: now, from_ad: !!b?.fromAd }],
    }).select("id").single();
    id = ins.data?.id;
  } else {
    const patch: Record<string, unknown> = { last_inbound_at: now, updated_at: now };
    if (b?.fromAd && lead.source !== "pub_meta") patch.source = "pub_meta";
    if (wantsCall) patch.phase = "À rappeler";
    await db.from("leads").update(patch).eq("id", lead.id);
  }
  // Alerte rappel : une seule par contact et par jour.
  let alerted = false;
  if (wantsCall && brevoReady() && id) {
    const today = now.slice(0, 10);
    const h = Array.isArray(lead?.history) ? lead!.history : [];
    if (!h.some((x: any) => x?.type === "callback_alert" && String(x.at || "").startsWith(today))) {
      try {
        await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", `Rappel demandé (WhatsApp${b?.fromAd ? ", pub Meta" : ""}) : ${b?.name || ""} 0${phone.slice(2)} - "${text.slice(0, 120)}"`.slice(0, 300));
        alerted = true;
        const { data: cur } = await db.from("leads").select("history").eq("id", id).single();
        await db.from("leads").update({ history: [...(Array.isArray(cur?.history) ? cur!.history : []), { type: "callback_alert", at: now }].slice(-60) }).eq("id", id);
      } catch (e) { console.error("[WA-INBOUND] alerte", e); }
    }
  }
  return NextResponse.json({ ok: true, id, created: !lead, alerted });
}
