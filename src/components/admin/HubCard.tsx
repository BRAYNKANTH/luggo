'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HubForm } from './HubForm'
import { HubToggle } from './HubToggle'
import { HubImageUpload } from './HubImageUpload'
import { MapPin, Clock, Users, Edit2, Globe } from 'lucide-react'

interface Hub {
  id: string
  name: string
  alias: string
  location: string
  address: string
  capacity: number
  open_time: string
  close_time: string
  active: boolean
  image_url: string | null
  latitude: number | null
  longitude: number | null
}

interface HubCardProps {
  hub: Hub
  bags: number
}

export function HubCard({ hub, bags }: HubCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)

  const pct = Math.min(100, Math.round((bags / hub.capacity) * 100))
  const isHigh = pct >= 80

  if (isEditing) {
    return (
      <div className="bg-white rounded-2xl border border-brand/20 p-5 shadow-sm">
        <h3 className="font-bold text-ocean-900 text-sm mb-4">Edit Hub: {hub.name}</h3>
        <HubForm
          hub={hub}
          onSuccess={() => {
            setIsEditing(false)
            router.refresh()
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold text-ocean-900 truncate">{hub.name}</h2>
            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg shrink-0">
              {hub.alias}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-4">
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {hub.address} ({hub.location})
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {hub.open_time.slice(0, 5)} – {hub.close_time.slice(0, 5)}
            </span>
            <span className="flex items-center gap-1">
              <Users size={11} />
              Capacity {hub.capacity} bags
            </span>
            {hub.latitude != null && hub.longitude != null && (
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <Globe size={11} />
                {hub.latitude.toFixed(4)}, {hub.longitude.toFixed(4)}
              </span>
            )}
          </div>

          {/* Capacity bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{bags} bags in storage</span>
              <span className={isHigh ? 'text-red-500 font-semibold' : ''}>
                {pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isHigh ? 'bg-red-400' : 'bg-brand'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Toggle & Edit Action */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-ocean-900 hover:bg-gray-100 transition-colors"
              title="Edit Hub Details"
            >
              <Edit2 size={14} />
            </button>
            <HubToggle hubId={hub.id} initialActive={hub.active} />
          </div>
          <span className="text-[10px] uppercase font-bold text-gray-400">
            {hub.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Image upload */}
      <div className="border-t border-gray-50 mt-4 pt-4">
        <p className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Hub Photo</p>
        <HubImageUpload
          hubId={hub.id}
          hubName={hub.name}
          currentImageUrl={hub.image_url ?? null}
        />
      </div>
    </div>
  )
}
