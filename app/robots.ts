import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/seo-dashboard",
        "/social-upload",
        "/crm",
        "/erp",
        "/gestion",
        "/facturation",
        "/dealer",
      ],
    },
    sitemap: "https://www.easydrive-auto.fr/sitemap.xml",
    host: "https://www.easydrive-auto.fr",
  };
}
