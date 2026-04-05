import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'
import { StatCard } from '@/components/admin/StatCard'
import {
  BookOpen,
  Package,
  AlertTriangle,
  Building2,
  Clock,
  DollarSign,
  TrendingUp,
  ShoppingBag,
} from 'lucide-react'
import { type UserRole } from '@/types/database'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single() as { data: { name: string; role: UserRole } | null; error: unknown }

  // ── Stat queries (run in parallel) ──────────────────────────────────────
  const [
    { count: activeStorage },
    { count: pickupRequested },
    { count: overstayed },
    { count: pendingComplaints },
    { count: totalHubs },
    { count: totalBookings },
    { data: allPaidPayments },
    { data: todayPaidPayments },
  ] = await Promise.all([
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'active_storage'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pickup_requested'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'overstayed'),
    supabase.from('complaints').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_review']),
    supabase.from('hubs').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('payments') as any).select('amount').eq('status', 'paid'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('payments') as any)
      .select('amount')
      .eq('status', 'paid')
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ])

  const totalRevenue = (allPaidPayments as { amount: number }[] | null)
    ?.reduce((s, p) => s + p.amount, 0) ?? 0

  const todayRevenue = (todayPaidPayments as { amount: number }[] | null)
    ?.reduce((s, p) => s + p.amount, 0) ?? 0

  // ── Recent bookings ──────────────────────────────────────────────────────
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select(`
      id, status, total_price, created_at,
      users ( name ),
      hubs ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(8) as {
      data: {
        id: string
        status: string
        total_price: number
        created_at: string
        users: { name: string } | null
        hubs: { name: string } | null
      }[] | null
      error: unknown
    }

  const STATUS_COLOUR: Record<string, string> = {
    pending_payment:                  'bg-amber-100 text-amber-700',
    confirmed:                        'bg-blue-100 text-blue-700',
    arrived:                          'bg-indigo-100 text-indigo-700',
    sealing_in_progress:              'bg-violet-100 text-violet-700',
    sealed_waiting_user_confirmation: 'bg-purple-100 text-purple-700',
    active_storage:                   'bg-brand/10 text-brand',
    pickup_requested:                 'bg-cyan-100 text-cyan-700',
    completed:                        'bg-green-100 text-green-700',
    cancelled:                        'bg-gray-100 text-gray-500',
    expired:                          'bg-gray-100 text-gray-400',
    overstayed:                       'bg-red-100 text-red-600',
    disputed:                         'bg-orange-100 text-orange-600',
  }

  return (
    <AdminShell
      userName={profile?.name ?? '—'}
      userRole={profile?.role ?? 'admin'}
    >
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-extrabold text-ocean-900 mb-1">Dashboard</h1>
        <p className="text-sm text-gray-400 mb-8">Overview of the Luggo platform</p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Bags in Storage"
            value={activeStorage ?? 0}
            icon={<Package size={22} />}
            sub="active_storage bookings"
          />
          <StatCard
            label="Pickup Pending"
            value={pickupRequested ?? 0}
            icon={<ShoppingBag size={22} />}
            sub="awaiting handover"
            variant={pickupRequested ? 'warning' : 'default'}
          />
          <StatCard
            label="Overstayed"
            value={overstayed ?? 0}
            icon={<Clock size={22} />}
            sub="past end time"
            variant={overstayed ? 'danger' : 'default'}
          />
          <StatCard
            label="Open Complaints"
            value={pendingComplaints ?? 0}
            icon={<AlertTriangle size={22} />}
            sub="open + in review"
            variant={pendingComplaints ? 'warning' : 'default'}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Active Hubs"
            value={totalHubs ?? 0}
            icon={<Building2 size={22} />}
          />
          <StatCard
            label="Total Bookings"
            value={(totalBookings ?? 0).toLocaleString()}
            icon={<BookOpen size={22} />}
          />
          <StatCard
            label="Today's Revenue"
            value={`LKR ${todayRevenue.toLocaleString()}`}
            icon={<TrendingUp size={22} />}
            variant="success"
          />
          <StatCard
            label="Total Revenue"
            value={`LKR ${totalRevenue.toLocaleString()}`}
            icon={<DollarSign size={22} />}
          />
        </div>

        {/* Recent bookings */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-bold text-ocean-900">Recent Bookings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Ref</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Hub</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings?.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      #{b.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3 text-ocean-900 font-medium">
                      {b.users?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{b.hubs?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOUR[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-ocean-900">
                      LKR {b.total_price.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
