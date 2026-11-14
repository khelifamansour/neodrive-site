import { MetadataRoute } from "next";

// Keep public commercial, local, article and video pages crawlable; keep internal tools out of search.
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
        "/organisation",
        "/contenu",
        "/idees",
        "/academy",
      ],
    },
    sitemap: "https://www.easydrive-auto.fr/sitemap.xml",
    host: "https://www.easydrive-auto.fr",
  };
}
