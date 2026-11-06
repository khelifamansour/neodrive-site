import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { crmDatabase, normalizePhone } from "../../../../lib/crm-agent";
import { whatsappOwner } from "../../../../lib/package-sender";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Standard téléphonique IA (Vapi) : à la fin de chaque appel, le compte rendu arrive ici.
 * On crée ou met à jour le contact dans le CRM, on enregistre le résumé et la transcription,
 * et on prévient le fondateur sur WhatsApp. Protégé par l'en-tête x-vapi-secret (VAPI_WEBHOOK_SECRET).
 */
export async function POST(req: Request) {
  await applyStoredSecrets();
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-vapi-secret") !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const m = body?.message || {};
  if (m.type !== "end-of-call-report") return NextResponse.json({ ok: true, ignored: m.type || "?" });
  const phone = normalizePhone(m.call?.customer?.number || m.customer?.number || "");
  const data = m.analysis?.structuredData || {};
  const summary = String(m.analysis?.summary || "").trim();
  const transcript = String(m.artifact?.transcript || m.transcript || "").slice(0, 8000);
  const duration = Math.round(Number(m.durationSeconds || 0));
  const db = crmDatabase(); const now = new Date().toISOString();
  let lead: any = null;
  if (phone) lead = (await db.from("leads").select("*").eq("telephone", phone).maybeSingle()).data;
  const nom = String(data.nom || "").trim();
  const patch: Record<string, unknown> = {
    statut: "Chaud", phase: data.rappel_souhaite ? "À rappeler" : "Attente réponse", last_inbound_at: now, updated_at: now,
    ...(data.code_postal ? { departement: String(data.code_postal).slice(0, 2) } : {}),
    ...(data.ville ? { ville: String(data.ville) } : {}),
    ...(data.modele ? { modele_interesse: String(data.modele) } : {}),
    ...(data.email ? { email: String(data.email) } : {}),
  };
  if (lead) await db.from("leads").update({ ...patch, ...(nom && (!lead.nom || /prospect/i.test(lead.nom)) ? { nom } : {}) }).eq("id", lead.id);
  else if (phone) lead = (await db.from("leads").insert({ ...patch, nom: nom || "Appel téléphonique", telephone: phone, source: "telephone", whatsapp_opt_in: false, ai_enabled: true, lead_score: 70 }).select().single()).data;
  if (lead) await db.from("crm_messages").insert({ lead_id: lead.id, direction: "inbound", channel: "telephone", body: `📞 Appel (${duration} s) — ${summary}\n\n${transcript}`.slice(0, 9000), status: "received", ai_generated: true });
  const tel = phone ? ("0" + phone.slice(2)).replace(/(\d{2})(?=\d)/g, "$1 ") : "numéro masqué";
  const txt = `📞 Appel pris par le standard IA (${duration} s)\nClient : ${nom || "?"} — ${tel}${data.code_postal ? ` — ${data.code_postal}` : ""}\nPour : ${data.pour_qui || "?"} · Modèle : ${data.modele || "?"}\n${data.rappel_souhaite ? "➡️ Souhaite être rappelé" + (data.creneau_rappel ? ` (${data.creneau_rappel})` : "") : ""}\n\nRésumé : ${summary || "—"}`;
  await whatsappOwner(txt, "Appel manqué").catch(() => false);
  return NextResponse.json({ ok: true, leadId: lead?.id || null });
}
