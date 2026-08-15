import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({ ok: false, error: "INSTAGRAM_ACCESS_TOKEN is not configured" }, { status: 503 });
  }

  const imageUrl = "https://www.easydrive-auto.fr/neodrive-instagram-test.jpg";
  const caption = `NEODRIVE ⚡🚗\nVoiture électrique sans permis.\nTest de publication automatique Instagram.\n\n#NeoDrive #VoitureSansPermis #VoitureElectrique`;

  try {
    const meUrl = new URL("https://graph.instagram.com/me");
    meUrl.searchParams.set("fields", "id,username");
    meUrl.searchParams.set("access_token", token);

    const meResponse = await fetch(meUrl, { cache: "no-store" });
    const meData = await meResponse.json();

    if (!meResponse.ok || !meData?.id) {
      return NextResponse.json({ ok: false, error: "Unable to resolve Instagram account", details: meData?.error?.message ?? "Instagram API error" }, { status: meResponse.status || 502 });
    }

    const createUrl = new URL(`https://graph.instagram.com/${meData.id}/media`);
    const createBody = new URLSearchParams({ image_url: imageUrl, caption, access_token: token });
    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createBody,
      cache: "no-store",
    });
    const createData = await createResponse.json();

    if (!createResponse.ok || !createData?.id) {
      return NextResponse.json({ ok: false, error: "Instagram media container creation failed", details: createData?.error?.message ?? "Instagram API error" }, { status: createResponse.status || 502 });
    }

    let statusCode = "IN_PROGRESS";
    let statusDetails: unknown = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      const statusUrl = new URL(`https://graph.instagram.com/${createData.id}`);
      statusUrl.searchParams.set("fields", "status_code,status");
      statusUrl.searchParams.set("access_token", token);

      const statusResponse = await fetch(statusUrl, { cache: "no-store" });
      const statusData = await statusResponse.json();
      statusCode = statusData?.status_code ?? statusCode;
      statusDetails = statusData;

      if (statusCode === "FINISHED") break;
      if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        return NextResponse.json({ ok: false, error: "Instagram media processing failed", containerId: createData.id, details: statusData }, { status: 502 });
      }

      await sleep(2000);
    }

    if (statusCode !== "FINISHED") {
      return NextResponse.json({ ok: false, error: "Instagram media is still processing", containerId: createData.id, details: statusDetails }, { status: 409 });
    }

    const publishUrl = new URL(`https://graph.instagram.com/${meData.id}/media_publish`);
    const publishBody = new URLSearchParams({ creation_id: createData.id, access_token: token });
    const publishResponse = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishBody,
      cache: "no-store",
    });
    const publishData = await publishResponse.json();

    if (!publishResponse.ok || !publishData?.id) {
      return NextResponse.json({ ok: false, error: "Instagram publish failed", containerId: createData.id, details: publishData?.error?.message ?? "Instagram API error" }, { status: publishResponse.status || 502 });
    }

    return NextResponse.json({ ok: true, published: true, account: meData.username ?? null, mediaId: publishData.id });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
