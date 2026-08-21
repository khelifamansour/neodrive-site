import { NextResponse } from "next/server";
import { crmDatabase, firstMessage, generateCommercialReply, leadScore, normalizePhone, sendWhatsApp, whatsappConfigured } from "@/lib/crm-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(passcode: unknown) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && typeof passcode === "string" && passcode === secret);
}

function safePatch(raw: any) {
  const allowed = ["nom", "telephone", "email", "annonce", "statut", "phase", "operateur", "commentaire", "historique", "next_followup_at", "last_contact_at", "derniere_relance", "source", "modele_interesse", "ville", "departement", "whatsapp_opt_in", "ai_enabled", "opted_out_at"];
  return Object.fromEntries(Object.entries(raw || {}).filter(([key]) => allowed.includes(key)));
}

function splitCsv(text: string): string[][] {
  const delimiter = (text.split(/\r?\n/, 1)[0]?.match(/;/g)?.length || 0) > (text.split(/\r?\n/, 1)[0]?.match(/,/g)?.length || 0) ? ";" : ",";
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (char === delimiter && !quoted) { row.push(field.trim()); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[i + 1] === "\n") i++; row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = ""; }
    else field += char;
  }
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csvRecord(headers: string[], values: string[]) {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => { record[header.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")] = values[index] || ""; });
  const pick = (...keys: string[]) => keys.map(key => record[key]).find(Boolean) || "";
  const consent = pick("consentementwhatsapp", "whatsappoptin", "optin", "consentement");
  return { nom: pick("nom", "name", "prenom", "contact", "acheteur", "fullname"), telephone: pick("telephone", "phone", "tel", "mobile", "numero", "phonenumber"), email: pick("email", "mail", "courriel"), ville: pick("ville", "city", "localite"), annonce: pick("annonce", "ad", "titre", "title", "objet"), commentaire: pick("message", "commentaire", "notes", "demande", "description"), modele_interesse: pick("modele", "vehicule", "produit"), source: "leboncoin", whatsapp_opt_in: /^(oui|yes|true|1|ok)$/i.test(consent) };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!authorized(body.passcode)) return NextResponse.json({ ok: false, error: "Code d'accès incorrect" }, { status: 401 });
  let db: ReturnType<typeof crmDatabase>;
  try { db = crmDatabase(); } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Configuration manquante" }, { status: 503 }); }
  const action = String(body.action || "list");

  if (action === "list") {
    const { data, error } = await db.from("leads").select("*").order("id", { ascending: false }).limit(1000);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, leads: data || [], whatsappConfigured: whatsappConfigured(), aiConfigured: Boolean(process.env.OPENAI_API_KEY), templateConfigured: Boolean(process.env.WHATSAPP_TEMPLATE_NAME) });
  }

  if (action === "import") {
    const text = String(body.csv || "").replace(/^\uFEFF/, "");
    if (!text || text.length > 2_000_000) return NextResponse.json({ ok: false, error: "Fichier CSV manquant ou trop volumineux" }, { status: 400 });
    const rows = splitCsv(text); if (rows.length < 2) return NextResponse.json({ ok: false, error: "Aucun prospect trouvé dans ce fichier" }, { status: 400 });
    const { data: existing } = await db.from("leads").select("telephone,email").limit(10000);
    const phones = new Set((existing || []).map(item => normalizePhone(item.telephone)).filter(Boolean));
    const emails = new Set((existing || []).map(item => String(item.email || "").toLowerCase()).filter(Boolean));
    const inserts: any[] = []; let duplicates = 0; let invalid = 0;
    for (const values of rows.slice(1, 1001)) {
      const lead = csvRecord(rows[0], values); const phone = normalizePhone(lead.telephone); const email = lead.email.toLowerCase();
      if (!phone && !email) { invalid++; continue; }
      if ((phone && phones.has(phone)) || (email && emails.has(email))) { duplicates++; continue; }
      if (phone) phones.add(phone); if (email) emails.add(email);
      inserts.push({ ...lead, telephone: phone || lead.telephone, statut: "Nouveau", phase: "À contacter", lead_score: leadScore(lead), next_followup_at: new Date().toISOString(), history: [{ type: "import", source: "leboncoin", imported_at: new Date().toISOString() }] });
    }
    if (inserts.length) { const { error } = await db.from("leads").insert(inserts); if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
    return NextResponse.json({ ok: true, imported: inserts.length, duplicates, invalid, automaticSending: whatsappConfigured() && Boolean(process.env.WHATSAPP_TEMPLATE_NAME), consentRequired: true });
  }

  if (action === "create") {
    const lead = { ...safePatch(body.lead), statut: "Nouveau", phase: "À contacter", source: "manuel" } as any; lead.lead_score = leadScore(lead);
    const { data, error } = await db.from("leads").insert(lead).select().single();
    return error ? NextResponse.json({ ok: false, error: error.message }, { status: 500 }) : NextResponse.json({ ok: true, lead: data });
  }

  if (action === "update") {
    const patch = { ...safePatch(body.patch), updated_at: new Date().toISOString() };
    const { error } = await db.from("leads").update(patch).eq("id", Number(body.id));
    return error ? NextResponse.json({ ok: false, error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (action === "bulk-status" || action === "delete") {
    const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite).slice(0, 500) : [];
    if (!ids.length) return NextResponse.json({ ok: false, error: "Aucun prospect sélectionné" }, { status: 400 });
    const result = action === "delete" ? await db.from("leads").delete().in("id", ids) : await db.from("leads").update({ statut: String(body.status || "Nouveau"), updated_at: new Date().toISOString() }).in("id", ids);
    return result.error ? NextResponse.json({ ok: false, error: result.error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (["draft", "send", "conversation"].includes(action)) {
    const { data: lead, error } = await db.from("leads").select("*").eq("id", Number(body.id)).single();
    if (error || !lead) return NextResponse.json({ ok: false, error: "Prospect introuvable" }, { status: 404 });
    const { data: messages } = await db.from("crm_messages").select("*").eq("lead_id", lead.id).order("created_at", { ascending: true }).limit(50);
    if (action === "conversation") return NextResponse.json({ ok: true, lead, messages: messages || [] });
    if (action === "draft") {
      const draft = await generateCommercialReply(lead, String(body.incoming || ""), messages || []).catch(() => firstMessage(lead));
      return NextResponse.json({ ok: true, message: draft, whatsappUrl: `https://wa.me/${normalizePhone(lead.telephone)}?text=${encodeURIComponent(draft)}` });
    }
    if (lead.opted_out_at) return NextResponse.json({ ok: false, error: "Ce prospect a refusé les messages" }, { status: 409 });
    const withinWindow = lead.last_inbound_at && Date.now() - new Date(lead.last_inbound_at).getTime() < 24 * 60 * 60 * 1000;
    if (!withinWindow && !lead.whatsapp_opt_in) return NextResponse.json({ ok: false, error: "Consentement WhatsApp requis avant un premier contact automatique" }, { status: 409 });
    const message = String(body.message || firstMessage(lead)).trim(); const template = withinWindow ? undefined : process.env.WHATSAPP_TEMPLATE_NAME;
    if (!withinWindow && !template) return NextResponse.json({ ok: false, error: "Un modèle WhatsApp approuvé est nécessaire pour initier la conversation" }, { status: 409 });
    try {
      const providerId = await sendWhatsApp(lead.telephone, message, template);
      await db.from("crm_messages").insert({ lead_id: lead.id, direction: "outbound", channel: "whatsapp", body: message, provider_message_id: providerId, status: "sent", ai_generated: Boolean(body.aiGenerated) });
      await db.from("leads").update({ statut: lead.statut === "Nouveau" ? "Contacté" : lead.statut, phase: "Attente réponse", last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", lead.id);
      return NextResponse.json({ ok: true, providerMessageId: providerId });
    } catch (err) { return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Envoi impossible" }, { status: 502 }); }
  }

  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
