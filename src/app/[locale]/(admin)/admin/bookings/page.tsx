import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'
import { HubFilter } from '@/components/admin/HubFilter'
import { BookingsTable } from '@/components/admin/BookingsTable'
import { type UserRole, type BookingStatus } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Bookings — Admin' }

const PAGE_SIZE = 30

const ALL_STATUSES: BookingStatus[] = [
  'pending_payment', 'confirmed', 'arrived', 'sealing_in_progress',
  'sealed_waiting_user_confirmation', 'active_storage', 'pickup_requested',
  'completed', 'cancelled', 'expired', 'overstayed', 'disputed',
]

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; hub?: string; page?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single() as { data: { name: string; role: UserRole } | null; error: unknown }

  const page   = Math.max(1, Number(searchParams.page ?? 1))
  const offset = (page - 1) * PAGE_SIZE

  // Hubs for filter dropdown
  const { data: hubs } = await supabase
    .from('hubs')
    .select('id, name')
    .order('name') as { data: { id: string; name: string }[] | null; error: unknown }

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('bookings') as any)
    .select(`
      id, status, start_time, end_time, total_price, created_at,
      users ( name, email ),
      hubs ( name ),
      booking_bags ( id )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.hub)    query = query.eq('hub_id', searchParams.hub)

  const { data: bookings, count } = await query as {
    data: {
      id: string
      status: string
      start_time: string
      end_time: string
      total_price: number
      created_at: string
      users: { name: string; email: string } | null
      hubs: { name: string } | null
      booking_bags: { id: string }[]
    }[] | null
    count: number | null
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    const merged = { status: searchParams.status, hub: searchParams.hub, page: String(page), ...params }
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v) })
    return `/admin/bookings?${sp.toString()}`
  }

  return (
    <AdminShell userName={profile?.name ?? '—'} userRole={profile?.role ?? 'admin'}>
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-extrabold text-ocean-900 mb-1">Bookings</h1>
        <p className="text-sm text-gray-400 mb-6">{count ?? 0} total</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Status filter */}
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={buildUrl({ status: undefined, page: '1' })}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                !searchParams.status
                  ? 'bg-ocean-900 text-white border-ocean-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              All
            </Link>
            {ALL_STATUSES.map((s) => (
              <Link
                key={s}
                href={buildUrl({ status: s, page: '1' })}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  searchParams.status === s
                    ? 'bg-ocean-900 text-white border-ocean-900'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </Link>
            ))}
          </div>

          {/* Hub filter */}
          {hubs && hubs.length > 0 && (
            <HubFilter hubs={hubs} currentHubId={searchParams.hub} />
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <BookingsTable bookings={bookings} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
              <p className="text-xs text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildUrl({ page: String(page - 1) })}
                    className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildUrl({ page: String(page + 1) })}
                    className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
