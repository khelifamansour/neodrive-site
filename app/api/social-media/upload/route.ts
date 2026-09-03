import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPABASE_URL = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const BUCKET = "social-media";

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "media";
  return `${base}${ext}`;
}

export async function POST(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const uploadSecret = process.env.CRON_SECRET;
  if (!serviceKey) return NextResponse.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY missing" }, { status: 503 });
  if (!uploadSecret) return NextResponse.json({ ok: false, error: "CRON_SECRET missing" }, { status: 503 });

  const form = await req.formData();
  const passcode = String(form.get("passcode") ?? "");
  if (passcode !== uploadSecret) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Fichier manquant" }, { status: 400 });
  if (file.size > 100 * 1024 * 1024) return NextResponse.json({ ok: false, error: "Fichier trop volumineux (100 Mo max)" }, { status: 400 });

  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]);
  if (!allowed.has(file.type)) return NextResponse.json({ ok: false, error: `Format non supporté: ${file.type || "inconnu"}` }, { status: 400 });

  const title = String(form.get("title") ?? "").trim().slice(0, 160);
  const context = String(form.get("context") ?? "").trim().slice(0, 1200);
  const mediaType = file.type.startsWith("video/") ? "video" : "image";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName(file.name)}`;

  const bytes = await file.arrayBuffer();
  const storageRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: bytes,
  });
  const storageText = await storageRes.text();
  if (!storageRes.ok) return NextResponse.json({ ok: false, error: `Upload Supabase échoué: ${storageText}` }, { status: 500 });

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/social_media_assets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ storage_path: path, public_url: publicUrl, media_type: mediaType, title: title || null, context: context || null, status: "ready", priority: 100 }),
  });
  const rows = await dbRes.json().catch(() => null);
  if (!dbRes.ok) return NextResponse.json({ ok: false, error: `Enregistrement média échoué`, details: rows }, { status: 500 });

  return NextResponse.json({ ok: true, asset: Array.isArray(rows) ? rows[0] : rows, publicUrl, mediaType });
}
