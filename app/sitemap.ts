import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.easydrive-auto.fr";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },

    {
      url: `${baseUrl}/produit`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },

    {
      url: `${baseUrl}/guide-voiture-sans-permis`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },

    {
      url: `${baseUrl}/QuiSommesNous`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.85,
    },

    {
      url: `${baseUrl}/a-propos`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },

    {
      url: `${baseUrl}/financement`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },

    {
      url: `${baseUrl}/voiture-sans-permis-electrique`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },

    {
      url: `${baseUrl}/citroen-ami-ou-neodrive`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },

    {
      url: `${baseUrl}/livraison`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.85,
    },

    {
      url: `${baseUrl}/carte-grise`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.85,
    },

    {
      url: `${baseUrl}/pieces`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },

    {
      url: `${baseUrl}/sav`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },

    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },

    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.85,
    },

    {
      url: `${baseUrl}/reservation`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
