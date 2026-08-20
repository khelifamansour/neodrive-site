import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const expectedState = request.cookies.get("tiktok_oauth_state")?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/social-upload?tiktok=error&reason=${encodeURIComponent(errorDescription || error)}`, request.url));
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/social-upload?tiktok=error&reason=oauth_state", request.url));
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clientKey || !clientSecret || !serviceKey) {
    return NextResponse.redirect(new URL("/social-upload?tiktok=error&reason=configuration", request.url));
  }

  const redirectUri = "https://www.easydrive-auto.fr/api/tiktok/callback";
  const tr = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  const token = await tr.json().catch(() => ({}));
  if (!tr.ok || !token.access_token) {
    return NextResponse.redirect(new URL(`/social-upload?tiktok=error&reason=${encodeURIComponent(token.error_description || token.error || "token_exchange")}`, request.url));
  }

  const sb = createClient(SB, serviceKey, { auth: { persistSession: false } });
  const now = Date.now();
  const { error: dbError } = await sb.from("tiktok_connection").upsert({
    id: 1,
    open_id: token.open_id || null,
    scope: token.scope || null,
    access_token: token.access_token,
    refresh_token: token.refresh_token || null,
    access_expires_at: new Date(now + Number(token.expires_in || 86400) * 1000).toISOString(),
    refresh_expires_at: new Date(now + Number(token.refresh_expires_in || 31536000) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (dbError) {
    return NextResponse.redirect(new URL(`/social-upload?tiktok=error&reason=${encodeURIComponent(dbError.message)}`, request.url));
  }

  const res = NextResponse.redirect(new URL("/social-upload?tiktok=connected", request.url));
  res.cookies.delete("tiktok_oauth_state");
  return res;
}
