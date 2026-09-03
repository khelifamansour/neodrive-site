import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

function slugFromUrl(url: string | null | undefined) {
  const s = String(url || "");
  const marker = "/blog/";
  const i = s.indexOf(marker);
  if (i < 0) return "";
  return decodeURIComponent(s.slice(i + marker.length).split(/[?#]/)[0]).replace(/^\/+|\/+$/g, "");
}

export async function POST(req: Request) {
  const { passcode } = await req.json().catch(() => ({}));
  const secret = process.env.CRON_SECRET;
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || passcode !== secret) return NextResponse.json({ ok: false, error: "Code d’accès incorrect" }, { status: 401 });
  if (!sk) return NextResponse.json({ ok: false, error: "Configuration Supabase manquante" }, { status: 503 });

  const sb = createClient(SB, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  const since90 = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

  const [{ data: dynamicArticles, error: daErr }, { data: staticArticles, error: saErr }, { data: runs, error: runErr }, { data: metrics, error: metErr }] = await Promise.all([
    sb.from("seo_articles").select("id,slug,title,target_keyword,status,published_at,created_at,publish_source").eq("status", "published").order("published_at", { ascending: false }).limit(120),
    sb.from("published_content").select("id,title,primary_keyword,external_url,published_at,created_at,content_type,channel").eq("content_type", "seo_article").order("published_at", { ascending: false }).limit(120),
    sb.from("seo_publish_runs").select("id,trigger_source,status,topic,started_at,completed_at,article_id,slug,title,url,error_message,duration_ms").order("started_at", { ascending: false }).limit(80),
    sb.from("seo_daily_metrics").select("slug,metric_date,views,google_views,direct_views,other_views,product_clicks,whatsapp_clicks").gte("metric_date", since90).order("metric_date", { ascending: false }).limit(5000),
  ]);

  const errors = [daErr, saErr, runErr, metErr].filter(Boolean).map((e: any) => e.message);
  if (errors.length) return NextResponse.json({ ok: false, error: errors.join(" | ") }, { status: 500 });

  const now = Date.now();
  const metricMap = new Map<string, any>();
  for (const m of metrics || []) {
    const slug = String(m.slug || "");
    if (!slug) continue;
    const row = metricMap.get(slug) || { views7: 0, views30: 0, views90: 0, google30: 0, direct30: 0, other30: 0, product30: 0, whatsapp30: 0 };
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
    rows.push({
      id: a.id,
      slug,
      title: a.title,
      keyword: a.target_keyword,
      source: a.publish_source || "manual_or_legacy",
      status: a.status,
      published_at: a.published_at || a.created_at,
      url: `https://www.easydrive-auto.fr/blog/${slug}`,
      metrics: metricMap.get(slug) || { views7: 0, views30: 0, views90: 0, google30: 0, direct30: 0, other30: 0, product30: 0, whatsapp30: 0 },
    });
  }
  for (const a of staticArticles || []) {
    const slug = slugFromUrl(a.external_url);
    if (!slug) continue;
    rows.push({
      id: a.id,
      slug,
      title: a.title,
      keyword: a.primary_keyword,
      source: "git_static",
      status: "published",
      published_at: a.published_at || a.created_at,
      url: a.external_url,
      metrics: metricMap.get(slug) || { views7: 0, views30: 0, views90: 0, google30: 0, direct30: 0, other30: 0, product30: 0, whatsapp30: 0 },
    });
  }

  const dedup = new Map<string, any>();
  for (const row of rows.sort((a, b) => +new Date(b.published_at || 0) - +new Date(a.published_at || 0))) {
    if (!dedup.has(row.url)) dedup.set(row.url, row);
  }
  const articles = Array.from(dedup.values());

  const successfulRuns = (runs || []).filter((r: any) => r.status === "success");
  const failedRuns = (runs || []).filter((r: any) => r.status === "failed");
  const last7 = articles.filter((a: any) => now - +new Date(a.published_at || 0) <= 7 * 86400000).length;
  const totalViews30 = articles.reduce((s: number, a: any) => s + Number(a.metrics?.views30 || 0), 0);
  const totalGoogle30 = articles.reduce((s: number, a: any) => s + Number(a.metrics?.google30 || 0), 0);
  const totalClicks30 = articles.reduce((s: number, a: any) => s + Number(a.metrics?.product30 || 0) + Number(a.metrics?.whatsapp30 || 0), 0);

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    cron: { schedule: "15 5 * * 2", description: "Chaque mardi à 05:15 UTC" },
    summary: {
      total_articles: articles.length,
      published_last_7d: last7,
      last_published_at: articles[0]?.published_at || null,
      successful_runs: successfulRuns.length,
      failed_runs: failedRuns.length,
      views_30d: totalViews30,
      google_views_30d: totalGoogle30,
      seo_cta_clicks_30d: totalClicks30,
    },
    articles: articles.slice(0, 150),
    runs: runs || [],
  });
}
