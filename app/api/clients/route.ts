import { NextResponse } from "next/server";
import { authorizeSection, logSection } from "../../../lib/access";
import { crmDatabase } from "../../../lib/crm-agent";
import { isSatisfaction, isStatus, normalizePhone, toIsoDate, type Customer, type HistoryItem, type Status } from "../../../lib/clients";

/**
 * Clients et avis — suivi des clients livrés. AUCUN envoi automatique :
 * le navigateur ouvre WhatsApp / l'appli SMS avec le message pré-rempli, et cette route enregistre seulement l'action.
 * POST { passcode, action, ... } — actions : list, save, import, act.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TABLE = "customers_followup";
const clean = (v: unknown, n = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const opt = (v: unknown, n = 200) => clean(v, n) || null;
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

function fields(b: Record<string, unknown>) {
  const d = clean(b.delivered_at, 20);
  return {
    first_name: clean(b.first_name, 80), last_name: clean(b.last_name, 80), phone: opt(b.phone, 40), email: opt(b.email, 160)?.toLowerCase() ?? null,
    city: opt(b.city, 80), model: opt(b.model, 60), vin: opt(b.vin, 40)?.replace(/\s+/g, "").toUpperCase() ?? null,
    delivered_at: d ? (toIsoDate(d) ?? null) : null, source: opt(b.source, 60),
  };
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  const who = await authorizeSection(req, b.passcode, "clients");
  if (!who) return fail("Code incorrect", 401);
  const db = crmDatabase();
  const now = new Date().toISOString();
  const by = who.name;

  if (b.action === "list") {
    const { data, error } = await db.from(TABLE).select("*").order("updated_at", { ascending: false }).limit(2000);
    if (error) return fail(error.message, 500);
    return NextResponse.json({ ok: true, customers: data || [], me: { who: who.who, name: who.name } });
  }

  if (b.action === "save") {
    const f = fields(b.customer || {});
    if (!f.first_name && !f.last_name) return fail("Indiquez au moins le prénom ou le nom.");
    if (b.customer?.id) {
      const id = Number(b.customer.id);
      const { data: cur } = await db.from(TABLE).select("history").eq("id", id).single();
      if (!cur) return fail("Client introuvable", 404);
      const history = [...((cur.history as HistoryItem[]) || []), { at: now, action: "Fiche modifiée", by }];
      const { data, error } = await db.from(TABLE).update({ ...f, updated_at: now, history }).eq("id", id).select("*").single();
      if (error) return fail(error.message, 500);
      await logSection(who, "clients:modifier", { id });
      return NextResponse.json({ ok: true, customer: data });
    }
    const { data, error } = await db.from(TABLE).insert({ ...f, source: f.source || "manuel", status: "à contacter", history: [{ at: now, action: "Client ajouté", by }] }).select("*").single();
    if (error) return fail(error.message, 500);
    await logSection(who, "clients:ajouter", { id: data.id });
    return NextResponse.json({ ok: true, customer: data });
  }

  if (b.action === "import") {
    const rows = Array.isArray(b.rows) ? b.rows.slice(0, 1000) : [];
    if (!rows.length) return fail("Aucun client à importer.");
    const { data: existing } = await db.from(TABLE).select("phone");
    const known = new Set((existing || []).map((r: { phone: string | null }) => normalizePhone(r.phone).intl).filter(Boolean));
    const toInsert: Record<string, unknown>[] = []; let skipped = 0;
    for (const r of rows) {
      const f = fields({ ...r, source: b.source || "import" });
      if (!f.first_name && !f.last_name) { skipped++; continue; }
      const p = normalizePhone(f.phone).intl;
      if (p && known.has(p)) { skipped++; continue; }
      if (p) known.add(p);
      toInsert.push({ ...f, status: "à contacter", history: [{ at: now, action: "Client importé", by }] });
    }
    if (toInsert.length) { const { error } = await db.from(TABLE).insert(toInsert); if (error) return fail(error.message, 500); }
    await logSection(who, "clients:import", { added: toInsert.length, skipped });
    return NextResponse.json({ ok: true, added: toInsert.length, skipped });
  }

  if (b.action === "act") {
    const id = Number(b.id);
    const { data: c } = await db.from(TABLE).select("*").eq("id", id).single<Customer>();
    if (!c) return fail("Client introuvable", 404);
    const patch: Partial<Customer> = {};
    let entry: HistoryItem;
    const kind = String(b.kind || "");
    const channel = b.channel === "sms" ? "sms" : b.channel === "whatsapp" ? "whatsapp" : null;

    switch (kind) {
      case "message_nouvelles":
      case "message_avis": {
        if (c.status === "ne pas contacter") return fail("Ce client est marqué « Ne pas contacter ».", 409);
        if (kind === "message_avis" && c.status === "problème en cours") return fail("Un problème est en cours : réglez-le d'abord, puis demandez l'avis.", 409);
        if (!channel) return fail("Canal inconnu.");
        patch.last_contact_at = now;
        if (kind === "message_nouvelles") { if (["à contacter", "nouvelles demandées"].includes(c.status)) patch.status = "nouvelles demandées"; }
        else if (c.status !== "avis laissé") patch.status = "avis demandé";
        entry = { at: now, action: kind === "message_avis" ? "Demande d'avis ouverte" : "Prise de nouvelles ouverte", channel, text: clean(b.text, 2000) };
        break;
      }
      case "satisfaction": {
        const s = b.value === null || b.value === "" ? null : b.value;
        if (s !== null && !isSatisfaction(s)) return fail("Valeur inconnue.");
        patch.satisfaction = s;
        entry = { at: now, action: s ? `Réponse du client : ${s}` : "Réponse effacée" };
        break;
      }
      case "probleme": {
        patch.status = "problème en cours";
        if (b.sav_ticket_ref !== undefined) patch.sav_ticket_ref = opt(b.sav_ticket_ref, 40);
        entry = { at: now, action: "Problème signalé" + (patch.sav_ticket_ref ? ` (ticket ${patch.sav_ticket_ref})` : ""), text: opt(b.text, 1000) };
        break;
      }
      case "ticket": {
        patch.sav_ticket_ref = opt(b.sav_ticket_ref, 40);
        entry = { at: now, action: patch.sav_ticket_ref ? `Ticket SAV : ${patch.sav_ticket_ref}` : "Ticket SAV retiré" };
        break;
      }
      case "resolu": {
        if (c.status !== "problème en cours") return fail("Aucun problème en cours.");
        patch.status = "nouvelles demandées";
        entry = { at: now, action: "Problème résolu", text: opt(b.text, 1000) };
        break;
      }
      case "avis_laisse": {
        patch.status = "avis laissé";
        entry = { at: now, action: "Avis Google laissé ✓" };
        break;
      }
      case "ne_pas_contacter": {
        const reason = clean(b.reason, 500);
        if (!reason) return fail("Indiquez la raison.");
        patch.status = "ne pas contacter"; patch.do_not_contact_reason = reason;
        entry = { at: now, action: "Ne pas contacter", text: reason };
        break;
      }
      case "reactiver": {
        if (c.status !== "ne pas contacter") return fail("Ce client n'est pas bloqué.");
        patch.status = "à contacter"; patch.do_not_contact_reason = null;
        entry = { at: now, action: "Client de nouveau à contacter" };
        break;
      }
      case "statut": {
        if (!isStatus(b.value)) return fail("Statut inconnu.");
        if (b.value === "ne pas contacter") return fail("Utilisez le bouton « Ne pas contacter » (raison obligatoire).");
        patch.status = b.value as Status;
        entry = { at: now, action: `Statut changé : ${b.value}` };
        break;
      }
      case "notes": {
        patch.notes = opt(b.notes, 4000);
        entry = { at: now, action: "Notes modifiées" };
        break;
      }
      default: return fail("Action inconnue.");
    }

    const history = [...(c.history || []), { ...entry, by }];
    const { data, error } = await db.from(TABLE).update({ ...patch, history, updated_at: now }).eq("id", id).select("*").single();
    if (error) return fail(error.message, 500);
    await logSection(who, `clients:${kind}`, { id });
    return NextResponse.json({ ok: true, customer: data });
  }

  return fail("Action inconnue.");
}
