import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { Button } from '@/components/ui/Button'
import { BookingStatusBadge } from '@/components/customer/BookingStatusBadge'
import { RealtimeRefresher } from '@/components/shared/RealtimeRefresher'
import { ChevronLeft, User, Clock, Package, Tag, ShieldAlert, MapPin } from 'lucide-react'
import { isPast } from 'date-fns'
import { formatInSLT } from '@/lib/utils/timezone'
import { markArrivedAction, bypassSealConfirmationAction, completePickupWithCashAction } from '@/lib/staff/actions'
import { StaffVerificationForm } from '@/components/staff/StaffVerificationForm'
import { CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react'
import { type BookingStatus, type BagType } from '@/types/database'
import { BAG_LABELS, calculateLateFee } from '@/lib/utils/pricing'
import { LiveStorageCountdown } from '@/components/staff/LiveStorageCountdown'

type BookingFull = {
  id: string
  status: BookingStatus
  start_time: string
  end_time: string
  total_price: number
  qr_code: string
  id_verified: boolean
  walk_in_name: string | null
  walk_in_phone: string | null
  walk_in_nic_passport_ref: string | null
  slot_number: number | null
  users: { name: string; email: string; phone: string | null; nic_passport: string | null } | null
  booking_bags: { 
    id: string
    bag_type: BagType
    sticker_number: string | null
    seal_number: string | null
    bag_tag_id: string | null
    seal_status: 'sealed' | 'seal_not_applicable'
    notes: string | null
    status: string
    bag_tags: { tag_code: string } | null
  }[]
}

export default async function StaffBookingPage({
  params,
}: {
  params: { bookingId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  // Get staff's hub
  const { data: staffRow } = await supabase
    .from('hub_staff')
    .select('hub_id, hubs(name, alias)')
    .eq('user_id', user.id)
    .eq('active', true)
    .single() as {
      data: { hub_id: string; hubs: { name: string; alias: string } | null } | null
      error: unknown
    }

  if (!staffRow) redirect('/staff/login')

  // Fetch booking (must belong to this hub)
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, status, start_time, end_time, total_price, qr_code, id_verified, slot_number,
      walk_in_name, walk_in_phone, walk_in_nic_passport_ref,
      users ( name, email, phone, nic_passport ),
      booking_bags ( id, bag_type, sticker_number, seal_number, bag_tag_id, seal_status, notes, status, bag_tags ( tag_code ) )
    `)
    .eq('id', params.bookingId)
    .eq('hub_id', staffRow.hub_id)
    .single() as { data: BookingFull | null; error: unknown }

  if (!booking) notFound()

  const { data: bookingPayment } = await supabase
    .from('payments')
    .select('status, gateway_ref')
    .eq('booking_id', booking.id)
    .eq('type', 'booking')
    .single() as { data: { status: string; gateway_ref: string | null } | null; error: unknown }

  const start = new Date(booking.start_time)
  const end = new Date(booking.end_time)
  const hasInsurance = booking.qr_code.endsWith('_ins')
  const isOverdue = isPast(end)
  const lateFeeAmount = isOverdue && (booking.status === 'overstayed' || booking.status === 'late_fee_pending') ? calculateLateFee(booking.booking_bags, end) : 0

  // Determine next action
  const nextAction = (() => {
    switch (booking.status) {
      case 'confirmed': return 'check-in'
      case 'arrived': return booking.id_verified ? 'bags' : 'verify_id'
      case 'identity_verified': return 'bags'
      case 'sealing_in_progress': return 'bags'
      case 'sealed_waiting_user_confirmation': return 'waiting'
      case 'active_storage':
      case 'pickup_requested':
      case 'overstayed':
      case 'late_fee_pending':
      case 'ready_for_release':
        return 'pickup'
      default: return 'none'
    }
  })()

  const customerName = booking.walk_in_name || booking.users?.name || 'Walk-In Guest'
  const customerPhone = booking.walk_in_phone || booking.users?.phone || 'No phone'

  return (
    <div className="min-h-screen bg-ocean-900 text-white pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <Link
          href="/staff/dashboard"
          className="flex items-center gap-1 text-white/60 hover:text-white text-sm transition-colors"
        >
          <ChevronLeft size={16} />
          Dashboard
        </Link>
        <Logo variant="white" size="sm" />
        <SignOutButton portal="staff" iconOnly />
      </div>

      {/* Realtime refresher */}
      <RealtimeRefresher
        bookingId={booking.id}
        watchStatuses={['active_storage', 'disputed', 'pickup_requested', 'completed', 'exception_hold']}
      />

      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        {/* Status + ref */}
        <div className="flex items-center justify-between">
          <p className="font-mono text-white/40 text-xs">
            #{booking.id.slice(0, 8).toUpperCase()}
          </p>
          <BookingStatusBadge status={booking.status} />
        </div>

        {/* Customer */}
        <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand/30 flex items-center justify-center shrink-0">
            <User size={18} className="text-brand" />
          </div>
          <div>
            <p className="font-bold">{customerName}</p>
            <p className="text-white/50 text-xs">{customerPhone}</p>
          </div>
        </div>

        {/* Exception hold block */}
        {booking.status === 'exception_hold' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-2">
            <h3 className="text-red-300 font-extrabold text-sm flex items-center gap-1.5">
              <ShieldAlert size={16} /> Incident Hold Active
            </h3>
            <p className="text-white/60 text-xs">
              This booking is locked in operations hold due to active incident. Supervisor action required.
            </p>
            <Link href={`/staff/pickup/${booking.id}`}>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white mt-2">
                Process Incident & Release
              </Button>
            </Link>
          </div>
        )}

        {/* Luggage Protection Active Banner */}
        {hasInsurance && (
          <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="font-bold text-emerald-400 text-xs uppercase tracking-wider">🛡️ Luggage Protection Covered</p>
              <p className="text-white/60 text-xs mt-0.5">Protected up to LKR 40,000 against theft, loss, or damage.</p>
            </div>
          </div>
        )}

        {/* Storage Slot Assignment Banner */}
        {booking.slot_number && (
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-ocean-900 shrink-0">
                <MapPin size={18} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Storage Location Slot</p>
                <p className="text-sm font-extrabold text-white">Slot #{booking.slot_number}</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full border border-amber-400/20">
              Assigned Shelf
            </span>
          </div>
        )}

        {/* Live ticking countdown timer */}
        <LiveStorageCountdown endTime={booking.end_time} status={booking.status} />

        {/* Pay at Hub Cash Alert */}
        {bookingPayment?.status === 'pending' && bookingPayment?.gateway_ref === 'PAY_AT_HUB' && booking.status === 'confirmed' && (
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-amber-400 font-bold text-sm mb-0.5">💵 Collect Booking Payment (Cash)</p>
              <p className="text-white/50 text-xs">Customer chose Cash on Arrival. Collect LKR {booking.total_price.toLocaleString()} at counter.</p>
            </div>
            <p className="text-xl font-bold text-amber-400">LKR {booking.total_price.toLocaleString()}</p>
          </div>
        )}

        {/* Identity Verification Info */}
        {(booking.status === 'arrived' || booking.status === 'confirmed' || booking.status === 'identity_verified') && (
          <div className={`p-4 rounded-2xl border transition-all ${booking.id_verified ? 'bg-green-500/10 border-green-500/20' : 'bg-brand/10 border-brand/20'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className={booking.id_verified ? 'text-green-400' : 'text-brand-light'} />
                <h3 className="text-xs font-black uppercase tracking-widest text-white/70">Identity Verification</h3>
              </div>
              {booking.id_verified && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 uppercase">
                  <CheckCircle2 size={12} /> Verified
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">NIC / Passport</p>
                <p className="font-mono text-sm tracking-widest">
                  {booking.walk_in_nic_passport_ref || booking.users?.nic_passport || 'Not provided'}
                </p>
              </div>
              {!booking.id_verified && booking.status === 'arrived' && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-light animate-pulse">
                  <AlertCircle size={12} /> Match with Physical ID
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Form */}
        {!booking.id_verified && booking.status === 'arrived' && (
          <StaffVerificationForm bookingId={booking.id} />
        )}

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
              <Clock size={12} /> Drop-off
            </div>
            <p className="font-bold text-sm">{formatInSLT(start, { day: '2-digit', month: 'short' })}</p>
            <p className="text-white/60 text-xs">{formatInSLT(start, { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
          </div>
          <div className={`rounded-2xl p-3 ${isOverdue ? 'bg-red-500/20 border border-red-400/30' : 'bg-white/10'}`}>
            <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
              <Clock size={12} /> Pick-up
            </div>
            <p className={`font-bold text-sm ${isOverdue ? 'text-red-300' : ''}`}>
              {formatInSLT(end, { day: '2-digit', month: 'short' })}
            </p>
            <p className={`text-xs ${isOverdue ? 'text-red-400' : 'text-white/60'}`}>
              {formatInSLT(end, { hour: '2-digit', minute: '2-digit', hour12: true })} {isOverdue && booking.status === 'overstayed' ? '— OVERDUE' : ''}
            </p>
          </div>
        </div>

        {lateFeeAmount > 0 && (booking.status === 'overstayed' || booking.status === 'late_fee_pending') && (
          <div className="bg-red-500/10 border border-red-400/20 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-300 font-semibold text-sm mb-0.5">Pending Late Fee</p>
                <p className="text-red-200/60 text-xs">Collect cash or customer pays online</p>
              </div>
              <p className="text-xl font-bold text-red-300">LKR {lateFeeAmount.toLocaleString()}</p>
            </div>
            <form action={completePickupWithCashAction.bind(null, booking.id)}>
              <Button type="submit" fullWidth size="sm" className="bg-brand-accent text-brand-dark hover:bg-brand-accent/90">
                💵 Collect LKR {lateFeeAmount.toLocaleString()} Cash & Complete Handover
              </Button>
            </form>
          </div>
        )}

        {/* Bags */}
        <div className="bg-white/10 rounded-2xl p-4">
          <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Package size={15} className="text-brand-accent" />
            Bags ({booking.booking_bags.length})
          </h2>
          <div className="space-y-2">
            {booking.booking_bags.map((bag) => (
              <div key={bag.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                <div className="flex flex-col">
                  <span className="text-white/80 font-medium">{BAG_LABELS[bag.bag_type]}</span>
                  {bag.seal_number && (
                    <span className="text-[10px] text-brand-accent font-mono font-bold">
                      🔒 Seal: {bag.seal_number}
                    </span>
                  )}
                  {bag.seal_status === 'seal_not_applicable' && (
                    <span className="text-[10px] text-white/40 font-bold italic">
                      Unsealable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {nextAction === 'waiting' && booking.status === 'sealed_waiting_user_confirmation' && (
          <div className="bg-yellow-500/10 border border-yellow-400/20 rounded-2xl p-4 space-y-3">
            <div>
              <p className="text-yellow-300 font-semibold text-sm">Waiting for customer</p>
              <p className="text-yellow-200/60 text-xs mt-1">
                Customer needs to review and confirm the seal photo in the Luggo app.
              </p>
            </div>
            <form action={bypassSealConfirmationAction.bind(null, booking.id)}>
              <Button type="submit" variant="outline" fullWidth size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                🗣️ Customer verbally confirmed (No Internet)
              </Button>
            </form>
          </div>
        )}
        {booking.status === 'active_storage' && (
          <div className="bg-green-500/10 border border-green-400/20 rounded-2xl p-4">
            <p className="text-green-300 font-semibold text-sm">Bags in storage ✓</p>
            <p className="text-green-200/60 text-xs mt-1">
              All bags are sealed and confirmed. Staff can process pickup directly below.
            </p>
          </div>
        )}
      </div>

      {/* Sticky action footer */}
      {(nextAction === 'check-in' || nextAction === 'verify_id' || nextAction === 'bags' || nextAction === 'pickup') && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-ocean-900 border-t border-white/10 px-4 py-4 pb-safe">
          {nextAction === 'check-in' && (
            <form action={markArrivedAction.bind(null, booking.id)}>
              <Button type="submit" fullWidth size="lg">
                ✓ Check in customer
              </Button>
            </form>
          )}
          {nextAction === 'verify_id' && (
            <div className="text-center text-xs text-white/50 bg-white/5 p-3 rounded-xl mx-4">
              Verify customer ID document above to continue
            </div>
          )}
          {nextAction === 'bags' && (
            <Link href={`/staff/booking/${booking.id}/bags`} className="block mx-4">
              <Button fullWidth size="lg">
                <Tag size={16} /> Register Bag Tags & Seals
              </Button>
            </Link>
          )}
          {nextAction === 'pickup' && (
            <Link href={`/staff/pickup/${booking.id}`} className="block mx-4">
              <Button fullWidth size="lg">
                📦 Process pickup
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
