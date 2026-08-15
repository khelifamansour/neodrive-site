import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const BUCKET = "social-media";

export async function POST(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const uploadSecret = process.env.CRON_SECRET;
  if (!serviceKey || !uploadSecret) return NextResponse.json({ ok: false, error: "Configuration serveur manquante" }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body || body.passcode !== uploadSecret) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });

  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (!items.length) return NextResponse.json({ ok: false, error: "Aucun média à enregistrer" }, { status: 400 });

  const batchContext = String(body.batchContext || "").trim().slice(0, 1000);
  const rows = items.map((item: any) => {
    const path = String(item.path || "");
    const type = String(item.type || "");
    const name = String(item.name || "").slice(0, 160);
    const mediaType = type.startsWith("video/") ? "reel" : "image";
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
    return {
      storage_path: path,
      public_url: publicUrl,
      media_type: mediaType,
      title: name || null,
      context: batchContext || null,
      status: "ready",
      priority: mediaType === "reel" ? 60 : 50,
    };
  });

  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/social_media_assets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });
  const data = await dbRes.json().catch(() => null);
  if (!dbRes.ok) return NextResponse.json({ ok: false, error: "Enregistrement des médias échoué", details: data }, { status: 500 });
  return NextResponse.json({ ok: true, count: rows.length, assets: data });
}
