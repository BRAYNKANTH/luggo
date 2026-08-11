import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MaintenancePage from '@/components/marketing/MaintenancePage'
// import LandingPage from '@/components/marketing/LandingPage'
import { type UserRole, type BagType } from '@/types/database'
import { siteUrl } from '@/lib/site-url'
import { DEFAULT_BAG_RATES, type BagRates } from '@/lib/utils/pricing'

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string }
}): Promise<Metadata> {
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

export default async function RootPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
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

    const jsonLdWebsite = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Luggo',
      url: siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/${locale}/dashboard?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    }

    const jsonLdOrg = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Luggo',
      url: siteUrl,
      logo: `${siteUrl}/images/logo.png`,
      sameAs: [
        'https://www.facebook.com/luggo.lk',
        'https://www.instagram.com/luggo.lk',
      ],
    }

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
        <MaintenancePage />
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

