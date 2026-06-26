import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/marketing/LandingPage'
import { type UserRole } from '@/types/database'
import { siteUrl } from '@/lib/site-url'

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
        <LandingPage />
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

