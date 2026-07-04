import { notFound, redirect } from 'next/navigation'
import { Link } from '@/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookingQR } from '@/components/customer/BookingQR'
import { BookingStatusBadge } from '@/components/customer/BookingStatusBadge'
import { RealtimeRefresher } from '@/components/shared/RealtimeRefresher'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { ExtendBookingCTA } from '@/components/customer/ExtendBookingCTA'
import { cancelBooking } from '@/lib/auth/actions'
import {
  MapPin, Clock, Package, AlertTriangle, CheckCircle,
  ShoppingBag, CreditCard, QrCode, ShieldCheck
} from 'lucide-react'
import { BookingProgressTracker } from '@/components/customer/BookingProgressTracker'
import { formatDateSLT, formatDateTimeSLT } from '@/lib/utils/timezone'
import { type BookingStatus, type BagType } from '@/types/database'
import { BAG_LABELS, BAG_RATES, calculateLateFee } from '@/lib/utils/pricing'
import { EarlyCheckinPayButton } from '@/components/customer/EarlyCheckinPayButton'

type BookingDetail = {
  id: string
  status: BookingStatus
  start_time: string
  end_time: string
  total_price: number
  qr_code: string
  created_at: string
  slot_number: number | null
  hub_id: string
  hubs: { name: string; alias: string; address: string } | null
  booking_bags: { id: string; bag_type: BagType; sticker_number: string | null; seal_number: string | null }[]
  payments: { status: string; gateway_ref: string | null; type: string }[]
  early_checkin_minutes: number | null
  early_checkin_type: string
  early_checkin_extra_hours: number | null
  early_checkin_fee: number
  early_checkin_payment_status: string | null
}

const CANCELLABLE: BookingStatus[] = ['pending_payment', 'confirmed']
const EXTEND_ELIGIBLE: BookingStatus[] = ['confirmed', 'arrived', 'sealing_in_progress', 'sealed_waiting_user_confirmation', 'active_storage', 'overstayed']

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: { bookingId: string }
  searchParams: { payment?: string; sealed?: string; pickup?: string; ext?: string; pickup_error?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, status, start_time, end_time, total_price, qr_code, created_at, slot_number, hub_id,
      early_checkin_minutes, early_checkin_type, early_checkin_extra_hours, early_checkin_fee, early_checkin_payment_status,
      hubs ( name, alias, address ),
      booking_bags ( id, bag_type, sticker_number, seal_number ),
      payments ( status, gateway_ref, type )
    `)
    .eq('id', params.bookingId)
    .eq('user_id', user.id)
    .single() as { data: BookingDetail | null; error: unknown }

  if (!booking) notFound()

  // Fetch seal proof if it exists
  const { data: sealProof } = await supabase
    .from('seal_proofs')
    .select('photo_url')
    .eq('booking_id', booking.id)
    .maybeSingle() as { data: { photo_url: string } | null; error: unknown }

  let signedSealPhotoUrl: string | null = null
  if (sealProof) {
    const { data: signedData } = await supabase.storage
      .from('seal-proofs')
      .createSignedUrl(sealProof.photo_url, 3600)
    signedSealPhotoUrl = signedData?.signedUrl ?? null
  }

  const start = new Date(booking.start_time)
  const end   = new Date(booking.end_time)
  const hasInsurance = booking.qr_code.endsWith('_ins')
  const isCancellable   = CANCELLABLE.includes(booking.status)
  const showQR          = !['cancelled', 'expired', 'pending_payment'].includes(booking.status)
  const showConfirmSeal = booking.status === 'sealed_waiting_user_confirmation'
  const showPickupCTA   = ['active_storage', 'overstayed', 'late_fee_pending'].includes(booking.status)
  const isPickupPending = booking.status === 'pickup_requested'
  const showExtendCTA   = EXTEND_ELIGIBLE.includes(booking.status)
  const hourlyRate      = booking.booking_bags.reduce((t, b) => t + (BAG_RATES[b.bag_type] || 0), 0)
  const bookingPayment  = booking.payments?.find(p => p.type === 'booking')
  const isCashPaymentPending = !bookingPayment || (bookingPayment.status === 'pending' && bookingPayment.gateway_ref === 'PAY_AT_HUB')

  // Calculate late fee if overstayed or late fee is pending
  const isOverdue = ['overstayed', 'late_fee_pending'].includes(booking.status)
  let lateFeeAmount = 0
  let overdueHours = 0
  let overdueHalfHours = 0
  if (isOverdue) {
    lateFeeAmount = calculateLateFee(booking.booking_bags, end, new Date())
    if (lateFeeAmount > 0) {
      const overdueMs = Date.now() - end.getTime()
      const overdueMinutes = Math.ceil(overdueMs / (60 * 1000))
      overdueHalfHours = Math.ceil(overdueMinutes / 30)
      overdueHours = overdueHalfHours * 0.5
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <RealtimeRefresher bookingId={booking.id} />

      <PageHeader
        title={booking.hubs?.name ?? 'Booking'}
        subtitle={`#${booking.id.slice(0, 8).toUpperCase()} · ${formatDateSLT(start)}`}
        backHref="/bookings"
        action={<BookingStatusBadge status={booking.status} />}
      />

      <div className="px-4 md:px-6 py-4 md:py-6 space-y-4">

        {/* ── Banners ── */}
        {isCashPaymentPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">💵 Cash Payment Pending at Hub</p>
              <p className="text-xs text-amber-700 mt-0.5">Please pay <strong>LKR {booking.total_price.toLocaleString()}</strong> in cash to the staff at the counter during drop-off.</p>
            </div>
          </div>
        )}
        {searchParams.payment === 'success' && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle size={18} className="text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-900 text-sm">Payment confirmed!</p>
                <p className="text-xs text-green-700 mt-0.5">Your booking is secured. We&apos;ll see you at the hub.</p>
              </div>
            </div>
            <script dangerouslySetInnerHTML={{
              __html: `try { localStorage.removeItem('luggo_booking_${booking.hub_id}'); } catch(e){}`
            }} />
          </>
        )}
        {searchParams.payment === 'ext_success' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle size={18} className="text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-900 text-sm">Booking extended!</p>
              <p className="text-xs text-green-700 mt-0.5">Your new pickup time is shown below.</p>
            </div>
          </div>
        )}
        {searchParams.payment === 'lf_success' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle size={18} className="text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-900 text-sm">Late fee paid!</p>
              <p className="text-xs text-green-700 mt-0.5">Head to the hub counter to collect your bags.</p>
            </div>
          </div>
        )}
        {searchParams.payment === 'cancelled' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">Payment not completed</p>
              <p className="text-xs text-amber-700 mt-0.5">Your booking is held for 30 minutes.</p>
            </div>
          </div>
        )}

        {/* ── Seal review alert ── */}
        {showConfirmSeal && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl md:rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Action required</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-tight">Staff have sealed your bags. Please review the photo and confirm.</p>
              </div>
            </div>
            <Link href={`/booking/${booking.id}/confirm-seal`}>
              <Button fullWidth size="sm">Review & Confirm Seal</Button>
            </Link>
          </div>
        )}

        {/* ── Early Check-In Pending Payment Alert ── */}
        {booking.status === 'early_checkin_pending_payment' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl md:rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Early drop-off payment required</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-tight">
                  You are {booking.early_checkin_minutes} minutes early. To keep your original pickup time, please pay LKR {booking.early_checkin_fee}.
                </p>
                <p className="text-[10px] text-amber-600/80 leading-normal italic mt-1.5">
                  * Early fee is calculated from the time Luggo staff accepts your luggage.
                </p>
              </div>
            </div>
            <EarlyCheckinPayButton bookingId={booking.id} fee={booking.early_checkin_fee} />
          </div>
        )}

        {/* ── Free Buffer Early Check-In Applied Banner ── */}
        {booking.early_checkin_type === 'free_buffer' && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl md:rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900 text-sm">Free early check-in applied</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                You are slightly early. Your early check-in is free, and your pickup time remains unchanged.
              </p>
            </div>
          </div>
        )}

        {/* ── Shift Booking Early Check-In Applied Banner ── */}
        {booking.early_checkin_type === 'shift_booking' && (
          <div className="bg-brand/5 border border-brand/20 rounded-xl md:rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <Clock size={18} className="text-brand shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-ocean-900 text-sm">Booking shifted earlier</p>
              <p className="text-xs text-gray-500 mt-0.5">
                You shifted your booking window earlier. Your new pickup time is {formatDateTimeSLT(new Date(booking.end_time))}.
              </p>
            </div>
          </div>
        )}

        {/* ── Paid Early Check-In Applied Banner ── */}
        {booking.early_checkin_type === 'pay_extra' && booking.early_checkin_payment_status === 'paid' && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl md:rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900 text-sm">Early check-in fee paid</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                You checked in {booking.early_checkin_minutes} minutes early. Paid LKR {booking.early_checkin_fee} to keep your original pickup time.
              </p>
            </div>
          </div>
        )}

        {/* ── Cash Payment Pending Warning Banner ── */}
        {isCashPaymentPending && booking.status === 'confirmed' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl md:rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 text-sm leading-tight">Cash Payment Pending at Hub</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-tight">
                Please pay LKR {booking.total_price.toLocaleString()} in cash to the staff at the counter during drop-off.
              </p>
            </div>
          </div>
        )}
        {searchParams.pickup_error && (
          <div className="bg-red-50 border border-red-200 rounded-xl md:rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 text-sm leading-tight">Pickup request failed</p>
              <p className="text-xs text-red-500 mt-0.5">{decodeURIComponent(searchParams.pickup_error)}</p>
            </div>
          </div>
        )}

        {/* ── Late Fee Pending Alert ── */}
        {isOverdue && lateFeeAmount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl md:rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-red-950 text-sm">⚠️ Late Overstay Fee Required</p>
                <p className="text-xs text-red-700 mt-1 leading-normal">
                  Your storage has exceeded the booked pick-up time. A late fee must be paid before you can request bag pickup.
                </p>
                
                {/* Pricing Calculation breakdown table */}
                <div className="bg-white/60 p-3.5 rounded-xl border border-red-100 text-xs space-y-1.5 mt-3 text-red-900">
                  <div className="flex justify-between">
                    <span>Overstay Duration:</span>
                    <span className="font-bold">{overdueHours} hour{overdueHours !== 1 ? 's' : ''} ({overdueHalfHours} half-hour blocks)</span>
                  </div>
                  <div className="flex justify-between border-t border-red-100/50 pt-1.5 mt-1.5 font-bold">
                    <span>Total Late Fee Payable:</span>
                    <span className="text-red-600">LKR {lateFeeAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Pay Online Button */}
            <div className="pt-1">
              <Link href={`/pickup/${booking.id}`}>
                <Button fullWidth className="bg-red-600 hover:bg-red-500 text-white border-none font-bold">
                  💳 Pay Late Fee Online & Request Pickup
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Pickup pending ── */}
        {isPickupPending && (
          <div className="bg-brand/5 border border-brand/20 rounded-xl md:rounded-2xl p-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin shrink-0" />
            <div>
              <p className="font-semibold text-ocean-900 text-sm leading-tight">Staff are retrieving your bags</p>
              <p className="text-xs text-gray-500 mt-0.5">Please show your QR code at the counter.</p>
            </div>
          </div>
        )}

        {/* ── Progress Tracker ── */}
        <BookingProgressTracker status={booking.status} />

        {/* ── Luggage Protection Covered Banner ── */}
        {hasInsurance && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md shadow-emerald-100">
              <CheckCircle size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="font-black text-emerald-900 text-sm tracking-tight">
                🛡️ Luggage Protection Active
              </p>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5 leading-relaxed">
                Your bags are protected by Luggo Guarantee with comprehensive coverage up to <span className="font-extrabold text-emerald-800">LKR 40,000</span> against loss, damage, or theft.
              </p>
            </div>
          </div>
        )}

        {/* ── QR Code ── */}
        {showQR && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 self-start">
              <QrCode size={16} className="text-brand" />
              <span className="text-sm font-semibold text-gray-700">Your Entry QR</span>
            </div>
            <div className="scale-75 md:scale-100 -my-4 md:my-0">
              <BookingQR qrCode={booking.qr_code} bookingId={booking.id} />
            </div>
            <p className="text-[10px] md:text-xs text-gray-400 text-center">Show this at the hub desk for drop-off and collection</p>
          </div>
        )}

        {/* ── Seal Proof Photo ── */}
        {signedSealPhotoUrl && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span className="text-sm font-semibold text-gray-700">Storage Seal Proof</span>
              </div>
              <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Sealed & Secure
              </span>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center">
              <img
                src={signedSealPhotoUrl}
                alt="Luggage storage seal proof"
                className="object-cover w-full h-full"
              />
            </div>
            <p className="text-[10px] md:text-xs text-gray-400 text-center">
              This photo confirms that your luggage zip ties/locks are sealed and secure in our hub.
            </p>
          </div>
        )}

        {/* ── Details grid ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {/* Location */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-brand shrink-0">
                <MapPin size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium">Hub</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{booking.hubs?.name}</p>
                <p className="text-xs text-gray-500 truncate">{booking.hubs?.address}</p>
              </div>
            </div>
            {booking.slot_number && (
              <div className="text-right shrink-0">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Storage Slot</p>
                <p className="text-sm font-black text-brand bg-brand/10 border border-brand/20 px-3 py-1 rounded-xl">
                  Slot #{booking.slot_number}
                </p>
              </div>
            )}
          </div>

          {/* Timing */}
          <div className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-brand shrink-0">
              <Clock size={16} />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 font-medium">Drop-off</p>
                <p className="text-sm font-semibold text-gray-900">{formatDateTimeSLT(start)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Pick-up</p>
                <p className="text-sm font-semibold text-gray-900">{formatDateTimeSLT(end)}</p>
              </div>
            </div>
          </div>

          {/* Bags */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-brand shrink-0">
                <Package size={16} />
              </div>
              <p className="text-sm font-semibold text-gray-700">Bags ({booking.booking_bags.length})</p>
            </div>
            <div className="space-y-2 pl-12">
              {booking.booking_bags.map((bag) => (
                <div key={bag.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm text-gray-700">
                  <span>{BAG_LABELS[bag.bag_type]}</span>
                  {bag.seal_number ? (
                    <span className="font-mono font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                      🔒 Seal: {bag.seal_number}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 font-semibold italic">Unsealable</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-brand shrink-0">
              <CreditCard size={16} />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">
                  {isCashPaymentPending ? 'Amount payable at counter' : 'Total paid'}
                </p>
                <p className="text-sm font-bold text-gray-900">LKR {booking.total_price.toLocaleString()}</p>
              </div>
              {isCashPaymentPending ? (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                  Pay at Hub (Cash)
                </span>
              ) : (
                <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                  Paid
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Pickup CTA ── */}
        {showPickupCTA && (
          <Link href={`/pickup/${booking.id}`}>
            <Button fullWidth size="lg" className="mt-2">
              <ShoppingBag size={18} />
              Request Pickup
            </Button>
          </Link>
        )}

        {/* ── Extend booking ── */}
        {showExtendCTA && (
          <ExtendBookingCTA bookingId={booking.id} bags={booking.booking_bags} hourlyRate={hourlyRate} />
        )}

        {/* ── Receipt ── */}
        {['completed', 'active_storage', 'pickup_requested'].includes(booking.status) && (
          <Link
            href={`/booking/${booking.id}/receipt`}
            className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 border border-gray-200 py-3 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            🧾 View receipt
          </Link>
        )}

        {/* ── Cancel ── */}
        {isCancellable && (
          <div className="pt-2">
            <form action={cancelBooking.bind(null, booking.id)}>
              <Button variant="danger" fullWidth type="submit">
                Cancel Booking
              </Button>
            </form>
            <p className="text-[10px] md:text-xs text-gray-400 text-center mt-2">
              Full refund within 3–5 business days before check-in
            </p>
          </div>
        )}

        {/* ── Sticky Mobile Footer ── */}
        {(showExtendCTA || showPickupCTA) && (
          <div className="md:hidden fixed bottom-14 left-0 right-0 z-50 px-4 pb-4">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 p-2 flex items-center justify-between gap-2">
               {showExtendCTA && (
                 <div className="flex-1">
                   <ExtendBookingCTA bookingId={booking.id} bags={booking.booking_bags} hourlyRate={hourlyRate} minimal />
                 </div>
               )}
               {showPickupCTA && (
                 <Link href={`/pickup/${booking.id}`} className="flex-1">
                   <Button fullWidth size="lg">
                     <ShoppingBag size={18} />
                     Request Pickup
                   </Button>
                 </Link>
               )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
