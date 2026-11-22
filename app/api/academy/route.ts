import { NextResponse } from "next/server";
import { authorizeSection, logSection } from "../../../lib/access";
import { crmDatabase } from "../../../lib/crm-agent";
import { MODULES, PASS_MARK } from "../../../lib/academy";

/**
 * NeoDrive Academy — progression et correction des QCM.
 * POST { passcode?, action, ... } — actions : me, read, submit, admin (fondateur).
 * Membre : cookie d'équipe + section « academy ». Fondateur : code principal (aperçu, rien n'est enregistré pour lui).
 */
export const dynamic = "force-dynamic";

const TABLE = "academy_progress";
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
type Row = { member_id: number; module_key: string; best_score: number; last_score: number | null; attempts: number; read_at: string | null; passed_at: string | null; updated_at: string };

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const who = await authorizeSection(req, b.passcode, "academy");
  if (!who) return fail("Non connecté", 401);
  const db = crmDatabase();
  const memberId = who.who === "member" ? who.member.id : null;

  if (b.action === "me") {
    let progress: Row[] = [];
    if (memberId != null) {
      const { data, error } = await db.from(TABLE).select("*").eq("member_id", memberId);
      if (error) return fail(error.message, 500);
      progress = (data || []) as Row[];
    }
    return NextResponse.json({ ok: true, me: { who: who.who, name: who.name }, progress });
  }

  const mod = MODULES.find(m => m.key === b.module);

  if (b.action === "read") {
    if (!mod) return fail("Module inconnu");
    if (memberId == null) return NextResponse.json({ ok: true });
    const now = new Date().toISOString();
    const { data: cur } = await db.from(TABLE).select("read_at").eq("member_id", memberId).eq("module_key", mod.key).maybeSingle();
    if (!cur) await db.from(TABLE).insert({ member_id: memberId, module_key: mod.key, read_at: now, updated_at: now });
    else if (!cur.read_at) await db.from(TABLE).update({ read_at: now, updated_at: now }).eq("member_id", memberId).eq("module_key", mod.key);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "submit") {
    if (!mod) return fail("Module inconnu");
    const answers = Array.isArray(b.answers) ? b.answers : [];
    if (answers.length !== mod.quiz.length) return fail("Répondez à toutes les questions.");
    const results = mod.quiz.map((q, i) => ({ chosen: Number(answers[i]), correct: q.answer, ok: Number(answers[i]) === q.answer }));
    const good = results.filter(r => r.ok).length;
    const score = Math.round((good / mod.quiz.length) * 100);
    const passed = score >= PASS_MARK;
    let best = score; let attempts = 1; let firstPass = passed;
    if (memberId != null) {
      const now = new Date().toISOString();
      const { data: cur } = await db.from(TABLE).select("*").eq("member_id", memberId).eq("module_key", mod.key).maybeSingle();
      const c = cur as Row | null;
      best = Math.max(score, c?.best_score || 0); attempts = (c?.attempts || 0) + 1; firstPass = passed && !c?.passed_at;
      const row = { member_id: memberId, module_key: mod.key, best_score: best, last_score: score, attempts, read_at: c?.read_at || now, passed_at: c?.passed_at || (passed ? now : null), updated_at: now };
      const { error } = await db.from(TABLE).upsert(row, { onConflict: "member_id,module_key" });
      if (error) return fail(error.message, 500);
      await logSection(who, firstPass ? "academy_module_passed" : "academy_quiz", { module: mod.key, title: mod.title, score, good, total: mod.quiz.length, attempt: attempts });
    }
    return NextResponse.json({ ok: true, score, good, total: mod.quiz.length, passed, best, attempts, firstPass, results });
  }

  if (b.action === "admin") {
    if (who.who !== "owner") return fail("Réservé au fondateur", 403);
    const [{ data: members, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
      db.from("team_members").select("id,name,role,active,revoked_at,sections").order("name"),
      db.from(TABLE).select("*"),
    ]);
    if (e1 || e2) return fail((e1 || e2)!.message, 500);
    const list = (members || []).filter(m => Array.isArray(m.sections) && m.sections.includes("academy")).map(m => ({
      id: m.id, name: m.name, role: m.role, active: m.active && !m.revoked_at,
      progress: ((rows || []) as Row[]).filter(r => r.member_id === m.id),
    }));
    return NextResponse.json({ ok: true, members: list });
  }

  return fail("Action inconnue");
}
