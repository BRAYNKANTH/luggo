import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'
import { NearbyPlaceForm } from '@/components/admin/NearbyPlaceForm'
import { DeleteNearbyPlace } from '@/components/admin/DeleteNearbyPlace'
import { MapPinned } from 'lucide-react'
import { type UserRole } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nearby Places — Admin' }

type Place = {
  id: string
  name: string
  category: string
  description: string | null
  distance_km: number
  map_url: string | null
  hubs: { id: string; name: string } | null
}

// Category emoji mapping
const CAT_EMOJI: Record<string, string> = {
  Restaurant:   '🍽️',
  Cafe:         '☕',
  Hotel:        '🏨',
  Shopping:     '🛍️',
  Attraction:   '📸',
  Transport:    '🚆',
  Beach:        '🏖️',
  'Hospital':   '🏥',
  'Bank / ATM': '🏦',
  Other:        '📍',
}

export default async function AdminNearbyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single() as { data: { name: string; role: UserRole } | null; error: unknown }

  const [{ data: hubs }, { data: places }] = await Promise.all([
    supabase
      .from('hubs')
      .select('id, name')
      .eq('active', true)
      .order('name') as unknown as Promise<{ data: { id: string; name: string }[] | null; error: unknown }>,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('nearby_places') as any)
      .select('id, name, category, description, distance_km, map_url, hubs ( id, name )')
      .order('distance_km') as Promise<{ data: Place[] | null; error: unknown }>,
  ])

  // Group places by hub name
  const byHub: Record<string, Place[]> = {}
  places?.forEach((p) => {
    const key = p.hubs?.name ?? 'Unknown Hub'
    if (!byHub[key]) byHub[key] = []
    byHub[key].push(p)
  })

  return (
    <AdminShell userName={profile?.name ?? '—'} userRole={profile?.role ?? 'admin'}>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-ocean-900 mb-1">Nearby Places</h1>
            <p className="text-sm text-gray-400">
              {places?.length ?? 0} places across {Object.keys(byHub).length} hubs
            </p>
          </div>
          <NearbyPlaceForm hubs={hubs ?? []} />
        </div>

        {Object.keys(byHub).length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-16 text-center">
            <MapPinned size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No nearby places yet.</p>
            <p className="text-gray-300 text-xs mt-1">Use &quot;Add place&quot; above to get started.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byHub).map(([hubName, hubPlaces]) => (
              <div key={hubName}>
                <h2 className="font-bold text-ocean-900 text-sm mb-3 flex items-center gap-2">
                  <MapPinned size={14} className="text-brand" />
                  {hubName}
                  <span className="text-xs font-normal text-gray-400">
                    ({hubPlaces.length})
                  </span>
                </h2>

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-50 bg-gray-50/50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Place</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Category</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Description</th>
                        <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400">Distance</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Maps</th>
                        <th className="px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {hubPlaces.map((place) => (
                        <tr key={place.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/30">
                          <td className="px-5 py-3 font-medium text-ocean-900">
                            {place.name}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {CAT_EMOJI[place.category] ?? '📍'} {place.category}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-400 max-w-[200px] truncate">
                            {place.description ?? <span className="text-gray-200">—</span>}
                          </td>
                          <td className="px-5 py-3 text-center text-xs font-semibold text-gray-600">
                            {place.distance_km} km
                          </td>
                          <td className="px-5 py-3">
                            {place.map_url ? (
                              <a
                                href={place.map_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-brand hover:underline"
                              >
                                View →
                              </a>
                            ) : (
                              <span className="text-gray-200 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <DeleteNearbyPlace placeId={place.id} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
