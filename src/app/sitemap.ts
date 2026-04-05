import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://luggo.lk'
  
  const now = new Date()

  return [
    { url: baseUrl,              lastModified: now, changeFrequency: 'daily',  priority: 1.0 },
    { url: `${baseUrl}/hubs`,    lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
    { url: `${baseUrl}/login`,   lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`,   lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
