import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'
import { UserRoleSelector } from '@/components/admin/UserRoleSelector'
import { type UserRole } from '@/types/database'
import { format } from 'date-fns'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { role?: string; q?: string }
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
  let query = (supabase.from('users') as any)
    .select('id, name, email, phone, role, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100)

  const roleFilter = searchParams.role ?? 'customer'
  query = query.eq('role', roleFilter)

  const { data: users, count } = await query as {
    data: {
      id: string
      name: string
      email: string
      phone: string | null
      role: UserRole
      created_at: string
    }[] | null
    count: number | null
  }

  // Booking counts per user
  const userIds = users?.map((u) => u.id) ?? []
  const bookingCounts: Record<string, number> = {}

  if (userIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bCounts } = await (supabase.from('bookings') as any)
      .select('user_id')
      .in('user_id', userIds) as { data: { user_id: string }[] | null; error: unknown }

    bCounts?.forEach((b) => {
      bookingCounts[b.user_id] = (bookingCounts[b.user_id] ?? 0) + 1
    })
  }

  const ROLE_TABS: UserRole[] = ['customer', 'hub_staff', 'support_admin', 'ops_admin', 'master_admin']

  return (
    <AdminShell userName={profile?.name ?? '—'} userRole={profile?.role ?? 'admin'}>
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-extrabold text-ocean-900 mb-1">Users</h1>
        <p className="text-sm text-gray-400 mb-6">{count ?? 0} in this role</p>

        {/* Role tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {ROLE_TABS.map((r) => (
            <a
              key={r}
              href={`/admin/users?role=${r}`}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                roleFilter === r
                  ? 'bg-ocean-900 text-white border-ocean-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {r.replace(/_/g, ' ')}
            </a>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Phone</th>
                  {roleFilter === 'customer' && (
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400">Bookings</th>
                  )}
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Joined</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Role / Action</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-ocean-900">{u.name}</td>
                    <td className="px-5 py-3 text-gray-500">{u.email}</td>
                    <td className="px-5 py-3 text-gray-400">{u.phone ?? '—'}</td>
                    {roleFilter === 'customer' && (
                      <td className="px-5 py-3 text-center">
                        <span className="text-xs font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full">
                          {bookingCounts[u.id] ?? 0}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {format(new Date(u.created_at), 'dd MMM yyyy')}
                    </td>
                    <td className="px-5 py-3">
                      <UserRoleSelector
                        userId={u.id}
                        currentRole={u.role}
                        disabled={u.id === user?.id}
                      />
                    </td>
                  </tr>
                ))}
                {!users?.length && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
