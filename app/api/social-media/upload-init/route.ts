import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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
  if (!serviceKey || !uploadSecret) return NextResponse.json({ ok: false, error: "Configuration serveur manquante" }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body || body.passcode !== uploadSecret) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });

  const files = Array.isArray(body.files) ? body.files.slice(0, 50) : [];
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]);
  if (!files.length) return NextResponse.json({ ok: false, error: "Aucun fichier" }, { status: 400 });

  const supabase = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const results = [];
  for (const f of files) {
    const name = String(f?.name || "media");
    const type = String(f?.type || "");
    const size = Number(f?.size || 0);
    if (!allowed.has(type)) return NextResponse.json({ ok: false, error: `Format non supporté: ${type || name}` }, { status: 400 });
    if (size > 100 * 1024 * 1024) return NextResponse.json({ ok: false, error: `${name}: 100 Mo max` }, { status: 400 });
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName(name)}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data?.token) return NextResponse.json({ ok: false, error: error?.message || "Impossible de préparer l'upload" }, { status: 500 });
    results.push({ path, token: data.token, type, name });
  }

  return NextResponse.json({ ok: true, uploads: results });
}
