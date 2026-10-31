import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SAV_BUCKET, SAV_MAX_FILES, SAV_MAX_PHOTO, SAV_MAX_VIDEO } from "../../../../lib/sav";

export const dynamic = "force-dynamic";
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const safeName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);

/** Réserve une référence SAV et des URL d'envoi signées : photos et vidéos partent directement vers le stockage privé (pas de limite de taille Vercel). */
export async function POST(req: Request) {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Configuration serveur incomplète" }, { status: 503 });
  const body = await req.json().catch(() => null) as { files?: { name: string; type: string; size: number }[] } | null;
  const files = Array.isArray(body?.files) ? body!.files : [];
  if (files.length > SAV_MAX_FILES) return NextResponse.json({ ok: false, error: `${SAV_MAX_FILES} fichiers maximum.` }, { status: 400 });
  for (const f of files) {
    const isVideo = String(f.type).startsWith("video/");
    const isImage = String(f.type).startsWith("image/") || /\.(heic|heif)$/i.test(f.name);
    if (!isVideo && !isImage) return NextResponse.json({ ok: false, error: `${f.name} : seules les photos et vidéos sont acceptées.` }, { status: 400 });
    const max = isVideo ? SAV_MAX_VIDEO : SAV_MAX_PHOTO;
    if (!(f.size > 0) || f.size > max) return NextResponse.json({ ok: false, error: `${f.name} dépasse ${Math.round(max / 1024 / 1024)} Mo.` }, { status: 400 });
  }
  const ref = `SAV-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`;
  const folder = `sav/${ref}-${crypto.randomUUID()}`;
  const sb = createClient(SB, sk, { auth: { persistSession: false } });
  const uploads = [];
  for (const [i, f] of files.entries()) {
    const path = `${folder}/${String(i + 1).padStart(2, "0")}-${safeName(f.name || "media")}`;
    const { data, error } = await sb.storage.from(SAV_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible, réessayez." }, { status: 502 });
    uploads.push({ index: i, path: data.path, token: data.token });
  }
  return NextResponse.json({ ok: true, ref, folder, bucket: SAV_BUCKET, uploads });
}
