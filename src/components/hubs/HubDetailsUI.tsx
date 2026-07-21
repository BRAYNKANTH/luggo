'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { SignOutButton } from '@/components/shared/SignOutButton'
import {
  MapPin, Clock, ChevronLeft,
  ArrowRight, ShieldCheck, Star
} from 'lucide-react'
import { BAG_LABELS, type BagRates } from '@/lib/utils/pricing'
import { type BagType } from '@/types/database'
import { getConfig } from '@/lib/utils/ui'

type Hub = {
  id: string
  name: string
  alias: string
  location: string
  address: string
  capacity: number
  open_time: string
  close_time: string
  active: boolean
  image_url?: string
}

type NearbyPlace = {
  id: string
  name: string
  category: string
  description: string | null
  distance_km: number
  map_url: string | null
}

interface HubDetailsUIProps {
  hub: Hub
  activeCount: number
  categories: string[]
  grouped: Record<string, NearbyPlace[]>
  isLoggedIn: boolean
  rates: BagRates
}

export function HubDetailsUI({
  hub,
  activeCount,
  categories,
  grouped,
  isLoggedIn,
  rates,
}: HubDetailsUIProps) {
  const [showAllNearby, setShowAllNearby] = useState(false)

  const availability = hub.capacity - activeCount
  const availabilityLabel =
    availability > hub.capacity * 0.5
      ? { text: 'Available', color: 'bg-emerald-500', dot: 'bg-emerald-500' }
      : availability > 0
      ? { text: 'Limited', color: 'bg-amber-500', dot: 'bg-amber-400' }
      : { text: 'Full', color: 'bg-red-500', dot: 'bg-red-500' }

  const bookHref = `/book/${hub.id}`

  const BookCTA = (
    <Link href={bookHref} className="block">
      <Button fullWidth size="lg" disabled={availability <= 0}
        className="rounded-2xl h-14 text-base font-bold shadow-lg shadow-brand/20">
        {availability > 0 ? 'Reserve Storage' : 'Hub is Full'}
      </Button>
    </Link>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-32 md:pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3.5 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/hubs" className="flex items-center gap-1.5 text-gray-500 hover:text-brand font-semibold text-sm transition-colors">
            <ChevronLeft size={18} />
            Back
          </Link>
          <Logo size="sm" />
          {isLoggedIn ? (
            <SignOutButton portal="customer" iconOnly />
          ) : (
            <Link href="/login" className="text-sm font-bold text-gray-500 hover:text-brand transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-4 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Left Column ── */}
          <div className="lg:col-span-7 space-y-4 md:space-y-6">

            {/* Hero Image */}
            <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-gray-200/80">
              <div className="aspect-[16/6] md:h-80 relative">
                {hub.image_url ? (
                  <Image
                    src={hub.image_url}
                    alt={hub.name}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 bg-ocean-900 flex items-center justify-center">
                    <Logo variant="white" size="lg" className="opacity-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              </div>

              {/* Availability badge */}
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <div className={`h-2 w-2 rounded-full ${availabilityLabel.dot} animate-pulse`} />
                <span className="text-white text-xs font-semibold">{availabilityLabel.text}</span>
              </div>

              {/* Hub name overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-0.5">
                  {hub.alias}
                </span>
                <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                  {hub.name}
                </h1>
              </div>
            </div>

            {/* Location */}
            <div className="bg-ocean-900 p-5 md:p-8 rounded-3xl text-white space-y-3 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-brand/15 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="bg-white/10 p-2 rounded-xl">
                  <MapPin size={16} className="text-brand-light" />
                </div>
                <h2 className="text-base font-bold">Location</h2>
              </div>
              <p className="text-white/80 text-xs md:text-sm leading-relaxed relative z-10">
                {hub.address}
              </p>
              <div className="relative z-10 pt-1">
                <Link 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hub.address)}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-[10px] md:text-xs font-semibold px-3.5 py-2 rounded-xl border border-white/10 transition-colors"
                >
                  Open in Maps <ArrowRight size={10} />
                </Link>
              </div>
            </div>

            {/* Quick attributes */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
              {[
                { icon: <Clock size={16} />, label: 'Open Hours', value: `${hub.open_time.slice(0, 5)}–${hub.close_time.slice(0, 5)}` },
                { icon: <ShieldCheck size={16} />, label: 'Security', value: 'Vault Grade' },
              ].map((attr, i) => (
                <div key={i} className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                  <div className="w-8 h-8 bg-brand/8 rounded-xl flex items-center justify-center text-brand">
                    {attr.icon}
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">{attr.label}</p>
                    <p className="font-bold text-gray-900 text-[11px] sm:text-xs">{attr.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Full Nearby Explorer — desktop, visible below left column */}
            {categories.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm md:text-base font-bold text-gray-900">Explore the Neighbourhood</h3>
                  <button 
                    onClick={() => setShowAllNearby(!showAllNearby)}
                    className="md:hidden text-brand text-xs font-bold bg-brand/5 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                  >
                    {showAllNearby ? 'Show Less' : `Show All (${categories.length})`}
                  </button>
                </div>
                
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!showAllNearby ? 'hidden md:grid' : 'grid'}`}>
                  {categories.map((cat) => {
                    const cfg = getConfig(cat)
                    return (
                      <div key={cat} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <div className={`flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-wider ${cfg.text}`}>
                          <div className={`p-1.5 md:p-2 rounded-xl ${cfg.bg}`}>{cfg.icon}</div>
                          {cat}
                        </div>
                        <div className="space-y-2.5 md:space-y-3">
                          {grouped[cat].map((place) => (
                            <div key={place.id} className="flex items-center justify-between">
                              <div className="min-w-0 pr-2">
                                <p className="font-semibold text-gray-900 text-xs md:text-sm truncate">{place.name}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{place.distance_km} km away</p>
                              </div>
                              {place.map_url && (
                                <Link href={place.map_url} target="_blank" className="text-brand text-[10px] md:text-xs font-semibold flex items-center gap-1 hover:underline shrink-0">
                                  Maps <ArrowRight size={10} />
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column (sticky) ── */}
          <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">

            {/* Pricing card */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Storage Rates</h2>
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Best Rate
                </div>
              </div>

              {/* Rate list */}
              <div className="space-y-2">
                {(Object.entries(BAG_LABELS) as [BagType, string][]).map(([type, label]) => (
                  <div key={type} className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                        <Star size={14} />
                      </div>
                      <span className="font-semibold text-gray-800 text-sm">{label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900 leading-tight">LKR {rates[type].hourlyRate.toLocaleString()}/hr</p>
                      <p className="text-[9px] text-brand font-black uppercase mt-0.5 tracking-wider">Max LKR {rates[type].dailyCap.toLocaleString()}/day</p>
                    </div>
                  </div>
                ))}
              </div>


              {/* Desktop CTA */}
              <div className="space-y-3 hidden md:block">
                {BookCTA}
                <p className="text-center text-xs text-gray-400 font-medium">No deposit required · Instant confirmation</p>
              </div>
            </div>

            {/* Nearby snapshot */}
            {categories.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">Nearby</h3>
                  <span className="text-brand text-xs font-semibold">Explore</span>
                </div>
                <div className="space-y-5">
                  {categories.slice(0, 2).map((cat) => {
                    const cfg = getConfig(cat)
                    return (
                      <div key={cat} className="space-y-3">
                        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${cfg.text}`}>
                          <div className={`p-2 rounded-xl ${cfg.bg}`}>{cfg.icon}</div>
                          {cat}
                        </div>
                        <div className="space-y-2">
                          {grouped[cat].slice(0, 2).map((place) => (
                            <div key={place.id} className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">{place.name}</p>
                                <p className="text-xs text-gray-400">{place.distance_km} km away</p>
                              </div>
                              <ArrowRight size={14} className="text-gray-300" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </aside>
        </div>
      </main>

      {/* ── Mobile sticky booking bar ── */}
      <div className="md:hidden fixed bottom-[60px] inset-x-0 z-40 bg-white border-t border-gray-100 px-4 py-3 shadow-2xl shadow-gray-300/50">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">Starting from</p>
            <p className="text-sm font-bold text-gray-900">
              LKR {Math.min(...Object.values(rates).map(r => r.hourlyRate)).toLocaleString()}<span className="text-gray-400 font-normal">/hr</span>
            </p>
          </div>
          <Link href={bookHref} className="shrink-0">
            <Button size="sm" disabled={availability <= 0} className="rounded-xl px-6 font-bold">
              {availability > 0 ? 'Reserve Storage' : 'Hub is Full'}
            </Button>
          </Link>
        </div>
      </div>

    </div>
  )
}
