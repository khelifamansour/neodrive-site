import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { commercialPages } from "../../../../lib/seo-commercial";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const URL = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}
function keyOf(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
function safeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function errText(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e); } catch { return "Erreur inconnue"; }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const oa = process.env.OPENAI_API_KEY;
  if (!sk || !oa) return NextResponse.json({ ok: false, error: "Configuration incomplete" }, { status: 503 });

  const sb = createClient(URL, sk, { auth: { persistSession: false } });
  const requestUrl = new globalThis.URL(req.url);
  const requestedTopic = requestUrl.searchParams.get("topic")?.trim().slice(0, 240) || "";
  const triggerSource = requestUrl.searchParams.get("source") === "manual" ? "manual" : "auto";
  const startedMs = Date.now();

  const { data: run } = await sb.from("seo_publish_runs").insert({
    trigger_source: triggerSource,
    status: "running",
    topic: requestedTopic || null,
  }).select("id").single();

  const fail = async (error: unknown, status = 500) => {
    const message = errText(error).slice(0, 3000);
    if (run?.id) {
      await sb.from("seo_publish_runs").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedMs,
        error_message: message,
      }).eq("id", run.id);
    }
    return NextResponse.json({ ok: false, error: message }, { status });
  };

  try {
    const [{ data: topics }, { data: recentArticles }, { data: photos }, { data: videos }] = await Promise.all([
      sb.from("marketing_topics").select("id,topic,angle,target_audience,primary_keyword,secondary_keywords,business_priority,times_used").eq("status", "idea").order("times_used", { ascending: true }).order("business_priority", { ascending: false }).limit(80),
      sb.from("seo_articles").select("slug,title,target_keyword,published_at").eq("status", "published").order("published_at", { ascending: false }).limit(40),
      sb.from("social_media_assets").select("public_url,title,context,ai_quality_score").eq("status", "ready").eq("media_type", "image").not("storage_path", "like", "generated/%").order("ai_quality_score", { ascending: false, nullsFirst: false }).limit(20),
      sb.from("social_media_assets").select("id,public_url,title,context,created_at").eq("status", "ready").eq("media_type", "video").not("storage_path", "like", "generated/%").order("created_at", { ascending: false }).limit(30),
    ]);

    const recentKeys = new Set((recentArticles || []).flatMap((item: any) => [keyOf(String(item.title || "")), keyOf(String(item.target_keyword || ""))]).filter(Boolean));
    const availableTopics = (topics || []).filter((item: any) => {
      const topicKey = keyOf(String(item.topic || ""));
      const keywordKey = keyOf(String(item.primary_keyword || ""));
      return !recentKeys.has(topicKey) && !recentKeys.has(keywordKey);
    });
    const chosen = requestedTopic
      ? topics?.find((item: any) => keyOf(String(item.topic || "")) === keyOf(requestedTopic) || keyOf(String(item.primary_keyword || "")) === keyOf(requestedTopic))
      : availableTopics[0] || topics?.[0];

    const topic = requestedTopic || chosen?.topic || "Combien coûte une voiture sans permis électrique en 2026 ?";
    if (run?.id && !requestedTopic) await sb.from("seo_publish_runs").update({ topic }).eq("id", run.id);

    const offerLinks = commercialPages.map(page => `/offres/${page.slug} (${page.title})`).join("; ");
    const existingTitles = (recentArticles || []).map((item: any) => item.title).join(" | ");
    const prompt = `Rédige un excellent article SEO français de 1400 à 2200 mots pour un acheteur réel de voiture sans permis. Sujet: ${topic}. Angle: ${chosen?.angle || "guide d'achat concret"}. Public: ${chosen?.target_audience || "acheteurs en France"}. Mot-clé principal: ${chosen?.primary_keyword || topic}. Mots-clés secondaires: ${(chosen?.secondary_keywords || []).join(", ")}. Articles récents à ne pas dupliquer: ${existingTitles || "aucun"}. NeoDrive: VSP électrique 2 places, gamme à partir de 3 990 € TTC, recharge prise 220 V, livraison en France. Exigences: répondre précisément à l'intention; titre distinctif; introduction courte; H2/H3; exemples/scénarios pratiques; tableau comparatif HTML si pertinent; checklist; FAQ 5 questions; intégrer naturellement 4 à 7 liens internes pertinents parmi /produit, /contact, /guide-voiture-sans-permis, /prix-voiture-sans-permis, /voiture-sans-permis, /videos, /voiture-sans-permis-occasion, /citroen-ami-ou-neodrive, /fiat-topolino-ou-neodrive, /blog et les pages commerciales suivantes: ${offerLinks}; conclusion utile. Comparaisons Citroën Ami, Fiat Topolino, Aixam, Ligier: factuelles, nuancées, sans dénigrement, sans inventer prix/caractéristiques/défauts. Carrosserie acier: expliquer l’intérêt général sans attribuer ce matériau à NeoDrive sans documentation vérifiée. Réglementation: quadricycle léger à partir de 14 ans avec catégorie AM lorsque requise; jamais avant 14 ans; personnes nées avant 1988: exception à vérifier; formation AM minimum 8 heures; citer Service-Public https://www.service-public.gouv.fr/particuliers/vosdroits/F2890. Pour assurance, suspension/retrait de permis: situation dépend de la catégorie et de la décision administrative/judiciaire, recommander vérification officielle; ne jamais promettre le droit de conduire. Aucun faux avis, fausse ville, faux stock, fausse autonomie ou garantie. Pas de bourrage de mots-clés. Retour JSON strict {title,description,content,keywords}; content HTML simple sans H1.`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${oa}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_SEO_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      }),
    });
    const j = await r.json();
    if (!r.ok) return fail(j, 500);

    const out = JSON.parse(j.choices?.[0]?.message?.content || "{}");
    if (!out.title || !out.content) return fail("Le moteur SEO n'a pas retourné un article complet", 500);

    const baseSlug = slugify(out.title || topic) + "-" + new Date().toISOString().slice(0, 10);
    const { data: already } = await sb.from("seo_articles").select("id").eq("slug", baseSlug).limit(1).maybeSingle();
    const slug = already ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
    const now = new Date().toISOString();
    const description = String(out.description || "").trim();

    const photo = photos?.[Math.floor(Date.now() / 86400000) % (photos?.length || 1)];
    const image = photo?.public_url
      ? `<figure><img src="${safeHtml(String(photo.public_url))}" alt="${safeHtml(String(photo.title || "Voiture sans permis électrique NeoDrive"))}" loading="lazy" style="max-width:100%;height:auto;border-radius:16px"><figcaption>Photo réelle NeoDrive.</figcaption></figure>`
      : "";

    const video = videos?.[Math.floor(Date.now() / 86400000) % (videos?.length || 1)];
    const videoBlock = video?.public_url && video?.id
      ? `<section><h2>Voir une NeoDrive réelle en vidéo</h2><p>Cette vidéo provient de notre bibliothèque réelle de véhicules et complète les informations du guide.</p><video controls preload="metadata" playsinline style="width:100%;max-height:650px;background:#000;border-radius:16px"><source src="${safeHtml(String(video.public_url))}" type="video/mp4"></video><p><a href="/videos/${safeHtml(String(video.id))}">Ouvrir la page dédiée à cette vidéo</a> · <a href="/videos">Voir toutes les vidéos NeoDrive</a></p></section>`
      : "";

    const relatedArticles = (recentArticles || []).slice(0, 4).map((item: any) => `<li><a href="/blog/${safeHtml(String(item.slug))}">${safeHtml(String(item.title))}</a></li>`).join("");
    const links = relatedArticles ? `<section><h2>Autres guides NeoDrive</h2><ul>${relatedArticles}</ul></section>` : "";
    const content = `${image}${String(out.content || "")}${videoBlock}${links}<p><a href="https://wa.me/33628261446">Demander les photos, vidéos et tarifs NeoDrive sur WhatsApp</a></p>`;

    const { data, error } = await sb.from("seo_articles").insert({
      slug,
      title: out.title,
      meta_description: description,
      excerpt: description,
      description,
      content,
      target_keyword: chosen?.primary_keyword || topic,
      topic,
      keywords: Array.isArray(out.keywords) ? out.keywords : [],
      status: "published",
      published_at: now,
      publish_source: triggerSource,
    }).select().single();
    if (error) return fail(error.message, 500);

    if (chosen?.id) {
      const { data: t } = await sb.from("marketing_topics").select("times_used").eq("id", chosen.id).single();
      await sb.from("marketing_topics").update({ times_used: Number(t?.times_used || 0) + 1, last_used_at: now, updated_at: now }).eq("id", chosen.id);
    }

    const articleUrl = `https://www.easydrive-auto.fr/blog/${slug}`;
    if (run?.id) {
      await sb.from("seo_publish_runs").update({
        status: "success",
        completed_at: now,
        duration_ms: Date.now() - startedMs,
        article_id: data.id,
        slug,
        title: data.title,
        url: articleUrl,
        error_message: null,
      }).eq("id", run.id);
    }

    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ ok: true, article: data, url: articleUrl, triggerSource, embeddedVideo: video?.id || null, topicSource: requestedTopic ? "manual" : chosen ? "marketing_topics" : "fallback" });
  } catch (e) {
    return fail(e, 500);
  }
}
