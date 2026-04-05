import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient, type HubCard, type ActiveBooking } from './DashboardClient'

type RawHub = {
  id: string
  name: string
  alias: string
  address: string
  open_time: string
  close_time: string
  capacity: number
  image_url: string | null
  latitude: number | null
  longitude: number | null
}



export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Guest-safe: fetch profile only when signed in
  let firstName: string | null = null
  let rawActiveBookings: ActiveBooking[] = []
  let notifications: { id: string; message: string; read: boolean; created_at: string; type: string }[] = []

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', user.id)
      .single() as { data: { name: string; role: string } | null }

    if (profile) {
      if (profile.role === 'hub_staff') {
        redirect('/staff/dashboard')
      }
      firstName = profile.name.split(' ')[0]
    }

    // Active bookings banner
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status, start_time, end_time, total_price, hubs(name, alias, image_url)')
      .eq('user_id', user.id)
      .not('status', 'in', '("completed","cancelled","expired")')
      .order('created_at', { ascending: false })
      .limit(3) as { data: ActiveBooking[] | null }

    rawActiveBookings = bookings ?? []

    // Notifications
    const { data: notifs } = await supabase
      .from('notifications')
      .select('id, message, read, created_at, type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    notifications = notifs ?? []
  }

  // Hubs are always public — fetch for everyone
  const { data: rawHubs } = await supabase
    .from('hubs')
    .select('id, name, alias, address, open_time, close_time, capacity, image_url, latitude, longitude')
    .eq('active', true)
    .order('name') as { data: RawHub[] | null }

  // Bag-based availability: count total bags across all active/storing bookings
  const { data: hubBagRows } = await supabase
    .from('booking_bags')
    .select('id, bookings!inner(hub_id)')
    .not('bookings.status', 'in', '("completed","cancelled","expired","pending_payment")') as { data: { id: string; bookings: { hub_id: string } }[] | null }

  const countMap: Record<string, number> = {}
  for (const row of hubBagRows ?? []) {
    const hubId = row.bookings.hub_id
    countMap[hubId] = (countMap[hubId] ?? 0) + 1
  }

  const hubs: HubCard[] = (rawHubs ?? []).map((h) => ({
    ...h,
    activeCount: countMap[h.id] ?? 0,
  }))

  return (
    <DashboardClient
      hubs={hubs}
      activeBookings={rawActiveBookings}
      firstName={firstName}
      userId={user?.id ?? null}
      notifications={notifications}
    />
  )
}
