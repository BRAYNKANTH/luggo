'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

type Hub = {
  id: string
  name: string
  alias: string
  address: string
  latitude: number | null
  longitude: number | null
}

interface HubMapProps {
  hubs: Hub[]
  onHubClick?: (hubId: string) => void
  className?: string
}

export function HubMap({ hubs, onHubClick, className }: HubMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null)

  useEffect(() => {
    if (!mapRef.current) return
    let isMounted = true
    let map: import('leaflet').Map | null = null

    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      if (!isMounted || !mapRef.current) return

      // Check if container already has a map (to be extra safe)
      // Leaflet doesn't have a simple check, but we can check the ref
      if (mapInstanceRef.current) return

      // Fix default marker icon issue with webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      // Centre on Sri Lanka
      map = L.map(mapRef.current, {
        center: [7.8731, 80.7718],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      // Custom brand marker with price
      const brandIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
            <div style="
              background:#038cc9;
              color:#fff;
              font-family:sans-serif;
              font-weight:800;
              font-size:11px;
              padding:4px 8px;
              border-radius:12px;
              border:2px solid #fff;
              box-shadow:0 3px 10px rgba(0,0,0,0.2);
              white-space:nowrap;
            ">
              LKR 200
            </div>
            <div style="
              width:0; height:0;
              border-left:6px solid transparent;
              border-right:6px solid transparent;
              border-top:6px solid #fff;
              margin-top:-1px;
            "></div>
          </div>
        `,
        iconSize: [60, 34],
        iconAnchor: [30, 34],
        popupAnchor: [0, -36],
      })

      hubs.forEach((hub) => {
        if (hub.latitude && hub.longitude) {
          const marker = L.marker([hub.latitude, hub.longitude], { icon: brandIcon })
            .addTo(map!)
            .bindPopup(`
              <div style="font-family:sans-serif;min-width:140px">
                <div style="font-weight:800;color:#011a2e;font-size:13px">${hub.name}</div>
                <div style="color:#666;font-size:11px;margin-top:2px">${hub.address}</div>
                <div style="margin-top:8px">
                  <span style="background:#038cc9;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px">${hub.alias}</span>
                </div>
              </div>
            `)

          if (onHubClick) {
            marker.on('popupopen', () => {
              setTimeout(() => {
                const btn = document.getElementById(`hub-popup-${hub.id}`)
                btn?.addEventListener('click', () => onHubClick(hub.id))
              }, 50)
            })
          }
        }
      })

      mapInstanceRef.current = map
    })

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      } else if (map) {
        map.remove()
      }
    }
  }, [hubs, onHubClick])

  const hasCoords = hubs.some((h) => h.latitude && h.longitude)

  return (
    <div className={`relative w-full ${!className ? 'h-[220px]' : className}`}>
      <div
        ref={mapRef}
        className="w-full h-full rounded-3xl overflow-hidden"
      />
      {!hasCoords && (
        <div className="absolute inset-0 flex items-center justify-center bg-ocean-900/80 rounded-3xl">
          <div className="text-center text-white px-6">
            <p className="font-bold text-sm">Map coming soon</p>
            <p className="text-white/60 text-xs mt-1">Add hub coordinates in admin to see pins</p>
          </div>
        </div>
      )}
    </div>
  )
}
