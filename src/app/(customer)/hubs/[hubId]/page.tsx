import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HubDetailsUI } from '@/components/hubs/HubDetailsUI'

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
}

type NearbyPlace = {
  id: string
  name: string
  category: string
  description: string | null
  distance_km: number
  map_url: string | null
}

export default async function HubDetailPage({
  params,
}: {
  params: { hubId: string }
}) {
  const supabase = await createClient()

  const [, hubResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('hubs')
      .select('id, name, alias, location, address, capacity, open_time, close_time, active, image_url')
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

  return (
    <HubDetailsUI
      hub={hub}
      activeCount={activeCount ?? 0}
      categories={categories}
      grouped={grouped}
    />
  )
}
