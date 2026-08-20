import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { passcode } = await req.json().catch(() => ({}));
  const secret = process.env.CRON_SECRET;
  if (!secret || passcode !== secret) {
    return NextResponse.json({ ok: false, error: "Code d’accès incorrect" }, { status: 401 });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.json({ ok: false, error: "TIKTOK_CLIENT_KEY manque dans Vercel" }, { status: 503 });
  }

  const state = crypto.randomBytes(24).toString("hex");
  const redirectUri = "https://www.easydrive-auto.fr/api/tiktok/callback";
  const u = new URL("https://www.tiktok.com/v2/auth/authorize/");
  u.searchParams.set("client_key", clientKey);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "user.info.basic,video.publish,video.upload");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);

  const res = NextResponse.json({ ok: true, authorizationUrl: u.toString() });
  res.cookies.set("tiktok_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
