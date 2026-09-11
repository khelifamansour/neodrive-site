import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function buildCaptionCandidates(job: { id: string; theme?: string | null; hook?: string | null }) {
  const hook = String(job.hook || "Découvrez NeoDrive").trim();
  const theme = String(job.theme || "").toLowerCase();
  const common = [
    `${hook}\n\nDe vraies images de nos véhicules, sans mise en scène. Découvrez NeoDrive au quotidien.\n\n#NeoDrive #VoitureSansPermis #VSPElectrique #MobiliteElectrique`,
    `NeoDrive en images réelles ⚡\n\n${hook}\n\nUn aperçu concret de la voiture, de la route et de son utilisation au quotidien.\n\n#NeoDrive #VSP #Electrique #Mobilite`,
    `${hook}\n\nIci, pas de visuel de catalogue : uniquement de vraies séquences NeoDrive prises sur le terrain.\n\n#NeoDrive #Voiturette #VoitureSansPermis #Electrique`,
    `Quelques secondes pour voir NeoDrive autrement.\n\n${hook}\n\nCompacte, électrique et pensée pour les déplacements du quotidien.\n\n#NeoDrive #VSP #MobiliteDuQuotidien #Electrique`,
    `La NeoDrive telle qu’elle est vraiment.\n\n${hook}\n\nRetrouvez nos véhicules, nos livraisons et nos essais en images réelles.\n\n#NeoDrive #VoitureSansPermis #MobiliteElectrique`,
    `${hook}\n\nTrois séquences, trois moments réels, une même NeoDrive.\n\n#NeoDrive #VSPFrance #VoitureElectrique #Mobilite`,
    `Vous voulez voir le véhicule avant de vous décider ?\n\n${hook}\n\nVoici un nouvel aperçu filmé dans des conditions réelles.\n\n#NeoDrive #VoitureSansPermis #VSP #Electrique`,
    `Une NeoDrive, en vrai. 🚗⚡\n\n${hook}\n\nNous préférons vous montrer le véhicule sur le terrain plutôt qu’un simple visuel publicitaire.\n\n#NeoDrive #MobiliteElectrique #Voiturette`,
  ];

  if (theme.includes("livraison")) {
    common.unshift(
      `Une nouvelle NeoDrive sur le terrain 🚗\n\n${hook}\n\nChaque livraison est aussi l’occasion de vous montrer nos véhicules dans la vraie vie.\n\n#NeoDrive #Livraison #VoitureSansPermis #Electrique`,
      `${hook}\n\nDe notre stock jusqu’au client : un nouvel aperçu d’une NeoDrive en conditions réelles.\n\n#NeoDrive #VSP #LivraisonFrance #MobiliteElectrique`
    );
  }
  if (theme.includes("route") || theme.includes("action")) {
    common.unshift(
      `${hook}\n\nCette fois, place à la route : quelques images réelles pour voir NeoDrive en mouvement.\n\n#NeoDrive #EssaiRoute #VSP #Electrique`,
      `NeoDrive en mouvement ⚡\n\n${hook}\n\nUn aperçu simple et concret de la voiture pendant son utilisation.\n\n#NeoDrive #VoitureSansPermis #MobiliteElectrique`
    );
  }
  if (theme.includes("intérieur")) {
    common.unshift(
      `${hook}\n\nTableau de bord, habitacle, espace à bord : découvrez NeoDrive depuis l’intérieur.\n\n#NeoDrive #Interieur #VSP #VoitureSansPermis`,
      `À bord de NeoDrive.\n\n${hook}\n\nUn aperçu réel de l’habitacle et de l’expérience au quotidien.\n\n#NeoDrive #Voiturette #MobiliteElectrique`
    );
  }
  if (theme.includes("recharge")) {
    common.unshift(
      `${hook}\n\nLa mobilité électrique doit rester simple au quotidien. Voici NeoDrive en images réelles.\n\n#NeoDrive #Recharge #Electrique #VSP`,
      `Électrique et simple à vivre ⚡\n\n${hook}\n\nUn nouvel aperçu terrain de NeoDrive et de son utilisation quotidienne.\n\n#NeoDrive #MobiliteElectrique #VoitureSansPermis`
    );
  }
  if (theme.includes("couleur") || theme.includes("stock")) {
    common.unshift(
      `${hook}\n\nDifférentes couleurs, différentes scènes, toujours la même idée : une mobilité simple et électrique.\n\n#NeoDrive #VSP #Couleurs #MobiliteElectrique`,
      `Laquelle choisiriez-vous ? 🚗\n\n${hook}\n\nDécouvrez de vraies NeoDrive filmées directement sur le terrain.\n\n#NeoDrive #VoitureSansPermis #Electrique`
    );
  }

  return common;
}

export async function POST(req: Request) {
  const { passcode, jobId, platform = "both" } = await req.json().catch(() => ({}));
  const secret = process.env.CRON_SECRET;
  if (!secret || passcode !== secret) return NextResponse.json({ ok: false, error: "Code d’accès incorrect" }, { status: 401 });
  if (!["instagram", "facebook", "both"].includes(platform)) return NextResponse.json({ ok: false, error: "Plateforme invalide" }, { status: 400 });

  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Supabase missing" }, { status: 503 });
  const sb = createClient(SB, sk, { auth: { persistSession: false } });

  let query = sb.from("video_generation_jobs").select("id,theme,hook,output_url,completed_at,status,error_message");
  if (jobId) query = query.eq("id", String(jobId));
  else query = query.eq("status", "succeeded").not("output_url", "is", null).order("completed_at", { ascending: false }).limit(1);

  const { data: job, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!job) return NextResponse.json({ ok: false, error: "Vidéo introuvable" }, { status: 404 });
  if (job.status === "rendering") return NextResponse.json({ ok: false, rendering: true, error: "La nouvelle vidéo est encore en cours de rendu. Attends quelques secondes puis reclique." }, { status: 409 });
  if (job.status === "failed") return NextResponse.json({ ok: false, error: `Le rendu de cette vidéo a échoué${job.error_message ? `: ${job.error_message}` : ""}` }, { status: 500 });
  if (job.status !== "succeeded" || !job.output_url) return NextResponse.json({ ok: false, error: "Cette vidéo n’est pas encore prête" }, { status: 409 });

  const platforms = platform === "both" ? ["instagram", "facebook"] : [platform];
  const candidates = buildCaptionCandidates(job);
  const start = hashString(String(job.id)) % candidates.length;
  const rotated = [...candidates.slice(start), ...candidates.slice(0, start)];

  const { data: recentRows } = await sb
    .from("social_content_queue")
    .select("caption")
    .eq("content_type", "reel")
    .in("platform", platforms)
    .order("created_at", { ascending: false })
    .limit(30);
  const recentCaptions = new Set((recentRows || []).map((row: any) => String(row.caption || "").trim()).filter(Boolean));
  const caption = rotated.find((text) => !recentCaptions.has(text.trim())) || rotated[0];

  const brief = `generated-video-manual-${job.id}`;
  await sb.from("social_content_queue").delete().eq("media_brief", brief).in("platform", platforms).in("status", ["scheduled", "publishing", "failed"]);

  const due = "2000-01-01T00:00:00.000Z";
  const rows = platforms.map((p: string) => ({
    platform: p,
    content_type: "reel",
    hook: job.hook || job.theme || "video",
    caption,
    hashtags: [],
    media_brief: brief,
    media_url: job.output_url,
    cta: "easydrive-auto.fr",
    publish_at: due,
    status: "scheduled",
    requires_human_review: false,
    retry_count: 0,
    max_retries: 3,
  }));
  const { error: qe } = await sb.from("social_content_queue").insert(rows);
  if (qe) return NextResponse.json({ ok: false, error: qe.message }, { status: 500 });

  const origin = new URL(req.url).origin;
  const result: any = { ok: true, video: job.output_url, jobId: job.id, theme: job.theme, caption };
  if (platforms.includes("instagram")) {
    const ir = await fetch(`${origin}/api/instagram/publish-next`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
      cache: "no-store",
    });
    const ij = await ir.json().catch(() => ({}));
    result.instagram = ij;
    if (!ir.ok || !ij.ok) result.ok = false;
  }
  if (platforms.includes("facebook")) {
    const fr = await fetch(`${origin}/api/facebook/publish-next`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
      cache: "no-store",
    });
    const fj = await fr.json().catch(() => ({}));
    result.facebook = fj;
    if (!fr.ok || !fj.ok) result.ok = false;
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 207 });
}
