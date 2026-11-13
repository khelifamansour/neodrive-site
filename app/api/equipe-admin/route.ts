import { NextResponse } from "next/server";
import OpenAI from "openai";
import { applyStoredSecrets, isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { brevoReady, sendEmail, OWNER_EMAIL } from "../../../lib/brevo";
import { ACTION_FR, ROLES, endSessions, newCode, sha } from "../../../lib/team";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const clean = (v: unknown, n = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const parisDayStart = (d = new Date()) => { const p = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Paris" })); const off = d.getTime() - p.getTime(); p.setHours(0, 0, 0, 0); return new Date(p.getTime() + off); };
const hm = (s: number) => `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, "0")}`;

/** Statistiques d'un membre depuis une date. */
async function stats(memberId: number, since: Date) {
  const db = crmDatabase();
  const [{ data: sess }, { data: acts }] = await Promise.all([
    db.from("team_sessions").select("started_at,last_seen_at,ended_at,active_seconds").eq("member_id", memberId).gte("last_seen_at", since.toISOString()),
    db.from("team_activity").select("action,at,lead_id,detail").eq("member_id", memberId).gte("at", since.toISOString()).order("at", { ascending: true }),
  ]);
  const count = (a: string) => (acts || []).filter(x => x.action === a).length;
  const first = (sess || []).map(s => s.started_at).sort()[0] || null; const last = (sess || []).map(s => s.ended_at || s.last_seen_at).sort().pop() || null;
  const results: Record<string, number> = {}; (acts || []).filter(a => a.action === "call_result").forEach(a => { const r = String((a.detail as any)?.result || "?"); results[r] = (results[r] || 0) + 1; });
  return { active: (sess || []).reduce((t, s) => t + (s.active_seconds || 0), 0), first, last, views: count("view_lead"), calls: count("call"), results: count("call_result"), byResult: results, messages: count("whatsapp"), blocked: count("blocked"), acts: acts || [] };
}

/** Évaluation par l'IA de la qualité des échanges (comptes-rendus d'appel et messages WhatsApp). */
async function evaluate(name: string, acts: { action: string; detail: unknown }[]) {
  const items = acts.filter(a => a.action === "call_result" || a.action === "whatsapp").slice(-60).map(a => a.action === "whatsapp" ? `WhatsApp envoyé : ${(a.detail as any)?.text || ""}` : `Appel – ${(a.detail as any)?.result}${(a.detail as any)?.note ? ` : ${(a.detail as any).note}` : ""}`);
  if (!items.length || !process.env.OPENAI_API_KEY) return null;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const r = await client.responses.create({ model: "gpt-4.1-mini", max_output_tokens: 500, text: { format: { type: "json_object" } },
    instructions: "Tu es responsable commercial chez NeoDrive (voitures sans permis électriques, vente à distance en France). Évalue le travail d'un conseiller à partir de ses comptes-rendus d'appel et de ses messages WhatsApp de la journée. Sois factuel et bref. Réponds en json : {\"score\": 0-100, \"resume\": \"2-3 phrases\", \"points_forts\": [\"...\"], \"a_ameliorer\": [\"...\"], \"alertes\": [\"propos inappropriés, promesses non autorisées (prix, délais, remises), données clients demandées hors cadre… ou vide\"]}",
    input: `Réponds en json. Conseiller : ${name}\n${items.join("\n")}` }).catch(() => null);
  try { return JSON.parse(r?.output_text || "null"); } catch { return null; }
}

export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase(); const id = Number(b.id) || 0;

  if (b.action === "list") {
    const { data: members } = await db.from("team_members").select("id,name,role,phone,email,active,expires_at,revoked_at,last_seen_at,can_see_numbers,ringover_number,max_views_per_hour,note,created_at").order("created_at", { ascending: false });
    const since = parisDayStart();
    const out = await Promise.all((members || []).map(async m => {
      const { count } = await db.from("leads").select("id", { count: "exact", head: true }).eq("assigned_to", String(m.id));
      const { data: open } = await db.from("team_sessions").select("id").eq("member_id", m.id).is("ended_at", null).gte("last_seen_at", new Date(Date.now() - 3 * 60e3).toISOString());
      const s = await stats(m.id, since);
      return { ...m, assigned: count || 0, online: Boolean(open?.length), today: { ...s, acts: undefined } };
    }));
    const { count: free } = await db.from("leads").select("id", { count: "exact", head: true }).is("assigned_to", null);
    return NextResponse.json({ ok: true, members: out, roles: ROLES, freeLeads: free || 0 });
  }

  if (b.action === "create") {
    const name = clean(b.name, 80); if (name.length < 2) return NextResponse.json({ ok: false, error: "Nom manquant" }, { status: 400 });
    const days = Math.min(Math.max(Number(b.days) || 7, 1), 365); const code = newCode();
    const { data, error } = await db.from("team_members").insert({ name, role: ROLES[b.role] ? b.role : "closer", phone: clean(b.phone, 30) || null, email: clean(b.email, 160) || null, code_hash: sha(code), expires_at: new Date(Date.now() + days * 86400e3).toISOString(), can_see_numbers: Boolean(b.can_see_numbers), ringover_number: clean(b.ringover_number, 30) || null, max_views_per_hour: Math.min(Math.max(Number(b.max_views) || 60, 5), 500), note: clean(b.note, 500) || null }).select("id").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id, code });
  }

  if (!id) return NextResponse.json({ ok: false, error: "Membre manquant" }, { status: 400 });

  if (b.action === "revoke") { await db.from("team_members").update({ active: false, revoked_at: new Date().toISOString() }).eq("id", id); await endSessions(id); return NextResponse.json({ ok: true }); }
  if (b.action === "reactivate") { const days = Math.min(Math.max(Number(b.days) || 7, 1), 365); await db.from("team_members").update({ active: true, revoked_at: null, expires_at: new Date(Date.now() + days * 86400e3).toISOString() }).eq("id", id); return NextResponse.json({ ok: true }); }
  if (b.action === "new_code") { const code = newCode(); await db.from("team_members").update({ code_hash: sha(code) }).eq("id", id); await endSessions(id); return NextResponse.json({ ok: true, code }); }
  if (b.action === "settings") {
    const patch: Record<string, unknown> = {};
    if ("can_see_numbers" in b) patch.can_see_numbers = Boolean(b.can_see_numbers);
    if ("ringover_number" in b) patch.ringover_number = clean(b.ringover_number, 30) || null;
    if ("max_views" in b) patch.max_views_per_hour = Math.min(Math.max(Number(b.max_views) || 60, 5), 500);
    await db.from("team_members").update(patch).eq("id", id); return NextResponse.json({ ok: true });
  }
  if (b.action === "assign") {
    const n = Math.min(Math.max(Number(b.n) || 20, 1), 200);
    let q = db.from("leads").select("id").is("assigned_to", null).is("opted_out_at", null).order("created_at", { ascending: false }).limit(n);
    if (b.statut) q = q.eq("statut", String(b.statut));
    const { data } = await q; const ids = (data || []).map(x => x.id);
    if (ids.length) await db.from("leads").update({ assigned_to: String(id) }).in("id", ids);
    return NextResponse.json({ ok: true, assigned: ids.length });
  }
  if (b.action === "unassign") { await db.from("leads").update({ assigned_to: null }).eq("assigned_to", String(id)); return NextResponse.json({ ok: true }); }

  if (b.action === "detail") {
    const days = Math.min(Math.max(Number(b.days) || 7, 1), 60);
    const { data: sess } = await db.from("team_sessions").select("started_at,last_seen_at,ended_at,active_seconds,ip,ua").eq("member_id", id).gte("started_at", new Date(Date.now() - days * 86400e3).toISOString()).order("started_at", { ascending: false });
    const { data: acts } = await db.from("team_activity").select("at,action,lead_id,detail").eq("member_id", id).order("at", { ascending: false }).limit(300);
    const { data: reports } = await db.from("team_reports").select("created_at,day,body,ai_summary,ai_score").eq("member_id", id).order("created_at", { ascending: false }).limit(30);
    return NextResponse.json({ ok: true, sessions: sess || [], activity: (acts || []).map(a => ({ ...a, label: ACTION_FR[a.action] || a.action })), reports: reports || [] });
  }

  if (b.action === "evaluate") {
    await applyStoredSecrets(); const { data: m } = await db.from("team_members").select("name").eq("id", id).single();
    const s = await stats(id, parisDayStart()); const ev = await evaluate(m?.name || "", s.acts);
    return NextResponse.json({ ok: true, evaluation: ev, stats: { ...s, acts: undefined } });
  }

  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}

/** Rapport journalier envoyé au fondateur (cron, 19 h 40 à Paris). */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  await applyStoredSecrets(); const db = crmDatabase(); const since = parisDayStart();
  const { data: members } = await db.from("team_members").select("id,name,role,active,expires_at").eq("active", true);
  const blocks: string[] = [];
  for (const m of members || []) {
    const s = await stats(m.id, since); if (!s.active && !s.acts.length) { blocks.push(`<h3>${esc(m.name)}</h3><p>❌ Pas connecté aujourd'hui.</p>`); continue; }
    const ev = await evaluate(m.name, s.acts);
    const { data: rep } = await db.from("team_reports").select("body").eq("member_id", m.id).gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(1);
    if (ev && rep?.length) await db.from("team_reports").update({ ai_summary: ev.resume, ai_score: ev.score }).eq("member_id", m.id).gte("created_at", since.toISOString());
    const fmt = (d: string | null) => d ? new Date(d).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }) : "—";
    blocks.push(`<h3>${esc(m.name)}</h3><ul><li>Connecté de ${fmt(s.first)} à ${fmt(s.last)} – <b>temps actif ${hm(s.active)}</b></li><li>${s.views} fiches ouvertes, ${s.calls} appels lancés, ${s.results} comptes-rendus, ${s.messages} messages WhatsApp</li><li>Résultats : ${Object.entries(s.byResult).map(([k, v]) => `${esc(k)} ${v}`).join(", ") || "—"}</li>${s.blocked ? `<li>⚠️ Bloqué ${s.blocked} fois (trop de fiches ouvertes)</li>` : ""}</ul>${ev ? `<p><b>Qualité (IA) : ${ev.score}/100</b> – ${esc(ev.resume)}</p>${ev.points_forts?.length ? `<p>👍 ${ev.points_forts.map(esc).join(" · ")}</p>` : ""}${ev.a_ameliorer?.length ? `<p>🛠 ${ev.a_ameliorer.map(esc).join(" · ")}</p>` : ""}${ev.alertes?.length ? `<p style="color:#b91c1c">⚠️ ${ev.alertes.map(esc).join(" · ")}</p>` : ""}` : ""}${rep?.length ? `<p><b>Son rapport :</b><br>${esc(rep[0].body).replace(/\n/g, "<br>")}</p>` : "<p>Pas de rapport de fin de journée.</p>"}`);
  }
  if (blocks.length && brevoReady()) await sendEmail(OWNER_EMAIL, "Mansour", `Équipe NeoDrive – rapport du ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`, `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${blocks.join("<hr>")}<p><a href="https://www.easydrive-auto.fr/equipe-admin">Ouvrir l'espace équipe</a></p></div>`);
  return NextResponse.json({ ok: true, members: blocks.length });
}
