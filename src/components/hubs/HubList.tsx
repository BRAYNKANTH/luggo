'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, Navigation, Map, List, ChevronRight } from 'lucide-react'

const HubMap = dynamic(() => import('./HubMap').then((m) => m.HubMap), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-2xl" />,
})

type Hub = {
  id: string
  name: string
  alias: string
  location: string
  address: string
  open_time: string
  close_time: string
  latitude: number | null
  longitude: number | null
  image_url: string | null
}
type HubWithDistance = Hub & { distanceKm: number | null }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function HubList({ hubs, isLoggedIn = false }: { hubs: Hub[]; isLoggedIn?: boolean }) {
  void isLoggedIn
  const [view, setView] = useState<'list' | 'map'>('list')
  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { timeout: 6000 }
    )
  }, [])

  const sorted: HubWithDistance[] = hubs
    .map((h) => ({
      ...h,
      distanceKm: userPos && h.latitude && h.longitude
        ? haversineKm(userPos.lat, userPos.lon, h.latitude, h.longitude)
        : null,
    }))
    .sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm
      if (a.distanceKm !== null) return -1
      if (b.distanceKm !== null) return 1
      return 0
    })

  if (!hubs.length) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-gray-400 font-medium text-sm">No active hubs found.</p>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 py-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <List size={13} /> List
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Map size={13} /> Map
          </button>
        </div>

        <button
          onClick={() => {
            setLocating(true)
            navigator.geolocation?.getCurrentPosition(
              (pos) => { setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLocating(false) },
              () => setLocating(false),
              { timeout: 6000 }
            )
          }}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
            userPos
              ? 'bg-brand/5 border-brand/20 text-brand'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          <Navigation size={12} className={locating ? 'animate-pulse' : ''} />
          {locating ? 'Locating…' : userPos ? 'Near me ✓' : 'Near me'}
        </button>
      </div>

      {/* Map */}
      {view === 'map' && (
        <div className="h-[60vh] mb-4 rounded-2xl overflow-hidden">
          <HubMap hubs={hubs} onHubClick={(id) => window.location.assign(`/hubs/${id}`)} />
        </div>
      )}

      {/* Hub cards */}
      {view === 'list' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((hub, i) => (
            <motion.div
              key={hub.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
            >
              <Link href={`/hubs/${hub.id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-brand/30 hover:shadow-md transition-all group">
                  {/* Image */}
                  <div className="relative h-40 bg-ocean-900">
                    {hub.image_url ? (
                      <Image
                        src={hub.image_url}
                        alt={hub.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized={hub.image_url.includes('?t=')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Map size={32} className="text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {hub.distanceKm !== null && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                        <span className="text-[10px] font-bold text-gray-700">
                          {hub.distanceKm < 1
                            ? `${(hub.distanceKm * 1000).toFixed(0)}m`
                            : `${hub.distanceKm.toFixed(1)}km`}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white font-bold text-sm leading-tight">{hub.name}</p>
                      <p className="text-white/60 text-xs mt-0.5 truncate">{hub.address}</p>
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {hub.open_time.slice(0, 5)} – {hub.close_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-brand text-xs font-semibold">
                      Book <ChevronRight size={13} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
