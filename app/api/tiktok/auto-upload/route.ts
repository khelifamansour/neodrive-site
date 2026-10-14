import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

type VideoJob = {
  id: string;
  theme: string | null;
  hook: string | null;
  output_url: string;
  completed_at: string | null;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ ok: false, error: "Supabase missing" }, { status: 503 });

  const sb = createClient(SB, serviceKey, { auth: { persistSession: false } });
  const { data: connection, error: connectionError } = await sb
    .from("tiktok_connection")
    .select("open_id,scope,access_expires_at,refresh_expires_at")
    .eq("id", 1)
    .maybeSingle();

  if (connectionError) return NextResponse.json({ ok: false, error: connectionError.message }, { status: 500 });
  if (!connection?.open_id) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      setupNeeded: true,
      reason: "TikTok non connecté. Utilise le bouton Connecter TikTok dans /social-upload.",
    });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: jobs, error: jobsError } = await sb
    .from("video_generation_jobs")
    .select("id,theme,hook,output_url,completed_at")
    .eq("status", "succeeded")
    .not("output_url", "is", null)
    .gte("completed_at", since)
    .order("completed_at", { ascending: false })
    .limit(12);

  if (jobsError) return NextResponse.json({ ok: false, error: jobsError.message }, { status: 500 });
  if (!jobs?.length) return NextResponse.json({ ok: true, skipped: true, reason: "Aucun Reel récent prêt" });

  const urls = (jobs as VideoJob[]).map((job) => job.output_url);
  const { data: queue, error: queueError } = await sb
    .from("social_content_queue")
    .select("id,media_url,status,retry_count")
    .eq("platform", "tiktok")
    .in("media_url", urls);

  if (queueError) return NextResponse.json({ ok: false, error: queueError.message }, { status: 500 });

  const completedUrls = new Set(
    (queue || [])
      .filter((row: any) => ["review", "published"].includes(row.status))
      .map((row: any) => row.media_url),
  );
  const job = (jobs as VideoJob[]).find((candidate) => !completedUrls.has(candidate.output_url));
  if (!job) return NextResponse.json({ ok: true, skipped: true, reason: "Tous les Reels récents sont déjà envoyés à TikTok" });

  const brief = `tiktok-inbox-${job.id}`;
  const caption = `${job.hook || job.theme || "Découvrez NeoDrive"}\n\nVoiture sans permis électrique 2 places. Plus d’informations sur easydrive-auto.fr\n\n#NeoDrive #VoitureSansPermis #VSP #MobiliteElectrique`;
  const previous = (queue || []).find((row: any) => row.media_url === job.output_url);

  if (previous) {
    await sb.from("social_content_queue").update({
      status: "publishing",
      error_message: null,
      last_attempt_at: new Date().toISOString(),
      retry_count: Number(previous.retry_count || 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", previous.id);
  } else {
    const { error: insertError } = await sb.from("social_content_queue").insert({
      platform: "tiktok",
      content_type: "reel",
      hook: job.hook || job.theme || "NeoDrive",
      caption,
      hashtags: [],
      media_brief: brief,
      media_url: job.output_url,
      cta: "easydrive-auto.fr",
      publish_at: new Date().toISOString(),
      status: "publishing",
      requires_human_review: true,
      retry_count: 0,
      max_retries: 3,
      last_attempt_at: new Date().toISOString(),
    });
    if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const upload = await fetch(`${origin}/api/tiktok/publish-reel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode: secret, jobId: job.id }),
    cache: "no-store",
  });
  const result = await upload.json().catch(() => ({}));

  if (!upload.ok || !result.ok) {
    await sb.from("social_content_queue").update({
      status: "failed",
      error_message: result.error || `Upload TikTok échoué (${upload.status})`,
      updated_at: new Date().toISOString(),
    }).eq("media_brief", brief).eq("platform", "tiktok");
    return NextResponse.json({ ok: false, jobId: job.id, error: result.error || "Upload TikTok impossible" }, { status: upload.status >= 400 ? upload.status : 502 });
  }

  await sb.from("social_content_queue").update({
    status: "review",
    external_post_id: result.publishId || null,
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq("media_brief", brief).eq("platform", "tiktok");

  return NextResponse.json({
    ok: true,
    uploaded: true,
    jobId: job.id,
    publishId: result.publishId || null,
    tiktokStatus: result.tiktokStatus || null,
    finalApprovalRequired: true,
    note: "Reel envoyé automatiquement dans la boîte TikTok. TikTok exige l’approbation finale dans l’application.",
  });
}
