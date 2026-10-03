import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { posterConcept, renderMarketingPoster } from "@/lib/marketing-posters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "Supabase missing" }, { status: 503 });
  const sb = createClient(SB, key, { auth: { persistSession: false } });
  const date = new Date().toISOString().slice(0, 10);
  const storagePath = `generated/visual-${date}.jpg`;
  const { data: existing, error: lookupError } = await sb.from("social_media_assets").select("id,public_url").eq("storage_path", storagePath).eq("status", "ready").maybeSingle();
  if (lookupError) return NextResponse.json({ ok: false, error: lookupError.message }, { status: 500 });
  if (existing) return NextResponse.json({ ok: true, skipped: true, reason: "Affiche du jour déjà prête", asset: existing });
  const { data: media, error } = await sb.from("social_media_assets").select("id,public_url,title,context,times_used").eq("status", "ready").eq("media_type", "image").not("storage_path", "like", "generated/%").order("times_used").order("last_used_at", { nullsFirst: true }).order("ai_quality_score", { ascending: false, nullsFirst: false }).limit(25);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!media?.length) return NextResponse.json({ ok: false, error: "Ajoutez une photo réelle NeoDrive" }, { status: 422 });
  const asset = media.find(a => a.public_url?.startsWith(`${SB}/storage/v1/object/public/social-media/`));
  if (!asset) return NextResponse.json({ ok: false, error: "Aucune photo source compatible" }, { status: 422 });
  const concept = posterConcept(date);
  const { data: job, error: jobError } = await sb.from("video_generation_jobs").insert({ status: "rendering", theme: `visual:${concept.id}`, hook: concept.lines.join(" "), source_asset_ids: [asset.id], render_provider: "local-poster" }).select("id").single();
  if (jobError || !job) return NextResponse.json({ ok: false, error: jobError?.message }, { status: 500 });
  try {
    const photo = await fetch(asset.public_url, { signal: AbortSignal.timeout(15000), redirect: "error" });
    if (!photo.ok || !photo.headers.get("content-type")?.startsWith("image/")) throw new Error("Photo originale inaccessible");
    const original = Buffer.from(await photo.arrayBuffer());
    if (original.length > 20000000) throw new Error("Photo source trop volumineuse");
    const jpeg = await renderMarketingPoster(original, date);
    const { error: uploadError } = await sb.storage.from("social-media").upload(storagePath, jpeg, { contentType: "image/jpeg", upsert: true });
    if (uploadError) throw uploadError;
    const publicUrl = sb.storage.from("social-media").getPublicUrl(storagePath).data.publicUrl;
    const { error: registerError } = await sb.from("social_media_assets").upsert({ storage_path: storagePath, public_url: publicUrl, media_type: "image", title: concept.lines.join(" "), context: concept.caption, status: "ready", priority: 95, ai_summary: `Affiche à partir d’une photo réelle NeoDrive. Thème : ${concept.id}.`, ai_tags: ["poster", concept.id], updated_at: new Date().toISOString() }, { onConflict: "storage_path" });
    if (registerError) throw registerError;
    const { error: finishError } = await sb.from("video_generation_jobs").update({ status: "succeeded", output_url: publicUrl, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(), error_message: null }).eq("id", job.id);
    if (finishError) throw finishError;
    await sb.from("social_media_assets").update({ times_used: Number(asset.times_used || 0) + 1, last_used_at: new Date().toISOString() }).eq("id", asset.id);
    return NextResponse.json({ ok: true, jobId: job.id, theme: concept.id, source: asset.id, publicUrl, format: "1080x1350" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await sb.from("video_generation_jobs").update({ status: "failed", error_message: message, updated_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
