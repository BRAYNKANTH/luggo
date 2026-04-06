import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'
import { HubToggle } from '@/components/admin/HubToggle'
import { HubImageUpload } from '@/components/admin/HubImageUpload'
import { MapPin, Clock, Users } from 'lucide-react'
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
    .select('id, name, alias, address, capacity, open_time, close_time, active, image_url')
    .order('name') as {
      data: {
        id: string
        name: string
        alias: string
        address: string
        capacity: number
        open_time: string
        close_time: string
        active: boolean
        image_url: string | null
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

        <div className="space-y-4">
          {hubs?.map((hub) => {
            const bags    = bagsByHub[hub.id] ?? 0
            const pct     = Math.min(100, Math.round((bags / hub.capacity) * 100))
            const isHigh  = pct >= 80

            return (
              <div key={hub.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-bold text-ocean-900">{hub.name}</h2>
                      <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">
                        {hub.alias}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {hub.address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {hub.open_time} – {hub.close_time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        Capacity {hub.capacity} bags
                      </span>
                    </div>

                    {/* Capacity bar */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{bags} bags in storage</span>
                        <span className={isHigh ? 'text-red-500 font-semibold' : ''}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isHigh ? 'bg-red-400' : 'bg-brand'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <HubToggle hubId={hub.id} initialActive={hub.active} />
                    <span className="text-xs text-gray-400">
                      {hub.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Image upload */}
                <div className="border-t border-gray-50 mt-4 pt-4">
                  <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Hub Photo</p>
                  <HubImageUpload
                    hubId={hub.id}
                    hubName={hub.name}
                    currentImageUrl={hub.image_url ?? null}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminShell>
  )
}
