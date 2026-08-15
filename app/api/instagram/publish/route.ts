import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const secret = process.env.INSTAGRAM_AUTOMATION_SECRET;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "INSTAGRAM_ACCESS_TOKEN is not configured" },
      { status: 503 }
    );
  }

  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "INSTAGRAM_AUTOMATION_SECRET is not configured" },
      { status: 503 }
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return unauthorized();

  try {
    const body = await req.json();
    const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";
    const caption = typeof body?.caption === "string" ? body.caption.trim() : "";

    if (!imageUrl || !caption) {
      return NextResponse.json(
        { ok: false, error: "imageUrl and caption are required" },
        { status: 400 }
      );
    }

    let parsedImageUrl: URL;
    try {
      parsedImageUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { ok: false, error: "imageUrl must be a valid public URL" },
        { status: 400 }
      );
    }

    if (parsedImageUrl.protocol !== "https:") {
      return NextResponse.json(
        { ok: false, error: "imageUrl must use HTTPS" },
        { status: 400 }
      );
    }

    if (caption.length > 2200) {
      return NextResponse.json(
        { ok: false, error: "caption is too long" },
        { status: 400 }
      );
    }

    const meUrl = new URL("https://graph.instagram.com/me");
    meUrl.searchParams.set("fields", "id,username");
    meUrl.searchParams.set("access_token", token);

    const meResponse = await fetch(meUrl, { cache: "no-store" });
    const meData = await meResponse.json();

    if (!meResponse.ok || !meData?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unable to resolve Instagram account",
          details: meData?.error?.message ?? "Instagram API error",
        },
        { status: meResponse.status || 502 }
      );
    }

    const createUrl = new URL(`https://graph.instagram.com/${meData.id}/media`);
    const createBody = new URLSearchParams({
      image_url: imageUrl,
      caption,
      access_token: token,
    });

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createBody,
      cache: "no-store",
    });

    const createData = await createResponse.json();

    if (!createResponse.ok || !createData?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Instagram media container creation failed",
          details: createData?.error?.message ?? "Instagram API error",
        },
        { status: createResponse.status || 502 }
      );
    }

    const publishUrl = new URL(`https://graph.instagram.com/${meData.id}/media_publish`);
    const publishBody = new URLSearchParams({
      creation_id: createData.id,
      access_token: token,
    });

    const publishResponse = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishBody,
      cache: "no-store",
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok || !publishData?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Instagram publish failed",
          containerId: createData.id,
          details: publishData?.error?.message ?? "Instagram API error",
        },
        { status: publishResponse.status || 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      published: true,
      account: meData.username ?? null,
      mediaId: publishData.id,
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
