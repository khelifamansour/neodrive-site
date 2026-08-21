import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const sleep = (ms:number) => new Promise(resolve => setTimeout(resolve, ms));
const runFile = promisify(execFile);

async function normalizeTikTokVideo(input:Buffer, jobId:string) {
  const directory = await mkdtemp(path.join(tmpdir(), "neodrive-tiktok-"));
  const inputPath = path.join(directory, "input.mp4");
  const outputPath = path.join(directory, "output.mp4");
  const bundledFfmpeg = path.join(process.cwd(), "node_modules", "@ffmpeg-installer", "linux-x64", "ffmpeg");
  let ffmpegPath = bundledFfmpeg;
  try { await access(bundledFfmpeg); } catch { ffmpegPath = "/usr/bin/ffmpeg"; }

  try {
    await writeFile(inputPath, input);
    await runFile(ffmpegPath, [
      "-y", "-hide_banner", "-loglevel", "error", "-i", inputPath,
      "-vf", "scale=1080:1920:flags=lanczos,setsar=1",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-movflags", "+faststart", outputPath,
    ], { timeout:180000, maxBuffer:1024*1024 });
    const output = await readFile(outputPath);
    console.info("[tiktok-upload] normalized video", { jobId, inputBytes:input.length, outputBytes:output.length, width:1080, height:1920 });
    return output;
  } finally {
    await rm(directory, { recursive:true, force:true });
  }
}

async function refreshIfNeeded(sb:any, row:any) {
  if (!row) throw new Error("TikTok non connecté");
  const exp = row.access_expires_at ? new Date(row.access_expires_at).getTime() : 0;
  if (exp > Date.now() + 5 * 60 * 1000) return row;
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret || !row.refresh_token) throw new Error("TikTok token à renouveler");
  const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, grant_type: "refresh_token", refresh_token: row.refresh_token }),
    cache: "no-store",
  });
  const j = await r.json().catch(()=>({}));
  if (!r.ok || !j.access_token) throw new Error(j.error_description || j.error || "Échec renouvellement TikTok");
  const now = Date.now();
  const next = {
    ...row,
    access_token: j.access_token,
    refresh_token: j.refresh_token || row.refresh_token,
    scope: j.scope || row.scope,
    open_id: j.open_id || row.open_id,
    access_expires_at: new Date(now + Number(j.expires_in || 86400) * 1000).toISOString(),
    refresh_expires_at: new Date(now + Number(j.refresh_expires_in || 31536000) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  await sb.from("tiktok_connection").upsert({ id:1, ...next });
  return next;
}

export async function POST(req: Request) {
  const { passcode, jobId } = await req.json().catch(()=>({}));
  const secret = process.env.CRON_SECRET;
  if (!secret || passcode !== secret) return NextResponse.json({ ok:false, error:"Code d’accès incorrect" }, { status:401 });
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok:false, error:"Supabase missing" }, { status:503 });
  const sb = createClient(SB, sk, { auth:{ persistSession:false } });

  let q = sb.from("video_generation_jobs").select("id,theme,hook,output_url,status,error_message");
  if (jobId) q = q.eq("id", String(jobId)); else q = q.eq("status","succeeded").not("output_url","is",null).order("completed_at",{ascending:false}).limit(1);
  const { data:job, error:jobError } = await q.maybeSingle();
  if (jobError) return NextResponse.json({ ok:false, error:jobError.message }, { status:500 });
  if (!job) return NextResponse.json({ ok:false, error:"Reel introuvable" }, { status:404 });
  if (job.status !== "succeeded" || !job.output_url) return NextResponse.json({ ok:false, error:"Le Reel n’est pas encore prêt" }, { status:409 });

  const { data:stored } = await sb.from("tiktok_connection").select("*").eq("id",1).maybeSingle();
  let conn;
  try { conn = await refreshIfNeeded(sb, stored); } catch(e) { return NextResponse.json({ ok:false, error:e instanceof Error?e.message:"TikTok non connecté" }, { status:401 }); }
  if (!String(conn.scope||"").split(",").includes("video.publish")) {
    return NextResponse.json({ ok:false, reconnectRequired:true, error:"Reconnecte TikTok avec le bouton Connecter TikTok pour autoriser la publication directe (video.publish)." }, { status:403 });
  }
  const creatorResponse = await fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {
    method:"POST", headers:{ Authorization:`Bearer ${conn.access_token}`, "Content-Type":"application/json; charset=UTF-8" }, cache:"no-store",
  });
  const creator = await creatorResponse.json().catch(()=>({}));
  if (!creatorResponse.ok || creator?.error?.code && creator.error.code!=="ok") {
    return NextResponse.json({ ok:false, error:creator?.error?.message||"TikTok n’autorise pas encore la publication directe. Active Direct Post et video.publish dans TikTok for Developers." }, { status:403 });
  }
  const privacyOptions:string[] = Array.isArray(creator?.data?.privacy_level_options)?creator.data.privacy_level_options:[];
  const privacyLevel = privacyOptions.includes("PUBLIC_TO_EVERYONE")?"PUBLIC_TO_EVERYONE":privacyOptions.includes("FOLLOWER_OF_CREATOR")?"FOLLOWER_OF_CREATOR":privacyOptions.includes("MUTUAL_FOLLOW_FRIENDS")?"MUTUAL_FOLLOW_FRIENDS":null;
  if (!privacyLevel) return NextResponse.json({ ok:false, error:"TikTok limite cette application aux publications privées. Fais valider l’application Direct Post pour publier automatiquement en public." }, { status:403 });

  const vr = await fetch(job.output_url, { cache:"no-store" });
  if (!vr.ok) return NextResponse.json({ ok:false, error:"Impossible de télécharger le Reel généré" }, { status:500 });
  let buf:Buffer;
  try {
    buf = await normalizeTikTokVideo(Buffer.from(await vr.arrayBuffer()), String(job.id));
  } catch(e) {
    console.error("[tiktok-upload] video normalization failed", { jobId:job.id, error:e instanceof Error?e.message:String(e) });
    return NextResponse.json({ ok:false, error:"Impossible de convertir la vidéo au format TikTok HD" }, { status:500 });
  }
  const size = buf.length;

  const init = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method:"POST",
    headers:{ Authorization:`Bearer ${conn.access_token}`, "Content-Type":"application/json; charset=UTF-8" },
    body:JSON.stringify({
      post_info:{ title:`${job.hook||"Découvrez NeoDrive"} #NeoDrive #VoitureSansPermis #VoitureElectrique`, privacy_level:privacyLevel, disable_duet:false, disable_comment:false, disable_stitch:false, brand_content_toggle:false, brand_organic_toggle:true },
      source_info:{ source:"FILE_UPLOAD", video_size:size, chunk_size:size, total_chunk_count:1 }
    }),
    cache:"no-store",
  });
  const ij = await init.json().catch(()=>({}));
  const publishId = ij?.data?.publish_id;
  if (!init.ok || !ij?.data?.upload_url || !publishId) return NextResponse.json({ ok:false, error:ij?.error?.message || ij?.error_description || "Initialisation de l’upload TikTok impossible" }, { status:500 });

  const up = await fetch(ij.data.upload_url, {
    method:"PUT",
    headers:{ "Content-Type":"video/mp4", "Content-Length":String(size), "Content-Range":`bytes 0-${size-1}/${size}` },
    body:buf,
    cache:"no-store",
  });
  if (![200,201,204].includes(up.status)) return NextResponse.json({ ok:false, error:`Upload TikTok échoué (${up.status})`, publishId }, { status:500 });

  let status = "PROCESSING_UPLOAD";
  let failReason:string|null = null;
  for (let attempt=1; attempt<=10; attempt++) {
    if (attempt>1) await sleep(2000);
    const sr = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
      method:"POST",
      headers:{ Authorization:`Bearer ${conn.access_token}`, "Content-Type":"application/json; charset=UTF-8" },
      body:JSON.stringify({ publish_id:publishId }),
      cache:"no-store",
    });
    const sj = await sr.json().catch(()=>({}));
    status = sj?.data?.status || status;
    failReason = sj?.data?.fail_reason || sj?.error?.message || null;
    console.log("[tiktok-upload] status", { publishId, attempt, httpStatus:sr.status, status, failReason });
    if (!sr.ok || status === "FAILED") return NextResponse.json({ ok:false, error:failReason || "TikTok a refusé la vidéo", publishId, tiktokStatus:status }, { status:500 });
    if (status === "PUBLISH_COMPLETE") {
      return NextResponse.json({ ok:true, uploaded:true, confirmed:true, published:true, publishId, tiktokStatus:status, note:"La vidéo est publiée directement sur TikTok." });
    }
  }

  return NextResponse.json({ ok:true, uploaded:true, confirmed:false, publishId, tiktokStatus:status, note:"TikTok traite la vidéo : elle sera publiée automatiquement, sans validation dans la boîte de réception." }, { status:202 });
}
