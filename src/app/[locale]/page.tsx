import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/marketing/LandingPage'
// import MaintenancePage from '@/components/marketing/MaintenancePage' // Available for service stopped / maintenance mode
import { type UserRole, type BagType } from '@/types/database'
import { CONTACT_EMAIL, SOCIAL_LINKS } from '@/lib/public-company'
import { siteUrl } from '@/lib/site-url'
import { DEFAULT_BAG_RATES, type BagRates } from '@/lib/utils/pricing'
import { liveCitiesFromHubs } from '@/lib/utils/live-cities'
import { LISTINGS_HIDDEN } from '@/lib/booking-pause'
import { getTranslations } from 'next-intl/server'
import { GUARANTEE_LIMIT_LABEL } from '@/lib/utils/guarantee'

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>
  }
): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const canonicalPath = locale === 'en' ? '/' : `/${locale}`

  return {
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: '/',
        si: '/si',
        ta: '/ta',
      },
    },
  }
}

export default async function RootPage(
  props: {
    params: Promise<{ locale: string }>
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Cheapest rate per bag type across all active hubs, so the marketing
    // page can honestly say "from LKR X/hr" now that rates vary per hub.
    const { data: rateRows } = await supabase
      .from('hub_bag_rates' as never)
      .select('bag_type, hourly_rate, daily_cap, hubs!inner(active)')
      .eq('hubs.active', true) as {
        data: { bag_type: BagType; hourly_rate: number; daily_cap: number }[] | null
      }

    const fromRates: BagRates = { ...DEFAULT_BAG_RATES }
    for (const row of rateRows ?? []) {
      const current = fromRates[row.bag_type]
      if (Number(row.hourly_rate) < current.hourlyRate) {
        fromRates[row.bag_type] = { hourlyRate: Number(row.hourly_rate), dailyCap: Number(row.daily_cap) }
      }
    }

    // Cities with a live partner hub. Hubs are hidden publicly while LISTINGS_HIDDEN is on,
    // so no city is shown as live then.
    let liveCities: ReturnType<typeof liveCitiesFromHubs> = []
    if (!LISTINGS_HIDDEN) {
      const { data: liveHubs } = await supabase
        .from('hubs')
        .select('name, alias, location, address')
        .eq('active', true)
      liveCities = liveCitiesFromHubs(liveHubs ?? [])
    }

    const tFaq = await getTranslations({ locale, namespace: 'Faq' })
    const tMeta = await getTranslations({ locale, namespace: 'Meta' })
    const langPrefix = locale === 'en' ? '' : `/${locale}`
    const pageUrl = `${siteUrl}${langPrefix}`

    const jsonLdWebsite = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: 'Luggo',
      url: siteUrl,
      inLanguage: locale,
      publisher: { '@id': `${siteUrl}/#organization` },
    }

    const jsonLdOrg = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Luggo',
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      description: tMeta('siteDescription'),
      email: CONTACT_EMAIL,
      areaServed: { '@type': 'Country', name: 'Sri Lanka' },
      sameAs: SOCIAL_LINKS.map(({ href }) => href),
    }

    const jsonLdService = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      '@id': `${pageUrl}#service`,
      serviceType: 'Luggage storage',
      name: tMeta('siteTitle'),
      description: tMeta('siteDescription'),
      provider: { '@id': `${siteUrl}/#organization` },
      areaServed: { '@type': 'Country', name: 'Sri Lanka' },
      url: pageUrl,
    }

    const jsonLdFaq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: locale,
      mainEntity: (['how', 'late', 'covered', 'account'] as const).map((key) => ({
        '@type': 'Question',
        name: tFaq(`${key}.q`),
        acceptedAnswer: {
          '@type': 'Answer',
          text: tFaq(`${key}.a`, { amount: GUARANTEE_LIMIT_LABEL }),
        },
      })),
    }

    const jsonLd = [jsonLdWebsite, jsonLdOrg, jsonLdService, jsonLdFaq]

    return (
      <>
        {jsonLd.map((data, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
          />
        ))}
        <LandingPage rates={fromRates} liveCities={liveCities} />
      </>
    )
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: UserRole } | null; error: unknown }

  if (!profile) redirect('/login')

  switch (profile.role) {
    case 'hub_staff':
      redirect('/staff/dashboard')
    case 'support_admin':
    case 'ops_admin':
    case 'master_admin':
      redirect('/admin/dashboard')
    default:
      redirect('/dashboard')
  }
}

