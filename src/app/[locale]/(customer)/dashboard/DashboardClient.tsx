'use client'

import { useState, useEffect, useMemo } from 'react'
import { Link } from '@/navigation'
import Image from 'next/image'
import { isPast } from 'date-fns'
import {
  Search, X, MapPin, Clock, Package, ChevronRight,
  QrCode, Navigation, ShieldCheck
} from 'lucide-react'
import { HubMap } from '@/components/hubs/HubMap'
import { BookingStatusBadge } from '@/components/customer/BookingStatusBadge'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { type BookingStatus } from '@/types/database'
import { useTranslations } from 'next-intl'

// ── Types ─────────────────────────────────────────────────────────────────────

export type HubCard = {
  id: string
  name: string
  alias: string
  address: string
  open_time: string
  close_time: string
  capacity: number
  activeCount: number
  image_url: string | null
  latitude: number | null
  longitude: number | null
  minRate: number
}

export type ActiveBooking = {
  id: string
  status: BookingStatus
  start_time: string
  end_time: string
  total_price: number
  hubs: { name: string; alias: string; image_url: string | null } | null
  booking_bags: { id: string }[]
}

type Notification = {
  id: string
  message: string
  read: boolean
  created_at: string
  type: string
}

interface DashboardClientProps {
  hubs: HubCard[]
  activeBookings: ActiveBooking[]
  firstName: string | null
  userId: string | null
  notifications: Notification[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function isOpenNow(open: string, close: string) {
  const now = new Date()
  const [oh, om] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)
  const cur = now.getHours() * 60 + now.getMinutes()
  return cur >= oh * 60 + om && cur <= ch * 60 + cm
}

function fmtDist(km: number) {
  return km < 1 ? `${(km * 1000).toFixed(0)}m` : `${km.toFixed(1)}km`
}

function getAvailability(hub: HubCard) {
  const spots = hub.capacity - hub.activeCount
  
  if (spots <= 0) return { label: 'Full', color: 'bg-red-500', textColor: 'text-red-600', spots: 0 }
  if (spots <= hub.capacity * 0.3) return { label: `${spots} left`, color: 'bg-amber-400', textColor: 'text-amber-600', spots }
  return { label: 'Available', color: 'bg-emerald-500', textColor: 'text-emerald-600', spots }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HubImagePlaceholder() {
  return (
    <div className="w-full h-full bg-ocean-900 flex items-center justify-center">
      <Package size={28} className="text-white/20" />
    </div>
  )
}

function FeaturedHubCard({ hub, distanceKm }: { hub: HubCard; distanceKm: number | null }) {
  const t = useTranslations('Common')
  const avail = getAvailability(hub)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    setOpen(isOpenNow(hub.open_time, hub.close_time))
  }, [hub.open_time, hub.close_time])

  return (
    <Link href={`/hubs/${hub.id}`} className="block shrink-0 w-52">
      <div className="bg-white rounded-3xl border border-gray-100/80 shadow-premium hover:shadow-premium-hover hover:border-brand/20 hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
        <div className="relative h-32 bg-ocean-900 overflow-hidden">
          {hub.image_url ? (
            <Image src={hub.image_url} alt={hub.name} fill sizes="208px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized={hub.image_url.includes('?t=')} />
          ) : (
            <HubImagePlaceholder />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-brand-accent backdrop-blur-md px-2 py-0.5 rounded-full shadow-sm border border-brand-accent/25">
            <ShieldCheck size={9} className="text-brand-dark stroke-[3]" />
            <span className="text-brand-dark text-[8px] font-black uppercase tracking-wider">{t('vetted')}</span>
          </div>

          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-black/45 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10">
            <div className={`w-1.5 h-1.5 rounded-full ${avail.color} ${avail.spots > 0 ? 'animate-pulse' : ''}`} />
            <span className="text-white text-[9px] font-bold tracking-wide">{avail.label}</span>
          </div>

          {distanceKm !== null && (
            <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-white/20">
              <Navigation size={8} className="text-brand fill-brand" />
              <span className="text-[10px] font-extrabold text-gray-800">{fmtDist(distanceKm)}</span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white font-black text-sm leading-tight truncate drop-shadow-md tracking-tight">{hub.name}</p>
          </div>
        </div>

        <div className="px-3.5 py-3 space-y-2 bg-gradient-to-b from-white to-gray-50/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wide">
              <Clock size={10} />
              <span>{hub.open_time.slice(0, 5)}–{hub.close_time.slice(0, 5)}</span>
            </div>
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${open ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
              {open ? t('open') : t('closed')}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-gray-100/50">
            <p className="text-xs font-black text-brand tracking-tight">
              From LKR {hub.minRate.toLocaleString()}<span className="text-gray-400 font-normal text-[9px]">/hr</span>
            </p>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-0.5">
              <MapPin size={9} className="text-gray-300" />
              {hub.alias}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function HubListCard({ hub, distanceKm }: { hub: HubCard; distanceKm: number | null }) {
  const t = useTranslations('Common')
  const avail = getAvailability(hub)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    setOpen(isOpenNow(hub.open_time, hub.close_time))
  }, [hub.open_time, hub.close_time])

  return (
    <Link href={`/hubs/${hub.id}`}>
      <div className="bg-white rounded-3xl border border-gray-100/80 shadow-premium overflow-hidden hover:border-brand/35 hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300 group flex">
        <div className="relative w-24 shrink-0 bg-ocean-900 overflow-hidden">
          {hub.image_url ? (
            <Image src={hub.image_url} alt={hub.name} fill sizes="96px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized={hub.image_url.includes('?t=')} />
          ) : (
            <HubImagePlaceholder />
          )}
        </div>

        <div className="flex-1 min-w-0 px-4 py-3.5 flex flex-col justify-center gap-1 bg-gradient-to-r from-white to-gray-50/20">
          <div className="flex items-start justify-between gap-2">
            <p className="font-extrabold text-gray-900 text-sm tracking-tight leading-tight truncate group-hover:text-brand transition-colors">{hub.name}</p>
            <ChevronRight size={16} className="text-gray-300 shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs text-gray-400 truncate flex items-center gap-1 font-medium">
            <MapPin size={10} className="shrink-0 text-gray-300" />
            {hub.address}
          </p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-brand-accent/20 px-2 py-0.5 rounded-md border border-brand-accent/10">
              <ShieldCheck size={9} className="text-brand-dark font-black" />
              <span className="text-[8px] font-black text-brand-dark uppercase tracking-wide">{t('vetted')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${avail.color}`} />
              <span className={`text-[10px] font-bold ${avail.textColor}`}>{avail.label}</span>
            </div>
            {distanceKm !== null && <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-tighter">{fmtDist(distanceKm)}</span>}
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {hub.open_time.slice(0, 5)}–{hub.close_time.slice(0, 5)}
              {!open && <span className="text-rose-500 ml-1 font-extrabold">· {t('closed')}</span>}
            </span>
          </div>

          <p className="text-xs font-black text-brand mt-1.5 tracking-tight">
            From LKR {hub.minRate.toLocaleString()}/hr
          </p>
        </div>
      </div>
    </Link>
  )
}

function ActiveBookingBanner({ booking }: { booking: ActiveBooking }) {
  const t = useTranslations('Dashboard')
  const needsQR = ['active_storage', 'confirmed', 'arrived', 'sealing_in_progress',
    'sealed_waiting_user_confirmation', 'pickup_requested'].includes(booking.status)

  const [timeLeft, setTimeLeft] = useState('')
  const [urgency, setUrgency] = useState<'none' | 'warning' | 'critical'>('none')
  const [overdue, setOverdue] = useState(false)

  useEffect(() => {
    const checkTime = () => {
      const end = new Date(booking.end_time).getTime()
      const now = new Date().getTime()
      const diff = end - now

      if (diff <= 0) {
        setTimeLeft('Expired')
        setUrgency('critical')
      } else {
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        setTimeLeft(`${h}h ${m}m left`)

        if (h === 0 && m <= 15) setUrgency('critical')
        else if (h === 0 && m <= 60) setUrgency('warning')
        else setUrgency('none')
      }

      setOverdue(isPast(new Date(booking.end_time)) && booking.status === 'active_storage')
    }

    checkTime()
    const timer = setInterval(checkTime, 1000)
    return () => clearInterval(timer)
  }, [booking.end_time, booking.status])

  return (
    <div className={`rounded-3xl border overflow-hidden transition-all duration-500 shadow-premium ${
      overdue || urgency === 'critical' ? 'border-red-200 bg-red-50/60 shadow-red-100/30' : 'border-brand/15 bg-brand/5/30 backdrop-blur-sm'
    }`}>
      <Link href={`/booking/${booking.id}`}>
        <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/40 transition-colors">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-ocean-900 shrink-0 shadow-inner">
            {booking.hubs?.image_url ? (
              <Image src={booking.hubs.image_url} alt="" width={48} height={48} className="w-full h-full object-cover" unoptimized />
            ) : <Package size={20} className="text-white/30" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-extrabold text-gray-900 text-sm truncate leading-tight">{booking.hubs?.name}</p>
              <BookingStatusBadge status={booking.status} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-black uppercase py-0.5 px-2 rounded-lg bg-black/5 text-gray-500 flex items-center gap-1 tracking-wider border border-black/5">
                <Package size={10} /> {booking.booking_bags.length > 1 ? t('bags.multiple') : booking.booking_bags.length === 1 ? t('bags.single') : t('bags.none')}
              </span>
              <p className={`text-[10px] font-black uppercase tracking-wider ${overdue ? 'text-red-600 animate-pulse bg-red-100/60 px-2 py-0.5 rounded-lg border border-red-200/50' : 'text-ocean-600 bg-ocean-50/50 px-2 py-0.5 rounded-lg border border-ocean-100/50'}`}>
                {overdue ? t('timeExceeded') : timeLeft}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-black text-gray-900 tracking-tight">LKR {booking.total_price.toLocaleString()}</p>
            <p className="text-[9px] text-gray-400 font-extrabold uppercase mt-0.5 tracking-wider">{t('totalPaid')}</p>
          </div>
          <ChevronRight size={16} className="text-gray-300 shrink-0 ml-1" />
        </div>
      </Link>
      {needsQR && (
        <div className="border-t border-brand/10 bg-white/40 px-4 py-2 flex items-center justify-between gap-4">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-relaxed">{t('qrInstruction')}</p>
          <Link href={`/booking/${booking.id}`} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-brand text-white px-3.5 py-1.5 rounded-xl transition-all shadow-glow-brand hover:bg-ocean-500 hover:scale-[1.02] active:scale-95 shrink-0">
            <QrCode size={12} /> {t('showQr')}
          </Link>
        </div>
      )}
    </div>
  )
}

export function DashboardClient({ hubs, activeBookings, firstName, userId, notifications }: DashboardClientProps) {
  const t = useTranslations('Dashboard')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'available' | 'open'>('all')
  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null)
  const [locating, setLocating] = useState(false)

  const hubsWithDist = useMemo(() =>
    hubs.map((h) => ({
      ...h,
      distanceKm: userPos && h.latitude && h.longitude ? haversineKm(userPos.lat, userPos.lon, h.latitude, h.longitude) : null,
    })).sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)),
    [hubs, userPos]
  )

  const filtered = useMemo(() => {
    let list = hubsWithDist
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(h => h.name.toLowerCase().includes(q) || h.alias.toLowerCase().includes(q) || h.address.toLowerCase().includes(q))
    }
    if (filter === 'available') list = list.filter(h => h.activeCount < h.capacity)
    if (filter === 'open') list = list.filter(h => isOpenNow(h.open_time, h.close_time))
    return list
  }, [hubsWithDist, search, filter])

  const isSearching = search.trim().length > 0 || filter !== 'all'

  return (
    <div className="max-w-5xl mx-auto">
      {!isSearching && (
        <div className="px-4 pt-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-1">
            <HubMap hubs={hubs} className="h-60" />
          </div>
        </div>
      )}

      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/60">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex flex-col justify-center">
            {userId ? (
              <>
                <p className="text-[8px] text-gray-400 font-extrabold uppercase tracking-widest mb-1.5">{t('welcomeBack')}</p>
                <p className="text-sm md:text-base font-black text-gray-900 leading-none tracking-tight">{firstName ?? 'There'} 👋</p>
              </>
            ) : <p className="text-sm font-black text-gray-900 leading-none tracking-tight">{t('guestTitle')}</p>}
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => {
              setLocating(true)
              navigator.geolocation?.getCurrentPosition((pos) => { setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLocating(false) }, () => setLocating(false), { timeout: 8000 })
            }} className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3.5 py-2 rounded-2xl border transition-all duration-300 ${userPos ? 'bg-brand/10 border-brand/20 text-brand shadow-glow-brand' : 'bg-gray-50/50 border-gray-200/80 text-gray-500 hover:bg-gray-50'}`}>
              <Navigation size={12} className={locating ? 'animate-pulse' : 'fill-current'} />
              {locating ? t('locating') : userPos ? t('nearMeChecked') : t('nearMe')}
            </button>
            {userId && <NotificationBell initialNotifications={notifications} />}
          </div>
        </div>

        <div className="px-4 pb-3.5">
          <div className="relative group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand transition-colors" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchPlaceholder')}
              className="w-full bg-gray-50/80 border border-gray-200/80 rounded-2xl pl-9.5 pr-9.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-brand/50 focus:ring-4 focus:ring-brand/5 transition-all duration-300" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"><X size={15} /></button>}
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3.5 overflow-x-auto scrollbar-hide">
          {(['all', 'available', 'open'] as const).map((key) => (
            <button key={key} onClick={() => setFilter(key)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border transition-all duration-300 ${filter === key ? 'bg-gray-950 text-white border-gray-950 shadow-md shadow-gray-950/10' : 'bg-white text-gray-500 border-gray-200/80 hover:bg-gray-50'}`}>
              {t(`filters.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {activeBookings.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">{t('activeBookings')}</h2>
              <Link href="/bookings" className="text-xs text-brand font-semibold">{t('seeAll')}</Link>
            </div>
            {activeBookings.map(b => <ActiveBookingBanner key={b.id} booking={b} />)}
          </section>
        )}

        {isSearching ? (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">{t('hubsFound', { count: filtered.length })}</p>
              <button onClick={() => { setSearch(''); setFilter('all') }} className="text-xs text-brand font-semibold">{t('clearSearch')}</button>
            </div>
            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <Search size={32} className="text-gray-200 mx-auto mb-6" />
                <p className="font-black text-xl text-gray-900">{t('zeroMatches')}</p>
                <p className="text-sm text-gray-400 mt-1">{t('zeroMatchesDesc')}</p>
                <button onClick={() => { setSearch(''); setFilter('all') }} className="mt-8 bg-gray-900 text-white text-xs font-black px-8 py-3 rounded-2xl">{t('resetFilters')}</button>
              </div>
            ) : <div className="space-y-3">{filtered.map(h => <HubListCard key={h.id} hub={h} distanceKm={h.distanceKm} />)}</div>}
          </section>
        ) : (
          <>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900">{userPos ? t('nearestHubs') : t('storageHubs')}</h2>
                <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2.5 py-1 rounded-full">{t('locationsCount', { count: hubs.length })}</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                {hubsWithDist.map(h => <FeaturedHubCard key={h.id} hub={h} distanceKm={h.distanceKm} />)}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900">{t('allHubs')}</h2>
                <Link href="/hubs" className="text-xs text-brand font-semibold">{t('seeAll')}</Link>
              </div>
              <div className="space-y-3">
                {hubsWithDist.slice(0, 4).map(h => <HubListCard key={h.id} hub={h} distanceKm={h.distanceKm} />)}
              </div>
              {hubsWithDist.length > 4 && (
                <Link href="/hubs" className="mt-3 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 text-xs font-bold py-3 rounded-2xl">
                  {t('viewAllHubs', { count: hubsWithDist.length })} <ChevronRight size={14} />
                </Link>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
