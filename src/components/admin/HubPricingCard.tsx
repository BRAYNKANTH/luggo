'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateHubBagRates } from '@/lib/admin/actions'
import { BAG_LABELS, type BagRates } from '@/lib/utils/pricing'
import { type BagType } from '@/types/database'
import { Save, CheckCircle2, AlertCircle } from 'lucide-react'

interface HubPricingCardProps {
  hubId: string
  hubName: string
  hubAlias: string
  hubActive: boolean
  rates: BagRates
}

const BAG_TYPES: BagType[] = ['small', 'regular', 'large']

export function HubPricingCard({ hubId, hubName, hubAlias, hubActive, rates }: HubPricingCardProps) {
  const router = useRouter()
  const [form, setForm] = useState<BagRates>(rates)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const isDirty = BAG_TYPES.some(
    (type) => form[type].hourlyRate !== rates[type].hourlyRate || form[type].dailyCap !== rates[type].dailyCap
  )

  function updateField(type: BagType, field: 'hourlyRate' | 'dailyCap', value: string) {
    setSaved(false)
    const num = value === '' ? 0 : Number(value)
    setForm((prev) => ({ ...prev, [type]: { ...prev[type], [field]: num } }))
  }

  async function handleSave() {
    setError(null)
    setLoading(true)
    try {
      for (const type of BAG_TYPES) {
        if (form[type].hourlyRate <= 0) {
          setError(`${BAG_LABELS[type]} hourly rate must be greater than 0.`)
          setLoading(false)
          return
        }
        if (form[type].dailyCap <= 0) {
          setError(`${BAG_LABELS[type]} daily cap must be greater than 0.`)
          setLoading(false)
          return
        }
      }

      const res = await updateHubBagRates(hubId, form)
      if (res.error) {
        setError(res.error)
      } else {
        setSaved(true)
        router.refresh()
      }
    } catch {
      setError('Failed to save pricing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100/80 p-6 shadow-premium">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-bold text-ocean-900 truncate">{hubName}</h2>
          <span className="text-xs font-mono bg-gray-150 text-gray-500 px-2 py-0.5 rounded-lg shrink-0">{hubAlias}</span>
          {!hubActive && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg shrink-0">
              Inactive
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {BAG_TYPES.map((type) => (
          <div key={type} className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
            <p className="font-bold text-ocean-900 text-sm mb-3">{BAG_LABELS[type]}</p>

            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Hourly Rate (LKR)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={form[type].hourlyRate}
              onChange={(e) => updateField(type, 'hourlyRate', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-ocean-900 focus:outline-none focus:ring-2 focus:ring-brand/30 mb-3"
            />

            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Daily Cap (LKR)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={form[type].dailyCap}
              onChange={(e) => updateField(type, 'dailyCap', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-ocean-900 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-4 text-red-600 text-xs font-semibold">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={handleSave}
          disabled={loading || !isDirty}
          className="flex items-center gap-2 bg-brand text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-brand/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={14} />
          {loading ? 'Saving…' : 'Save Pricing'}
        </button>
        {saved && !isDirty && (
          <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
            <CheckCircle2 size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  )
}
