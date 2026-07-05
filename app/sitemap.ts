import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.easydrive-auto.fr',
      lastModified: new Date(),
    },
  ]
}
