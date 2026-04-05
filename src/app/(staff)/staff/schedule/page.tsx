import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { ChevronLeft, Calendar, Package, ArrowDown, ArrowUp, Clock, User, Tag, CheckCircle2 } from 'lucide-react'
import { format, isToday, isTomorrow, startOfDay, endOfDay, addDays } from 'date-fns'
import { BAG_LABELS } from '@/lib/utils/pricing'
import { type BagType, type BookingStatus } from '@/types/database'

type ScheduledBooking = {
  id: string
  status: BookingStatus
  start_time: string
  end_time: string
  users: { name: string; phone: string | null } | null
  booking_bags: { id: string; bag_type: BagType; sticker_number: string | null }[]
}

export default async function StaffSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

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

  const now       = new Date()
  const todayStart = startOfDay(now).toISOString()
  const todayEnd   = endOfDay(now).toISOString()
  const tomorrowStart = startOfDay(addDays(now, 1)).toISOString()
  const tomorrowEnd   = endOfDay(addDays(now, 1)).toISOString()

  // Today's drop-offs (start_time today, confirmed/arrived)
  const { data: todayDropoffs } = await supabase
    .from('bookings')
    .select('id, status, start_time, end_time, users(name, phone), booking_bags(id, bag_type, sticker_number)')
    .eq('hub_id', staffRow.hub_id)
    .in('status', ['confirmed', 'arrived'])
    .gte('start_time', todayStart)
    .lte('start_time', todayEnd)
    .order('start_time', { ascending: true }) as { data: ScheduledBooking[] | null }

  // Today's pickups (end_time today, active/overstayed/pickup_requested)
  const { data: todayPickups } = await supabase
    .from('bookings')
    .select('id, status, start_time, end_time, users(name, phone), booking_bags(id, bag_type, sticker_number)')
    .eq('hub_id', staffRow.hub_id)
    .in('status', ['active_storage', 'overstayed', 'pickup_requested'])
    .gte('end_time', todayStart)
    .lte('end_time', todayEnd)
    .order('end_time', { ascending: true }) as { data: ScheduledBooking[] | null }

  // Tomorrow's drop-offs
  const { data: tomorrowDropoffs } = await supabase
    .from('bookings')
    .select('id, status, start_time, end_time, users(name, phone), booking_bags(id, bag_type, sticker_number)')
    .eq('hub_id', staffRow.hub_id)
    .in('status', ['confirmed'])
    .gte('start_time', tomorrowStart)
    .lte('start_time', tomorrowEnd)
    .order('start_time', { ascending: true }) as { data: ScheduledBooking[] | null }

  const hubAlias = staffRow.hubs?.alias ?? ''

  // Bag type summary for today's drop-offs (for sticker pack prep)
  const bagSummary: Record<string, number> = {}
  for (const b of (todayDropoffs ?? [])) {
    for (const bag of b.booking_bags) {
      bagSummary[bag.bag_type] = (bagSummary[bag.bag_type] ?? 0) + 1
    }
  }
  const totalBagsToday = Object.values(bagSummary).reduce((s, v) => s + v, 0)

  return (
    <div className="min-h-screen bg-[#0f1923] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0f1923]/95 backdrop-blur border-b border-white/8 px-4 py-3 flex items-center justify-between">
        <Link href="/staff/dashboard" className="flex items-center gap-1 text-white/50 hover:text-white text-sm transition-colors">
          <ChevronLeft size={16} /> Dashboard
        </Link>
        <Logo variant="white" size="sm" />
        <SignOutButton portal="staff" iconOnly />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {/* Page title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
            <Calendar size={18} className="text-brand-light" />
          </div>
          <div>
            <h1 className="text-lg font-black">Today&apos;s Schedule</h1>
            <p className="text-white/40 text-xs">{format(now, 'EEEE, dd MMMM yyyy')} · {hubAlias}</p>
          </div>
        </div>

        {/* Sticker pack prep banner */}
        {totalBagsToday > 0 && (
          <div className="bg-brand/10 border border-brand/20 rounded-2xl p-4 flex items-start gap-3">
            <Tag size={16} className="text-brand-light mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm text-brand-light">Prepare sticker packs</p>
              <p className="text-white/50 text-xs mt-0.5 mb-2">
                {totalBagsToday} bag{totalBagsToday !== 1 ? 's' : ''} arriving today — have these stickers ready:
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(bagSummary).map(([type, count]) => (
                  <span key={type} className="text-xs font-bold bg-white/10 text-white/70 px-2.5 py-1 rounded-lg">
                    {count}× {BAG_LABELS[type as BagType]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TODAY ARRIVALS */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowDown size={14} className="text-green-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-green-400">
              Arrivals Today ({todayDropoffs?.length ?? 0})
            </h2>
          </div>

          {todayDropoffs && todayDropoffs.length > 0 ? (
            todayDropoffs.map(b => (
              <ScheduleCard key={b.id} booking={b} hubAlias={hubAlias} type="arrival" />
            ))
          ) : (
            <EmptySlot message="No drop-offs scheduled for today" />
          )}
        </section>

        {/* TODAY PICKUPS */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUp size={14} className="text-cyan-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400">
              Pickups Due Today ({todayPickups?.length ?? 0})
            </h2>
          </div>

          {todayPickups && todayPickups.length > 0 ? (
            todayPickups.map(b => (
              <ScheduleCard key={b.id} booking={b} hubAlias={hubAlias} type="pickup" />
            ))
          ) : (
            <EmptySlot message="No pickups due today" />
          )}
        </section>

        {/* TOMORROW ARRIVALS */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-white/30" />
            <h2 className="text-xs font-black uppercase tracking-widest text-white/30">
              Tomorrow&apos;s Arrivals ({tomorrowDropoffs?.length ?? 0})
            </h2>
          </div>

          {tomorrowDropoffs && tomorrowDropoffs.length > 0 ? (
            tomorrowDropoffs.map(b => (
              <ScheduleCard key={b.id} booking={b} hubAlias={hubAlias} type="tomorrow" />
            ))
          ) : (
            <EmptySlot message="No arrivals scheduled for tomorrow" />
          )}
        </section>

      </div>
    </div>
  )
}

function ScheduleCard({
  booking: b,
  hubAlias,
  type,
}: {
  booking: ScheduledBooking
  hubAlias: string
  type: 'arrival' | 'pickup' | 'tomorrow'
}) {
  const time       = type === 'pickup' ? new Date(b.end_time) : new Date(b.start_time)
  const isPast     = time < new Date()
  const stickers   = b.booking_bags.filter(bg => bg.sticker_number).map(bg => `${hubAlias}-${bg.sticker_number}`)
  const allStickered = b.booking_bags.every(bg => bg.sticker_number)

  const borderColor = type === 'arrival'
    ? 'border-green-500/20'
    : type === 'pickup'
    ? 'border-cyan-500/20'
    : 'border-white/5'

  return (
    <Link href={`/staff/booking/${b.id}`}>
      <div className={`group bg-white/[0.04] hover:bg-white/[0.07] border ${borderColor} rounded-2xl p-4 transition-all active:scale-[0.98]`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              type === 'arrival' ? 'bg-green-500/15' : type === 'pickup' ? 'bg-cyan-500/15' : 'bg-white/5'
            }`}>
              <User size={16} className={type === 'arrival' ? 'text-green-400' : type === 'pickup' ? 'text-cyan-400' : 'text-white/30'} />
            </div>
            <div>
              <p className="font-bold text-sm">{b.users?.name ?? 'Customer'}</p>
              <p className="text-white/40 text-xs">{b.users?.phone ?? '—'}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
            isPast && type !== 'tomorrow'
              ? 'bg-red-500/15 text-red-400'
              : type === 'arrival' ? 'bg-green-500/10 text-green-400' : type === 'pickup' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-white/5 text-white/40'
          }`}>
            <Clock size={11} />
            {format(time, 'h:mm a')}
          </div>
        </div>

        {/* Bags */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Package size={12} />
            <span>{b.booking_bags.length} bag{b.booking_bags.length !== 1 ? 's' : ''}</span>
          </div>
          {stickers.length > 0 ? (
            <>
              {stickers.slice(0, 3).map(s => (
                <span key={s} className="font-mono text-[10px] bg-brand-accent/15 text-brand-accent px-1.5 py-0.5 rounded font-bold">
                  {s}
                </span>
              ))}
              {stickers.length > 3 && <span className="text-[10px] text-white/30">+{stickers.length - 3}</span>}
            </>
          ) : type === 'arrival' ? (
            <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-lg">
              Stickers assigned at check-in
            </span>
          ) : null}

          {type === 'pickup' && allStickered && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-green-400 font-bold">
              <CheckCircle2 size={11} /> Stickers confirmed
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function EmptySlot({ message }: { message: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 border-dashed rounded-2xl px-4 py-5 text-center">
      <p className="text-xs text-white/20">{message}</p>
    </div>
  )
}
