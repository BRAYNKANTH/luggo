import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { Button } from '@/components/ui/Button'
import { BookingStatusBadge } from '@/components/customer/BookingStatusBadge'
import { RealtimeRefresher } from '@/components/shared/RealtimeRefresher'
import { ChevronLeft, User, Clock, Package, Tag } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { markArrivedAction } from '@/lib/staff/actions'
import { StaffVerificationForm } from '@/components/staff/StaffVerificationForm'
import { CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react'
import { type BookingStatus, type BagType } from '@/types/database'
import { BAG_LABELS, calculateLateFee } from '@/lib/utils/pricing'

type BookingFull = {
  id: string
  status: BookingStatus
  start_time: string
  end_time: string
  total_price: number
  id_verified: boolean
  users: { name: string; email: string; phone: string | null; nic_passport: string | null } | null
  booking_bags: { id: string; bag_type: BagType; sticker_number: string | null }[]
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
      id, status, start_time, end_time, total_price, qr_code, id_verified,
      users ( name, email, phone, nic_passport ),
      booking_bags ( id, bag_type, sticker_number )
    `)
    .eq('id', params.bookingId)
    .eq('hub_id', staffRow.hub_id)
    .single() as { data: BookingFull | null; error: unknown }

  if (!booking) notFound()

  const start = new Date(booking.start_time)
  const end = new Date(booking.end_time)
  const isOverdue = isPast(end)
  const lateFeeAmount = isOverdue && booking.status === 'overstayed' ? calculateLateFee(booking.booking_bags, end) : 0

  // Determine next action
  const nextAction = (() => {
    switch (booking.status) {
      case 'confirmed': return 'check-in'
      case 'arrived': return booking.id_verified ? 'stickers' : 'verify_id'
      case 'sealing_in_progress': return 'seal'
      case 'sealed_waiting_user_confirmation': return 'waiting'
      case 'active_storage': return 'stored'
      case 'pickup_requested': return 'pickup'
      case 'overstayed': return 'late_fee_pending'
      case 'disputed': return 'seal'
      default: return 'none'
    }
  })()

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

      {/* Realtime refresher — page auto-refreshes when customer confirms seal */}
      <RealtimeRefresher
        bookingId={booking.id}
        watchStatuses={['active_storage', 'disputed', 'pickup_requested', 'completed']}
      />

      <div className="px-4 py-5 space-y-4">
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
            <p className="font-bold">{booking.users?.name ?? '—'}</p>
            <p className="text-white/50 text-xs">{booking.users?.phone ?? booking.users?.email}</p>
          </div>
        </div>

        {/* Identity Verification Info */}
        {(booking.status === 'arrived' || booking.status === 'confirmed') && (
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
                <p className="font-mono text-sm tracking-widest">{booking.users?.nic_passport ?? 'Not provided'}</p>
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
            <p className="font-bold text-sm">{format(start, 'dd MMM')}</p>
            <p className="text-white/60 text-xs">{format(start, 'h:mm a')}</p>
          </div>
          <div className={`rounded-2xl p-3 ${isOverdue ? 'bg-red-500/20 border border-red-400/30' : 'bg-white/10'}`}>
            <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
              <Clock size={12} /> Pick-up
            </div>
            <p className={`font-bold text-sm ${isOverdue ? 'text-red-300' : ''}`}>
              {format(end, 'dd MMM')}
            </p>
            <p className={`text-xs ${isOverdue ? 'text-red-400' : 'text-white/60'}`}>
              {format(end, 'h:mm a')} {isOverdue && booking.status === 'overstayed' ? '— OVERDUE' : ''}
            </p>
          </div>
        </div>

        {lateFeeAmount > 0 && booking.status === 'overstayed' && (
          <div className="bg-red-500/10 border border-red-400/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-red-300 font-semibold text-sm mb-0.5">Pending Late Fee</p>
              <p className="text-red-200/60 text-xs">Customer must pay this in their app</p>
            </div>
            <p className="text-xl font-bold text-red-300">LKR {lateFeeAmount.toLocaleString()}</p>
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
              <div key={bag.id} className="flex items-center justify-between text-sm">
                <span className="text-white/80">{BAG_LABELS[bag.bag_type]}</span>
                {bag.sticker_number ? (
                  <span className="font-mono text-xs bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded-lg font-bold">
                    {staffRow.hubs?.alias}-{bag.sticker_number}
                  </span>
                ) : (
                  <span className="text-white/30 text-xs flex items-center gap-1">
                    <Tag size={11} /> No sticker
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Waiting for customer message */}
        {nextAction === 'waiting' && booking.status === 'sealed_waiting_user_confirmation' && (
          <div className="bg-yellow-500/10 border border-yellow-400/20 rounded-2xl p-4">
            <p className="text-yellow-300 font-semibold text-sm">Waiting for customer</p>
            <p className="text-yellow-200/60 text-xs mt-1">
              Customer needs to review and confirm the seal photo in the Luggo app.
            </p>
          </div>
        )}
        {nextAction === 'seal' && booking.status === 'disputed' && (
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl p-4">
            <p className="text-amber-400 font-semibold text-sm">Dispute Action Required</p>
            <p className="text-amber-200/60 text-xs mt-1">
              Customer disputed the seal photo. Please verify the bags and upload a new, clear photo to resolve.
            </p>
          </div>
        )}
        {nextAction === 'stored' && (
          <div className="bg-green-500/10 border border-green-400/20 rounded-2xl p-4">
            <p className="text-green-300 font-semibold text-sm">Bags in storage ✓</p>
            <p className="text-green-200/60 text-xs mt-1">
              All bags are sealed and confirmed. Awaiting customer pickup request.
            </p>
          </div>
        )}
      </div>

      {/* Sticky action footer */}
      {(nextAction === 'check-in' || nextAction === 'stickers' || nextAction === 'seal' || nextAction === 'pickup') && (
        <div className="fixed bottom-0 left-0 right-0 bg-ocean-900 border-t border-white/10 px-4 py-4 pb-safe">
          {nextAction === 'check-in' && (
            <form action={markArrivedAction.bind(null, booking.id)}>
              <Button type="submit" fullWidth size="lg">
                ✓ Check in customer
              </Button>
            </form>
          )}
          {nextAction === 'stickers' && (
            <Link href={`/staff/booking/${booking.id}/stickers`}>
              <Button fullWidth size="lg">
                <Tag size={16} /> Apply stickers & seal
              </Button>
            </Link>
          )}
          {nextAction === 'seal' && (
            <Link href={`/staff/booking/${booking.id}/seal`}>
              <Button fullWidth size="lg">
                📸 Upload seal photo
              </Button>
            </Link>
          )}
          {nextAction === 'pickup' && (
            <Link href={`/staff/pickup/${booking.id}`}>
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
