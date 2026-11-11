import { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

const PRIVATE_PATHS = ['/admin/', '/staff/', '/api/', '/dashboard/']

// AI search / answer-engine crawlers. Listed explicitly so the intent to be
// cited by them is unambiguous (and survives any future change to the '*' rule).
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
