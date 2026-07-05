import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://www.easydrive-auto.fr/sitemap.xml",
    host: "https://www.easydrive-auto.fr",
  };
}
