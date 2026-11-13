import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../lib/integrations";
import { crmDatabase, generateCommercialReply, normalizePhone, sendWhatsApp } from "../../../lib/crm-agent";
import { brevoReady, sendEmail, OWNER_EMAIL } from "../../../lib/brevo";
import { CALL_RESULTS, TEAM_COOKIE, endSessions, firstName, logActivity, maskEmail, maskPhone, newToken, sha, teamSession } from "../../../lib/team";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
const clean = (v: unknown, n = 2000) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const deny = (error = "Session expirée : reconnectez-vous.") => { const r = NextResponse.json({ ok: false, error, logout: true }, { status: 401 }); r.cookies.set(TEAM_COOKIE, "", { path: "/", maxAge: 0 }); return r; };
const STATUT: Record<string, string> = { "Intéressé": "Chaud", "Devis envoyé": "Chaud", "Réservation": "Client", "Pas intéressé": "Perdu", "Mauvais numéro": "Perdu" };

/** Liste publique minimale de la fiche (pas de numéro ni d'e-mail en clair). */
const card = (l: Record<string, any>) => ({ id: l.id, nom: firstName(l.nom), ville: l.ville || "", departement: l.departement || "", modele: l.modele_interesse || "", statut: l.statut, phase: l.phase || "", rappel: l.next_followup_at, dernier: l.last_contact_at, tel: maskPhone(l.telephone), email: maskEmail(l.email), source: l.source || "", annonce: String(l.annonce || "").slice(0, 160) });

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  const db = crmDatabase();
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 60); const ua = (req.headers.get("user-agent") || "").slice(0, 200);

  if (b.action === "login") {
    const code = String(b.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length < 8) return NextResponse.json({ ok: false, error: "Code incorrect." }, { status: 401 });
    const withDash = `${code.slice(0, 5)}-${code.slice(5)}`;
    const { data: m } = await db.from("team_members").select("*").eq("code_hash", sha(withDash)).maybeSingle();
    if (!m) return NextResponse.json({ ok: false, error: "Code incorrect." }, { status: 401 });
    if (!m.active || m.revoked_at) { await logActivity(m.id, "login_failed", null, { reason: "coupé", ip }); return NextResponse.json({ ok: false, error: "Cet accès a été désactivé." }, { status: 403 }); }
    if (m.expires_at && new Date(m.expires_at).getTime() < Date.now()) { await logActivity(m.id, "login_failed", null, { reason: "expiré", ip }); return NextResponse.json({ ok: false, error: "Cet accès a expiré." }, { status: 403 }); }
    await endSessions(m.id); // une seule session à la fois
    const token = newToken();
    await db.from("team_sessions").insert({ member_id: m.id, token_hash: sha(token), ip, ua });
    await db.from("team_members").update({ last_seen_at: new Date().toISOString() }).eq("id", m.id);
    await logActivity(m.id, "login", null, { ip, ua: ua.slice(0, 80) });
    const r = NextResponse.json({ ok: true });
    r.cookies.set(TEAM_COOKIE, token, { path: "/", httpOnly: true, secure: true, sameSite: "strict", maxAge: 14 * 3600 });
    return r;
  }

  const ctx = await teamSession(req); if (!ctx) return deny();
  const { member, session } = ctx; const now = new Date();

  if (b.action === "logout") { await db.from("team_sessions").update({ ended_at: now.toISOString() }).eq("id", session.id); await logActivity(member.id, "logout"); return deny("Déconnecté."); }

  // Battement de cœur : compte le temps actif (onglet visible) par tranches de 90 s maximum.
  if (b.action === "ping") {
    const gap = Math.min(90, Math.max(0, Math.round((now.getTime() - new Date(session.last_seen_at).getTime()) / 1000)));
    await db.from("team_sessions").update({ last_seen_at: now.toISOString(), active_seconds: session.active_seconds + (b.visible ? gap : 0) }).eq("id", session.id);
    await db.from("team_members").update({ last_seen_at: now.toISOString() }).eq("id", member.id);
    return NextResponse.json({ ok: true });
  }

  const mine = () => db.from("leads").select("*").eq("assigned_to", String(member.id));

  if (b.action === "me") {
    const today = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" })); today.setHours(0, 0, 0, 0);
    const { count } = await db.from("leads").select("id", { count: "exact", head: true }).eq("assigned_to", String(member.id));
    const { data: acts } = await db.from("team_activity").select("action").eq("member_id", member.id).gte("at", new Date(Date.now() - 16 * 3600e3).toISOString());
    return NextResponse.json({ ok: true, member: { name: member.name, role: member.role, expires_at: member.expires_at }, total: count || 0, results: CALL_RESULTS, today: { calls: (acts || []).filter(a => a.action === "call_result").length, messages: (acts || []).filter(a => a.action === "whatsapp").length } });
  }

  if (b.action === "list") {
    const page = Math.max(0, Number(b.page) || 0); const per = 15;
    let q = mine().order("next_followup_at", { ascending: true, nullsFirst: false }).order("id", { ascending: true }).range(page * per, page * per + per - 1);
    if (b.filter === "a_rappeler") q = q.lte("next_followup_at", new Date(Date.now() + 12 * 3600e3).toISOString());
    else if (b.filter === "nouveaux") q = q.eq("statut", "Nouveau");
    else if (b.filter === "chauds") q = q.eq("statut", "Chaud");
    const { data } = await q;
    return NextResponse.json({ ok: true, leads: (data || []).map(card), page, more: (data || []).length === per });
  }

  const id = Number(b.id); if (!id) return NextResponse.json({ ok: false, error: "Fiche manquante" }, { status: 400 });
  const { data: lead } = await mine().eq("id", id).maybeSingle();
  if (!lead) return NextResponse.json({ ok: false, error: "Cette fiche ne vous est pas attribuée." }, { status: 403 });

  if (b.action === "lead") {
    // Garde-fou : nombre de fiches ouvertes par heure.
    const { count } = await db.from("team_activity").select("id", { count: "exact", head: true }).eq("member_id", member.id).eq("action", "view_lead").gte("at", new Date(Date.now() - 3600e3).toISOString());
    if ((count || 0) >= member.max_views_per_hour) {
      await logActivity(member.id, "blocked", id, { count });
      const { count: already } = await db.from("team_activity").select("id", { count: "exact", head: true }).eq("member_id", member.id).eq("action", "blocked").gte("at", new Date(Date.now() - 3600e3).toISOString());
      if ((already || 0) <= 1 && brevoReady()) { await applyStoredSecrets(); await sendEmail(OWNER_EMAIL, "Mansour", `⚠️ Équipe : ${member.name} a ouvert ${count} fiches en 1 heure`, `<p>${member.name} a atteint la limite de ${member.max_views_per_hour} fiches par heure. L'ouverture de nouvelles fiches est bloquée pendant une heure.</p><p><a href="https://www.easydrive-auto.fr/equipe-admin">Voir l'activité / couper l'accès</a></p>`).catch(() => null); }
      return NextResponse.json({ ok: false, error: "Limite de fiches atteinte pour cette heure. Terminez vos appels en cours." }, { status: 429 });
    }
    await logActivity(member.id, "view_lead", id);
    const { data: messages } = await db.from("crm_messages").select("direction,body,created_at,channel").eq("lead_id", id).order("created_at", { ascending: true }).limit(40);
    const within = lead.last_inbound_at && Date.now() - new Date(lead.last_inbound_at).getTime() < 24 * 3600e3;
    return NextResponse.json({ ok: true, lead: { ...card(lead), historique: String(lead.historique || "").slice(-3000), commentaire: String(lead.commentaire || "").slice(0, 1500) }, messages: messages || [], canWhatsapp: Boolean(within) && !lead.opted_out_at, tel: member.can_see_numbers ? lead.telephone : null });
  }

  if (b.action === "call") {
    await applyStoredSecrets(); await logActivity(member.id, "call", id);
    const key = process.env.RINGOVER_API_KEY; const to = "+" + normalizePhone(lead.telephone);
    // Avec une clé Ringover : la plateforme lance l'appel depuis la ligne du membre, le numéro reste masqué.
    if (key && member.ringover_number) {
      const r = await fetch("https://public-api.ringover.com/v2/callback", { method: "POST", headers: { Authorization: key, "Content-Type": "application/json" }, body: JSON.stringify({ from_number: Number(String(member.ringover_number).replace(/\D/g, "")), to_number: Number(to.replace(/\D/g, "")), timeout: 30, device: "ALL" }) }).catch(() => null);
      if (r?.ok) return NextResponse.json({ ok: true, mode: "ringover", message: "Appel lancé : décrochez sur Ringover." });
    }
    // Sinon : lien d'appel direct (ouvert par Ringover ou le téléphone) ; le numéro n'est pas affiché à l'écran.
    return NextResponse.json({ ok: true, mode: "lien", href: `tel:${to}` });
  }

  if (b.action === "call_result") {
    const result = String(b.result || ""); if (!(CALL_RESULTS as readonly string[]).includes(result)) return NextResponse.json({ ok: false, error: "Choisissez un résultat." }, { status: 400 });
    const note = clean(b.note, 1500); const next = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(b.next || "")) ? new Date(String(b.next)).toISOString() : null;
    const stamp = now.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });
    const line = `[${stamp}] ${member.name} – ${result}${note ? ` : ${note}` : ""}${next ? ` (rappel ${new Date(next).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })})` : ""}`;
    await db.from("leads").update({ historique: `${lead.historique ? lead.historique + "\n" : ""}${line}`, statut: STATUT[result] || (lead.statut === "Nouveau" ? "Contacté" : lead.statut), phase: result, operateur: member.name, last_contact_at: now.toISOString(), next_followup_at: next, updated_at: now.toISOString() }).eq("id", id);
    await logActivity(member.id, "call_result", id, { result, note, next });
    return NextResponse.json({ ok: true });
  }

  if (b.action === "draft") {
    await applyStoredSecrets();
    const { data: messages } = await db.from("crm_messages").select("*").eq("lead_id", id).order("created_at", { ascending: true }).limit(30);
    const text = await generateCommercialReply(lead, "", messages || []).catch(() => "");
    return NextResponse.json({ ok: true, text });
  }

  if (b.action === "whatsapp") {
    await applyStoredSecrets();
    const text = clean(b.text, 1200); if (text.length < 2) return NextResponse.json({ ok: false, error: "Message vide." }, { status: 400 });
    if (lead.opted_out_at) return NextResponse.json({ ok: false, error: "Ce client a refusé les messages." }, { status: 409 });
    const within = lead.last_inbound_at && Date.now() - new Date(lead.last_inbound_at).getTime() < 24 * 3600e3;
    if (!within) return NextResponse.json({ ok: false, error: "Le client n'a pas écrit depuis plus de 24 h : WhatsApp n'autorise pas de message libre. Appelez-le plutôt." }, { status: 409 });
    try {
      const pid = await sendWhatsApp(lead.telephone, text);
      await db.from("crm_messages").insert({ lead_id: id, direction: "outbound", channel: "whatsapp", body: text, provider_message_id: pid, status: "sent", ai_generated: false });
      await db.from("leads").update({ last_contact_at: now.toISOString(), operateur: member.name, updated_at: now.toISOString() }).eq("id", id);
      await logActivity(member.id, "whatsapp", id, { text: text.slice(0, 500) });
      return NextResponse.json({ ok: true });
    } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message || "Envoi impossible" }, { status: 502 }); }
  }

  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}

/** Rapport de fin de journée (texte libre) : PUT { body }. */
export async function PUT(req: Request) {
  const ctx = await teamSession(req); if (!ctx) return deny();
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  const body = clean(b.body, 4000); if (body.length < 10) return NextResponse.json({ ok: false, error: "Écrivez quelques lignes sur votre journée." }, { status: 400 });
  await ctx.db.from("team_reports").insert({ member_id: ctx.member.id, body });
  await logActivity(ctx.member.id, "report");
  return NextResponse.json({ ok: true });
}
