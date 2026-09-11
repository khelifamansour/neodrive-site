import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chmod, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const BUCKET = "social-media";
const execFileAsync = promisify(execFile);

type VideoAsset = {
  id: string;
  public_url: string;
  storage_path: string;
  title: string | null;
  context: string | null;
  times_used: number | null;
  priority: number | null;
  created_at: string | null;
  last_used_at: string | null;
};

type CopyAngle = {
  theme: string;
  hook: string;
  keywords?: string[];
};

const COPY_ANGLES: CopyAngle[] = [
  { theme: "livraison client", hook: "Une nouvelle NeoDrive prend la route.", keywords: ["livraison", "livré", "livree", "client", "remise"] },
  { theme: "essai route", hook: "Quelques secondes de route avec NeoDrive.", keywords: ["route", "essai", "conduite", "roule", "trajet"] },
  { theme: "intérieur", hook: "Un coup d’œil à bord de NeoDrive.", keywords: ["intérieur", "interieur", "habitacle", "tableau", "siège", "siege"] },
  { theme: "recharge", hook: "L’électrique simple, jusque dans la recharge.", keywords: ["recharge", "charge", "batterie", "prise"] },
  { theme: "couleurs et stock", hook: "Quelle NeoDrive choisiriez-vous ?", keywords: ["couleur", "stock", "rouge", "bleu", "blanc", "noir", "vert"] },
  { theme: "mobilité quotidienne", hook: "Voilà à quoi ressemble NeoDrive au quotidien." },
  { theme: "images terrain", hook: "Pas de studio : de vraies images NeoDrive." },
  { theme: "mobilité électrique", hook: "La mobilité électrique, en vrai." },
  { theme: "format compact", hook: "Compacte dehors, pratique au quotidien." },
  { theme: "NeoDrive en action", hook: "De l’entrepôt à la route : NeoDrive en action." },
  { theme: "expérience réelle", hook: "Livrée, conduite, vécue : NeoDrive." },
  { theme: "aperçu réel", hook: "Un aperçu réel avant de choisir votre VSP." },
  { theme: "terrain NeoDrive", hook: "NeoDrive vue à travers nos vraies vidéos terrain." },
  { theme: "mobilité simple", hook: "Trois scènes, une même idée : rouler simplement." },
  { theme: "quotidien électrique", hook: "Une autre façon de vivre ses trajets du quotidien." },
  { theme: "VSP électrique", hook: "Petite taille, vraie mobilité électrique." },
  { theme: "découverte NeoDrive", hook: "Sur route comme à l’arrêt, découvrez NeoDrive." },
  { theme: "vraies images", hook: "Ce que vous voyez, c’est la réalité NeoDrive." },
];

function shuffle<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function normalise(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function dedupeVideos(videos: VideoAsset[]) {
  const seen = new Set<string>();
  const out: VideoAsset[] = [];
  for (const video of videos) {
    const key = normalise(video.title) || video.storage_path;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(video);
  }
  return out;
}

function rotateVideos(videos: VideoAsset[], recentIds: Set<string>, count = 3) {
  const deduped = dedupeVideos(videos);
  const fresh = deduped.filter((video) => !recentIds.has(video.id));
  const pool = fresh.length >= count ? fresh : deduped;

  const usageLevels = [...new Set(pool.map((video) => Number(video.times_used || 0)))].sort((a, b) => a - b);
  const ranked: VideoAsset[] = [];
  for (const usage of usageLevels) {
    const sameUsage = pool.filter((video) => Number(video.times_used || 0) === usage);
    ranked.push(...shuffle(sameUsage));
  }
  return ranked.slice(0, Math.min(count, ranked.length));
}

function chooseCopyAngle(selected: VideoAsset[], recentHooks: Set<string>) {
  const sourceText = selected.map((video) => `${video.title || ""} ${video.context || ""}`).join(" ").toLowerCase();
  const contextual = COPY_ANGLES.filter((angle) => angle.keywords?.some((keyword) => sourceText.includes(keyword)));
  const preferred = contextual.length ? contextual : COPY_ANGLES.filter((angle) => !angle.keywords?.length);
  const fresh = preferred.filter((angle) => !recentHooks.has(angle.hook));
  const available = fresh.length ? fresh : preferred;
  return shuffle(available)[0] || COPY_ANGLES[0];
}

async function createLocalReel(secret: string) {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Supabase missing" }, { status: 503 });

  const sb = createClient(SB, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: videos, error } = await sb
    .from("social_media_assets")
    .select("id,public_url,storage_path,title,context,times_used,priority,created_at,last_used_at")
    .eq("status", "ready")
    .eq("media_type", "video")
    .not("storage_path", "like", "generated/%")
    .order("times_used", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!videos?.length) return NextResponse.json({ ok: true, skipped: true, reason: "Aucune vraie vidéo disponible" });

  const { data: recentJobs } = await sb
    .from("video_generation_jobs")
    .select("source_asset_ids,hook,created_at")
    .eq("status", "succeeded")
    .in("render_provider", ["local-ffmpeg", "direct-original-fallback"])
    .order("created_at", { ascending: false })
    .limit(8);

  const recentIds = new Set<string>();
  const recentHooks = new Set<string>();
  for (const recent of recentJobs || []) {
    if (Array.isArray(recent.source_asset_ids)) {
      for (const id of recent.source_asset_ids) if (id) recentIds.add(String(id));
    }
    if (recent.hook) recentHooks.add(String(recent.hook));
  }

  const selected = rotateVideos(videos as VideoAsset[], recentIds, 3);
  if (!selected.length) return NextResponse.json({ ok: true, skipped: true, reason: "Aucune vraie vidéo exploitable" });

  const now = new Date();
  const angle = chooseCopyAngle(selected, recentHooks);
  const theme = angle.theme;
  const hook = angle.hook;
  const { data: job, error: jobError } = await sb.from("video_generation_jobs").insert({
    status: "rendering",
    theme,
    hook,
    source_asset_ids: selected.map((v) => v.id),
    render_provider: "local-ffmpeg",
  }).select().single();
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

    const ffmpegPath = path.join(process.cwd(), "node_modules", "@ffmpeg-installer", "linux-x64", "ffmpeg");
    await chmod(ffmpegPath, 0o755).catch(() => {});
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
      context: `Vidéo générée automatiquement à partir de vraies vidéos NeoDrive — ${theme}`,
      status: "ready",
      priority: 80,
    });

    const usedAt = new Date().toISOString();
    for (const v of selected) {
      await sb.from("social_media_assets").update({
        times_used: Number(v.times_used || 0) + 1,
        last_used_at: usedAt,
        updated_at: usedAt,
      }).eq("id", v.id);
    }

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      theme,
      hook,
      video: outputUrl,
      assets: selected.length,
      sourceAssetIds: selected.map((v) => v.id),
      provider: "local-ffmpeg",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
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
