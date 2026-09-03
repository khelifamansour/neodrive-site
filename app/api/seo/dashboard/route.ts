import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { seoCities } from "../../../../lib/seo-cities";

export const dynamic = "force-dynamic";

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const SITE = "https://www.easydrive-auto.fr";
const EMPTY_METRICS = { views7: 0, views30: 0, views90: 0, google30: 0, direct30: 0, other30: 0, product30: 0, whatsapp30: 0 };

function slugFromUrl(url: string | null | undefined) {
  const s = String(url || "");
  const marker = "/blog/";
  const i = s.indexOf(marker);
  if (i < 0) return "";
  return decodeURIComponent(s.slice(i + marker.length).split(/[?#]/)[0]).replace(/^\/+|\/+$/g, "");
}

function pageMetricKey(path: string) {
  const clean = path.replace(/\/+$/, "") || "/";
  const normalized = clean === "/" ? "home" : clean.replace(/^\/+/, "").replace(/\//g, "_").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `page_${normalized}`.slice(0, 180);
}

function pathFromPageKey(key: string) {
  if (key === "page_home") return "/";
  return "/" + key.replace(/^page_/, "").replace(/_/g, "/");
}

function nextSeoRunIso(now = new Date()) {
  const days = new Set([1, 3, 5]);
  for (let add = 0; add <= 7; add++) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() + add);
    d.setUTCHours(5, 15, 0, 0);
    if (days.has(d.getUTCDay()) && d.getTime() > now.getTime()) return d.toISOString();
  }
  return null;
}

export async function POST(req: Request) {
  const { passcode } = await req.json().catch(() => ({}));
  const secret = process.env.CRON_SECRET;
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || passcode !== secret) return NextResponse.json({ ok: false, error: "Code d’accès incorrect" }, { status: 401 });
  if (!sk) return NextResponse.json({ ok: false, error: "Configuration Supabase manquante" }, { status: 503 });

  const sb = createClient(SB, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  const since90 = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

  const [
    { data: dynamicArticles, error: daErr },
    { data: staticArticles, error: saErr },
    { data: runs, error: runErr },
    { data: metrics, error: metErr },
    { data: videos, error: videoErr },
    { data: queue, error: queueErr },
    { data: videoJobs, error: jobErr },
  ] = await Promise.all([
    sb.from("seo_articles").select("id,slug,title,target_keyword,status,published_at,created_at,publish_source").eq("status", "published").order("published_at", { ascending: false }).limit(160),
    sb.from("published_content").select("id,title,primary_keyword,external_url,published_at,created_at,content_type,channel").eq("content_type", "seo_article").order("published_at", { ascending: false }).limit(160),
    sb.from("seo_publish_runs").select("id,trigger_source,status,topic,started_at,completed_at,article_id,slug,title,url,error_message,duration_ms").order("started_at", { ascending: false }).limit(120),
    sb.from("seo_daily_metrics").select("slug,metric_date,views,google_views,direct_views,other_views,product_clicks,whatsapp_clicks").gte("metric_date", since90).order("metric_date", { ascending: false }).limit(10000),
    sb.from("social_media_assets").select("id,media_type,title,context,status,priority,times_used,last_used_at,created_at,public_url,storage_path,ai_quality_score").eq("status", "ready").eq("media_type", "video").order("created_at", { ascending: false }).limit(100),
    sb.from("social_content_queue").select("id,platform,content_type,hook,caption,media_url,publish_at,status,external_post_id,external_url,error_message,created_at,updated_at,retry_count,performance_score").order("created_at", { ascending: false }).limit(160),
    sb.from("video_generation_jobs").select("id,status,theme,hook,render_provider,output_url,error_message,created_at,completed_at").order("created_at", { ascending: false }).limit(40),
  ]);

  const errors = [daErr, saErr, runErr, metErr, videoErr, queueErr, jobErr].filter(Boolean).map((e: any) => e.message);
  if (errors.length) return NextResponse.json({ ok: false, error: errors.join(" | ") }, { status: 500 });

  const now = Date.now();
  const metricMap = new Map<string, any>();
  for (const m of metrics || []) {
    const slug = String(m.slug || "");
    if (!slug) continue;
    const row = metricMap.get(slug) || { ...EMPTY_METRICS };
    const dayMs = new Date(`${m.metric_date}T12:00:00Z`).getTime();
    const ageDays = Math.floor((now - dayMs) / 86400000);
    const views = Number(m.views || 0);
    row.views90 += views;
    if (ageDays <= 30) {
      row.views30 += views;
      row.google30 += Number(m.google_views || 0);
      row.direct30 += Number(m.direct_views || 0);
      row.other30 += Number(m.other_views || 0);
      row.product30 += Number(m.product_clicks || 0);
      row.whatsapp30 += Number(m.whatsapp_clicks || 0);
    }
    if (ageDays <= 7) row.views7 += views;
    metricMap.set(slug, row);
  }

  const rows: any[] = [];
  for (const a of dynamicArticles || []) {
    const slug = String(a.slug || "");
    rows.push({ id: a.id, slug, title: a.title, keyword: a.target_keyword, source: a.publish_source || "manual_or_legacy", status: a.status, published_at: a.published_at || a.created_at, url: `${SITE}/blog/${slug}`, metrics: metricMap.get(slug) || { ...EMPTY_METRICS } });
  }
  for (const a of staticArticles || []) {
    const slug = slugFromUrl(a.external_url);
    if (!slug) continue;
    rows.push({ id: a.id, slug, title: a.title, keyword: a.primary_keyword, source: "git_static", status: "published", published_at: a.published_at || a.created_at, url: a.external_url, metrics: metricMap.get(slug) || { ...EMPTY_METRICS } });
  }

  const dedup = new Map<string, any>();
  for (const row of rows.sort((a, b) => +new Date(b.published_at || 0) - +new Date(a.published_at || 0))) if (!dedup.has(row.url)) dedup.set(row.url, row);
  const articles = Array.from(dedup.values());

  const importantPages: [string, string][] = [
    ["/", "Accueil"], ["/voiture-sans-permis", "Hub voiture sans permis"], ["/prix-voiture-sans-permis", "Prix voiture sans permis"], ["/voiture-sans-permis-occasion", "Voiture sans permis occasion"], ["/voiture-sans-permis-electrique", "Voiture sans permis électrique"], ["/citroen-ami-ou-neodrive", "Citroën Ami ou NeoDrive"], ["/fiat-topolino-ou-neodrive", "Fiat Topolino ou NeoDrive"], ["/videos", "Vidéos réelles NeoDrive"], ["/produit", "Page produit"],
    ...seoCities.map(city => [`/voiture-sans-permis/${city.slug}`, `Voiture sans permis ${city.city}`] as [string, string]),
  ];

  const pageRows = importantPages.map(([path, title]) => {
    const key = pageMetricKey(path);
    return { key, path, title, url: `${SITE}${path === "/" ? "" : path}`, metrics: metricMap.get(key) || { ...EMPTY_METRICS } };
  });
  const knownPageKeys = new Set(pageRows.map(p => p.key));
  for (const [key, m] of metricMap.entries()) {
    if (!key.startsWith("page_") || knownPageKeys.has(key)) continue;
    const path = pathFromPageKey(key);
    pageRows.push({ key, path, title: path === "/" ? "Accueil" : path, url: `${SITE}${path === "/" ? "" : path}`, metrics: m });
  }
  pageRows.sort((a, b) => Number(b.metrics.views30 || 0) - Number(a.metrics.views30 || 0));

  const videoRows = (videos || []).map((v: any) => ({ ...v, generated: String(v.storage_path || "").startsWith("generated/"), page_url: `${SITE}/videos/${v.id}`, metrics: metricMap.get(`video_${v.id}`) || { ...EMPTY_METRICS } }));

  const publishedSocial = (queue || []).filter((q: any) => q.status === "published");
  const failedSocial = (queue || []).filter((q: any) => q.status === "failed");
  const scheduledSocial = (queue || []).filter((q: any) => q.status === "scheduled");
  const socialLast7 = publishedSocial.filter((q: any) => now - +new Date(q.updated_at || q.publish_at || q.created_at || 0) <= 7 * 86400000).length;
  const socialByPlatform = ["facebook", "instagram", "tiktok"].map(platform => ({ platform, published: publishedSocial.filter((q: any) => q.platform === platform).length, failed: failedSocial.filter((q: any) => q.platform === platform).length, scheduled: scheduledSocial.filter((q: any) => q.platform === platform).length }));

  const successfulRuns = (runs || []).filter((r: any) => r.status === "success");
  const failedRuns = (runs || []).filter((r: any) => r.status === "failed");
  const last7 = articles.filter((a: any) => now - +new Date(a.published_at || 0) <= 7 * 86400000).length;
  const articleViews30 = articles.reduce((s: number, a: any) => s + Number(a.metrics?.views30 || 0), 0);
  const articleGoogle30 = articles.reduce((s: number, a: any) => s + Number(a.metrics?.google30 || 0), 0);
  const articleClicks30 = articles.reduce((s: number, a: any) => s + Number(a.metrics?.product30 || 0) + Number(a.metrics?.whatsapp30 || 0), 0);
  const pageViews30 = pageRows.reduce((s: number, p: any) => s + Number(p.metrics?.views30 || 0), 0);
  const videoViews30 = videoRows.reduce((s: number, v: any) => s + Number(v.metrics?.views30 || 0), 0);
  const totalGoogle30 = [...articles, ...pageRows, ...videoRows].reduce((s: number, x: any) => s + Number(x.metrics?.google30 || 0), 0);
  const totalCta30 = [...articles, ...pageRows, ...videoRows].reduce((s: number, x: any) => s + Number(x.metrics?.product30 || 0) + Number(x.metrics?.whatsapp30 || 0), 0);

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    cron: { schedule: "15 5 * * 1,3,5", description: "Lundi, mercredi et vendredi à 05:15 UTC (07:15 en France actuellement)", next_run_at: nextSeoRunIso(), social_description: "Instagram 07:30, 11:30 et 16:30 UTC; Facebook 5 minutes après chaque créneau" },
    summary: { total_articles: articles.length, total_local_pages: seoCities.length, published_last_7d: last7, last_published_at: articles[0]?.published_at || null, successful_runs: successfulRuns.length, failed_runs: failedRuns.length, article_views_30d: articleViews30, page_views_30d: pageViews30, video_views_30d: videoViews30, total_views_30d: articleViews30 + pageViews30 + videoViews30, google_views_30d: totalGoogle30, seo_cta_clicks_30d: totalCta30, total_videos: videoRows.length, original_videos: videoRows.filter((v: any) => !v.generated).length, generated_videos: videoRows.filter((v: any) => v.generated).length, social_published_last_7d: socialLast7, social_failed: failedSocial.length, social_scheduled: scheduledSocial.length, article_google_30d: articleGoogle30, article_cta_30d: articleClicks30 },
    articles: articles.slice(0, 180), pages: pageRows.slice(0, 180), videos: videoRows.slice(0, 100), social: { by_platform: socialByPlatform, recent: (queue || []).slice(0, 100) }, video_jobs: videoJobs || [], runs: runs || [], search_console: { connected: false, note: "Le tableau mesure déjà les visites, provenance Google et clics. Pour impressions, requêtes, CTR et position moyenne, connecter Google Search Console reste nécessaire." },
  });
}
