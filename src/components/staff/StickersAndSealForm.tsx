'use client'

import { useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { confirmStickersApplied } from '@/lib/staff/actions'
import { type BagType } from '@/types/database'
import { BAG_LABELS } from '@/lib/utils/pricing'
import { Tag, Camera, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

// Dynamically import scanner to avoid SSR errors
const SealScanner = dynamic(
  () => import('./SealScanner').then((m) => m.SealScanner),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" className="text-brand-accent" />
        <p className="text-white/70 text-sm">Loading barcode scanner…</p>
      </div>
    )
  }
)

interface Bag {
  id: string
  bag_type: BagType
  sticker_number: string | null
}

interface Props {
  bookingId: string
  bags: Bag[]
  hubAlias: string
}

export function StickersAndSealForm({ bookingId, bags, hubAlias }: Props) {
  const [isPending, startTransition] = useTransition()
  const [seals, setSeals] = useState<Record<string, string>>({})
  const [activeScannerBagId, setActiveScannerBagId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSealChange(bagId: string, value: string) {
    setSeals((prev) => ({ ...prev, [bagId]: value.toUpperCase() }))
  }

  function handleScanSuccess(text: string) {
    if (activeScannerBagId) {
      handleSealChange(activeScannerBagId, text)
      setActiveScannerBagId(null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Check if we want to enforce seal numbers
    const missingSeals = bags.filter((b) => !seals[b.id]?.trim())
    if (missingSeals.length > 0) {
      setError(`Please scan or enter seal numbers for all ${bags.length} bags to secure the customer's luggage.`)
      return
    }

    startTransition(async () => {
      try {
        await confirmStickersApplied(bookingId, seals)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred during submission.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Dynamic scan modal overlay */}
      {activeScannerBagId && (
        <SealScanner
          onScan={handleScanSuccess}
          onClose={() => setActiveScannerBagId(null)}
        />
      )}

      {/* Bag list with inputs */}
      <div className="space-y-3">
        {bags.map((bag, i) => {
          const stickerCode = bag.sticker_number ? `${hubAlias}-${bag.sticker_number}` : '—'
          const sealVal = seals[bag.id] ?? ''

          return (
            <div key={bag.id} className="bg-white/10 rounded-2xl p-4 space-y-3 border border-white/5">
              {/* Bag meta */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 text-xs font-bold font-mono">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {BAG_LABELS[bag.bag_type]}
                    </p>
                    <p className="text-[10px] text-white/40">Apply sticker & unique zipper seal</p>
                  </div>
                </div>

                {bag.sticker_number ? (
                  <div className="flex items-center gap-1.5 bg-brand-accent/10 px-2.5 py-1 rounded-lg shrink-0">
                    <Tag size={12} className="text-brand-accent" />
                    <span className="font-mono font-black text-brand-accent text-sm tracking-wider">
                      {stickerCode}
                    </span>
                  </div>
                ) : (
                  <span className="text-red-300 text-xs font-semibold shrink-0">No sticker assigned</span>
                )}
              </div>

              {/* Seal input & scan */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    value={sealVal}
                    onChange={(e) => handleSealChange(bag.id, e.target.value)}
                    placeholder="Physical seal serial number…"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl
                               text-white text-xs font-mono placeholder:text-white/20
                               focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                  />
                  {sealVal && (
                    <span className="absolute right-3 top-3.5 text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                      ✓ Scanned
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveScannerBagId(bag.id)}
                  className="px-3 rounded-xl bg-brand-accent text-brand-dark hover:bg-brand-accent/90 transition-colors flex items-center justify-center shrink-0"
                  title="Scan seal barcode"
                >
                  <Camera size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Checklist instructions */}
      <div className="bg-white/5 rounded-2xl p-4 space-y-2 text-xs text-white/60">
        <p className="font-bold text-white/80 uppercase tracking-widest text-[10px] mb-2">Checklist before proceeding</p>
        {[
          'Pre-assigned sticker is firmly pasted on each bag.',
          'Unique physical security seal is locked on zippers.',
          'Barcode / serial number on seal matches the values entered above.',
        ].map((item) => (
          <div key={item} className="flex items-start gap-2">
            <CheckCircle size={13} className="text-brand-accent shrink-0 mt-0.5" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 bg-red-500/20 border border-red-400/30 rounded-2xl px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-ocean-900 border-t border-white/10 px-4 py-4 pb-safe z-40">
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isPending}
          disabled={bags.some((b) => !b.sticker_number)}
        >
          ✓ Confirm seals & proceed to photo
        </Button>
      </div>
    </form>
  )
}
