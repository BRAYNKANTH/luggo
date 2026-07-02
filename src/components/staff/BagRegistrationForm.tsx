'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Plus, Trash2, Shield, Info, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { SealScanner } from '@/components/staff/SealScanner'
import { registerBags } from '@/lib/staff/actions'
import { type BagType } from '@/types/database'

interface BagRegistrationFormProps {
  bookingId: string
  initialBags: Array<{
    id: string
    bag_type: BagType
    seal_number: string | null
    bag_tag_id: string | null
    seal_status: 'sealed' | 'seal_not_applicable'
    notes: string | null
  }>
}

interface BagInput {
  id: string
  tag_code: string
  bag_type: BagType
  seal_number: string
  seal_status: 'sealed' | 'seal_not_applicable'
  notes: string
  isNew?: boolean
}

const BAG_OPTIONS: { value: BagType; label: string }[] = [
  { value: 'small', label: 'Laptop bag / Small Backpack' },
  { value: 'regular', label: 'Standard Backpack / Suitcase' },
  { value: 'large', label: 'Large Suitcase / Duffel' }
]

export function BagRegistrationForm({ bookingId, initialBags }: BagRegistrationFormProps) {
  const router = useRouter()
  const [bags, setBags] = useState<BagInput[]>(() => {
    if (initialBags && initialBags.length > 0) {
      return initialBags.map((b) => ({
        id: b.id,
        tag_code: '', // Start fresh for tag scans
        bag_type: b.bag_type,
        seal_number: b.seal_number || '',
        seal_status: b.seal_status,
        notes: b.notes || ''
      }))
    }
    return [
      {
        id: `new-${Date.now()}`,
        tag_code: '',
        bag_type: 'regular',
        seal_number: '',
        seal_status: 'sealed',
        notes: '',
        isNew: true
      }
    ]
  })

  const [activeScan, setActiveScan] = useState<{ index: number; field: 'tag_code' | 'seal_number' } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function addBag() {
    setBags([
      ...bags,
      {
        id: `new-${Date.now()}`,
        tag_code: '',
        bag_type: 'regular',
        seal_number: '',
        seal_status: 'sealed',
        notes: '',
        isNew: true
      }
    ])
  }

  function removeBag(index: number) {
    setBags(bags.filter((_, idx) => idx !== index))
  }

  function updateBagField(index: number, field: keyof BagInput, value: any) {
    const updated = [...bags]
    updated[index] = { ...updated[index], [field]: value }
    setBags(updated)
  }

  function handleScanSuccess(text: string) {
    if (activeScan) {
      updateBagField(activeScan.index, activeScan.field, text)
      setActiveScan(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validation
    const tags = bags.map((b) => b.tag_code.trim())
    const seals = bags.map((b) => b.seal_number.trim())

    // 1. Tag must not be empty
    if (tags.some((t) => !t)) {
      setError('Every bag must be assigned a Reusable Bag Tag.')
      setLoading(false)
      return
    }

    // 2. Tag must be unique
    const uniqueTags = new Set(tags)
    if (uniqueTags.size !== tags.length) {
      setError('Duplicate Bag Tags are not allowed in the same booking.')
      setLoading(false)
      return
    }

    // 3. Sealed bags must have seal number
    for (let i = 0; i < bags.length; i++) {
      const bag = bags[i]
      if (bag.seal_status === 'sealed' && !bag.seal_number.trim()) {
        setError(`Bag #${i + 1} is marked as sealed but has no Seal Number assigned.`)
        setLoading(false)
        return
      }
    }

    // 4. Sealed numbers must be unique
    const activeSeals = seals.filter((s) => s)
    const uniqueSeals = new Set(activeSeals)
    if (uniqueSeals.size !== activeSeals.length) {
      setError('Duplicate Seal Numbers are not allowed in the same booking.')
      setLoading(false)
      return
    }

    try {
      const result = await registerBags(bookingId, bags)
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/staff/dashboard?success=bags_registered')
      }
    } catch (err) {
      setError('A system error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 text-red-200">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {bags.map((bag, index) => (
          <div key={bag.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-brand-light">Bag #{index + 1}</span>
              {bags.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBag(index)}
                  className="text-white/40 hover:text-red-400 transition-colors flex items-center gap-1 text-xs"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bag Tag Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Reusable Bag Tag QR</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={bag.tag_code}
                    onChange={(e) => updateBagField(index, 'tag_code', e.target.value.toUpperCase())}
                    placeholder="Scan or enter Tag Reference (e.g., CMB-A-101)..."
                    className="flex-1 px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-brand-light focus:border-transparent font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveScan({ index, field: 'tag_code' })}
                    className="px-3.5 rounded-xl bg-brand-light/20 hover:bg-brand-light/30 text-brand-light border border-brand-light/30 flex items-center justify-center transition-colors"
                  >
                    <Camera size={18} />
                  </button>
                </div>
              </div>

              {/* Bag Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Bag Size Category</label>
                <select
                  value={bag.bag_type}
                  onChange={(e) => updateBagField(index, 'bag_type', e.target.value as BagType)}
                  className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-light focus:border-transparent"
                >
                  {BAG_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-ocean-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Seal status check */}
              <div className="flex items-center gap-3 bg-white/5 p-3.5 rounded-xl border border-white/5 h-[50px] mt-4">
                <input
                  type="checkbox"
                  id={`unsealable-${bag.id}`}
                  checked={bag.seal_status === 'seal_not_applicable'}
                  onChange={(e) => {
                    const checked = e.target.checked
                    updateBagField(index, 'seal_status', checked ? 'seal_not_applicable' : 'sealed')
                    if (checked) {
                      updateBagField(index, 'seal_number', '')
                    }
                  }}
                  className="w-4 h-4 rounded bg-white/15 border-white/20 text-brand-light focus:ring-brand-light"
                />
                <label htmlFor={`unsealable-${bag.id}`} className="text-xs font-bold text-white/80 cursor-pointer">
                  Seal cannot be applied (backpack/zipper-less)
                </label>
              </div>

              {/* Seal Number */}
              {bag.seal_status === 'sealed' ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Physical Security Seal #</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required={bag.seal_status === 'sealed'}
                      value={bag.seal_number}
                      onChange={(e) => updateBagField(index, 'seal_number', e.target.value.toUpperCase())}
                      placeholder="Scan or enter seal serial code..."
                      className="flex-1 px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-brand-light focus:border-transparent font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveScan({ index, field: 'seal_number' })}
                      className="px-3.5 rounded-xl bg-brand-light/20 hover:bg-brand-light/30 text-brand-light border border-brand-light/30 flex items-center justify-center transition-colors"
                    >
                      <Camera size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Unsealable Reason / Notes</label>
                  <input
                    type="text"
                    required={bag.seal_status === 'seal_not_applicable'}
                    value={bag.notes}
                    onChange={(e) => updateBagField(index, 'notes', e.target.value)}
                    placeholder="Why is it unsealable? (e.g. Backpack, side zip only)..."
                    className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-brand-light focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={addBag}
          className="px-5 py-3 rounded-xl border border-white/20 hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5 text-xs text-white/80"
        >
          <Plus size={16} />
          Add Extra Bag
        </button>

        <div className="flex-1 flex justify-end gap-3">
          <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <span className="flex items-center gap-1.5 justify-center">
                <Spinner size="sm" />
                Registering Bags…
              </span>
            ) : (
              <span className="flex items-center gap-1.5 justify-center">
                <Shield size={18} />
                Confirm & Move to active_storage
              </span>
            )}
          </Button>
        </div>
      </div>

      {activeScan && (
        <SealScanner
          onScan={handleScanSuccess}
          onClose={() => setActiveScan(null)}
        />
      )}
    </form>
  )
}
