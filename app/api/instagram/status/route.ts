import { NextResponse } from "next/server";
import { resolveInstagramPublishingAuth } from "@/lib/instagram-publishing-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await resolveInstagramPublishingAuth();
    return NextResponse.json({
      ok: true,
      connected: true,
      authSource: auth.source,
      account: {
        id: auth.accountId,
        username: auth.username,
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
