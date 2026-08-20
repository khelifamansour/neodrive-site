import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

export async function POST(req: Request) {
  const { passcode } = await req.json().catch(() => ({}));
  const secret = process.env.CRON_SECRET;
  if (!secret || passcode !== secret) return NextResponse.json({ ok: false, error: "Code d’accès incorrect" }, { status: 401 });
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Supabase missing" }, { status: 503 });
  const sb = createClient(SB, sk, { auth: { persistSession: false } });
  const { data } = await sb.from("tiktok_connection").select("open_id,scope,access_expires_at,refresh_expires_at,updated_at").eq("id", 1).maybeSingle();
  return NextResponse.json({ ok: true, connected: !!data?.open_id, connection: data || null });
}
