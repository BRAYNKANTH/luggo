'use client'

import React, { useState } from 'react'
import { Save, Clock, Calendar, MapPin, Building2, Power } from 'lucide-react'
import { updateHubProfile } from '@/lib/staff/actions'
import { useRouter } from 'next/navigation'

interface HubData {
  id: string
  name: string
  address: string
  open_time: string
  close_time: string
  active: boolean
  active_days: string[]
}

interface HubProfileFormProps {
  hub: HubData
}

const DAYS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
]

export function HubProfileForm({ hub }: HubProfileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: hub.name,
    address: hub.address,
    open_time: hub.open_time,
    close_time: hub.close_time,
    active: hub.active,
    active_days: hub.active_days || DAYS.map(d => d.id)
  })

  const toggleDay = (dayId: string) => {
    setFormData(prev => ({
      ...prev,
      active_days: prev.active_days.includes(dayId)
        ? prev.active_days.filter(id => id !== dayId)
        : [...prev.active_days, dayId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const result = await updateHubProfile(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Today's Status Toggle */}
      <div className={`p-4 rounded-2xl border transition-all ${formData.active ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.active ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <Power size={20} className={formData.active ? 'text-green-400' : 'text-red-400'} />
            </div>
            <div>
              <p className="text-sm font-black text-white">Hub is {formData.active ? 'ACTIVE' : 'CLOSED'}</p>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Today&apos;s Status</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFormData(p => ({ ...p, active: !p.active }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.active ? 'bg-green-500' : 'bg-white/10'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.active ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Hub Basic Details */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={16} className="text-brand-light" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white/70">Hub Details</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Hub Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm mt-1 focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Address</label>
            <textarea 
              rows={2}
              value={formData.address}
              onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm mt-1 focus:outline-none focus:border-brand/50 transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* Operating Hours */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={16} className="text-brand-light" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white/70">Operating Hours</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Opens at</label>
            <input 
              type="time" 
              value={formData.open_time}
              onChange={e => setFormData(p => ({ ...p, open_time: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm mt-1 focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Closes at</label>
            <input 
              type="time" 
              value={formData.close_time}
              onChange={e => setFormData(p => ({ ...p, close_time: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm mt-1 focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Active Days */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} className="text-brand-light" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white/70">Weekly Schedule</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => {
            const isActive = formData.active_days.includes(day.id)
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                className={`flex-1 min-w-[60px] py-3 rounded-xl border text-xs font-black transition-all ${
                  isActive 
                    ? 'bg-brand/20 border-brand/40 text-brand-light' 
                    : 'bg-white/5 border-white/10 text-white/30'
                }`}
              >
                {day.label}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-white/30 text-center font-bold italic">Customers cannot book slots on unselected days</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-xs text-red-400 font-bold">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <p className="text-xs text-green-400 font-bold">Hub profile updated successfully!</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand text-white font-black text-sm uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-brand/20 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
      >
        <Save size={18} />
        {loading ? 'Saving Changes...' : 'Save Hub Profile'}
      </button>
    </form>
  )
}
