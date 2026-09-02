import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { commercialPages } from "../lib/seo-commercial";

const SITE = "https://www.easydrive-auto.fr";
const supabase = createClient(
  "https://tzlsdjzcxdjaatcpwqwn.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY||"sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    ["", "daily", 1], ["/produit", "weekly", 0.95], ["/blog", "daily", 0.9],
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
    url: `${SITE}${route}`, lastModified: new Date(), changeFrequency, priority,
  }));

  const { data } = await supabase
    .from("seo_articles")
    .select("slug,published_at,created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5000);

  const articles: MetadataRoute.Sitemap = (data || []).filter(a => a.slug).map(a => ({
    url: `${SITE}/blog/${a.slug}`,
    lastModified: new Date(a.published_at || a.created_at || Date.now()),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const offers:MetadataRoute.Sitemap=commercialPages.map(page=>({url:`${SITE}/offres/${page.slug}`,lastModified:new Date(),changeFrequency:"weekly",priority:0.9}));
  return [...base,...offers,...articles];
}
