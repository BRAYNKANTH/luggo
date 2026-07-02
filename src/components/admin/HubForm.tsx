'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { PlusCircle, AlertCircle, CheckCircle, MapPin, Clock, Users, Globe } from 'lucide-react'
import { createHub, updateHub } from '@/lib/admin/actions'

interface HubFormProps {
  hub?: {
    id: string
    name: string
    alias: string
    location: string
    address: string
    capacity: number
    open_time: string
    close_time: string
    latitude: number | null
    longitude: number | null
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export function HubForm({ hub, onSuccess, onCancel }: HubFormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(hub?.name ?? '')
  const [alias, setAlias] = useState(hub?.alias ?? '')
  const [location, setLocation] = useState(hub?.location ?? '')
  const [address, setAddress] = useState(hub?.address ?? '')
  const [capacity, setCapacity] = useState(hub?.capacity ?? 50)
  const [openTime, setOpenTime] = useState(hub?.open_time ? hub.open_time.slice(0, 5) : '06:00')
  const [closeTime, setCloseTime] = useState(hub?.close_time ? hub.close_time.slice(0, 5) : '22:00')
  const [latitude, setLatitude] = useState(hub?.latitude != null ? String(hub.latitude) : '')
  const [longitude, setLongitude] = useState(hub?.longitude != null ? String(hub.longitude) : '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Form validation checks before starting transition
    if (!/^[A-Za-z]{2,6}$/.test(alias)) {
      setError('Alias must be between 2 and 6 letters.')
      return
    }

    const latNum = parseFloat(latitude)
    const lngNum = parseFloat(longitude)

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError('Latitude must be a valid number between -90 and 90.')
      return
    }

    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setError('Longitude must be a valid number between -180 and 180.')
      return
    }

    startTransition(async () => {
      const hubData = {
        name: name.trim(),
        alias: alias.toUpperCase().trim(),
        location: location.trim(),
        address: address.trim(),
        capacity: Number(capacity),
        openTime,
        closeTime,
        latitude: latNum,
        longitude: lngNum,
      }

      const result = hub
        ? await updateHub(hub.id, hubData)
        : await createHub(hubData)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(
          hub
            ? `Hub "${name}" updated successfully.`
            : `Hub "${name}" created successfully. You can now assign staff members to it.`
        )
        
        if (!hub) {
          // Reset form on creation
          setName('')
          setAlias('')
          setLocation('')
          setAddress('')
          setCapacity(50)
          setOpenTime('06:00')
          setCloseTime('22:00')
          setLatitude('')
          setLongitude('')
        }

        if (onSuccess) {
          // Trigger success callback after a brief delay for user to read success message
          setTimeout(() => {
            onSuccess()
          }, 800)
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <Globe size={13} className="text-gray-400" />
            Hub Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Luggo Hikkaduwa Beach"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white text-gray-800"
          />
        </div>

        {/* Alias */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <PlusCircle size={13} className="text-gray-400" />
            Alias (3-letter Code) *
          </label>
          <input
            type="text"
            required
            value={alias}
            onChange={(e) => setAlias(e.target.value.toUpperCase())}
            placeholder="e.g. HIK"
            maxLength={6}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white font-mono text-gray-800 uppercase"
          />
        </div>

        {/* City/Location */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <MapPin size={13} className="text-gray-400" />
            Location (City/Area) *
          </label>
          <input
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Hikkaduwa"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white text-gray-800"
          />
        </div>

        {/* Address */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <MapPin size={13} className="text-gray-400" />
            Street Address *
          </label>
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 12 Galle Road, Hikkaduwa"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white text-gray-800"
          />
        </div>

        {/* Capacity */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <Users size={13} className="text-gray-400" />
            Max Bag Capacity *
          </label>
          <input
            type="number"
            required
            min={1}
            max={1000}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white text-gray-800"
          />
        </div>

        {/* Open Time */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <Clock size={13} className="text-gray-400" />
            Open Time *
          </label>
          <input
            type="time"
            required
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white text-gray-800"
          />
        </div>

        {/* Close Time */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <Clock size={13} className="text-gray-400" />
            Close Time *
          </label>
          <input
            type="time"
            required
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white text-gray-800"
          />
        </div>

        {/* Latitude */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <Globe size={13} className="text-gray-400" />
            Latitude *
          </label>
          <input
            type="text"
            required
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="e.g. 6.1398"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white text-gray-800"
          />
        </div>

        {/* Longitude */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <Globe size={13} className="text-gray-400" />
            Longitude *
          </label>
          <input
            type="text"
            required
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="e.g. 80.1042"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white text-gray-800"
          />
        </div>
      </div>

      {/* Errors & Success Messages */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700">
          <CheckCircle size={15} className="mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={isPending} className="gap-2">
          {!hub && <PlusCircle size={15} />}
          {hub ? 'Save changes' : 'Create Hub'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
