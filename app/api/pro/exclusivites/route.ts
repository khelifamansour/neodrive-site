import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";

export const dynamic = "force-dynamic";

/** Départements déjà réservés ou attribués en exclusivité (sans nom de société). */
export async function GET() {
  try {
    const { data } = await crmDatabase().from("pro_exclusivities").select("department,status").in("status", ["réservé", "attribué"]);
    return NextResponse.json({ ok: true, taken: (data || []).map(r => ({ dept: r.department, status: r.status })) });
  } catch { return NextResponse.json({ ok: true, taken: [] }); }
}
