import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { createDemoTour, deleteTestData } from "../../../../lib/demo-tour";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tournée de démonstration (compte « Serge (test) ») : création ou suppression, par jeton à usage unique (admin_once_tokens.purpose « demo-tour », payload { action: "create" | "delete", date? }). */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "demo-tour").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: { action?: string; date?: string } } | undefined)?.payload;
  if (!p?.action) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    if (p.action === "create") return NextResponse.json({ ok: true, ...(await createDemoTour(db, /^\d{4}-\d{2}-\d{2}$/.test(p.date || "") ? p.date : undefined)) });
    if (p.action === "delete") return NextResponse.json({ ok: true, ...(await deleteTestData(db)) });
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 }); }
}
export const GET = run;
export const POST = run;
