import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { BookingStatusBadge } from '@/components/customer/BookingStatusBadge'
import { RealtimeRefresher } from '@/components/shared/RealtimeRefresher'
import { PickupRequest } from '@/components/customer/PickupRequest'
import {
  ChevronLeft,
  MapPin,
  Package,
  Tag,
  Clock,
  CheckCircle,
  AlertTriangle,
  ShoppingBag,
  CreditCard,
  ShieldCheck,

} from 'lucide-react'
import { format, isPast } from 'date-fns'
import { type BookingStatus, type BagType } from '@/types/database'
import { BAG_LABELS } from '@/lib/utils/pricing'

type Bag = { id: string; bag_type: BagType; sticker_number: string | null }
type BookingDetail = {
  id: string
  status: BookingStatus
  start_time: string
  end_time: string
  total_price: number
  hubs: { name: string; alias: string; address: string } | null
  booking_bags: Bag[]
  users: { name: string; phone: string | null } | null
}

const ALLOWED: BookingStatus[] = [
  'active_storage',
  'overstayed',
  'pickup_requested',
  'completed',
]

export default async function CustomerPickupPage({
  params,
  searchParams,
}: {
  params: { bookingId: string }
  searchParams: { payment?: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, status, start_time, end_time, total_price,
      hubs ( name, alias, address ),
      booking_bags ( id, bag_type, sticker_number ),
      users ( name, phone )
    `)
    .eq('id', params.bookingId)
    .eq('user_id', user.id)
    .single() as { data: BookingDetail | null; error: unknown }

  if (!booking) notFound()
  if (!ALLOWED.includes(booking.status)) {
    redirect(`/booking/${params.bookingId}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lateFee } = await (supabase.rpc as any)('calculate_late_fee', {
    p_booking_id: params.bookingId,
  }) as { data: number | null; error: unknown }

  const fee = lateFee ?? 0
  const isOverdue = isPast(new Date(booking.end_time))
  const isDone = booking.status === 'completed'
  const isRequested = booking.status === 'pickup_requested'

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Realtime refresher */}
      <RealtimeRefresher bookingId={booking.id} watchStatuses={['completed']} />

      {/* Modern Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href={`/booking/${booking.id}`} className="flex items-center gap-2 text-ocean-900/50 hover:text-brand font-black text-xs uppercase tracking-widest transition-all">
            <ChevronLeft size={16} />
            Details
          </Link>
          <Logo size="sm" />
          <div className="flex items-center gap-4">
             <ShieldCheck size={18} className="text-brand hidden md:block" />
             <SignOutButton portal="customer" iconOnly />
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div className="space-y-8">
           
           {/* Primary Status Banner */}
           <div className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-4 md:gap-6">
                 <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.2rem] md:rounded-[1.8rem] bg-brand text-white flex items-center justify-center shadow-xl shadow-brand/20">
                    <ShoppingBag size={24} className="md:hidden" />
                    <ShoppingBag size={28} className="hidden md:block" />
                 </div>
                 <div>
                    <h1 className="text-xl md:text-3xl font-black text-ocean-900 tracking-tighter">Collection</h1>
                    <p className="text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-0.5 md:mt-1">Status: {booking.status.replace('_', ' ')}</p>
                 </div>
              </div>
              <BookingStatusBadge status={booking.status} />
           </div>

           {/* Dynamic Action Banners */}
           <div className="space-y-4">
             {searchParams.payment === 'cancelled' && (
               <div className="bg-amber-100/50 border border-amber-200 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] flex items-start gap-3 md:gap-4 animate-shake">
                 <div className="bg-amber-500 text-white p-2 md:p-2.5 rounded-xl">
                    <AlertTriangle size={18} className="md:hidden" />
                    <AlertTriangle size={20} className="hidden md:block" />
                 </div>
                 <div>
                   <p className="font-black text-ocean-900 leading-tight italic text-sm md:text-base">Action Required: Payment Not Completed</p>
                   <p className="text-ocean-900/60 text-[10px] md:text-xs font-bold mt-1 max-w-sm">
                     The late fee must be paid before your bags can be released from secure storage.
                   </p>
                 </div>
               </div>
             )}

             {isDone && (
               <div className="bg-green-100/50 border border-green-200 p-6 rounded-[2.5rem] flex items-center gap-4 animate-in zoom-in-95 duration-500">
                 <div className="bg-green-500 text-white p-2.5 rounded-xl shadow-lg shadow-green-500/20">
                    <CheckCircle size={20} />
                 </div>
                 <div>
                   <p className="font-black text-ocean-900 leading-tight">Storage Session Completed</p>
                   <p className="text-ocean-900/60 text-xs font-bold mt-1">All items successfully returned. Safe travels!</p>
                 </div>
               </div>
             )}

             {isRequested && (
               <div className="bg-ocean-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] text-white space-y-3 md:space-y-4 shadow-2xl shadow-ocean-900/20 relative overflow-hidden group">
                  <div className="absolute right-[-5%] top-[-5%] w-32 h-32 bg-brand/30 rounded-full blur-3xl animate-pulse" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-brand-light/30 border-t-brand-light rounded-full animate-spin" />
                    <div>
                      <p className="font-black text-base md:text-lg tracking-tight">Staff are retrieving your bags</p>
                      <p className="text-white/40 text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-0.5">Please wait at the counter with your QR Code</p>
                    </div>
                  </div>
               </div>
             )}
           </div>

           {/* Hub & Times Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3.5rem] border border-gray-100 shadow-sm space-y-4 md:space-y-5">
                 <div className="flex items-center gap-3">
                    <div className="bg-ocean-50 p-2 rounded-xl text-brand">
                       <MapPin size={18} />
                    </div>
                    <h3 className="font-black text-ocean-900 uppercase tracking-widest text-[9px]">Active Hub</h3>
                 </div>
                 <div>
                    <p className="font-black text-lg md:text-xl text-ocean-900 tracking-tight leading-none mb-1">{booking.hubs?.name}</p>
                    <p className="text-gray-400 text-[10px] md:text-xs font-bold leading-relaxed">{booking.hubs?.address}</p>
                 </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3.5rem] border border-gray-100 shadow-sm space-y-5 md:space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-ocean-50 p-2 rounded-xl text-brand">
                       <Clock size={18} />
                    </div>
                    <h3 className="font-black text-ocean-900 uppercase tracking-widest text-[9px]">Storage Period</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <p className="text-[8px] md:text-[9px] text-gray-400 font-bold uppercase tracking-widest">Entry</p>
                       <p className="text-xs md:text-sm font-black text-ocean-900">{format(new Date(booking.start_time), 'dd MMM, HH:mm')}</p>
                    </div>
                    <div className="space-y-1">
                       <p className={`text-[8px] md:text-[9px] font-bold uppercase tracking-widest ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>Expiry</p>
                       <p className={`text-xs md:text-sm font-black ${isOverdue ? 'text-red-600' : 'text-brand'}`}>
                          {format(new Date(booking.end_time), 'dd MMM, HH:mm')}
                       </p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Bag Inventory */}
           <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[4rem] border border-gray-100 shadow-sm space-y-5 md:space-y-6">
              <div className="flex items-center gap-3 justify-between">
                 <div className="flex items-center gap-3">
                    <div className="bg-ocean-50 p-2 rounded-xl text-brand">
                       <Package size={18} />
                    </div>
                    <h3 className="font-black text-ocean-900 tracking-tight text-sm md:text-base">Your Inventory</h3>
                 </div>
                 <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">{booking.booking_bags.length} Items</span>
              </div>
              
              <div className="space-y-2 md:space-y-3">
                 {booking.booking_bags.map((bag) => (
                   <div key={bag.id} className="flex items-center justify-between bg-gray-50/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3 md:gap-4">
                         <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                            <Tag size={16} />
                         </div>
                         <span className="font-bold text-ocean-900 text-xs md:text-sm">{BAG_LABELS[bag.bag_type]}</span>
                      </div>
                      {bag.sticker_number ? (
                         <div className="bg-brand text-white px-2.5 py-1 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-sm">
                            {booking.hubs?.alias}-{bag.sticker_number}
                         </div>
                      ) : (
                         <span className="text-[9px] md:text-[10px] text-gray-300 font-bold uppercase tracking-widest italic leading-none">Not Tagged</span>
                      )}
                   </div>
                 ))}
              </div>
           </div>

           {/* Primary Desktop Action / Receipt Link */}
           <div className="hidden md:block">
              {/* Financial Summary card (Desktop) */}
              <div className="bg-ocean-900 p-8 md:p-10 rounded-[3rem] md:rounded-[4rem] text-white space-y-6 md:space-y-8 relative overflow-hidden group shadow-2xl shadow-ocean-900/10">
                 <div className="absolute right-[-10%] top-[-10%] w-48 h-48 bg-brand/30 rounded-full blur-3xl group-hover:bg-brand/40 transition-all duration-700 pointer-events-none" />
                 
                 <div className="flex items-center gap-4 relative z-10">
                    <div className="bg-white/10 p-3 rounded-2xl text-brand-light">
                       <CreditCard size={24} />
                    </div>
                    <h3 className="font-black text-xl tracking-tight">Financial Record</h3>
                 </div>

                 <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center text-white/50 text-xs font-bold uppercase tracking-widest">
                       <span>Base Booking Fee</span>
                       <span className="text-white">LKR {booking.total_price.toLocaleString()}</span>
                    </div>
                    {fee > 0 && (
                      <div className="flex justify-between items-center text-red-400 text-xs font-black uppercase tracking-widest">
                         <span className="flex items-center gap-2">
                           <AlertTriangle size={14} />
                           Late Pickup Penalty
                         </span>
                         <span className="text-red-400">+ LKR {fee.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                       <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Total Transaction</p>
                       <p className="text-3xl font-black text-white tracking-tighter">LKR {(booking.total_price + fee).toLocaleString()}</p>
                    </div>
                 </div>
              </div>

              {!isDone && !isRequested && (
                 <div className="bg-white p-8 md:p-10 rounded-[3.5rem] md:rounded-[4.5rem] border border-gray-100 shadow-xl space-y-6 mt-6">
                    {isOverdue && fee > 0 && (
                       <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 mb-2">
                          <p className="text-xs text-red-900/70 font-bold leading-relaxed italic">
                             Session expired. To release your bags, the late fee penalty must be settled via the secure portal below.
                          </p>
                       </div>
                    )}
                    <PickupRequest bookingId={booking.id} lateFee={fee} />
                 </div>
              )}
           </div>

           {/* ── Sticky Mobile Footer ── */}
           {!isDone && !isRequested && (
              <div className="md:hidden fixed bottom-14 left-0 right-0 z-50 px-4 pb-4">
                 <div className="bg-ocean-900 rounded-[2.5rem] shadow-2xl shadow-ocean-900/40 p-1.5 flex items-center justify-between">
                    <div className="pl-6 py-2">
                       <p className="text-white/40 text-[8px] font-black uppercase tracking-[0.2em] mb-0.5">Total Payable</p>
                       <p className="text-xl font-black text-white tracking-tighter">
                          LKR {(booking.total_price + fee).toLocaleString()}
                       </p>
                    </div>
                    <div className="w-[55%]">
                       <PickupRequest bookingId={booking.id} lateFee={fee} />
                    </div>
                 </div>
              </div>
           )}

        </div>
      </main>
    </div>
  )
}
