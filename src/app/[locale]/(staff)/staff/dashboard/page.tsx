import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { RealtimeDashboardRefresher } from '@/components/staff/RealtimeDashboardRefresher'
import { Button } from '@/components/ui/Button'
import {
  QrCode, Package, Clock, AlertTriangle, CheckCircle2,
  User, ChevronRight, Inbox, ArrowRight, Tag,
  ShoppingBag, ShieldAlert, Plus
} from 'lucide-react'
import { isPast, formatDistanceToNow } from 'date-fns'
import { formatInSLT } from '@/lib/utils/timezone'
import { type BookingStatus, type BagType } from '@/types/database'

type ActiveBooking = {
  id: string
  status: BookingStatus
  start_time: string
  end_time: string
  walk_in_name: string | null
  walk_in_phone: string | null
  walk_in_nic_passport_ref: string | null
  users: { name: string; phone: string | null } | null
  booking_bags: { 
    id: string 
    bag_type: BagType 
    sticker_number: string | null 
    seal_number: string | null
    bag_tags: { tag_code: string } | null
  }[]
}

const NEXT_ACTION: Partial<Record<BookingStatus, { label: string; icon: React.ReactNode; color: string }>> = {
  confirmed:                        { label: 'Wait check-in',          icon: <Clock size={13} />,        color: 'text-blue-400'   },
  arrived:                          { label: 'Register Tags & Seals',  icon: <Tag size={13} />,          color: 'text-violet-400' },
  identity_verified:                { label: 'Register Tags & Seals',  icon: <Tag size={13} />,          color: 'text-violet-400' },
  sealing_in_progress:              { label: 'Register Tags & Seals',  icon: <Tag size={13} />,          color: 'text-violet-400' },
  active_storage:                   { label: 'Stored — Safe',          icon: <CheckCircle2 size={13} />, color: 'text-green-400'  },
  pickup_requested:                 { label: 'Process pickup',         icon: <ShoppingBag size={13} />,  color: 'text-cyan-400'   },
  overstayed:                       { label: 'Overdue late fee',       icon: <AlertTriangle size={13} />, color: 'text-red-400'  },
  late_fee_pending:                 { label: 'Overdue late fee',       icon: <AlertTriangle size={13} />, color: 'text-red-400'  },
  ready_for_release:                { label: 'Handover bags',          icon: <ShoppingBag size={13} />,  color: 'text-emerald-400'},
  exception_hold:                   { label: 'Incident hold active',   icon: <ShieldAlert size={13} />,  color: 'text-red-500 font-extrabold' },
}

function formatDropoff(dt: string) {
  const d = new Date(dt)
  return formatInSLT(d, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}

export default async function StaffDashboardPage({
  searchParams,
}: {
  searchParams?: { search?: string; tab?: string }
}) {
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

  const search = searchParams?.search || ''
  const activeTab = searchParams?.tab || 'check_in'

  // Fetch bookings from last 30 days to keep list comprehensive but fast
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, status, start_time, end_time, walk_in_name, walk_in_phone, walk_in_nic_passport_ref,
      users ( name, phone ),
      booking_bags ( id, bag_type, sticker_number, seal_number, bag_tags ( tag_code ) )
    `)
    .eq('hub_id', staffRow.hub_id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('start_time', { ascending: true }) as { data: ActiveBooking[] | null }

  let filteredBookings = bookings || []

  // Perform search in memory (instant lookup of name, phone, tags, seals)
  if (search) {
    const q = search.toLowerCase().trim()
    filteredBookings = filteredBookings.filter(b => {
      const walkInName = b.walk_in_name?.toLowerCase() || ''
      const walkInPhone = b.walk_in_phone?.toLowerCase() || ''
      const walkInNic = b.walk_in_nic_passport_ref?.toLowerCase() || ''
      const userName = b.users?.name?.toLowerCase() || ''
      const userPhone = b.users?.phone?.toLowerCase() || ''
      const bookingId = b.id.toLowerCase()

      const hasTagCode = b.booking_bags?.some(bag => 
        bag.bag_tags?.tag_code?.toLowerCase().includes(q)
      )
      const hasSealNumber = b.booking_bags?.some(bag => 
        bag.seal_number?.toLowerCase().includes(q)
      )

      return (
        walkInName.includes(q) ||
        walkInPhone.includes(q) ||
        walkInNic.includes(q) ||
        userName.includes(q) ||
        userPhone.includes(q) ||
        bookingId.includes(q) ||
        hasTagCode ||
        hasSealNumber
      )
    })
  }

  // Categorize bookings
  const checkInList = filteredBookings.filter(b => 
    ['confirmed', 'arrived', 'identity_verified'].includes(b.status)
  )
  const inStorageList = filteredBookings.filter(b => 
    ['active_storage', 'sealing_in_progress', 'sealed_waiting_user_confirmation', 'pickup_requested', 'ready_for_release'].includes(b.status)
  )
  const overdueList = filteredBookings.filter(b => 
    ['overstayed', 'late_fee_pending'].includes(b.status)
  )
  const completedList = filteredBookings.filter(b => 
    ['completed'].includes(b.status)
  )
  const holdList = filteredBookings.filter(b => 
    ['exception_hold', 'disputed'].includes(b.status)
  )

  // Current tab selection
  const tabList = (() => {
    switch (activeTab) {
      case 'check_in': return checkInList
      case 'in_storage': return inStorageList
      case 'overdue': return overdueList
      case 'completed': return completedList
      case 'holds': return holdList
      default: return checkInList
    }
  })()

  const bagsInStorage = (bookings || [])
    .filter(b => ['active_storage', 'overstayed', 'pickup_requested', 'ready_for_release'].includes(b.status))
    .reduce((s, b) => s + b.booking_bags.length, 0)

  const hub = staffRow.hubs

  return (
    <div className="min-h-screen bg-[#0f1923] text-white">
      <RealtimeDashboardRefresher hubId={staffRow.hub_id} />

      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#0f1923]/95 backdrop-blur border-b border-white/8 px-4 py-3 flex items-center justify-between">
        <Logo variant="white" size="sm" />
        <div className="flex items-center gap-3">
          <Link
            href="/staff/walk-in-booking"
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
          >
            <Plus size={14} />
            Walk-in
          </Link>
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
        {/* Hub identity card */}
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
                { label: 'Check-in', value: checkInList.length, highlight: checkInList.length > 0 },
                { label: 'Bags Stored', value: bagsInStorage, highlight: false },
                { label: 'Exception Holds', value: holdList.length, highlight: holdList.length > 0 },
                { label: 'Overdue', value: overdueList.length, highlight: overdueList.length > 0 },
              ].map(({ label, value, highlight }) => (
                <div key={label} className={`rounded-xl p-2.5 text-center ${highlight ? 'bg-white/25 border border-white/20' : 'bg-white/10'}`}>
                  <p className={`text-xl font-black ${highlight ? 'text-white' : 'text-white/90'}`}>{value}</p>
                  <p className="text-[9px] text-white/60 font-bold uppercase tracking-wider leading-tight mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search Form */}
        <form method="GET" action="/staff/dashboard" className="flex gap-2">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search customer, phone, Bag Tag code, Seal #..."
            className="flex-1 px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-light focus:border-transparent"
          />
          {search && (
            <Link
              href={`/staff/dashboard?tab=${activeTab}`}
              className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs flex items-center font-bold"
            >
              Clear
            </Link>
          )}
          <Button type="submit" size="sm" className="px-5">
            Search
          </Button>
        </form>

        {/* Category Tabs */}
        <div className="flex border-b border-white/10 overflow-x-auto pb-1 gap-1">
          {[
            { id: 'check_in', label: 'Arriving', count: checkInList.length },
            { id: 'in_storage', label: 'Stored', count: inStorageList.length },
            { id: 'overdue', label: 'Overdue', count: overdueList.length },
            { id: 'completed', label: 'Handed Over', count: completedList.length },
            { id: 'holds', label: 'Holds ⚠️', count: holdList.length },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            const queryUrl = `/staff/dashboard?tab=${tab.id}${search ? `&search=${encodeURIComponent(search)}` : ''}`
            return (
              <Link
                key={tab.id}
                href={queryUrl}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white/10 text-white border-b-2 border-brand-light'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab.label}
                <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] text-white/60 font-black">
                  {tab.count}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Bookings List */}
        <div className="space-y-3">
          {tabList.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}

          {tabList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/20">
                <Inbox size={24} />
              </div>
              <div className="text-center">
                <p className="font-bold text-white/30 text-sm">No bookings in this tab</p>
                <p className="text-xs text-white/20 mt-1">Try changing tags, clearing search or picking another tab.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom scan button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-[#0f1923] to-transparent pointer-events-none z-40">
        <Link
          href="/staff/scan"
          className="pointer-events-auto flex items-center justify-center gap-3 bg-brand text-white font-black text-sm uppercase tracking-widest h-14 rounded-2xl shadow-2xl shadow-brand/40 active:scale-95 transition-all max-w-sm mx-auto"
        >
          <QrCode size={20} />
          Scan Customer QR
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}

function BookingCard({
  booking,
}: {
  booking: ActiveBooking
}) {
  const next = NEXT_ACTION[booking.status]
  const isOver = isPast(new Date(booking.end_time))
  const bagCount = booking.booking_bags.length

  const isHold = ['exception_hold', 'disputed'].includes(booking.status)
  const isOverdue = ['overstayed', 'late_fee_pending'].includes(booking.status)

  const borderColor = isHold
    ? 'border-red-500/40'
    : isOverdue
    ? 'border-red-400/20'
    : 'border-white/5'

  const accentBg = isHold
    ? 'bg-red-500/10'
    : isOverdue
    ? 'bg-red-400/10'
    : 'bg-white/5'

  // Tag codes assigned to the booking
  const tagCodes = booking.booking_bags
    .map(b => b.bag_tags?.tag_code)
    .filter(Boolean)

  const customerName = booking.walk_in_name || booking.users?.name || 'Walk-in Customer'
  const customerPhone = booking.walk_in_phone || booking.users?.phone || 'No phone'

  return (
    <Link href={`/staff/booking/${booking.id}`}>
      <div className={`group bg-white/[0.04] hover:bg-white/[0.07] border ${borderColor} rounded-2xl p-4 transition-all active:scale-[0.98] block`}>

        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl ${accentBg} flex items-center justify-center shrink-0`}>
              <User size={16} className={isHold ? 'text-red-500' : isOverdue ? 'text-red-400' : 'text-white/40'} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate">
                {customerName}
              </p>
              <p className="text-white/40 text-xs">
                {customerPhone}
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

        {/* Middle: duration */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white/5 rounded-xl px-3 py-2">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-0.5">Drop-off</p>
            <p className="text-xs font-semibold text-white/80">{formatDropoff(booking.start_time)}</p>
          </div>
          <div className={`rounded-xl px-3 py-2 ${isOverdue ? 'bg-red-500/15' : 'bg-white/5'}`}>
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-0.5">Pick-up by</p>
            <p className={`text-xs font-semibold ${isOverdue ? 'text-red-400 font-bold animate-pulse' : 'text-white/80'}`}>
              {isOver && isOverdue
                ? `Overdue ${formatDistanceToNow(new Date(booking.end_time))}`
                : formatDropoff(booking.end_time)
              }
            </p>
          </div>
        </div>

        {/* Footer info: Bags + tags */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap max-w-[70%]">
            <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg">
              <Package size={12} className="text-white/30" />
              <span className="text-xs font-bold text-white/60">{bagCount} bag{bagCount !== 1 ? 's' : ''}</span>
            </div>
            {tagCodes.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {tagCodes.slice(0, 2).map(tag => (
                  <span key={tag} className="font-mono text-[9px] bg-brand-accent/15 text-brand-accent px-1.5 py-0.5 rounded font-black tracking-wider border border-brand-accent/10">
                    🏷️ {tag}
                  </span>
                ))}
                {tagCodes.length > 2 && (
                  <span className="text-[10px] text-white/30">+{tagCodes.length - 2}</span>
                )}
              </div>
            )}
          </div>

          {/* Next Action tag */}
          {next && (
            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${next.color}`}>
              {next.icon}
              <span className="hidden sm:inline">{next.label}</span>
            </div>
          )}
        </div>

        {/* Hold Warning Indicator */}
        {booking.status === 'exception_hold' && (
          <div className="mt-3 flex items-center gap-2 bg-red-500/15 border border-red-500/25 rounded-xl px-3 py-2">
            <ShieldAlert size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-300 font-bold">
              OPERATIONS LOCK: Active incident requires supervisor check!
            </p>
          </div>
        )}

      </div>
    </Link>
  )
}
