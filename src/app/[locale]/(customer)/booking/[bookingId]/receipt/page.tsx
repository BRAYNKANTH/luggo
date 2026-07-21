import { notFound, redirect } from 'next/navigation'
import { Link } from '@/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { CheckCircle, MapPin, Clock, Package, CreditCard, ArrowLeft } from 'lucide-react'
import { formatDateSLT, formatInSLT } from '@/lib/utils/timezone'
import { BAG_LABELS, calculateBagPriceForHours } from '@/lib/utils/pricing'
import { getHubBagRates } from '@/lib/utils/hubPricing'
import { type BagType } from '@/types/database'

type Bag = { id: string; bag_type: BagType; sticker_number: string | null; seal_number: string | null }
type Payment = { id: string; amount: number; status: string; type: string; gateway_ref: string | null; created_at: string }

export default async function BookingReceiptPage({
  params,
}: {
  params: { bookingId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, status, start_time, end_time, total_price, created_at, slot_number, hub_id,
      hubs ( name, alias, address ),
      booking_bags ( id, bag_type, sticker_number, seal_number )
    `)
    .eq('id', params.bookingId)
    .eq('user_id', user.id)
    .single() as {
      data: {
        id: string
        status: string
        start_time: string
        end_time: string
        total_price: number
        created_at: string
        slot_number: number | null
        hub_id: string
        hubs: { name: string; alias: string; address: string } | null
        booking_bags: Bag[]
      } | null
      error: unknown
    }

  if (!booking) notFound()

  // Show receipt for completed bookings or paid bookings
  const receiptStatuses = ['completed', 'active_storage', 'pickup_requested', 'confirmed', 'arrived',
    'sealing_in_progress', 'sealed_waiting_user_confirmation', 'overstayed']
  if (!receiptStatuses.includes(booking.status)) {
    redirect(`/booking/${params.bookingId}`)
  }

  const { data: payments } = await supabase
    .from('payments' as never)
    .select('id, amount, status, type, gateway_ref, created_at')
    .eq('booking_id', params.bookingId)
    .order('created_at', { ascending: true }) as { data: Payment[] | null }

  const start       = new Date(booking.start_time)
  const end         = new Date(booking.end_time)
  const hours       = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60))
  const isCompleted = booking.status === 'completed'

  const receiptRates = await getHubBagRates(supabase, booking.hub_id)
  const lineItems = booking.booking_bags.map(bag => ({
    label: BAG_LABELS[bag.bag_type],
    rate:  receiptRates[bag.bag_type].hourlyRate,
    hours,
    total: calculateBagPriceForHours(bag.bag_type, hours, receiptRates),
    sticker: bag.sticker_number,
    seal: bag.seal_number,
  }))

  const paidPayments = (payments ?? []).filter(p => p.status === 'paid')
  const pendingPayments = (payments ?? []).filter(p => p.status === 'pending')

  const subtotal   = lineItems.reduce((s, l) => s + l.total, 0)
  const lateFees   = paidPayments.filter(p => p.type === 'late_fee').reduce((s, p) => s + p.amount, 0)
  const extensions = paidPayments.filter(p => p.type === 'extension').reduce((s, p) => s + p.amount, 0)
  const grandTotalPaid = paidPayments.reduce((s, p) => s + p.amount, 0)
  const pendingBookingPayment = pendingPayments.find(p => p.type === 'booking' && p.gateway_ref === 'PAY_AT_HUB')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print-friendly header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between print:hidden">
        <Link href={`/booking/${params.bookingId}`} className="flex items-center gap-1 text-gray-400 hover:text-gray-700 text-sm">
          <ArrowLeft size={16} /> Back
        </Link>
        <button
          onClick={() => window.print()}
          className="text-xs font-semibold text-brand border border-brand/30 px-3 py-1.5 rounded-xl hover:bg-brand/5 transition-colors"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-16">

        {/* Receipt card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:border-none">

          {/* Header */}
          <div className="bg-ocean-900 px-6 py-8 text-center">
            <Logo variant="white" size="sm" className="mx-auto mb-4" />
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <p className="text-white font-bold text-lg">
              {isCompleted ? 'Booking Complete' : 'Payment Receipt'}
            </p>
            <p className="text-white/50 text-sm mt-1">
              Ref #{booking.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5">

            {/* Hub & timing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                    <MapPin size={14} className="text-brand" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{booking.hubs?.name}</p>
                    <p className="text-xs text-gray-400">{booking.hubs?.address}</p>
                  </div>
                </div>
                {booking.slot_number && (
                  <span className="text-xs font-black bg-brand/10 border border-brand/20 text-brand px-3 py-1 rounded-xl shrink-0">
                    Slot #{booking.slot_number}
                  </span>
                )}
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <Clock size={14} className="text-brand" />
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Drop-off</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDateSLT(start)}</p>
                    <p className="text-xs text-gray-500">{formatInSLT(start, { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Pick-up</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDateSLT(end)}</p>
                    <p className="text-xs text-gray-500">{formatInSLT(end, { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <Clock size={14} className="text-brand" />
                </div>
                <p className="text-sm text-gray-600">
                  Storage duration: <span className="font-semibold text-gray-900">{hours} hour{hours !== 1 ? 's' : ''}</span>
                </p>
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package size={13} className="text-gray-400" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bags</p>
              </div>
              <div className="space-y-2">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex items-start justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span>LKR {item.rate.toLocaleString()} × {hours}h</span>
                        {item.seal ? (
                          <span className="font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                            🔒 Seal: {item.seal}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-semibold italic">
                            Unsealable
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900 shrink-0">LKR {item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-dashed border-gray-100" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Storage ({hours}h)</span>
                <span>LKR {subtotal.toLocaleString()}</span>
              </div>
              {extensions > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Extension(s)</span>
                  <span>LKR {extensions.toLocaleString()}</span>
                </div>
              )}
              {lateFees > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Late fee</span>
                  <span>LKR {lateFees.toLocaleString()}</span>
                </div>
              )}
              {pendingBookingPayment && (
                <div className="flex justify-between text-sm text-amber-600 font-bold bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                  <span>Payable at Hub (Cash)</span>
                  <span>LKR {pendingBookingPayment.amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-ocean-900 text-base pt-2 border-t border-gray-100">
                <span>Total paid</span>
                <span>LKR {grandTotalPaid.toLocaleString()}</span>
              </div>
            </div>

            {/* Payments list */}
            {payments && payments.length > 0 && (
              <>
                <div className="border-t border-dashed border-gray-100" />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard size={13} className="text-gray-400" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment history</p>
                  </div>
                  <div className="space-y-1.5">
                    {payments.map((p) => (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <div>
                          <span className="text-gray-600 capitalize font-medium">{p.type.replace('_', ' ')}</span>
                          {p.status === 'pending' && (
                            <span className="ml-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1 py-0.5 rounded">
                              Pending Cash
                            </span>
                          )}
                          <span className="text-gray-400 ml-2">· {formatInSLT(p.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        </div>
                        <span className={`font-semibold ${p.status === 'pending' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>LKR {p.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 text-center border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Thank you for choosing Luggo · luggo.lk
            </p>
            <p className="text-xs text-gray-300 mt-0.5">
              Issued {formatInSLT(new Date(), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3 print:hidden">
          <Link
            href={`/booking/${params.bookingId}`}
            className="flex-1 text-center text-sm font-semibold text-gray-600 border border-gray-200 py-3 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            Back to booking
          </Link>
          <Link
            href="/bookings"
            className="flex-1 text-center text-sm font-semibold text-white bg-ocean-900 py-3 rounded-2xl hover:bg-ocean-800 transition-colors"
          >
            All bookings
          </Link>
        </div>
      </div>
    </div>
  )
}
