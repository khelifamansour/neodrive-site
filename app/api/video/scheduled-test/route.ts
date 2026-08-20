import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const TEST_PROVIDER = "creatomate-scheduled-test";
const MAX_TEST_JOBS = 3;
const POLL_INTERVAL_MS = 25_000;
const POLL_ATTEMPTS = 8;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Job = {
  id: string;
  status: string;
  output_url: string | null;
  theme: string | null;
  error_message: string | null;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Supabase missing" }, { status: 503 });

  const sb = createClient(SB, sk, { auth: { persistSession: false } });
  const origin = new URL(req.url).origin;
  const { data: jobs, error } = await sb
    .from("video_generation_jobs")
    .select("id,status,output_url,theme,error_message")
    .eq("render_provider", TEST_PROVIDER)
    .order("created_at", { ascending: false })
    .limit(MAX_TEST_JOBS);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const active = (jobs || []).find((job: Job) => job.status === "rendering") as Job | undefined;
  if (active) return waitForRender(sb, active, origin, secret);

  for (const job of (jobs || []) as Job[]) {
    if (job.status !== "succeeded" || !job.output_url) continue;
    const { data: queue, error: queueError } = await sb
      .from("social_content_queue")
      .select("status")
      .eq("media_brief", `generated-video-manual-${job.id}`)
      .eq("platform", "instagram")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (queueError) return NextResponse.json({ ok: false, error: queueError.message }, { status: 500 });
    if (queue?.status !== "published") return publishWhenReady(sb, job, origin, secret);
  }

  if ((jobs || []).length >= MAX_TEST_JOBS) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Scheduled Reel test completed" });
  }

  console.log("[scheduled-reel-test] render start");
  const created = await fetch(`${origin}/api/video/create?scheduled_test=1`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  const result = await created.json().catch(() => ({}));
  console.log("[scheduled-reel-test] render start result", {
    ok: created.ok,
    jobId: result.jobId || null,
    status: created.status,
  });

  return NextResponse.json({ test: true, action: "render_start", result }, { status: created.status });
}

async function waitForRender(sb: any, job: Job, origin: string, secret: string) {
  for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt++) {
    const { data, error } = await sb
      .from("video_generation_jobs")
      .select("id,status,output_url,theme,error_message")
      .eq("id", job.id)
      .maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    if (data?.status === "succeeded" && data.output_url) {
      console.log("[scheduled-reel-test] render ready", { jobId: data.id, attempt });
      return publishWhenReady(sb, data, origin, secret);
    }
    if (data?.status === "failed") {
      console.log("[scheduled-reel-test] render failed", { jobId: data.id });
      return NextResponse.json({ ok: false, error: data.error_message || "Render failed", jobId: data.id }, { status: 500 });
    }

    console.log("[scheduled-reel-test] render pending", { jobId: job.id, attempt });
    if (attempt < POLL_ATTEMPTS) await sleep(POLL_INTERVAL_MS);
  }

  console.log("[scheduled-reel-test] render retry scheduled", { jobId: job.id });
  return NextResponse.json({ ok: true, retry: true, jobId: job.id, reason: "Render is still in progress" }, { status: 202 });
}

async function publishWhenReady(sb: any, job: Job, origin: string, secret: string) {
  const brief = `generated-video-manual-${job.id}`;
  const { data: queue, error } = await sb
    .from("social_content_queue")
    .select("status,external_post_id")
    .eq("media_brief", brief)
    .eq("platform", "instagram")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  if (queue?.status === "published") {
    return NextResponse.json({ ok: true, published: true, jobId: job.id, mediaId: queue.external_post_id });
  }
  if (queue?.status === "scheduled" || queue?.status === "publishing") {
    console.log("[scheduled-reel-test] publish retry scheduled", { jobId: job.id, queueStatus: queue.status });
    return NextResponse.json({ ok: true, retry: true, jobId: job.id, reason: "Instagram publication is retrying" }, { status: 202 });
  }

  console.log("[scheduled-reel-test] publish attempt", { jobId: job.id, theme: job.theme });
  const published = await fetch(`${origin}/api/video/publish-latest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode: secret, jobId: job.id, platform: "instagram" }),
    cache: "no-store",
  });
  const result = await published.json().catch(() => ({}));
  console.log("[scheduled-reel-test] publish result", { jobId: job.id, ok: published.ok, status: published.status });

  return NextResponse.json({ test: true, action: "publish", jobId: job.id, result }, { status: published.status });
}
