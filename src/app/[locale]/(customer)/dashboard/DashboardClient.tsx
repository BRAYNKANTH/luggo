'use client'

import { useState, useEffect, useMemo } from 'react'
import { Link } from '@/navigation'
import Image from 'next/image'
import { isPast } from 'date-fns'
import {
  Search, X, MapPin, Clock, Package, ChevronRight,
  QrCode, Navigation, SlidersHorizontal, ShieldCheck
} from 'lucide-react'
import { HubMap } from '@/components/hubs/HubMap'
import { BookingStatusBadge } from '@/components/customer/BookingStatusBadge'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { type BookingStatus } from '@/types/database'
import { BAG_RATES } from '@/lib/utils/pricing'
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
}

export type ActiveBooking = {
  id: string
  status: BookingStatus
  start_time: string
  end_time: string
  total_price: number
  hubs: { name: string; alias: string; image_url: string | null } | null
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
  const percent = Math.round((hub.activeCount / hub.capacity) * 100)
  
  if (spots <= 0) return { label: 'Full', color: 'bg-red-500', textColor: 'text-red-600', spots: 0, percent: 100 }
  if (spots <= hub.capacity * 0.3) return { label: `${spots} left`, color: 'bg-amber-400', textColor: 'text-amber-600', spots, percent }
  return { label: 'Available', color: 'bg-emerald-500', textColor: 'text-emerald-600', spots, percent }
}

const minRate = Math.min(...Object.values(BAG_RATES) as number[])

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
  const open = isOpenNow(hub.open_time, hub.close_time)

  return (
    <Link href={`/hubs/${hub.id}`} className="block shrink-0 w-52">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-brand/20 hover:-translate-y-0.5 transition-all group">
        <div className="relative h-32 bg-ocean-900">
          {hub.image_url ? (
            <Image src={hub.image_url} alt={hub.name} fill sizes="208px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized={hub.image_url.includes('?t=')} />
          ) : (
            <HubImagePlaceholder />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-brand-accent backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
            <ShieldCheck size={10} className="text-brand font-bold" strokeWidth={3} />
            <span className="text-brand text-[9px] font-black uppercase tracking-tight">{t('vetted')}</span>
          </div>

          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full ${avail.color} ${avail.spots > 0 ? 'animate-pulse' : ''}`} />
            <span className="text-white text-[9px] font-semibold">{avail.label}</span>
          </div>

          {distanceKm !== null && (
            <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
              <Navigation size={8} className="text-brand" />
              <span className="text-[10px] font-bold text-gray-700">{fmtDist(distanceKm)}</span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white font-bold text-sm leading-tight truncate drop-shadow">{hub.name}</p>
          </div>
        </div>

        <div className="px-3 py-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Clock size={10} />
              <span>{hub.open_time.slice(0, 5)}–{hub.close_time.slice(0, 5)}</span>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${open ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              {open ? t('open') : t('closed')}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-tighter">
              <span className="text-gray-400">{t('capacity')}</span>
              <span className={avail.textColor}>{avail.percent}%</span>
            </div>
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-1000 ${avail.color}`} style={{ width: `${avail.percent}%` }} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-brand">
              From LKR {minRate.toLocaleString()}<span className="text-gray-400 font-normal text-[10px]">/hr</span>
            </p>
            <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
              <MapPin size={9} />
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
  const open = isOpenNow(hub.open_time, hub.close_time)

  return (
    <Link href={`/hubs/${hub.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-brand/20 hover:shadow-md transition-all group flex">
        <div className="relative w-24 shrink-0 bg-ocean-900">
          {hub.image_url ? (
            <Image src={hub.image_url} alt={hub.name} fill sizes="96px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized={hub.image_url.includes('?t=')} />
          ) : (
            <HubImagePlaceholder />
          )}
        </div>

        <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center gap-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-gray-900 text-sm leading-tight truncate">{hub.name}</p>
            <ChevronRight size={16} className="text-gray-300 shrink-0 mt-0.5" />
          </div>
          <p className="text-xs text-gray-400 truncate flex items-center gap-1">
            <MapPin size={10} className="shrink-0" />
            {hub.address}
          </p>
          <div className="flex items-center gap-3 mt-1 underline-offset-4">
            <div className="flex items-center gap-1 bg-brand-accent/30 px-1.5 py-0.5 rounded-md">
              <ShieldCheck size={9} className="text-brand font-bold" />
              <span className="text-[9px] font-black text-brand uppercase tracking-tighter">{t('vetted')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${avail.color}`} />
              <span className={`text-[10px] font-semibold ${avail.textColor}`}>{avail.label}</span>
            </div>
            {distanceKm !== null && <span className="text-[10px] text-gray-400 font-medium">{fmtDist(distanceKm)}</span>}
            <span className="text-[10px] text-gray-400 font-medium">
              {hub.open_time.slice(0, 5)}–{hub.close_time.slice(0, 5)}
              {!open && <span className="text-red-400 ml-1">· {t('closed')}</span>}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-1000 ${avail.color}`} style={{ width: `${avail.percent}%` }} />
            </div>
            <span className={`text-[9px] font-bold ${avail.textColor}`}>{avail.percent}%</span>
          </div>

          <p className="text-xs font-bold text-brand mt-1">
            From LKR {minRate.toLocaleString()}/hr
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

  useEffect(() => {
    const timer = setInterval(() => {
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
    }, 1000)
    return () => clearInterval(timer)
  }, [booking.end_time])

  const overdue = isPast(new Date(booking.end_time)) && booking.status === 'active_storage'

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-500 ${
      overdue || urgency === 'critical' ? 'border-red-200 bg-red-50 shadow-lg' : 'border-brand/20 bg-brand/4'
    }`}>
      <Link href={`/booking/${booking.id}`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-ocean-900 shrink-0 shadow-inner">
            {booking.hubs?.image_url ? (
              <Image src={booking.hubs.image_url} alt="" width={48} height={48} className="w-full h-full object-cover" unoptimized />
            ) : <Package size={20} className="text-white/30" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm truncate">{booking.hubs?.name}</p>
              <BookingStatusBadge status={booking.status} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold uppercase py-0.5 px-1.5 rounded bg-black/5 text-gray-500 flex items-center gap-1">
                <Package size={10} /> {booking.total_price > 0 ? (booking.total_price / BAG_RATES.regular > 1 ? t('bags.multiple') : t('bags.single')) : t('bags.none')}
              </span>
              <p className={`text-[10px] font-black uppercase ${overdue ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                {overdue ? t('timeExceeded') : timeLeft}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-black text-gray-900">LKR {booking.total_price.toLocaleString()}</p>
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{t('totalPaid')}</p>
          </div>
          <ChevronRight size={16} className="text-gray-300 shrink-0 ml-1" />
        </div>
      </Link>
      {needsQR && (
        <div className="border-t border-brand/10 bg-white/50 px-4 py-2 flex items-center justify-between">
          <p className="text-[10px] text-gray-400 font-medium italic">{t('qrInstruction')}</p>
          <Link href={`/booking/${booking.id}`} className="flex items-center gap-1.5 text-[10px] font-bold bg-brand text-white px-3 py-1.5 rounded-xl transition-all">
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

      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col justify-center">
            {userId ? (
              <>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('welcomeBack')}</p>
                <p className="text-sm md:text-base font-black text-gray-900 leading-none">{firstName ?? 'There'} 👋</p>
              </>
            ) : <p className="text-sm font-black text-gray-900 leading-none">{t('guestTitle')}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
              setLocating(true)
              navigator.geolocation?.getCurrentPosition((pos) => { setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLocating(false) }, () => setLocating(false), { timeout: 8000 })
            }} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${userPos ? 'bg-brand/10 border-brand/20 text-brand' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              <Navigation size={12} className={locating ? 'animate-pulse' : ''} />
              {locating ? t('locating') : userPos ? t('nearMeChecked') : t('nearMe')}
            </button>
            {userId && <NotificationBell initialNotifications={notifications} userId={userId} />}
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchPlaceholder')}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-9 pr-9 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={15} /></button>}
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {(['all', 'available', 'open'] as const).map((key) => (
            <button key={key} onClick={() => setFilter(key)} className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${filter === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
              {t(`filters.${key}`)}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 shrink-0 mx-1" />
          <button className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-gray-200 bg-white text-gray-600">
            <SlidersHorizontal size={11} /> {t('filters.more')}
          </button>
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
