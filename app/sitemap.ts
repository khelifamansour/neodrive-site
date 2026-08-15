import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.easydrive-auto.fr";

  const routes = [
    ["", "daily", 1],
    ["/produit", "weekly", 0.95],
    ["/guide-voiture-sans-permis", "weekly", 0.95],
    ["/QuiSommesNous", "monthly", 0.85],
    ["/a-propos", "weekly", 0.95],
    ["/financement", "weekly", 0.95],
    ["/voiture-sans-permis-electrique", "weekly", 0.95],
    ["/citroen-ami-ou-neodrive", "weekly", 0.95],
    ["/voiture-sans-permis-occasion", "weekly", 0.95],
    ["/quelle-voiture-sans-permis-choisir", "weekly", 0.95],
    ["/prix-voiture-sans-permis", "weekly", 0.95],
    ["/fiat-topolino-ou-neodrive", "weekly", 0.95],
    ["/meilleure-voiture-sans-permis-electrique", "weekly", 0.95],
    ["/assurance-voiture-sans-permis", "weekly", 0.9],
    ["/batterie-lithium-ou-plomb-voiture-sans-permis", "monthly", 0.9],
    ["/livraison", "monthly", 0.85],
    ["/carte-grise", "monthly", 0.85],
    ["/pieces", "weekly", 0.8],
    ["/sav", "weekly", 0.8],
    ["/faq", "weekly", 0.8],
    ["/contact", "monthly", 0.85],
    ["/reservation", "weekly", 0.9],
  ] as const;

  return routes.map(([route, changeFrequency, priority]) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
