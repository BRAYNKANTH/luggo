'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { confirmStickers } from '@/lib/staff/actions'
import { BAG_LABELS } from '@/lib/utils/pricing'
import { type BagType } from '@/types/database'

type Bag = {
  id: string
  bag_type: BagType
  sticker_number: string | null
}

interface StickerEntryProps {
  bookingId: string
  bags: Bag[]
  hubAlias: string
  nextStickerHint?: number
}

export function StickerEntry({ bookingId, bags, hubAlias, nextStickerHint }: StickerEntryProps) {
  const router = useRouter()
  const unassigned = bags.filter((b) => !b.sticker_number)

  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(
      unassigned.map((bag, i) => [
        bag.id,
        nextStickerHint ? String(nextStickerHint + i).padStart(3, '0') : '',
      ])
    )
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const allFilled = unassigned.every((b) => values[b.id]?.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)


    const result = await confirmStickers(bookingId)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setDone(true)
      setTimeout(() => router.push(`/staff/booking/${bookingId}/seal`), 1200)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="h-14 w-14 rounded-full bg-brand-success/20 flex items-center justify-center">
          <CheckCircle size={28} className="text-brand-success" />
        </div>
        <p className="font-bold text-white">Stickers assigned!</p>
        <p className="text-white/50 text-sm">Proceeding to seal step…</p>
      </div>
    )
  }

  if (unassigned.length === 0) {
    return (
      <div className="card bg-white/10 border-white/10 text-center py-6">
        <CheckCircle size={24} className="text-brand-success mx-auto mb-2" />
        <p className="text-white text-sm font-medium">All bags already have stickers assigned.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-white/60 text-sm">
        Enter the sticker number for each bag. Prefix <span className="font-bold text-brand-accent">{hubAlias}-</span> is added automatically.
      </p>

      {unassigned.map((bag) => (
        <div key={bag.id} className="bg-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={15} className="text-brand-accent shrink-0" />
            <span className="text-white font-semibold text-sm">{BAG_LABELS[bag.bag_type]}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Fixed prefix */}
            <span className="text-brand-accent font-bold font-mono text-sm px-3 py-2.5 bg-white/10 rounded-xl shrink-0">
              {hubAlias}-
            </span>
            {/* Number input */}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{1,6}"
              placeholder="001"
              value={values[bag.id] ?? ''}
              onChange={(e) =>
                setValues((v) => ({ ...v, [bag.id]: e.target.value.replace(/\D/g, '') }))
              }
              maxLength={6}
              required
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl bg-white/10 border font-mono text-sm',
                'text-white placeholder:text-white/30',
                'focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent',
                values[bag.id] ? 'border-brand' : 'border-white/20'
              )}
            />
          </div>
          {values[bag.id] && (
            <p className="text-xs text-white/40 mt-1.5 ml-1 font-mono">
              Full label: {hubAlias}-{values[bag.id].padStart(3, '0')}
            </p>
          )}
        </div>
      ))}

      {error && (
        <div className="flex items-start gap-2 bg-red-500/20 border border-red-400/30 rounded-2xl px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" fullWidth size="lg" loading={loading} disabled={!allFilled}>
        Confirm stickers &amp; proceed to seal
      </Button>
    </form>
  )
}
