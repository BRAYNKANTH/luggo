import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { SignOutButton } from '@/components/shared/SignOutButton'
import {
  QrCode, Package, Clock, AlertTriangle, CheckCircle2,
  User, ChevronRight, Inbox, ArrowRight, Tag, Camera,
  ShoppingBag, Timer, RefreshCw
} from 'lucide-react'
import { format, isToday, isTomorrow, isPast, formatDistanceToNow } from 'date-fns'
import { type BookingStatus, type BagType } from '@/types/database'

type ActiveBooking = {
  id: string
  status: BookingStatus
  start_time: string
  end_time: string
  users: { name: string; phone: string | null } | null
  booking_bags: { id: string; bag_type: BagType; sticker_number: string | null }[]
}

// What action is next for each status — for staff clarity
const NEXT_ACTION: Partial<Record<BookingStatus, { label: string; icon: React.ReactNode; color: string }>> = {
  confirmed:                        { label: 'Waiting for drop-off',    icon: <Clock size={13} />,        color: 'text-blue-400'   },
  arrived:                          { label: 'Apply stickers',          icon: <Tag size={13} />,          color: 'text-violet-400' },
  sealing_in_progress:              { label: 'Upload seal photo',        icon: <Camera size={13} />,       color: 'text-amber-400'  },
  sealed_waiting_user_confirmation: { label: 'Waiting for customer',    icon: <RefreshCw size={13} />,    color: 'text-yellow-400' },
  active_storage:                   { label: 'In storage — all good',   icon: <CheckCircle2 size={13} />, color: 'text-green-400'  },
  pickup_requested:                 { label: 'Process pickup now',       icon: <ShoppingBag size={13} />,  color: 'text-cyan-400'   },
  overstayed:                       { label: 'Overdue — fee pending',   icon: <AlertTriangle size={13} />, color: 'text-red-400'  },
  disputed:                         { label: 'Re-upload seal photo',    icon: <Camera size={13} />,       color: 'text-orange-400' },
}

const STATUS_ORDER: BookingStatus[] = [
  'pickup_requested',
  'disputed',
  'arrived',
  'sealing_in_progress',
  'sealed_waiting_user_confirmation',
  'overstayed',
  'confirmed',
  'active_storage',
]

const URGENT: BookingStatus[] = ['pickup_requested', 'disputed', 'arrived', 'sealing_in_progress', 'overstayed']
const WAITING: BookingStatus[] = ['sealed_waiting_user_confirmation']
const PASSIVE: BookingStatus[] = ['confirmed', 'active_storage']

function formatDropoff(dt: string) {
  const d = new Date(dt)
  if (isToday(d))    return `Today ${format(d, 'h:mm a')}`
  if (isTomorrow(d)) return `Tomorrow ${format(d, 'h:mm a')}`
  return format(d, 'dd MMM, h:mm a')
}

export default async function StaffDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: staffRow } = await supabase
    .from('hub_staff')
    .select('hub_id, hubs(name, alias, address, capacity, open_time, close_time, active)')
    .eq('user_id', user.id)
    .eq('active', true)
    .single() as {
      data: {
        hub_id: string
        hubs: {
          name: string
          alias: string
          address: string
          capacity: number
          open_time: string
          close_time: string
          active: boolean
        } | null
      } | null
      error: unknown
    }

  if (!staffRow) redirect('/staff/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, start_time, end_time, users(name, phone), booking_bags(id, bag_type, sticker_number)')
    .eq('hub_id', staffRow.hub_id)
    .not('status', 'in', '("pending_payment","cancelled","expired","completed")')
    .order('start_time', { ascending: true }) as { data: ActiveBooking[] | null }

  const all = (bookings ?? []).sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status)
    const bi = STATUS_ORDER.indexOf(b.status)
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  })

  const urgent  = all.filter(b => URGENT.includes(b.status))
  const waiting = all.filter(b => WAITING.includes(b.status))
  const passive = all.filter(b => PASSIVE.includes(b.status))

  // Today's confirmed drop-offs (upcoming)
  const todayDropoffs = all.filter(b =>
    b.status === 'confirmed' && isToday(new Date(b.start_time))
  )

  // Stats
  const bagsInStorage = all
    .filter(b => ['active_storage', 'overstayed', 'pickup_requested'].includes(b.status))
    .reduce((s, b) => s + b.booking_bags.length, 0)

  const hub = staffRow.hubs

  return (
    <div className="min-h-screen bg-[#0f1923] text-white">

      {/* ── Top bar ───────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-[#0f1923]/95 backdrop-blur border-b border-white/8 px-4 py-3 flex items-center justify-between">
        <Logo variant="white" size="sm" />
        <div className="flex items-center gap-3">
          <Link
            href="/staff/scan"
            className="flex items-center gap-2 bg-brand text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-all"
          >
            <QrCode size={15} />
            Scan QR
          </Link>
          <SignOutButton portal="staff" iconOnly />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6 pb-24">

        {/* ── Hub identity card ─────────────────────────── */}
        <div className="bg-brand rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-0.5">Your Hub</p>
                <h1 className="text-2xl font-black tracking-tight">{hub?.name}</h1>
                <p className="text-white/60 text-xs mt-1">{hub?.address}</p>
              </div>
              <span className="font-mono text-xs bg-white/20 text-white px-2.5 py-1 rounded-lg font-bold">
                {hub?.alias}
              </span>
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Needs Action', value: urgent.length, highlight: urgent.length > 0 },
                { label: 'Bags Stored', value: bagsInStorage, highlight: false },
                { label: 'Today Drop-offs', value: todayDropoffs.length, highlight: false },
                { label: 'Total Active', value: all.length, highlight: false },
              ].map(({ label, value, highlight }) => (
                <div key={label} className={`rounded-xl p-2.5 text-center ${highlight ? 'bg-white/25' : 'bg-white/10'}`}>
                  <p className={`text-xl font-black ${highlight ? 'text-white' : 'text-white/90'}`}>{value}</p>
                  <p className="text-[9px] text-white/60 font-bold uppercase tracking-wider leading-tight mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── URGENT — needs action ─────────────────────── */}
        {urgent.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-red-500 rounded-full" />
              <h2 className="text-xs font-black uppercase tracking-widest text-red-400">
                Needs Action ({urgent.length})
              </h2>
            </div>
            {urgent.map(b => <BookingCard key={b.id} booking={b} hubAlias={hub?.alias ?? ''} priority="urgent" />)}
          </section>
        )}

        {/* ── WAITING — sealed, waiting for customer ────── */}
        {waiting.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-yellow-400 rounded-full" />
              <h2 className="text-xs font-black uppercase tracking-widest text-yellow-400">
                Waiting for Customer ({waiting.length})
              </h2>
            </div>
            {waiting.map(b => <BookingCard key={b.id} booking={b} hubAlias={hub?.alias ?? ''} priority="waiting" />)}
          </section>
        )}

        {/* ── PASSIVE — in storage / upcoming ───────────── */}
        {passive.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-white/20 rounded-full" />
              <h2 className="text-xs font-black uppercase tracking-widest text-white/30">
                In Storage & Upcoming ({passive.length})
              </h2>
            </div>
            {passive.map(b => <BookingCard key={b.id} booking={b} hubAlias={hub?.alias ?? ''} priority="passive" />)}
          </section>
        )}

        {/* ── Empty state ───────────────────────────────── */}
        {all.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
              <Inbox size={32} />
            </div>
            <div className="text-center">
              <p className="font-bold text-white/30">No active bookings</p>
              <p className="text-xs text-white/20 mt-1">Standing by — scan a QR when a customer arrives</p>
            </div>
          </div>
        )}

      </div>

      {/* ── Sticky bottom scan button (mobile) ────────── */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-[#0f1923] to-transparent pointer-events-none z-50">
        <Link
          href="/staff/scan"
          className="pointer-events-auto flex items-center justify-center gap-3 bg-brand text-white font-black text-sm uppercase tracking-widest h-14 rounded-2xl shadow-2xl shadow-brand/40 active:scale-95 transition-all"
        >
          <QrCode size={20} />
          Scan Customer QR
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Booking Card
// ─────────────────────────────────────────────────────────────
function BookingCard({
  booking,
  hubAlias,
  priority,
}: {
  booking: ActiveBooking
  hubAlias: string
  priority: 'urgent' | 'waiting' | 'passive'
}) {
  const next    = NEXT_ACTION[booking.status]
  const isOver  = isPast(new Date(booking.end_time))
  const bagCount = booking.booking_bags.length

  const borderColor = priority === 'urgent'
    ? 'border-red-500/30'
    : priority === 'waiting'
    ? 'border-yellow-400/20'
    : 'border-white/5'

  const accentBg = priority === 'urgent'
    ? 'bg-red-500/10'
    : priority === 'waiting'
    ? 'bg-yellow-400/10'
    : 'bg-white/5'

  // Sticker numbers for bags
  const stickers = booking.booking_bags
    .filter(b => b.sticker_number)
    .map(b => `${hubAlias}-${b.sticker_number}`)

  return (
    <Link href={`/staff/booking/${booking.id}`}>
      <div className={`group bg-white/[0.04] hover:bg-white/[0.07] border ${borderColor} rounded-2xl p-4 transition-all active:scale-[0.98]`}>

        {/* Top row: name + status pill */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl ${accentBg} flex items-center justify-center shrink-0`}>
              <User size={16} className={priority === 'urgent' ? 'text-red-400' : priority === 'waiting' ? 'text-yellow-400' : 'text-white/40'} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate">
                {booking.users?.name ?? 'Walk-in Customer'}
              </p>
              <p className="text-white/40 text-xs">
                {booking.users?.phone ?? 'No phone'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-[10px] text-white/20">
              #{booking.id.slice(0, 6).toUpperCase()}
            </span>
            <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
          </div>
        </div>

        {/* Middle: times + bags */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white/5 rounded-xl px-3 py-2">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-0.5">Drop-off</p>
            <p className="text-xs font-semibold text-white/80">{formatDropoff(booking.start_time)}</p>
          </div>
          <div className={`rounded-xl px-3 py-2 ${isOver && booking.status === 'overstayed' ? 'bg-red-500/15' : 'bg-white/5'}`}>
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-0.5">Pick-up by</p>
            <p className={`text-xs font-semibold ${isOver && booking.status === 'overstayed' ? 'text-red-400' : 'text-white/80'}`}>
              {isOver && booking.status === 'overstayed'
                ? `Overdue ${formatDistanceToNow(new Date(booking.end_time))}`
                : formatDropoff(booking.end_time)
              }
            </p>
          </div>
        </div>

        {/* Bags + stickers */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg">
              <Package size={12} className="text-white/30" />
              <span className="text-xs font-bold text-white/60">{bagCount} bag{bagCount !== 1 ? 's' : ''}</span>
            </div>
            {stickers.length > 0 && (
              <div className="flex items-center gap-1">
                {stickers.slice(0, 2).map(s => (
                  <span key={s} className="font-mono text-[10px] bg-brand-accent/15 text-brand-accent px-1.5 py-0.5 rounded font-bold">
                    {s}
                  </span>
                ))}
                {stickers.length > 2 && (
                  <span className="text-[10px] text-white/30">+{stickers.length - 2}</span>
                )}
              </div>
            )}
          </div>

          {/* Next action label */}
          {next && (
            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${next.color}`}>
              {next.icon}
              <span className="hidden sm:inline">{next.label}</span>
            </div>
          )}
        </div>

        {/* Overstayed warning */}
        {booking.status === 'overstayed' && (
          <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">
            <Timer size={13} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-300 font-semibold">
              Overdue — customer must pay late fee in app before pickup
            </p>
          </div>
        )}

        {/* Disputed warning */}
        {booking.status === 'disputed' && (
          <div className="mt-3 flex items-center gap-2 bg-orange-500/10 border border-orange-400/20 rounded-xl px-3 py-2">
            <AlertTriangle size={13} className="text-orange-400 shrink-0" />
            <p className="text-xs text-orange-300 font-semibold">
              Customer disputed the seal — re-upload a clear photo
            </p>
          </div>
        )}

      </div>
    </Link>
  )
}
