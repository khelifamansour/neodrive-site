import { NextResponse } from "next/server";
import { authorizeSection } from "../../../../lib/access";
import { crmDatabase } from "../../../../lib/crm-agent";

export const dynamic = "force-dynamic";
const KINDS = ["appel", "pas de réponse", "entretien", "note", "recruté", "écarté"];

/** Journal du recrutement par candidat (appels, entretiens, décisions). Code d'accès NeoDrive. */
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  const acc = await authorizeSection(req, b.passcode, "recrutement");
  if (!acc) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  if (acc.who !== "owner" && b.action === "delete") return NextResponse.json({ ok: false, error: "Réservé au fondateur." }, { status: 403 });
  const db = crmDatabase();
  if (b.action === "list") { const { data } = await db.from("recruit_log").select("*").order("created_at", { ascending: false }).limit(2000); return NextResponse.json({ ok: true, logs: data || [] }); }
  if (b.action === "add") {
    if (!KINDS.includes(b.kind)) return NextResponse.json({ ok: false, error: "Type inconnu" }, { status: 400 });
    const phone9 = String(b.phone || "").replace(/\D/g, "").slice(-9);
    const { error } = await db.from("recruit_log").insert({ poste: String(b.poste || "").slice(0, 20), phone9, full_name: String(b.full_name || "").slice(0, 120), kind: b.kind, note: String(b.note || "").slice(0, 1000) || null });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "delete" && b.id) { await db.from("recruit_log").delete().eq("id", b.id); return NextResponse.json({ ok: true }); }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
