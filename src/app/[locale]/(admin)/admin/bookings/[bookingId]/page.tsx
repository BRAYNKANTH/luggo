import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AdminShell } from '@/components/admin/AdminShell'
import { type UserRole, type BookingStatus, type BagType } from '@/types/database'
import { format, isPast } from 'date-fns'
import { BAG_LABELS } from '@/lib/utils/pricing'
import { ChevronLeft, User, MapPin, Clock, Package, CreditCard, Tag, Shield, AlertTriangle } from 'lucide-react'

const STATUS_COLOUR: Record<string, string> = {
  pending_payment:                  'bg-amber-100 text-amber-700',
  confirmed:                        'bg-blue-100 text-blue-700',
  arrived:                          'bg-indigo-100 text-indigo-700',
  sealing_in_progress:              'bg-violet-100 text-violet-700',
  sealed_waiting_user_confirmation: 'bg-purple-100 text-purple-700',
  active_storage:                   'bg-green-100 text-green-700',
  pickup_requested:                 'bg-cyan-100 text-cyan-700',
  completed:                        'bg-green-100 text-green-800',
  cancelled:                        'bg-gray-100 text-gray-400',
  expired:                          'bg-gray-100 text-gray-400',
  overstayed:                       'bg-red-100 text-red-600',
  disputed:                         'bg-orange-100 text-orange-600',
}

async function forceCompleteAction(bookingId: string) {
  'use server'
  const svc = createServiceClient()
  await svc.from('bookings' as never).update({ status: 'completed' }).eq('id', bookingId)
  redirect(`/admin/bookings/${bookingId}`)
}

async function forceCancelAction(bookingId: string) {
  'use server'
  const svc = createServiceClient()
  await svc.from('bookings' as never).update({ status: 'cancelled' }).eq('id', bookingId)
  redirect(`/admin/bookings/${bookingId}`)
}

type BookingDetail = {
  id: string
  status: BookingStatus
  start_time: string
  end_time: string
  total_price: number
  qr_code: string
  created_at: string
  users: { id: string; name: string; email: string; phone: string | null } | null
  hubs: { name: string; alias: string; address: string } | null
  booking_bags: { id: string; bag_type: BagType; sticker_number: string | null; seal_number: string | null }[]
}

type Payment = {
  id: string
  amount: number
  status: string
  type: string
  gateway_ref: string | null
  created_at: string
}

type SealProof = {
  id: string
  photo_url: string
  uploaded_at: string
  confirmed_by_user_at: string | null
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: { bookingId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single() as { data: { name: string; role: UserRole } | null; error: unknown }

  const svc = createServiceClient()

  const { data: booking } = await svc
    .from('bookings' as never)
    .select(`
      id, status, start_time, end_time, total_price, qr_code, created_at,
      users ( id, name, email, phone ),
      hubs ( name, alias, address ),
      booking_bags ( id, bag_type, sticker_number, seal_number )
    `)
    .eq('id', params.bookingId)
    .single() as { data: BookingDetail | null }

  if (!booking) notFound()

  const { data: payments } = await svc
    .from('payments' as never)
    .select('id, amount, status, type, gateway_ref, created_at')
    .eq('booking_id', params.bookingId)
    .order('created_at', { ascending: false }) as { data: Payment[] | null }

  const { data: sealProofs } = await svc
    .from('seal_proofs' as never)
    .select('id, photo_url, uploaded_at, confirmed_by_user_at')
    .eq('booking_id', params.bookingId)
    .order('uploaded_at', { ascending: false }) as { data: SealProof[] | null }

  const isOverdue   = isPast(new Date(booking.end_time))
  const isTerminal  = ['completed', 'cancelled', 'expired'].includes(booking.status)
  const isActive    = !isTerminal && booking.status !== 'pending_payment'

  return (
    <AdminShell userName={profile?.name ?? '—'} userRole={profile?.role ?? 'admin'}>
      <div className="px-6 py-8 max-w-4xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/admin/bookings" className="text-sm text-gray-400 hover:text-ocean-900 flex items-center gap-1">
            <ChevronLeft size={14} /> Bookings
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-mono text-gray-600">#{booking.id.slice(0, 8).toUpperCase()}</span>
        </div>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-ocean-900">Booking Detail</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Created {format(new Date(booking.created_at), 'dd MMM yyyy, h:mm a')}
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_COLOUR[booking.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {booking.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: main info */}
          <div className="lg:col-span-2 space-y-4">

            {/* Customer */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User size={13} /> Customer
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-ocean-900 flex items-center justify-center text-white shrink-0">
                  <User size={18} />
                </div>
                <div>
                  <p className="font-bold text-ocean-900">{booking.users?.name ?? '—'}</p>
                  <p className="text-sm text-gray-500">{booking.users?.email}</p>
                  {booking.users?.phone && <p className="text-sm text-gray-400">{booking.users.phone}</p>}
                </div>
              </div>
            </div>

            {/* Hub + timing */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MapPin size={13} /> Hub
                </h2>
                <p className="font-semibold text-ocean-900">{booking.hubs?.name}</p>
                <p className="text-sm text-gray-500">{booking.hubs?.address}</p>
              </div>
              <div className="border-t border-gray-50 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                    <Clock size={11} /> Drop-off
                  </p>
                  <p className="font-semibold text-sm text-ocean-900">
                    {format(new Date(booking.start_time), 'dd MMM yyyy')}
                  </p>
                  <p className="text-xs text-gray-400">{format(new Date(booking.start_time), 'h:mm a')}</p>
                </div>
                <div>
                  <p className={`text-xs font-medium mb-1 flex items-center gap-1 ${isOverdue && isActive ? 'text-red-500' : 'text-gray-400'}`}>
                    <Clock size={11} /> Pick-up by
                  </p>
                  <p className={`font-semibold text-sm ${isOverdue && isActive ? 'text-red-600' : 'text-ocean-900'}`}>
                    {format(new Date(booking.end_time), 'dd MMM yyyy')}
                  </p>
                  <p className={`text-xs ${isOverdue && isActive ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                    {format(new Date(booking.end_time), 'h:mm a')}
                    {isOverdue && isActive && ' — OVERDUE'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bags */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Package size={13} /> Bags ({booking.booking_bags.length})
              </h2>
              <div className="space-y-2">
                {booking.booking_bags.map((bag) => (
                  <div key={bag.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700">{BAG_LABELS[bag.bag_type]}</span>
                      {bag.seal_number && (
                        <span className="text-[10px] font-mono text-gray-400">
                          🔒 Seal: {bag.seal_number}
                        </span>
                      )}
                    </div>
                    {bag.sticker_number ? (
                      <span className="font-mono text-xs font-bold bg-brand/10 text-brand px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                        <Tag size={10} /> {booking.hubs?.alias}-{bag.sticker_number}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 shrink-0">No sticker</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Seal proofs */}
            {sealProofs && sealProofs.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield size={13} /> Seal History ({sealProofs.length})
                </h2>
                <div className="space-y-2">
                  {sealProofs.map((sp, i) => (
                    <div key={sp.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-gray-700 font-medium text-xs">
                          Attempt {sealProofs.length - i}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {format(new Date(sp.uploaded_at), 'dd MMM, h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sp.confirmed_by_user_at ? (
                          <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            Confirmed
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: payments + actions */}
          <div className="space-y-4">

            {/* Price */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CreditCard size={13} /> Payments
              </h2>
              <div className="space-y-2">
                {payments?.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-xs font-semibold text-gray-700 capitalize">{p.type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {format(new Date(p.created_at), 'dd MMM, h:mm a')}
                      </p>
                      {p.gateway_ref && (
                        <p className="text-[10px] font-mono text-gray-300 mt-0.5">{p.gateway_ref}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ocean-900">LKR {p.amount.toLocaleString()}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        p.status === 'paid'     ? 'bg-green-100 text-green-700' :
                        p.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                        p.status === 'failed'   ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
                {!payments?.length && (
                  <p className="text-xs text-gray-400 text-center py-3">No payment records</p>
                )}
              </div>
              <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600">Total</span>
                <span className="font-black text-ocean-900">LKR {booking.total_price.toLocaleString()}</span>
              </div>
            </div>

            {/* Admin actions */}
            {!isTerminal && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle size={13} /> Admin Actions
                </h2>
                <p className="text-xs text-gray-400 mb-4">Use with caution — these actions are irreversible.</p>
                <div className="space-y-2">
                  {booking.status !== 'completed' && (
                    <form action={forceCompleteAction.bind(null, booking.id)}>
                      <button
                        type="submit"
                        className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-left"
                      >
                        ✓ Force complete booking
                      </button>
                    </form>
                  )}
                  {booking.status !== 'cancelled' && (
                    <form action={forceCancelAction.bind(null, booking.id)}>
                      <button
                        type="submit"
                        className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-left"
                      >
                        ✕ Force cancel booking
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Booking ref */}
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Booking Reference</p>
              <p className="font-mono font-black text-ocean-900 text-lg tracking-wider">
                #{booking.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
