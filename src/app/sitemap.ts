import { MetadataRoute } from 'next'
import { locales, defaultLocale, type Locale } from '@/i18n-config'
import { createClient } from '@/lib/supabase/server'

const baseUrl = 'https://luggo.lk'

type SitemapEntryInput = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
  lastModified: Date
}

function localizedPath(locale: Locale, path: string) {
  if (locale === defaultLocale) {
    return path
  }

  return `/${locale}${path}`
}

function absoluteUrl(path: string) {
  return `${baseUrl}${path}`
}

function buildEntry({
  path,
  changeFrequency,
  priority,
  lastModified,
}: SitemapEntryInput): MetadataRoute.Sitemap[number] {
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, absoluteUrl(localizedPath(locale, path))])
  )

  return {
    url: absoluteUrl(localizedPath(defaultLocale, path)),
    lastModified,
    changeFrequency,
    priority,
    alternates: {
      languages,
    },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const supabase = await createClient()

  const publicRoutes: SitemapEntryInput[] = [
    { path: '/', changeFrequency: 'daily', priority: 1.0, lastModified: now },
    { path: '/hubs', changeFrequency: 'daily', priority: 0.9, lastModified: now },
    { path: '/login', changeFrequency: 'monthly', priority: 0.7, lastModified: now },
    { path: '/forgot-password', changeFrequency: 'monthly', priority: 0.5, lastModified: now },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.3, lastModified: now },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.3, lastModified: now },
  ]

  const { data: hubs } = await supabase
    .from('hubs')
    .select('id, updated_at')
    .eq('active', true)
    .order('name') as {
      data: { id: string; updated_at: string | null }[] | null
      error: unknown
    }

  const hubRoutes = (hubs ?? []).map((hub) =>
    buildEntry({
      path: `/hubs/${hub.id}`,
      changeFrequency: 'weekly',
      priority: 0.8,
      lastModified: hub.updated_at ? new Date(hub.updated_at) : now,
    })
  )

  return [
    ...publicRoutes.map(buildEntry),
    ...hubRoutes,
  ]
}
