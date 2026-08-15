import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "INSTAGRAM_ACCESS_TOKEN is not configured" },
      { status: 503 }
    );
  }

  try {
    const url = new URL("https://graph.instagram.com/me");
    url.searchParams.set("fields", "id,username,account_type");
    url.searchParams.set("access_token", token);

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Instagram API rejected the access token",
          details: data?.error?.message ?? "Unknown Instagram API error",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      account: {
        id: data.id,
        username: data.username,
        accountType: data.account_type ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
