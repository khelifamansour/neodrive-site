import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

async function getInstagramAccount(token: string) {
  const meUrl = new URL("https://graph.instagram.com/me");
  meUrl.searchParams.set("fields", "id,username");
  meUrl.searchParams.set("access_token", token);
  const response = await fetch(meUrl, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data?.id) {
    throw new Error(data?.error?.message ?? "Unable to resolve Instagram account");
  }
  return data as { id: string; username?: string };
}

async function waitForContainer(containerId: string, token: string) {
  let last: unknown = null;
  for (let attempt = 0; attempt < 15; attempt++) {
    const statusUrl = new URL(`https://graph.instagram.com/${containerId}`);
    statusUrl.searchParams.set("fields", "status_code,status");
    statusUrl.searchParams.set("access_token", token);
    const response = await fetch(statusUrl, { cache: "no-store" });
    const data = await response.json();
    last = data;
    if (data?.status_code === "FINISHED") return;
    if (data?.status_code === "ERROR" || data?.status_code === "EXPIRED") {
      throw new Error(`Instagram media processing failed: ${JSON.stringify(data)}`);
    }
    await sleep(2000);
  }
  throw new Error(`Instagram media is still processing: ${JSON.stringify(last)}`);
}

async function publishContainer(accountId: string, containerId: string, token: string) {
  await sleep(4000);
  let lastError = "Instagram publish failed";
  for (let attempt = 0; attempt < 5; attempt++) {
    const publishUrl = new URL(`https://graph.instagram.com/${accountId}/media_publish`);
    const body = new URLSearchParams({ creation_id: containerId, access_token: token });
    const response = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const data = await response.json();
    if (response.ok && data?.id) return data.id as string;
    lastError = data?.error?.message ?? lastError;
    if (!lastError.toLowerCase().includes("media id is not available")) break;
    await sleep(3000);
  }
  throw new Error(lastError);
}

export async function POST(req: Request) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const secret = process.env.INSTAGRAM_AUTOMATION_SECRET;
  if (!token) return NextResponse.json({ ok: false, error: "INSTAGRAM_ACCESS_TOKEN is not configured" }, { status: 503 });
  if (!secret) return NextResponse.json({ ok: false, error: "INSTAGRAM_AUTOMATION_SECRET is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return unauthorized();

  try {
    const body = await req.json();
    const mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl.trim() : typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";
    const caption = typeof body?.caption === "string" ? body.caption.trim() : "";
    const mediaType = body?.mediaType === "reel" || mediaUrl.toLowerCase().endsWith(".mp4") ? "reel" : "image";

    if (!mediaUrl || !caption) return NextResponse.json({ ok: false, error: "mediaUrl and caption are required" }, { status: 400 });
    const parsed = new URL(mediaUrl);
    if (parsed.protocol !== "https:") return NextResponse.json({ ok: false, error: "mediaUrl must use HTTPS" }, { status: 400 });
    if (caption.length > 2200) return NextResponse.json({ ok: false, error: "caption is too long" }, { status: 400 });

    const account = await getInstagramAccount(token);
    const createUrl = new URL(`https://graph.instagram.com/${account.id}/media`);
    const params: Record<string, string> = { caption, access_token: token };
    if (mediaType === "reel") {
      params.media_type = "REELS";
      params.video_url = mediaUrl;
      params.share_to_feed = "true";
    } else {
      params.image_url = mediaUrl;
    }

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
      cache: "no-store",
    });
    const createData = await createResponse.json();
    if (!createResponse.ok || !createData?.id) throw new Error(createData?.error?.message ?? "Instagram media container creation failed");

    await waitForContainer(createData.id, token);
    const mediaId = await publishContainer(account.id, createData.id, token);

    return NextResponse.json({ ok: true, published: true, account: account.username ?? null, mediaId, mediaType });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
