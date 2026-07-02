'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Shield, AlertCircle, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { SealScanner } from '@/components/staff/SealScanner'
import { registerBags } from '@/lib/staff/actions'
import { type BagType } from '@/types/database'
import { BAG_LABELS } from '@/lib/utils/pricing'

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
  slotNumber: number
}

interface BagInput {
  id: string
  bag_type: BagType
  seal_number: string
  seal_status: 'sealed' | 'seal_not_applicable'
  notes: string
}

export function BagRegistrationForm({ bookingId, initialBags, slotNumber }: BagRegistrationFormProps) {
  const router = useRouter()
  const [bags, setBags] = useState<BagInput[]>(() => {
    if (initialBags && initialBags.length > 0) {
      return initialBags.map((b) => ({
        id: b.id,
        bag_type: b.bag_type,
        seal_number: b.seal_number || '',
        seal_status: b.seal_status as 'sealed' | 'seal_not_applicable',
        notes: b.notes || ''
      }))
    }
    return []
  })

  const [activeScan, setActiveScan] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function updateBagField(index: number, field: keyof BagInput, value: string) {
    const updated = [...bags]
    updated[index] = { ...updated[index], [field]: value } as BagInput
    setBags(updated)
  }

  function handleScanSuccess(text: string) {
    if (activeScan !== null) {
      updateBagField(activeScan, 'seal_number', text.toUpperCase())
      
      // Auto advance: find next empty seal field and focus it, or close scanner
      let nextIndex = -1
      for (let i = activeScan + 1; i < bags.length; i++) {
        if (bags[i].seal_status === 'sealed' && !bags[i].seal_number.trim()) {
          nextIndex = i
          break
        }
      }

      if (nextIndex !== -1) {
        setActiveScan(nextIndex)
      } else {
        setActiveScan(null)
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const seals = bags.map((b) => b.seal_number.trim())

    // 1. Sealed bags must have seal number
    for (let i = 0; i < bags.length; i++) {
      const bag = bags[i]
      if (bag.seal_status === 'sealed' && !bag.seal_number.trim()) {
        setError(`Bag #${i + 1} is marked as sealed but has no Seal Number assigned.`)
        setLoading(false)
        return
      }
    }

    // 2. Sealed numbers must be unique
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
    } catch {
      setError('A system error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Slot Banner */}
      <div className="bg-amber-500/10 border border-amber-400/20 rounded-3xl p-5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-ocean-900 shrink-0 shadow-md">
            <MapPin size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Allocated Room Location</p>
            <p className="text-xl font-extrabold text-white tracking-wide">Storage Slot #{slotNumber}</p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full animate-pulse border border-amber-400/20">
          Reserved Slot
        </span>
      </div>

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
              <span className="text-xs font-black uppercase tracking-wider text-brand-light">
                Bag #{index + 1} ({BAG_LABELS[bag.bag_type]})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seal status check */}
              <div className="flex items-center gap-3 bg-white/5 p-3.5 rounded-xl border border-white/5 h-[50px] mt-1">
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
                      onClick={() => setActiveScan(index)}
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

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <span className="flex items-center gap-1.5 justify-center">
              <Spinner size="sm" />
              Registering Seals & Storing…
            </span>
          ) : (
            <span className="flex items-center gap-1.5 justify-center">
              <Shield size={18} />
              Confirm Storage Location #{slotNumber}
            </span>
          )}
        </Button>
      </div>

      {activeScan !== null && (
        <SealScanner
          onScan={handleScanSuccess}
          onClose={() => setActiveScan(null)}
        />
      )}
    </form>
  )
}
