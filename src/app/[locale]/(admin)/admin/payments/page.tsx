import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'
import { type UserRole } from '@/types/database'
import { format } from 'date-fns'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Payments — Admin' }

const PAGE_SIZE = 40

const STATUS_COLOUR: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  paid:     'bg-green-100 text-green-700',
  failed:   'bg-red-100 text-red-600',
  refunded: 'bg-gray-100 text-gray-500',
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: { type?: string; status?: string; page?: string }
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('payments') as any)
    .select(`
      id, amount, status, type, gateway_ref, created_at,
      bookings ( id, users ( name, email ), hubs ( name ) )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (searchParams.type)   query = query.eq('type', searchParams.type)
  if (searchParams.status) query = query.eq('status', searchParams.status)

  const { data: payments, count } = await query as {
    data: {
      id: string
      amount: number
      status: string
      type: string
      gateway_ref: string | null
      created_at: string
      bookings: {
        id: string
        users: { name: string; email: string } | null
        hubs: { name: string } | null
      } | null
    }[] | null
    count: number | null
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    const merged = { type: searchParams.type, status: searchParams.status, page: String(page), ...params }
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v) })
    return `/admin/payments?${sp.toString()}`
  }

  return (
    <AdminShell userName={profile?.name ?? '—'} userRole={profile?.role ?? 'admin'}>
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-extrabold text-ocean-900 mb-1">Payments</h1>
        <p className="text-sm text-gray-400 mb-6">{count ?? 0} total</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['', 'booking', 'late_fee'].map((t) => (
            <Link
              key={t}
              href={buildUrl({ type: t || undefined, page: '1' })}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                (searchParams.type ?? '') === t
                  ? 'bg-ocean-900 text-white border-ocean-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {t === '' ? 'All types' : t.replace('_', ' ')}
            </Link>
          ))}
          <div className="h-6 border-l border-gray-200 mx-1" />
          {['', 'pending', 'paid', 'failed', 'refunded'].map((s) => (
            <Link
              key={s}
              href={buildUrl({ status: s || undefined, page: '1' })}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                (searchParams.status ?? '') === s
                  ? 'bg-ocean-900 text-white border-ocean-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {s === '' ? 'All statuses' : s}
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Hub</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Ref</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments?.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {format(new Date(p.created_at), 'dd MMM yy, h:mm a')}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-ocean-900">{p.bookings?.users?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{p.bookings?.users?.email}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{p.bookings?.hubs?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.type === 'late_fee' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {p.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOUR[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      {p.gateway_ref ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-ocean-900">
                      LKR {p.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!payments?.length && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                      No payments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
              <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={buildUrl({ page: String(page - 1) })} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50">
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={buildUrl({ page: String(page + 1) })} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50">
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
