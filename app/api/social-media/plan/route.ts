import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

/** Ancien planificateur (4 publications par jour et par réseau, mêmes médias en boucle) : remplacé par lib/social-autopost
 * (1 publication par jour, rotation des sujets, pas de répétition sur 14 jours). Cet appel ne fait plus que vider
 * les créneaux qu'il avait préparés. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Supabase missing" }, { status: 503 });
  const sb = createClient(SB, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await sb.from("social_content_queue").delete().eq("status", "scheduled").in("platform", ["instagram", "facebook"]).like("media_brief", "real-upload:%");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, disabled: true, reason: "Planification remplacée par la publication quotidienne (/api/facebook/auto-publish, /api/instagram/auto-publish)." });
}
