import { NextResponse } from "next/server";
import { isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { SECTIONS, isSection, type SectionKey } from "../../../lib/access";
import { ROLES, logActivity, teamSession } from "../../../lib/team";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
const clean = (v: unknown, n = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const IDEA_STATUS = ["idée", "à faire", "en cours", "fait"] as const;
const ALL = Object.keys(SECTIONS) as SectionKey[];

type Who = { who: "owner"; name: string; role: string; sections: SectionKey[] } | { who: "member"; id: number; name: string; role: string; roleLabel: string; sections: SectionKey[]; expires_at: string | null };

/** Qui est connecté : le fondateur (code principal ou cron) ou un membre (cookie d'équipe). */
async function whoIs(req: Request, passcode: unknown): Promise<Who | null> {
  if (isAuthorized(req, typeof passcode === "string" ? passcode : "")) return { who: "owner", name: "Mansour", role: "fondateur", sections: ALL };
  const ctx = await teamSession(req); if (!ctx) return null;
  const m = ctx.member as typeof ctx.member & { sections?: string[] | null };
  return { who: "member", id: m.id, name: m.name, role: m.role, roleLabel: ROLES[m.role] || m.role, sections: (Array.isArray(m.sections) ? m.sections : []).filter(isSection), expires_at: m.expires_at };
}
const pub = (w: Who) => w.who === "owner" ? w : { who: w.who, name: w.name, role: w.role, roleLabel: w.roleLabel, sections: w.sections, expires_at: w.expires_at };
const deny = () => NextResponse.json({ ok: false, error: "Non connecté" }, { status: 401 });

/** Page /organisation : qui est connecté et quelles sections sont ouvertes (cookie d'équipe). */
export async function GET(req: Request) {
  const w = await whoIs(req, ""); if (!w) return deny();
  return NextResponse.json({ ok: true, ...pub(w), labels: SECTIONS });
}

/** Même chose avec le code du fondateur, plus le tableau « Idées et développement ». */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  const w = await whoIs(req, b.passcode); if (!w) return deny();
  const action = String(b.action || "me");
  if (action === "me") return NextResponse.json({ ok: true, ...pub(w), labels: SECTIONS });

  // Idées : le fondateur et tout membre qui a au moins une section.
  if (w.who === "member" && !w.sections.length) return NextResponse.json({ ok: false, error: "Aucune section ouverte pour vous." }, { status: 403 });
  const db = crmDatabase();
  if (action === "ideas") {
    const { data, error } = await db.from("org_ideas").select("id,created_at,updated_at,title,body,area,status,author").order("created_at", { ascending: false }).limit(500);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ideas: data || [], statuses: IDEA_STATUS, canStatus: w.who === "owner" });
  }
  if (action === "idea_add") {
    const title = clean(b.title, 160); if (title.length < 3) return NextResponse.json({ ok: false, error: "Donnez un titre à votre idée." }, { status: 400 });
    const row = { title, body: clean(b.body, 3000) || null, area: clean(b.area, 60) || null, status: "idée", author: w.name, member_id: w.who === "member" ? w.id : null };
    const { data, error } = await db.from("org_ideas").insert(row).select("id").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (w.who === "member") await logActivity(w.id, "idea_add", null, { id: data.id, title });
    return NextResponse.json({ ok: true, id: data.id });
  }
  if (action === "idea_status") {
    if (w.who !== "owner") return NextResponse.json({ ok: false, error: "Seul le fondateur change le statut." }, { status: 403 });
    const status = String(b.status); if (!(IDEA_STATUS as readonly string[]).includes(status) || !Number(b.id)) return NextResponse.json({ ok: false, error: "Statut invalide" }, { status: 400 });
    const { error } = await db.from("org_ideas").update({ status, updated_at: new Date().toISOString() }).eq("id", Number(b.id));
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
