import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const allowedEvents = new Set(["view", "product", "whatsapp"]);

export async function POST(req: Request) {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || "").trim().slice(0, 180);
  const event = String(body.event || "view");
  const referrer = String(body.referrer || "").slice(0, 500);

  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug) || !allowedEvents.has(event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sb = createClient(SB, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await sb.rpc("increment_seo_metric", { p_slug: slug, p_event: event, p_referrer: referrer || null });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
