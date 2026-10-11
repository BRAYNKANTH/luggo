'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

// Hub fields are admin-entered text; never interpolate them into popup HTML raw.
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

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
  const t = useTranslations('Hubs')
  const viewLabel = t('viewHub')
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null)
  // Callers pass inline handlers; keep the latest in a ref so the map isn't rebuilt every render.
  const onHubClickRef = useRef(onHubClick)
  onHubClickRef.current = onHubClick
  const clickable = !!onHubClick

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

      // Custom brand marker with icon
      const brandIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
            <div style="
              background:#0277b0;
              color:#fff;
              width:32px;
              height:32px;
              display:flex;
              align-items:center;
              justify-content:center;
              border-radius:12px;
              border:2px solid #fff;
              box-shadow:0 3px 10px rgba(0,0,0,0.2);
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
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
        iconSize: [32, 38],
        iconAnchor: [16, 38],
        popupAnchor: [0, -40],
      })

      hubs.forEach((hub) => {
        if (hub.latitude && hub.longitude) {
          // title/alt give each keyboard-focusable pin an accessible name.
          const marker = L.marker([hub.latitude, hub.longitude], { icon: brandIcon, title: hub.name, alt: hub.name })
            .addTo(map!)
            .bindPopup(`
              <div style="font-family:sans-serif;min-width:160px">
                <div style="font-weight:800;color:#011a2e;font-size:13px">${escapeHtml(hub.name)}</div>
                <div style="color:#4b5563;font-size:12px;margin-top:2px">${escapeHtml(hub.address)}</div>
                ${clickable ? `<button type="button" id="hub-popup-${hub.id}" style="margin-top:10px;min-height:40px;width:100%;background:#0277b0;color:#fff;font-size:13px;font-weight:700;border:0;border-radius:10px;cursor:pointer">${escapeHtml(viewLabel)}</button>` : ''}
              </div>
            `)

          if (clickable) {
            marker.on('popupopen', () => {
              setTimeout(() => {
                const btn = document.getElementById(`hub-popup-${hub.id}`)
                btn?.addEventListener('click', () => onHubClickRef.current?.(hub.id))
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
  }, [hubs, clickable, viewLabel])

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
            <p className="font-bold text-sm">{t('mapUnavailable')}</p>
            <p className="text-white/70 text-xs mt-1">{t('mapUnavailableDesc')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
