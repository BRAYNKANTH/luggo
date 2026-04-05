import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'
import { type UserRole, type BookingStatus } from '@/types/database'
import { format } from 'date-fns'

const PAGE_SIZE = 30

const ALL_STATUSES: BookingStatus[] = [
  'pending_payment', 'confirmed', 'arrived', 'sealing_in_progress',
  'sealed_waiting_user_confirmation', 'active_storage', 'pickup_requested',
  'completed', 'cancelled', 'expired', 'overstayed', 'disputed',
]

const STATUS_COLOUR: Record<string, string> = {
  pending_payment:                  'bg-amber-100 text-amber-700',
  confirmed:                        'bg-blue-100 text-blue-700',
  arrived:                          'bg-indigo-100 text-indigo-700',
  sealing_in_progress:              'bg-violet-100 text-violet-700',
  sealed_waiting_user_confirmation: 'bg-purple-100 text-purple-700',
  active_storage:                   'bg-brand/10 text-brand',
  pickup_requested:                 'bg-cyan-100 text-cyan-700',
  completed:                        'bg-green-100 text-green-700',
  cancelled:                        'bg-gray-100 text-gray-400',
  expired:                          'bg-gray-100 text-gray-400',
  overstayed:                       'bg-red-100 text-red-600',
  disputed:                         'bg-orange-100 text-orange-600',
}

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
            <select
              defaultValue={searchParams.hub ?? ''}
              onChange={() => {/* handled via Link below */}}
              className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="">All hubs</option>
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Ref</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Hub</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Bags</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Period</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bookings?.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => { window.location.href = `/admin/bookings/${b.id}` }}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      #{b.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-ocean-900">{b.users?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{b.users?.email}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{b.hubs?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOUR[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-gray-600">
                      {b.booking_bags?.length ?? 0}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      <p>{format(new Date(b.start_time), 'dd MMM, h:mm a')}</p>
                      <p className="text-gray-400">→ {format(new Date(b.end_time), 'dd MMM, h:mm a')}</p>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-ocean-900">
                      LKR {b.total_price.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!bookings?.length && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                      No bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
