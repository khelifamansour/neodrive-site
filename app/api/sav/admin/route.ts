import { NextResponse } from "next/server";
import OpenAI from "openai";
import { authorizeSection, logSection } from "../../../../lib/access";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { sendEmail } from "../../../../lib/brevo";
import { SAV_PRIORITIES, SAV_STATUSES, alertsOf, daysOpen, isPriority, isStatus, statusOf, CHANNEL_LABEL, type SavAttachment, type SavMessage } from "../../../../lib/sav-center";
import { TICKET_FIELDS, addEvent, addMessage, clip, emailHtml, importLegacy, savDb, signMedia, statusPatch, suiviUrl } from "../../../../lib/sav-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/**
 * Back-office SAV (/sav/admin). Accès : code du fondateur OU membre de l'équipe ayant la section « sav » (cookie).
 * Actions : list, get, update, message, summary.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const access = await authorizeSection(req, b.passcode, "sav");
  if (!access) return bad("Accès refusé : code incorrect ou section SAV non autorisée.", 401);
  const sb = savDb();
  if (!sb) return bad("Configuration serveur incomplète", 503);
  const me = access.name;
  const action = String(b.action || "");

  if (action === "list") {
    const { data, error } = await sb.from("sav_tickets").select(TICKET_FIELDS).order("created_at", { ascending: false }).limit(500);
    if (error) return bad(error.message, 500);
    let rows = data || [];
    // Reprise unique de l'ancien suivi (ne fait rien si déjà repris)
    const todo = rows.filter(t => !t.legacy_imported_at);
    if (todo.length) {
      for (const t of todo) await importLegacy(sb, t).catch(e => console.error("[SAV] import", t.public_reference, e));
      ({ data: rows = [] } = await sb.from("sav_tickets").select(TICKET_FIELDS).order("created_at", { ascending: false }).limit(500) as { data: typeof rows });
    }
    const ids = rows.map(t => t.id);
    const counts: Record<string, number> = {};
    const lastMsg: Record<string, { at: string; direction: string; body: string }> = {};
    if (ids.length) {
      const { data: msgs } = await sb.from("sav_messages").select("ticket_id,created_at,direction,body").in("ticket_id", ids).order("created_at", { ascending: true });
      for (const m of msgs || []) { counts[m.ticket_id] = (counts[m.ticket_id] || 0) + 1; lastMsg[m.ticket_id] = { at: m.created_at, direction: m.direction, body: String(m.body || "").slice(0, 140) }; }
    }
    const now = Date.now();
    const tickets = rows.map(t => ({
      id: t.id, ref: t.public_reference || t.ticket_number, sav_status: t.sav_status || "nouveau", priority: t.priority || "normal",
      customer_name: t.customer_name, customer_phone: t.customer_phone, customer_email: t.customer_email, vin: t.vin, category: t.category,
      assigned_to: t.assigned_to || t.assigned_garage || null, created_at: t.created_at, updated_at: t.updated_at, closed_at: t.closed_at,
      status_changed_at: t.status_changed_at, days_open: daysOpen(t, now), alerts: alertsOf(t, now),
      attachments: (t.attachments as unknown[] | null)?.length || 0, messages: counts[t.id] || 0, last: lastMsg[t.id] || null,
      parts: (t.requested_parts as unknown[] | null)?.length || 0,
    }));
    return NextResponse.json({ ok: true, me, who: access.who, statuses: SAV_STATUSES.map(s => ({ key: s.key, label: s.label, color: s.color })), priorities: SAV_PRIORITIES, tickets });
  }

  const id = String(b.id || "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return bad("Ticket manquant");
  const { data: t, error: tErr } = await sb.from("sav_tickets").select(TICKET_FIELDS).eq("id", id).maybeSingle();
  if (tErr) return bad(tErr.message, 500);
  if (!t) return bad("Ticket introuvable", 404);
  const ref = t.public_reference || t.ticket_number;

  if (action === "get") {
    const [{ data: msgs }, { data: events }] = await Promise.all([
      sb.from("sav_messages").select("*").eq("ticket_id", id).order("created_at", { ascending: true }),
      sb.from("sav_events").select("*").eq("ticket_id", id).order("created_at", { ascending: true }),
    ]);
    const messages: SavMessage[] = [];
    for (const m of (msgs || []) as SavMessage[]) messages.push({ ...m, media: await signMedia(sb, m.attachments, "message") });
    const ticketMedia = await signMedia(sb, t.attachments as SavAttachment[], "ticket");
    // Pièces : demandées par le client (copie) + recommandées (catalogue actuel)
    const requested = (t.requested_parts as { id: string }[] | null) || [];
    const recIds = ((t.recommended_part_ids as string[] | null) || []).filter(x => !requested.some(r => r.id === x));
    const ids = [...requested.map(r => r.id), ...recIds].filter(Boolean);
    let catalog: Record<string, unknown>[] = [];
    if (ids.length) ({ data: catalog = [] } = await sb.from("parts").select("id,sku,name,category,sale_price,image_url,stock_qty").in("id", ids) as { data: Record<string, unknown>[] });
    const parts = [...requested.map(r => ({ ...r, ...(catalog.find(c => c.id === r.id) || {}), kind: "client" })), ...recIds.map(x => ({ ...(catalog.find(c => c.id === x) || { id: x, name: "Pièce", sku: null, image_url: null }), kind: "recommandée" }))];
    let vehicle = null;
    if (t.vehicle_id) ({ data: vehicle } = await sb.from("vehicles").select("vin,internal_ref,model,version,color,status").eq("id", t.vehicle_id).maybeSingle());
    // Autres demandes du même client (téléphone, e-mail ou VIN)
    const seen = new Map<string, Record<string, unknown>>();
    for (const [col, val] of [["customer_phone", t.customer_phone], ["customer_email", t.customer_email], ["vin", t.vin]] as const) {
      if (!val) continue;
      const { data } = await sb.from("sav_tickets").select("id,public_reference,sav_status,created_at,category").eq(col, val).neq("id", id).limit(20);
      for (const o of data || []) seen.set(o.id, o);
    }
    const others = [...seen.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    await logSection(access, "sav_view", { ref });
    const now = Date.now();
    return NextResponse.json({ ok: true, me, ticket: { ...t, ref, sav_status: t.sav_status || "nouveau", days_open: daysOpen(t, now), alerts: alertsOf(t, now) }, messages, events: events || [], media: ticketMedia, parts, vehicle, history: others });
  }

  if (action === "update") {
    const patch: Record<string, unknown> = {};
    const changes: string[] = [];
    const clientMsg = clip(b.client_message, 3000);
    if (b.sav_status !== undefined && b.sav_status !== t.sav_status) {
      if (!isStatus(b.sav_status)) return bad("Statut invalide");
      Object.assign(patch, statusPatch(b.sav_status, t.closed_at));
      await addEvent(sb, id, { kind: "status", from: t.sav_status, to: b.sav_status, author: me, note: clientMsg || null });
      changes.push(`statut → ${statusOf(b.sav_status).label}`);
    }
    if (b.priority !== undefined && b.priority !== t.priority) {
      if (!isPriority(b.priority)) return bad("Priorité invalide");
      patch.priority = b.priority;
      await addEvent(sb, id, { kind: "priority", from: t.priority, to: String(b.priority), author: me });
      changes.push("priorité");
    }
    if (b.assigned_to !== undefined) {
      const a = clip(b.assigned_to, 120) || null;
      if (a !== (t.assigned_to || null)) { patch.assigned_to = a; await addEvent(sb, id, { kind: "assign", from: t.assigned_to, to: a, author: me }); changes.push("attribution"); }
    }
    if (b.resolution !== undefined) {
      const r = clip(b.resolution, 3000) || null;
      if (r !== (t.resolution || null)) { patch.resolution = r; await addEvent(sb, id, { kind: "resolution", to: r, author: me }); changes.push("solution"); }
    }
    if (Object.keys(patch).length) {
      patch.updated_at = new Date().toISOString();
      const { error } = await sb.from("sav_tickets").update(patch).eq("id", id);
      if (error) return bad(error.message, 500);
    }
    // Message visible par le client sur sa page de suivi
    if (clientMsg) await addMessage(sb, id, { direction: "out", channel: "plateforme", author: me, body: clientMsg });
    await logSection(access, "sav_update", { ref, changes, client_message: !!clientMsg });
    return NextResponse.json({ ok: true, changes });
  }

  if (action === "message") {
    const kind = String(b.kind || "");
    const body = clip(b.body, 8000);
    if (!body) return bad("Écrivez le message d’abord.");
    if (kind === "email") {
      if (!t.customer_email) return bad("Pas d’adresse e-mail pour ce client.");
      if (b.dry !== true) {
        await applyStoredSecrets();
        try {
          await sendEmail(t.customer_email, t.customer_name || "", `NeoDrive · votre demande ${ref}`, emailHtml(`Votre demande ${ref}`, body, suiviUrl(ref), "Voir ma demande et répondre"));
        } catch (e) { return bad("E-mail non envoyé : " + (e as Error).message, 502); }
      }
      const m = await addMessage(sb, id, { direction: "out", channel: "email", author: me, body });
      await logSection(access, "sav_email", { ref });
      return NextResponse.json({ ok: true, message: m, sent: b.dry !== true });
    }
    const map: Record<string, { direction: "in" | "out" | "note"; channel: "email" | "whatsapp" | "plateforme" | "note"; log: string }> = {
      whatsapp: { direction: "out", channel: "whatsapp", log: "sav_whatsapp" },
      in_whatsapp: { direction: "in", channel: "whatsapp", log: "sav_client_reply" },
      in_email: { direction: "in", channel: "email", log: "sav_client_reply" },
      note: { direction: "note", channel: "note", log: "sav_note" },
    };
    const k = map[kind];
    if (!k) return bad("Type de message inconnu");
    const m = await addMessage(sb, id, { direction: k.direction, channel: k.channel, author: k.direction === "in" ? `${t.customer_name || "Client"} (collé par ${me})` : me, body });
    // Une réponse du client sort le ticket de « Attente client »
    if (k.direction === "in" && t.sav_status === "attente_client") {
      await sb.from("sav_tickets").update(statusPatch("en_cours", t.closed_at)).eq("id", id);
      await addEvent(sb, id, { kind: "status", from: "attente_client", to: "en_cours", author: me, note: "Réponse du client reçue" });
    }
    await logSection(access, k.log, { ref });
    return NextResponse.json({ ok: true, message: m });
  }

  if (action === "summary") {
    await applyStoredSecrets();
    if (!process.env.OPENAI_API_KEY) return bad("Résumé IA indisponible (clé OpenAI absente).", 503);
    const { data: msgs } = await sb.from("sav_messages").select("created_at,direction,channel,author,body").eq("ticket_id", id).order("created_at", { ascending: true }).limit(80);
    const thread = (msgs || []).map(m => `[${m.created_at.slice(0, 16)}] ${m.direction === "in" ? "CLIENT" : m.direction === "note" ? "NOTE INTERNE" : "NEODRIVE"} (${CHANNEL_LABEL[m.channel] || m.channel}, ${m.author || ""}) : ${m.body}`).join("\n").slice(-12000);
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const r = await client.responses.create({ model: process.env.OPENAI_SUPPORT_MODEL || "gpt-5-mini", max_output_tokens: 600, input: `Tu aides l'équipe SAV NeoDrive (voitures sans permis électriques). Résume ce dossier en français simple pour un collègue qui le découvre : 1) le problème, 2) ce qui a été fait, 3) ce qu'on attend (et de qui), 4) la prochaine action conseillée. 8 lignes maximum, pas de jargon.\nTicket ${ref} · statut ${statusOf(t.sav_status).label} · sujet ${t.category} · code ${t.error_code || "aucun"} · VIN ${t.vin || "?"}\nDescription client : ${t.description}\nConversation :\n${thread || "(aucun message)"}` });
      await logSection(access, "sav_summary", { ref });
      return NextResponse.json({ ok: true, summary: r.output_text.trim() });
    } catch (e) { return bad("Résumé IA impossible : " + (e as Error).message, 502); }
  }

  return bad("Action inconnue");
}
