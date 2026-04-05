'use client'

import { useState, useTransition } from 'react'
import { createNearbyPlace } from '@/lib/admin/actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus } from 'lucide-react'

export const PLACE_CATEGORIES = [
  'Restaurant',
  'Cafe',
  'Hotel',
  'Shopping',
  'Attraction',
  'Transport',
  'Beach',
  'Hospital',
  'Bank / ATM',
  'Other',
] as const

interface Hub { id: string; name: string }

export function NearbyPlaceForm({ hubs }: { hubs: Hub[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [hubId,       setHubId]       = useState(hubs[0]?.id ?? '')
  const [name,        setName]        = useState('')
  const [category,    setCategory]    = useState<string>(PLACE_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [distanceKm,  setDistanceKm]  = useState('')
  const [mapUrl,      setMapUrl]      = useState('')

  function reset() {
    setName(''); setDescription(''); setDistanceKm(''); setMapUrl('')
    setCategory(PLACE_CATEGORIES[0])
    setError(null); setSuccess(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(false)

    const dist = parseFloat(distanceKm)
    if (!name.trim())    { setError('Name is required'); return }
    if (isNaN(dist) || dist <= 0) { setError('Enter a valid distance'); return }

    startTransition(async () => {
      const result = await createNearbyPlace({
        hubId,
        name,
        category,
        description,
        distanceKm: dist,
        mapUrl,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        reset()
        setTimeout(() => { setOpen(false); setSuccess(false) }, 1000)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand/80 transition-colors"
      >
        <Plus size={16} />
        Add place
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-brand/20 p-5 space-y-4"
    >
      <h3 className="font-bold text-ocean-900 text-sm">New Nearby Place</h3>

      {/* Hub */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Hub</label>
        <select
          value={hubId}
          onChange={(e) => setHubId(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {hubs.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

      {/* Name + Category */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="place-name"
          label="Place name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Burger King"
        />
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            {PLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">
          Description <span className="text-gray-300">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Open 24 hours, 3-min walk"
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
        />
      </div>

      {/* Distance + Map URL */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="distance"
          label="Distance (km)"
          type="number"
          step="0.1"
          min="0.1"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
          placeholder="e.g. 0.3"
        />
        <Input
          id="map-url"
          label="Maps link (optional)"
          value={mapUrl}
          onChange={(e) => setMapUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/..."
        />
      </div>

      {error   && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-green-600 font-semibold">Place added!</p>}

      <div className="flex gap-2">
        <Button type="submit" loading={isPending} size="sm">Add Place</Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setOpen(false); reset() }}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
