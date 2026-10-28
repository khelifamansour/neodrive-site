import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SOCIAL_THEMES, buildSocialCaption, isVideoAsset, pickSocialTheme } from "@/lib/social-copy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const CAMPAIGN_DAYS = 14;
const MEDIA_LOOKBACK_DAYS = 120;

type Asset = {
  id: string;
  storage_path: string;
  public_url: string;
  media_type: string;
  context: string | null;
  title: string | null;
  ai_summary: string | null;
  ai_tags: string[] | null;
  times_used: number;
  created_at: string;
};

function isRealUpload(a: Asset) {
  return /^\d{4}-\d{2}-\d{2}\//.test(a.storage_path || "") && !/^generated\//.test(a.storage_path || "");
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Supabase missing" }, { status: 503 });

  const now = new Date();
  const sb = createClient(SB, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  const since = new Date(Date.now() - MEDIA_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from("social_media_assets")
    .select("id,storage_path,public_url,media_type,context,title,ai_summary,ai_tags,times_used,created_at")
    .eq("status", "ready")
    .gte("created_at", since)
    .order("times_used", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const assets = ((data || []) as Asset[]).filter(isRealUpload);
  if (!assets.length) return NextResponse.json({ ok: true, skipped: true, reason: "Aucun média réel récent dans la bibliothèque" });



  const videos = assets.filter(isVideoAsset);
  const images = assets.filter((a) => !isVideoAsset(a));
  let vi = 0;
  let ii = 0;
  const used = new Set<string>();

  function take(prefer: "video" | "image") {
    const first = prefer === "video" ? videos : images;
    const second = prefer === "video" ? images : videos;
    const firstIndex = prefer === "video" ? () => vi++ : () => ii++;
    const secondIndex = prefer === "video" ? () => ii++ : () => vi++;

    while (true) {
      const n = firstIndex();
      const a = first[n];
      if (!a) break;
      if (!used.has(a.id)) {
        used.add(a.id);
        return a;
      }
    }
    while (true) {
      const n = secondIndex();
      const a = second[n];
      if (!a) break;
      if (!used.has(a.id)) {
        used.add(a.id);
        return a;
      }
    }
    return null;
  }

  const rows: Array<Record<string, unknown>> = [];
  const recentCopy: string[] = [];

  for (let d = 0; d < CAMPAIGN_DAYS; d++) {
    const slots = [
      { h: 7, m: 30, prefer: "video" as const },
      { h: 11, m: 30, prefer: "image" as const },
      { h: 16, m: 30, prefer: "image" as const },
      { h: 19, m: 30, prefer: "video" as const },
    ];

    for (let s = 0; s < slots.length; s++) {
      const slot = slots[s];
      const when = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + d, slot.h, slot.m, 0));
      if (when <= now) continue;

      const a = take(slot.prefer);
      if (!a) continue;

      const theme = pickSocialTheme(a, recentCopy.slice(-18), `plan-${d}-${s}-${a.id}`);
      const caption = buildSocialCaption(theme, a, "planned");
      recentCopy.push(`${theme.hook}\n${caption}`);

      for (const platform of ["instagram", "facebook"]) {
        rows.push({
          platform,
          content_type: isVideoAsset(a) ? "reel" : "post",
          hook: theme.hook,
          caption,
          hashtags: [],
          media_brief: `real-upload:${a.id}`,
          media_url: a.public_url,
          cta: "easydrive-auto.fr",
          publish_at: when.toISOString(),
          status: "scheduled",
          requires_human_review: false,
          retry_count: 0,
          max_retries: 3,
        });
      }
    }
  }

  if (!rows.length) return NextResponse.json({ ok: true, skipped: true, reason: "Pas assez de médias compatibles" });

  const { error: cleanupError } = await sb.from("social_content_queue").delete().eq("status", "scheduled").in("platform", ["instagram", "facebook"]);
  if (cleanupError) return NextResponse.json({ ok: false, error: cleanupError.message }, { status: 500 });
  const { error: insertError } = await sb.from("social_content_queue").insert(rows);
  if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    scheduled: rows.length,
    uniqueMedia: used.size,
    planningDays: CAMPAIGN_DAYS,
    postsPerDayPerPlatform: 4,
    themeCount: SOCIAL_THEMES.length,
    videos: videos.length,
    images: images.length,
    mode: "commercial-trust-real-uploads-photo-video",
  });
}
