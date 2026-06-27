import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
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
  ShoppingBag, CreditCard, QrCode
} from 'lucide-react'
import { BookingProgressTracker } from '@/components/customer/BookingProgressTracker'
import { format } from 'date-fns'
import { type BookingStatus, type BagType } from '@/types/database'
import { BAG_LABELS, BAG_RATES } from '@/lib/utils/pricing'

type BookingDetail = {
  id: string
  status: BookingStatus
  start_time: string
  end_time: string
  total_price: number
  qr_code: string
  created_at: string
  hubs: { name: string; alias: string; address: string } | null
  booking_bags: { id: string; bag_type: BagType; sticker_number: string | null }[]
}

const CANCELLABLE: BookingStatus[] = ['pending_payment', 'confirmed']
const PICKUP_ELIGIBLE: BookingStatus[] = ['active_storage', 'overstayed']
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
    .select('id, status, start_time, end_time, total_price, qr_code, created_at, hubs(name, alias, address), booking_bags(id, bag_type, sticker_number)')
    .eq('id', params.bookingId)
    .eq('user_id', user.id)
    .single() as { data: BookingDetail | null; error: unknown }

  if (!booking) notFound()

  const start = new Date(booking.start_time)
  const end   = new Date(booking.end_time)
  const isCancellable   = CANCELLABLE.includes(booking.status)
  const showQR          = !['cancelled', 'expired', 'pending_payment'].includes(booking.status)
  const showConfirmSeal = booking.status === 'sealed_waiting_user_confirmation'
  const showPickupCTA   = PICKUP_ELIGIBLE.includes(booking.status)
  const isPickupPending = booking.status === 'pickup_requested'
  const showExtendCTA   = EXTEND_ELIGIBLE.includes(booking.status)
  const hourlyRate      = booking.booking_bags.reduce((t, b) => t + (BAG_RATES[b.bag_type] || 0), 0)

  return (
    <div className="max-w-3xl mx-auto">
      <RealtimeRefresher bookingId={booking.id} />

      <PageHeader
        title={booking.hubs?.name ?? 'Booking'}
        subtitle={`#${booking.id.slice(0, 8).toUpperCase()} · ${format(start, 'dd MMM yyyy')}`}
        backHref="/bookings"
        action={<BookingStatusBadge status={booking.status} />}
      />

      <div className="px-4 md:px-6 py-4 md:py-6 space-y-4">

        {/* ── Banners ── */}
        {searchParams.payment === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle size={18} className="text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-900 text-sm">Payment confirmed!</p>
              <p className="text-xs text-green-700 mt-0.5">Your booking is secured. We&apos;ll see you at the hub.</p>
            </div>
          </div>
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

        {/* ── Pickup error ── */}
        {searchParams.pickup_error && (
          <div className="bg-red-50 border border-red-200 rounded-xl md:rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 text-sm leading-tight">Pickup request failed</p>
              <p className="text-xs text-red-500 mt-0.5">{decodeURIComponent(searchParams.pickup_error)}</p>
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

        {/* ── Details grid ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {/* Location */}
          <div className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-brand shrink-0">
              <MapPin size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium">Hub</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{booking.hubs?.name}</p>
              <p className="text-xs text-gray-500 truncate">{booking.hubs?.address}</p>
            </div>
          </div>

          {/* Timing */}
          <div className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-brand shrink-0">
              <Clock size={16} />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 font-medium">Drop-off</p>
                <p className="text-sm font-semibold text-gray-900">{format(start, 'dd MMM, HH:mm')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Pick-up</p>
                <p className="text-sm font-semibold text-gray-900">{format(end, 'dd MMM, HH:mm')}</p>
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
                <div key={bag.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{BAG_LABELS[bag.bag_type]}</span>
                  {bag.sticker_number ? (
                    <span className="text-xs font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-lg">
                      {booking.hubs?.alias}-{bag.sticker_number}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">No sticker yet</span>
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
                <p className="text-xs text-gray-400 font-medium">Total paid</p>
                <p className="text-sm font-bold text-gray-900">LKR {booking.total_price.toLocaleString()}</p>
              </div>
              <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                Paid
              </span>
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
