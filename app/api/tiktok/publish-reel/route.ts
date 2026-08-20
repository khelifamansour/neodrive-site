import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

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

  const vr = await fetch(job.output_url, { cache:"no-store" });
  if (!vr.ok) return NextResponse.json({ ok:false, error:"Impossible de télécharger le Reel généré" }, { status:500 });
  const buf = Buffer.from(await vr.arrayBuffer());
  const size = buf.length;

  const init = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
    method:"POST",
    headers:{ Authorization:`Bearer ${conn.access_token}`, "Content-Type":"application/json; charset=UTF-8" },
    body:JSON.stringify({
      source_info:{ source:"FILE_UPLOAD", video_size:size, chunk_size:size, total_chunk_count:1 }
    }),
    cache:"no-store",
  });
  const ij = await init.json().catch(()=>({}));
  const publishId = ij?.data?.publish_id;
  if (!init.ok || !ij?.data?.upload_url || !publishId) return NextResponse.json({ ok:false, error:ij?.error?.message || ij?.error_description || "Initialisation de l’upload TikTok impossible" }, { status:500 });

  const contentRange = `bytes 0-${size-1}/${size}`;
  const up = await fetch(ij.data.upload_url, {
    method:"PUT",
    headers:{ "Content-Type":"video/mp4", "Content-Length":String(size), "Content-Range":contentRange },
    body:buf,
    cache:"no-store",
  });
  const uploadComplete = [200,201,204].includes(up.status);
  console.log("[tiktok-upload] binary upload result", { publishId, status:up.status, uploadComplete, contentType:"video/mp4", contentLength:size, contentRange, uploadedBytes:buf.length });
  if (!uploadComplete) return NextResponse.json({ ok:false, error:`Upload TikTok échoué (${up.status})`, publishId, uploadStatus:up.status }, { status:500 });

  const statusResponse = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
    method:"POST",
    headers:{ Authorization:`Bearer ${conn.access_token}`, "Content-Type":"application/json; charset=UTF-8" },
    body:JSON.stringify({ publish_id:publishId }),
    cache:"no-store",
  });
  const statusPayload = await statusResponse.json().catch(()=>({}));
  const tiktokStatus = statusPayload?.data?.status || "UNKNOWN";
  const failReason = statusPayload?.data?.fail_reason || statusPayload?.error?.message || statusPayload?.error_description || null;
  console.log("[tiktok-upload] publish status", { publishId, httpStatus:statusResponse.status, status:tiktokStatus, failReason });
  if (!statusResponse.ok || tiktokStatus === "FAILED") return NextResponse.json({ ok:false, error:failReason || "TikTok a signalé un échec de publication", publishId, tiktokStatus, failReason, tiktokError:statusPayload?.error || null }, { status:500 });

  return NextResponse.json({ ok:true, uploaded:true, publishId, tiktokStatus, upload:{ status:up.status, contentType:"video/mp4", contentLength:size, contentRange, uploadedBytes:buf.length } });
}
