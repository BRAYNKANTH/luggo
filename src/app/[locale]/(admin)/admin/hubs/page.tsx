import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'
import { HubCard } from '@/components/admin/HubCard'
import { HubForm } from '@/components/admin/HubForm'
import { type UserRole } from '@/types/database'

export default async function AdminHubsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single() as { data: { name: string; role: UserRole } | null; error: unknown }

  // Hubs with current booking counts
  const { data: hubs } = await supabase
    .from('hubs')
    .select('id, name, alias, location, address, capacity, open_time, close_time, active, image_url, latitude, longitude')
    .order('name') as {
      data: {
        id: string
        name: string
        alias: string
        location: string
        address: string
        capacity: number
        open_time: string
        close_time: string
        active: boolean
        image_url: string | null
        latitude: number | null
        longitude: number | null
      }[] | null
      error: unknown
    }

  // Active bags per hub
  const { data: activeBags } = await supabase
    .from('bookings')
    .select('hub_id, booking_bags(id)')
    .in('status', ['active_storage', 'pickup_requested', 'overstayed']) as {
      data: { hub_id: string; booking_bags: { id: string }[] }[] | null
      error: unknown
    }

  const bagsByHub: Record<string, number> = {}
  activeBags?.forEach((b) => {
    bagsByHub[b.hub_id] = (bagsByHub[b.hub_id] ?? 0) + (b.booking_bags?.length ?? 0)
  })

  return (
    <AdminShell userName={profile?.name ?? '—'} userRole={profile?.role ?? 'admin'}>
      <div className="px-6 py-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-extrabold text-ocean-900 mb-1">Hubs</h1>
        <p className="text-sm text-gray-400 mb-8">{hubs?.length ?? 0} hubs registered</p>

        {/* Add new hub */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm">
          <h2 className="font-bold text-ocean-900 mb-1 text-base">Add New Hub</h2>
          <p className="text-xs text-gray-400 mb-5">
            Configure the name, alias prefix, location coordinates, capacity, and business hours for a new luggage hub.
          </p>
          <HubForm />
        </div>

        <div className="space-y-4">
          {hubs?.map((hub) => {
            const bags = bagsByHub[hub.id] ?? 0
            return (
              <HubCard
                key={hub.id}
                hub={hub}
                bags={bags}
              />
            )
          })}
        </div>
      </div>
    </AdminShell>
  )
}
