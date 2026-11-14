import { NextResponse } from "next/server";
import { SAV_STATUSES, statusOf, CHANNEL_LABEL, type SavAttachment } from "../../../../lib/sav-center";
import { findCustomerTicket, importLegacy, signMedia } from "../../../../lib/sav-server";

export const dynamic = "force-dynamic";

/** Suivi client : référence + e-mail → statut, historique et conversation (sans les notes internes). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const found = await findCustomerTicket(b.reference, b.email);
  if ("error" in found) return NextResponse.json({ ok: false, error: found.error }, { status: found.status });
  const { sb, ticket: t } = found;
  if (!t.legacy_imported_at) { await importLegacy(sb, t).catch(() => null); }
  const { data: fresh } = await sb.from("sav_tickets").select("sav_status,closed_at").eq("id", t.id).maybeSingle();
  const st = statusOf(fresh?.sav_status || t.sav_status);
  const [{ data: msgs }, { data: events }] = await Promise.all([
    sb.from("sav_messages").select("id,created_at,direction,channel,author,body,attachments").eq("ticket_id", t.id).in("direction", ["in", "out"]).order("created_at", { ascending: true }),
    sb.from("sav_events").select("created_at,kind,to_value").eq("ticket_id", t.id).in("kind", ["created", "status"]).order("created_at", { ascending: true }),
  ]);
  const messages = [];
  for (const m of msgs || []) {
    messages.push({
      id: m.id, at: m.created_at, from: m.direction === "in" ? "client" : "neodrive", channel: CHANNEL_LABEL[m.channel] || m.channel,
      // Prénom seulement pour l'équipe NeoDrive
      author: m.direction === "out" ? String(m.author || "NeoDrive").replace(/\s*\(.*\)$/, "").split(" ")[0] : "Vous",
      body: m.body, media: await signMedia(sb, m.attachments as SavAttachment[]),
    });
  }
  return NextResponse.json({
    ok: true,
    ticket: { reference: t.public_reference, category: t.category, vin: t.vin, created_at: t.created_at, closed_at: fresh?.closed_at || null, advice: t.ai_diagnosis, resolution: t.resolution, parts: t.requested_parts || [] },
    stage: { key: st.key, label: st.client, message: st.clientMsg },
    steps: SAV_STATUSES.map(s => ({ key: s.key, label: s.client })),
    events: (events || []).map(e => ({ at: e.created_at, label: e.kind === "created" ? "Demande reçue" : statusOf(e.to_value).client })),
    messages,
    media: await signMedia(sb, t.attachments as SavAttachment[]),
  });
}
