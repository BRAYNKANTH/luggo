import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'
import { ComplaintActions } from '@/components/admin/ComplaintActions'
import { type UserRole, type ComplaintStatus } from '@/types/database'
import { format } from 'date-fns'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '',          label: 'All' },
  { value: 'open',      label: 'Open' },
  { value: 'in_review', label: 'In Review' },
  { value: 'resolved',  label: 'Resolved' },
  { value: 'closed',    label: 'Closed' },
]

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single() as { data: { name: string; role: UserRole } | null; error: unknown }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('complaints') as any)
    .select(`
      id, description, status, created_at,
      users ( name, email ),
      bookings ( id, hubs ( name ) )
    `)
    .order('created_at', { ascending: false })

  if (searchParams.status) query = query.eq('status', searchParams.status)

  const { data: complaints } = await query as {
    data: {
      id: string
      description: string
      status: ComplaintStatus
      created_at: string
      users: { name: string; email: string } | null
      bookings: { id: string; hubs: { name: string } | null } | null
    }[] | null
    error: unknown
  }

  return (
    <AdminShell userName={profile?.name ?? '—'} userRole={profile?.role ?? 'admin'}>
      <div className="px-6 py-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-extrabold text-ocean-900 mb-1">Complaints</h1>
        <p className="text-sm text-gray-400 mb-6">{complaints?.length ?? 0} shown</p>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_FILTERS.map(({ value, label }) => (
            <Link
              key={value}
              href={value ? `/admin/complaints?status=${value}` : '/admin/complaints'}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                (searchParams.status ?? '') === value
                  ? 'bg-ocean-900 text-white border-ocean-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="space-y-3">
          {complaints?.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-ocean-900 text-sm">{c.users?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{c.users?.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    Booking #{(c.bookings?.id ?? '').slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-400">{c.bookings?.hubs?.name}</p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {format(new Date(c.created_at), 'dd MMM yyyy, h:mm a')}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 mb-3">
                {c.description}
              </p>

              <ComplaintActions
                complaintId={c.id}
                initialStatus={c.status}
              />
            </div>
          ))}
          {!complaints?.length && (
            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-12 text-center text-gray-400 text-sm">
              No complaints found.
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
