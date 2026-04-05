import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Package, Tag, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { BookingStatusBadge } from '@/components/customer/BookingStatusBadge'
import { completePickupAction, waiveAndCompletePickupAction } from '@/lib/staff/actions'
import { BAG_LABELS } from '@/lib/utils/pricing'
import { type BookingStatus, type BagType } from '@/types/database'
import { isPast } from 'date-fns'

type Bag = { id: string; bag_type: BagType; sticker_number: string | null }
type Booking = {
  id: string
  status: BookingStatus
  end_time: string
  total_price: number
  users: { name: string; phone: string | null } | null
  booking_bags: Bag[]
  hubs: { alias: string } | null
}

export default async function StaffPickupPage({
  params,
}: {
  params: { bookingId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: staffRow } = await supabase
    .from('hub_staff')
    .select('hub_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .single() as { data: { hub_id: string } | null; error: unknown }

  if (!staffRow) redirect('/staff/login')

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, status, end_time, total_price,
      users ( name, phone ),
      booking_bags ( id, bag_type, sticker_number ),
      hubs ( alias )
    `)
    .eq('id', params.bookingId)
    .eq('hub_id', staffRow.hub_id)
    .single() as { data: Booking | null; error: unknown }

  if (!booking) notFound()

  const allowed: BookingStatus[] = ['pickup_requested', 'overstayed']
  if (!allowed.includes(booking.status)) {
    redirect(`/staff/booking/${params.bookingId}`)
  }

  // Calculate late fee using Postgres function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lateFee } = await (supabase.rpc as any)('calculate_late_fee', {
    p_booking_id: params.bookingId,
  }) as { data: number | null; error: unknown }

  const isOverdue = isPast(new Date(booking.end_time))
  const fee = lateFee ?? 0

  return (
    <div className="min-h-screen bg-ocean-900 text-white pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <Link
          href={`/staff/booking/${params.bookingId}`}
          className="flex items-center gap-1 text-white/60 hover:text-white text-sm"
        >
          <ChevronLeft size={16} />
          Back
        </Link>
        <Logo variant="white" size="sm" />
        <div className="w-10" />
      </div>

      <div className="px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Process Pickup</h1>
          <BookingStatusBadge status={booking.status} />
        </div>

        {/* Customer */}
        <div className="bg-white/10 rounded-2xl p-4">
          <p className="text-white/50 text-xs mb-1">Customer</p>
          <p className="font-bold">{booking.users?.name ?? '—'}</p>
          {booking.users?.phone && (
            <p className="text-white/50 text-xs mt-0.5">{booking.users.phone}</p>
          )}
        </div>

        {/* Bags checklist */}
        <div className="bg-white/10 rounded-2xl p-4">
          <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Package size={15} className="text-brand-accent" />
            Verify bags before handing over
          </h2>
          <div className="space-y-2">
            {booking.booking_bags.map((bag) => (
              <div key={bag.id} className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0">
                <span className="text-white/80">{BAG_LABELS[bag.bag_type]}</span>
                {bag.sticker_number ? (
                  <span className="font-mono text-xs bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                    <Tag size={10} />
                    {booking.hubs?.alias}-{bag.sticker_number}
                  </span>
                ) : (
                  <span className="text-white/30 text-xs">No sticker</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Late fee warning */}
        {isOverdue && fee > 0 && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-300 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-300 font-semibold text-sm">Late pickup fee applies</p>
                <p className="text-red-200/70 text-xs mt-0.5">
                  Booking overdue by{' '}
                  {Math.ceil((Date.now() - new Date(booking.end_time).getTime()) / (1000 * 60 * 60))} hrs
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-between items-center text-sm">
              <span className="text-white/60">Original booking</span>
              <span>LKR {booking.total_price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-red-300">Late fee</span>
              <span className="text-red-300 font-bold">+ LKR {fee.toLocaleString()}</span>
            </div>
            <div className="border-t border-red-400/20 mt-2 pt-2 flex justify-between items-center font-bold">
              <span>Total to collect</span>
              <span>LKR {(booking.total_price + fee).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* On-time summary */}
        {!isOverdue && (
          <div className="bg-white/10 rounded-2xl p-4 flex justify-between items-center">
            <span className="text-white/60 text-sm">Total paid</span>
            <span className="font-bold">LKR {booking.total_price.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Confirm pickup CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-ocean-900 border-t border-white/10 px-4 py-4 pb-safe space-y-2">
        <p className="text-white/40 text-xs text-center mb-1">
          Verify customer identity and confirm all bags are returned before tapping.
        </p>
        {booking.status === 'overstayed' ? (
          <>
            <div className="bg-red-500/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center mb-1">
              <p className="text-red-300 text-xs font-semibold">Customer must pay late fee in-app to unlock normal completion.</p>
            </div>
            <form action={waiveAndCompletePickupAction.bind(null, booking.id)}>
              <Button type="submit" fullWidth size="lg" className="bg-amber-600 hover:bg-amber-500">
                ⚠️ Staff override — waive & complete
              </Button>
            </form>
          </>
        ) : (
          <form action={completePickupAction.bind(null, booking.id)}>
            <Button type="submit" fullWidth size="lg">
              ✓ Confirm pickup complete
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
