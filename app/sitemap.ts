import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { commercialPages } from "../lib/seo-commercial";
import { seoCities } from "../lib/seo-cities";

const SITE = "https://www.easydrive-auto.fr";
const supabase = createClient(
  "https://tzlsdjzcxdjaatcpwqwn.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    ["", "daily", 1], ["/produit", "weekly", 0.95], ["/blog", "daily", 0.9],
    ["/voiture-sans-permis", "weekly", 0.98], ["/videos", "daily", 0.9],
    ["/blog/livraison-voiture-sans-permis", "monthly", 0.8],
    ["/blog/5-questions-avant-acheter-voiture-sans-permis-electrique", "monthly", 0.8],
    ["/blog/voiture-sans-permis-14-ans", "monthly", 0.8],
    ["/blog/permis-am-voiturette-electrique", "monthly", 0.8],
    ["/blog/assurance-voiture-sans-permis-ce-quil-faut-verifier", "monthly", 0.8],
    ["/blog/carte-grise-voiture-sans-permis-electrique", "monthly", 0.8],
    ["/blog/voiture-sans-permis-neuve-ou-occasion", "monthly", 0.8],
    ["/blog/meilleur-rapport-qualite-prix-voiturette-electrique", "monthly", 0.8],
    ["/blog/voiture-sans-permis-neuve-3990-euros", "monthly", 0.8],
    ["/blog/cout-recharge-voiture-sans-permis-electrique", "monthly", 0.8],
    ["/blog/neodrive-ou-fiat-topolino", "monthly", 0.8],
    ["/guide-voiture-sans-permis", "weekly", 0.95], ["/QuiSommesNous", "monthly", 0.85],
    ["/a-propos", "weekly", 0.9], ["/financement", "weekly", 0.9],
    ["/voiture-sans-permis-electrique", "weekly", 0.95], ["/citroen-ami-ou-neodrive", "weekly", 0.95],
    ["/voiture-sans-permis-occasion", "weekly", 0.95], ["/quelle-voiture-sans-permis-choisir", "weekly", 0.95],
    ["/prix-voiture-sans-permis", "weekly", 0.95], ["/fiat-topolino-ou-neodrive", "weekly", 0.9],
    ["/meilleure-voiture-sans-permis-electrique", "weekly", 0.95], ["/assurance-voiture-sans-permis", "weekly", 0.9],
    ["/batterie-lithium-ou-plomb-voiture-sans-permis", "monthly", 0.9], ["/livraison", "monthly", 0.85],
    ["/carte-grise", "monthly", 0.85], ["/pieces", "weekly", 0.8], ["/sav", "weekly", 0.8],
    ["/blog/sav-voiture-sans-permis", "monthly", 0.75],
    ["/faq", "weekly", 0.8], ["/contact", "monthly", 0.85], ["/reservation", "weekly", 0.9],
  ] as const;

  const base: MetadataRoute.Sitemap = routes.map(([route, changeFrequency, priority]) => ({
    url: `${SITE}${route}`, changeFrequency, priority,
  }));

  const cityPages: MetadataRoute.Sitemap = seoCities.map((city) => ({
    url: `${SITE}/voiture-sans-permis/${city.slug}`,
    changeFrequency: "weekly",
    priority: city.slug === "toulouse" ? 0.95 : 0.9,
  }));

  const [{ data: articleRows }, { data: videoRows }] = await Promise.all([
    supabase.from("seo_articles").select("slug,published_at,created_at").eq("status", "published").order("published_at", { ascending: false }).limit(5000),
    supabase.from("social_media_assets").select("id,created_at").eq("status", "ready").eq("media_type", "video").not("storage_path", "like", "generated/%").order("created_at", { ascending: false }).limit(1000),
  ]);

  const articles: MetadataRoute.Sitemap = (articleRows || []).filter(a => a.slug).map(a => ({
    url: `${SITE}/blog/${a.slug}`,
    lastModified: new Date(a.published_at || a.created_at || Date.now()),
    changeFrequency: "monthly",
    priority: 0.72,
  }));

  const videos: MetadataRoute.Sitemap = (videoRows || []).filter(v => v.id).map(v => ({
    url: `${SITE}/videos/${v.id}`,
    lastModified: new Date(v.created_at || Date.now()),
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  const offers: MetadataRoute.Sitemap = commercialPages.map(page => ({
    url: `${SITE}/offres/${page.slug}`,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [...base, ...cityPages, ...offers, ...articles, ...videos];
}
