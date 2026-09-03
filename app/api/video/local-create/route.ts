import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ffmpegInstaller from "@ffmpeg-installer/linux-x64";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const BUCKET = "social-media";
const execFileAsync = promisify(execFile);

async function createLocalReel(secret: string) {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Supabase missing" }, { status: 503 });

  const sb = createClient(SB, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: videos, error } = await sb
    .from("social_media_assets")
    .select("id,public_url,storage_path,title,context,times_used,priority,created_at")
    .eq("status", "ready")
    .eq("media_type", "video")
    .not("storage_path", "like", "generated/%")
    .order("priority", { ascending: false })
    .order("times_used", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!videos?.length) return NextResponse.json({ ok: true, skipped: true, reason: "Aucune vraie vidéo disponible" });

  const selected = videos.slice(0, Math.min(3, videos.length));
  const now = new Date();
  const theme = "vidéos réelles récentes";
  const hook = "NeoDrive en situation réelle";
  const jobInsert = {
    status: "rendering",
    theme,
    hook,
    source_asset_ids: selected.map((v: any) => v.id),
    render_provider: "local-ffmpeg",
  };
  const { data: job, error: jobError } = await sb.from("video_generation_jobs").insert(jobInsert).select().single();
  if (jobError) return NextResponse.json({ ok: false, error: jobError.message }, { status: 500 });

  const tempFiles: string[] = [];
  const outPath = path.join(os.tmpdir(), `neodrive-${job.id}.mp4`);
  try {
    for (let i = 0; i < selected.length; i++) {
      const r = await fetch(selected[i].public_url, { cache: "no-store" });
      if (!r.ok) throw new Error(`Téléchargement média ${i + 1} impossible (${r.status})`);
      const bytes = Buffer.from(await r.arrayBuffer());
      const p = path.join(os.tmpdir(), `neodrive-${job.id}-${i}.mp4`);
      await writeFile(p, bytes);
      tempFiles.push(p);
    }

    const ffmpegPath = (ffmpegInstaller as any).path;
    const args: string[] = ["-y"];
    for (const p of tempFiles) args.push("-i", p);

    const filters = tempFiles.map((_, i) =>
      `[${i}:v]trim=start=0:duration=4.2,setpts=PTS-STARTPTS,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,setsar=1,format=yuv420p[v${i}]`
    );
    const inputs = tempFiles.map((_, i) => `[v${i}]`).join("");
    filters.push(`${inputs}concat=n=${tempFiles.length}:v=1:a=0[outv]`);

    args.push(
      "-filter_complex", filters.join(";"),
      "-map", "[outv]",
      "-an",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "25",
      "-movflags", "+faststart",
      "-pix_fmt", "yuv420p",
      outPath
    );

    await execFileAsync(ffmpegPath, args, { timeout: 240000, maxBuffer: 10 * 1024 * 1024 });
    const output = await readFile(outPath);
    const storagePath = `generated/local/${now.toISOString().slice(0, 10)}/${crypto.randomUUID()}-neodrive-reel.mp4`;
    const { error: uploadError } = await sb.storage.from(BUCKET).upload(storagePath, output, {
      contentType: "video/mp4",
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
    const outputUrl = pub.publicUrl;
    await sb.from("video_generation_jobs").update({
      status: "succeeded",
      output_url: outputUrl,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", job.id);

    await sb.from("social_media_assets").insert({
      storage_path: storagePath,
      public_url: outputUrl,
      media_type: "video",
      title: "Reel NeoDrive automatique",
      context: "Vidéo générée automatiquement localement à partir de vraies vidéos NeoDrive",
      status: "ready",
      priority: 80,
    });

    for (const v of selected) {
      await sb.from("social_media_assets").update({
        times_used: Number(v.times_used || 0) + 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", v.id);
    }

    return NextResponse.json({ ok: true, jobId: job.id, theme, hook, video: outputUrl, assets: selected.length, provider: "local-ffmpeg" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Fallback robuste : si FFmpeg ne peut pas rendre sur Vercel, on publie la vidéo réelle la plus récente
    // plutôt que de bloquer tout le système à cause de crédits d'un prestataire externe.
    const fallback = selected[0];
    await sb.from("video_generation_jobs").update({
      status: "succeeded",
      output_url: fallback.public_url,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      render_provider: "direct-original-fallback",
      error_message: `Montage local indisponible, vidéo réelle utilisée directement: ${message}`.slice(0, 1500),
    }).eq("id", job.id);
    await sb.from("social_media_assets").update({
      times_used: Number(fallback.times_used || 0) + 1,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", fallback.id);
    return NextResponse.json({ ok: true, jobId: job.id, theme, hook, video: fallback.public_url, assets: 1, provider: "direct-original-fallback", fallback: true, note: message });
  } finally {
    for (const p of [...tempFiles, outPath]) await unlink(p).catch(() => {});
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return createLocalReel(secret);
}

export async function POST(req: Request) {
  const { passcode } = await req.json().catch(() => ({}));
  const secret = process.env.CRON_SECRET;
  if (!secret || passcode !== secret) return NextResponse.json({ ok: false, error: "Code d’accès incorrect" }, { status: 401 });
  return createLocalReel(secret);
}
