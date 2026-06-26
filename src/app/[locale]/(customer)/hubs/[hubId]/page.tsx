import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HubDetailsUI } from '@/components/hubs/HubDetailsUI'
import { siteUrl } from '@/lib/site-url'

type Hub = {
  id: string
  name: string
  alias: string
  location: string
  address: string
  capacity: number
  open_time: string
  close_time: string
  active: boolean
  image_url?: string
  latitude?: number | null
  longitude?: number | null
}

type NearbyPlace = {
  id: string
  name: string
  category: string
  description: string | null
  distance_km: number
  map_url: string | null
}

export async function generateMetadata({
  params,
}: {
  params: { hubId: string; locale: string }
}): Promise<Metadata> {
  const supabase = await createClient()
  const { data: hub } = await supabase
    .from('hubs')
    .select('name, location, address')
    .eq('id', params.hubId)
    .single() as { data: { name: string; location: string; address: string } | null }

  if (!hub) return {}

  const path = `/hubs/${params.hubId}`
  const canonicalPath = params.locale === 'en' ? path : `/${params.locale}${path}`

  return {
    title: `Luggage Storage at ${hub.name}, ${hub.location} | Luggo`,
    description: `Store your bags securely at ${hub.name} in ${hub.location} (${hub.address}). Fully verified, secure, and insured luggage storage network in Sri Lanka.`,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: path,
        si: `/si${path}`,
        ta: `/ta${path}`,
      },
    },
  }
}

export default async function HubDetailPage({
  params,
}: {
  params: { hubId: string; locale: string }
}) {
  const supabase = await createClient()

  const [, hubResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('hubs')
      .select('id, name, alias, location, address, capacity, open_time, close_time, active, image_url, latitude, longitude')
      .eq('id', params.hubId)
      .single() as unknown as Promise<{ data: Hub | null }>,
  ])

  const hub = hubResult.data
  if (!hub || !hub.active) notFound()

  const [{ data: nearbyPlaces }, { count: activeCount }] = await Promise.all([
    supabase
      .from('nearby_places')
      .select('id, name, category, description, distance_km, map_url')
      .eq('hub_id', hub.id)
      .order('distance_km') as unknown as Promise<{ data: NearbyPlace[] | null }>,

    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('hub_id', hub.id)
      .not('status', 'in', '("cancelled","expired","completed")') as unknown as Promise<{
        count: number | null
      }>,
  ])

  const grouped: Record<string, NearbyPlace[]> = {}
  nearbyPlaces?.forEach((p) => {
    if (!grouped[p.category]) grouped[p.category] = []
    grouped[p.category].push(p)
  })
  const categories = Object.keys(grouped).sort()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${siteUrl}/hubs/${hub.id}`,
    name: `Luggo Luggage Storage - ${hub.name}`,
    image: hub.image_url || `${siteUrl}/images/hubs/bia.png`,
    url: `${siteUrl}/hubs/${hub.id}`,
    telephone: '+94770000000',
    priceRange: 'LKR 200 - LKR 400',
    address: {
      '@type': 'PostalAddress',
      streetAddress: hub.address,
      addressLocality: hub.location,
      addressCountry: 'LK',
    },
    ...(hub.latitude && hub.longitude
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: hub.latitude,
            longitude: hub.longitude,
          },
        }
      : {}),
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      opens: hub.open_time || '00:00',
      closes: hub.close_time || '23:59',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HubDetailsUI
        hub={hub}
        activeCount={activeCount ?? 0}
        categories={categories}
        grouped={grouped}
      />
    </>
  )
}

