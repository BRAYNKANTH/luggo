import { GUARANTEE_LIMIT_LABEL } from '@/lib/utils/guarantee'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookingQR } from '@/components/customer/BookingQR'
import { BookingStatusBadge } from '@/components/customer/BookingStatusBadge'
import { RealtimeRefresher } from '@/components/shared/RealtimeRefresher'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import { ExtendBookingCTA } from '@/components/customer/ExtendBookingCTA'
import { cancelBooking } from '@/lib/auth/actions'
import {
  MapPin, Clock, Package, AlertTriangle, CheckCircle,
  ShoppingBag, CreditCard, QrCode, ShieldCheck
} from 'lucide-react'
import { BookingProgressTracker } from '@/components/customer/BookingProgressTracker'
import { formatDateSLT, formatDateTimeSLT } from '@/lib/utils/timezone'
import { type BookingStatus, type BagType } from '@/types/database'
import { calculateLateFee } from '@/lib/utils/pricing'
import { getHubBagRates } from '@/lib/utils/hubPricing'
import { EarlyCheckinPayButton } from '@/components/customer/EarlyCheckinPayButton'
import { BookingPaymentRetryButton } from '@/components/customer/BookingPaymentRetryButton'
import { titleMetadata } from '@/lib/i18n/metadata'

export const generateMetadata = titleMetadata('booking')

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
  payments: { status: string; gateway_ref: string | null; type: string; amount: number }[]
  early_checkin_minutes: number | null
  early_checkin_type: string
  early_checkin_extra_hours: number | null
  early_checkin_fee: number
  early_checkin_payment_status: string | null
}

const CANCELLABLE: BookingStatus[] = ['pending_payment', 'confirmed']
const EXTEND_ELIGIBLE: BookingStatus[] = ['confirmed', 'arrived', 'sealing_in_progress', 'sealed_waiting_user_confirmation', 'active_storage', 'overstayed']

export default async function BookingDetailPage(
  props: {
    params: Promise<{ bookingId: string }>
    searchParams: Promise<{ payment?: string; sealed?: string; pickup?: string; ext?: string; pickup_error?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const t = await getTranslations('BookingDetail')
  const tBags = await getTranslations('Bags')
  const locale = await getLocale()
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
      payments ( status, gateway_ref, type, amount )
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
  const hubRates        = await getHubBagRates(supabase, booking.hub_id)
  const hourlyRate      = booking.booking_bags.reduce((t, b) => t + (hubRates[b.bag_type]?.hourlyRate || 0), 0)
  const bookingPayment  = booking.payments?.find(p => p.type === 'booking')
  const isCashPaymentPending = !bookingPayment || (bookingPayment.status === 'pending' && bookingPayment.gateway_ref === 'PAY_AT_HUB')

  // Calculate late fee if overstayed or late fee is pending or time passed (grace period of 15 min)
  const now = new Date()
  const isOverdue = (['overstayed', 'late_fee_pending'].includes(booking.status) || now.getTime() > end.getTime() + 15 * 60 * 1000) && booking.status !== 'pickup_requested'
  let lateFeeAmount = 0
  let overdueHours = 0
  let overdueHalfHours = 0
  if (isOverdue) {
    lateFeeAmount = calculateLateFee(booking.booking_bags, start, end, now, hubRates)
    
    // Deduct already paid late fees
    const totalPaidLateFee = booking.payments
      ?.filter(p => p.type === 'late_fee' && p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0) ?? 0
    lateFeeAmount = Math.max(0, lateFeeAmount - totalPaidLateFee)

    if (lateFeeAmount > 0) {
      const overdueMs = now.getTime() - end.getTime()
      const overdueMinutes = Math.ceil(overdueMs / (60 * 1000))
      overdueHalfHours = Math.ceil(overdueMinutes / 30)
      overdueHours = overdueHalfHours * 0.5
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <RealtimeRefresher bookingId={booking.id} />

      <PageHeader
        title={booking.hubs?.name ?? t('booking')}
        subtitle={`#${booking.id.slice(0, 8).toUpperCase()} · ${formatDateSLT(start, locale)}`}
        backHref="/bookings"
        action={<BookingStatusBadge status={booking.status} />}
      />

      <div className="px-4 md:px-6 py-4 md:py-6 space-y-4">

        {/* ── Banners ── */}
        {isCashPaymentPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">💵 {t('cashPendingTitle')}</p>
              <p className="text-xs text-amber-800 mt-0.5">{t.rich('cashPendingBody', { amount: booking.total_price.toLocaleString(), strong: (chunks) => <strong>{chunks}</strong> })}</p>
            </div>
          </div>
        )}
        {searchParams.payment === 'success' && booking.status !== 'pending_payment' && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle size={18} className="text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-900 text-sm">{t('paymentConfirmed')}</p>
                <p className="text-xs text-green-800 mt-0.5">{t('paymentConfirmedBody')}</p>
              </div>
            </div>
            <script dangerouslySetInnerHTML={{
              __html: `try { localStorage.removeItem('luggo_booking_${booking.hub_id}'); } catch(e){}`
            }} />
          </>
        )}

        {/* ── Payment Pending / Declined Alert ── */}
        {booking.status === 'pending_payment' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl md:rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-950 text-sm">⚠️ {t('paymentPendingTitle')}</p>
                <p className="text-xs text-amber-800 mt-1 leading-normal">
                  {t('paymentPendingBody')}
                </p>
              </div>
            </div>
            
            {/* Retry Payment Button */}
            <div className="pt-1">
              <BookingPaymentRetryButton bookingId={booking.id} price={booking.total_price} />
            </div>
            
            {/* Edit Booking Link */}
            <div className="text-center pt-1">
              <Link
                href={`/book/${booking.hub_id}`}
                className="inline-flex min-h-11 items-center text-xs font-bold text-amber-800 hover:text-amber-900 underline"
              >
                ← {t('editBooking')}
              </Link>
            </div>
          </div>
        )}
        {searchParams.payment === 'ext_success' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle size={18} className="text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-900 text-sm">{t('extended')}</p>
              <p className="text-xs text-green-800 mt-0.5">{t('extendedBody')}</p>
            </div>
          </div>
        )}
        {searchParams.payment === 'lf_success' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle size={18} className="text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-900 text-sm">{t('lateFeePaid')}</p>
              <p className="text-xs text-green-800 mt-0.5">{t('lateFeePaidBody')}</p>
            </div>
          </div>
        )}
        {searchParams.payment === 'cancelled' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">{t('paymentCancelled')}</p>
              <p className="text-xs text-amber-800 mt-0.5">{t('paymentCancelledBody')}</p>
            </div>
          </div>
        )}

        {/* ── Seal review alert ── */}
        {showConfirmSeal && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl md:rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">{t('actionRequired')}</p>
                <p className="text-xs text-amber-800 mt-0.5 leading-tight">{t('reviewSealBody')}</p>
              </div>
            </div>
            <Link href={`/booking/${booking.id}/confirm-seal`} className={buttonClass({ fullWidth: true, size: 'sm' })}>
              {t('reviewSeal')}
            </Link>
          </div>
        )}

        {/* ── Early Check-In Pending Payment Alert ── */}
        {booking.status === 'early_checkin_pending_payment' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl md:rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">{t('earlyPayTitle')}</p>
                <p className="text-xs text-amber-800 mt-0.5 leading-tight">
                  {t('earlyPayBody', { minutes: booking.early_checkin_minutes ?? 0, fee: booking.early_checkin_fee })}
                </p>
                <p className="text-[11px] text-amber-800 leading-normal italic mt-1.5">
                  * {t('earlyPayNote')}
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
              <p className="font-semibold text-emerald-900 text-sm">{t('freeEarlyTitle')}</p>
              <p className="text-xs text-emerald-800 mt-0.5">
                {t('freeEarlyBody')}
              </p>
            </div>
          </div>
        )}

        {/* ── Shift Booking Early Check-In Applied Banner ── */}
        {booking.early_checkin_type === 'shift_booking' && (
          <div className="bg-brand/5 border border-brand/20 rounded-xl md:rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <Clock size={18} className="text-brand shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-ocean-900 text-sm">{t('shiftedTitle')}</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {t('shiftedBody', { time: formatDateTimeSLT(new Date(booking.end_time), locale) })}
              </p>
            </div>
          </div>
        )}

        {/* ── Paid Early Check-In Applied Banner ── */}
        {booking.early_checkin_type === 'pay_extra' && booking.early_checkin_payment_status === 'paid' && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl md:rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900 text-sm">{t('earlyPaidTitle')}</p>
              <p className="text-xs text-emerald-800 mt-0.5">
                {t('earlyPaidBody', { minutes: booking.early_checkin_minutes ?? 0, fee: booking.early_checkin_fee })}
              </p>
            </div>
          </div>
        )}


        {searchParams.pickup_error && (
          <div className="bg-red-50 border border-red-200 rounded-xl md:rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm leading-tight">{t('pickupFailed')}</p>
              <p className="text-xs text-red-700 mt-0.5">{decodeURIComponent(searchParams.pickup_error)}</p>
            </div>
          </div>
        )}

        {/* ── Late Fee Pending Alert ── */}
        {isOverdue && lateFeeAmount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl md:rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-red-950 text-sm">⚠️ {t('lateFeeTitle')}</p>
                <p className="text-xs text-red-800 mt-1 leading-normal">
                  {t('lateFeeBody')}
                </p>
                
                {/* Pricing Calculation breakdown table */}
                <div className="bg-white/60 p-3.5 rounded-xl border border-red-100 text-xs space-y-1.5 mt-3 text-red-900">
                  <div className="flex justify-between">
                    <span>{t('overstayDuration')}</span>
                    <span className="font-bold">{t('overstayValue', { hours: overdueHours, blocks: overdueHalfHours })}</span>
                  </div>
                  <div className="flex justify-between border-t border-red-100/50 pt-1.5 mt-1.5 font-bold">
                    <span>{t('lateFeeTotal')}</span>
                    <span className="text-red-600">LKR {lateFeeAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Pay Online Button */}
            <div className="pt-1">
              <Link href={`/pickup/${booking.id}`} className={buttonClass({ variant: 'danger', fullWidth: true })}>
                💳 {t('payLateFee')}
              </Link>
            </div>
          </div>
        )}

        {/* ── Pickup pending ── */}
        {isPickupPending && (
          <div className="bg-brand/5 border border-brand/20 rounded-xl md:rounded-2xl p-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin shrink-0" />
            <div>
              <p className="font-semibold text-ocean-900 text-sm leading-tight">{t('retrieving')}</p>
              <p className="text-xs text-gray-600 mt-0.5">{t('retrievingBody')}</p>
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
                🛡️ {t('protectionTitle')}
              </p>
              <p className="text-xs text-emerald-800 font-semibold mt-0.5 leading-relaxed">
                {t.rich('protectionBody', { amount: GUARANTEE_LIMIT_LABEL, strong: (chunks) => <span className="font-extrabold">{chunks}</span> })}
              </p>
            </div>
          </div>
        )}

        {/* ── QR Code ── */}
        {showQR && (
          <div className="bg-white rounded-3xl border border-gray-100/80 shadow-premium p-6 flex flex-col items-center gap-4 animate-pop-in">
            <div className="flex items-center gap-2 self-start pb-2 border-b border-gray-100 w-full">
              <QrCode size={16} className="text-brand" />
              <span className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">{t('qrTitle')}</span>
            </div>
            <div className="scale-75 md:scale-100 -my-4 md:my-0 p-4 bg-gradient-to-tr from-brand/5 to-ocean-50/20 rounded-3xl border border-brand/10 shadow-inner animate-pulse-glow">
              <BookingQR qrCode={booking.qr_code} bookingId={booking.id} />
            </div>
            <p className="text-xs text-gray-600 font-bold uppercase tracking-wider text-center">{t('qrHint')}</p>
          </div>
        )}

        {/* ── Seal Proof Photo ── */}
        {signedSealPhotoUrl && (
          <div className="bg-white rounded-3xl border border-gray-100/80 shadow-premium p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">{t('sealProof')}</span>
              </div>
              <span className="badge-success">
                {t('sealed')}
              </span>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-150 bg-gray-50 flex items-center justify-center shadow-inner group">
              <Image
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 768px"
                src={signedSealPhotoUrl}
                alt={t('sealPhotoAlt')}
                className="object-cover w-full h-full group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
            <p className="text-xs text-gray-600 font-bold uppercase tracking-wider text-center">
              {t('sealPhotoHint')}
            </p>
          </div>
        )}

        {/* ── Details grid ── */}
        <div className="bg-white rounded-3xl border border-gray-100/80 shadow-premium divide-y divide-gray-100/60 overflow-hidden">
          {/* Location */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-brand shrink-0">
                <MapPin size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">{t('hub')}</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{booking.hubs?.name}</p>
                <p className="text-xs text-gray-500 truncate">{booking.hubs?.address}</p>
              </div>
            </div>
            {booking.slot_number && (
              <div className="text-right shrink-0">
                <p className="text-[11px] text-gray-500 font-black uppercase tracking-wider">{t('slot')}</p>
                <p className="text-sm font-black text-brand bg-brand/10 border border-brand/20 px-3 py-1 rounded-xl">
                  #{booking.slot_number}
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
                <p className="text-xs text-gray-500 font-medium">{t('dropOff')}</p>
                <p className="text-sm font-semibold text-gray-900">{formatDateTimeSLT(start, locale)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{t('pickUp')}</p>
                <p className="text-sm font-semibold text-gray-900">{formatDateTimeSLT(end, locale)}</p>
              </div>
            </div>
          </div>

          {/* Bags */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-brand shrink-0">
                <Package size={16} />
              </div>
              <p className="text-sm font-semibold text-gray-700">{t('bags', { count: booking.booking_bags.length })}</p>
            </div>
            <div className="space-y-2 pl-12">
              {booking.booking_bags.map((bag) => (
                <div key={bag.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm text-gray-700">
                  <span>{tBags(`${bag.bag_type}.label`)}</span>
                  {bag.seal_number ? (
                    <span className="font-mono font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                      🔒 {t('seal', { number: bag.seal_number })}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 font-semibold italic">{t('unsealed')}</span>
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
                <p className="text-xs text-gray-500 font-medium">
                  {isCashPaymentPending ? t('payableAtCounter') : t('totalPaid')}
                </p>
                <p className="text-sm font-bold text-gray-900">LKR {booking.total_price.toLocaleString()}</p>
              </div>
              {isCashPaymentPending ? (
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                  {t('payAtHub')}
                </span>
              ) : (
                <span className="text-xs font-semibold text-green-800 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                  {t('paid')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Pickup CTA ── */}
        {showPickupCTA && (
          <Link href={`/pickup/${booking.id}`} className={buttonClass({ fullWidth: true, size: 'lg', className: 'mt-2' })}>
            <ShoppingBag size={18} aria-hidden="true" />
            {t('requestPickup')}
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
            className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-gray-700 border border-gray-200 py-3 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            🧾 {t('viewReceipt')}
          </Link>
        )}

        {/* ── Cancel ── */}
        {isCancellable && (
          <div className="pt-2">
            <form action={cancelBooking.bind(null, booking.id)}>
              <Button variant="danger" fullWidth type="submit">
                {t('cancel')}
              </Button>
            </form>
            <p className="text-xs text-gray-600 text-center mt-2">
              {t('refundNote')}
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
                 <Link href={`/pickup/${booking.id}`} className={buttonClass({ fullWidth: true, size: 'lg', className: 'flex-1' })}>
                   <ShoppingBag size={18} aria-hidden="true" />
                   {t('requestPickup')}
                 </Link>
               )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
