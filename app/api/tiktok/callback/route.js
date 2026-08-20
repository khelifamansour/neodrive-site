import { NextResponse } from "next/server";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return NextResponse.json(
      { ok: false, error, error_description: errorDescription || null },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { ok: false, message: "TikTok callback is active. No authorization code was supplied." },
      { status: 400 }
    );
  }

  // Token exchange will be enabled once TIKTOK_CLIENT_KEY and
  // TIKTOK_CLIENT_SECRET are configured securely in Vercel.
  return NextResponse.json({
    ok: true,
    message: "TikTok authorization callback received successfully.",
  });
}
