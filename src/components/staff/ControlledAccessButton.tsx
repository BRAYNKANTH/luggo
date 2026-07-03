'use client'

import { useState } from 'react'
import { Key, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { recordBagAccessEventAction } from '@/lib/staff/actions'
import { BAG_LABELS } from '@/lib/utils/pricing'
import { type BagType } from '@/types/database'

interface Bag {
  id: string
  bag_type: BagType
  seal_number: string | null
  seal_status: string
}

interface ControlledAccessButtonProps {
  bookingId: string
  bags: Bag[]
}

export function ControlledAccessButton({ bookingId, bags }: ControlledAccessButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form states
  const [selectedBagId, setSelectedBagId] = useState('')
  const [newSealNumber, setNewSealNumber] = useState('')
  const [accessNotes, setAccessNotes] = useState('')

  const activeBags = bags.filter(b => b.seal_status === 'sealed')
  const currentBag = activeBags.find(b => b.id === selectedBagId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBagId || !newSealNumber.trim()) {
      setError('Please select a bag and specify the new seal number.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const res = await recordBagAccessEventAction(
        bookingId,
        selectedBagId,
        newSealNumber.toUpperCase().trim(),
        accessNotes.trim()
      )

      if (res.error) {
        setError(res.error)
      } else {
        setSuccess('Controlled access event logged. New seal is active.')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch {
      setError('Failed to record controlled access event.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setError(null)
          setSuccess(null)
          setSelectedBagId(activeBags[0]?.id || '')
          setNewSealNumber('')
          setAccessNotes('')
        }}
        disabled={activeBags.length === 0}
        className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
      >
        <Key size={13} className="text-brand-light" />
        🔑 Open Bag for Access (Controlled Event)
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-ocean-900 border border-white/15 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Key size={15} className="text-brand-light" /> Controlled Bag Access Event
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-white/50 hover:text-white"
              >
                Close
              </button>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 p-3.5 rounded-xl flex items-start gap-2.5 text-red-200 text-xs">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <p className="font-bold">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-500/25 border border-green-500/30 p-3.5 rounded-xl flex items-start gap-2.5 text-green-200 text-xs">
                <CheckCircle size={15} className="shrink-0 mt-0.5" />
                <p className="font-bold">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <p className="text-white/60 leading-normal">
                Use this form when a customer needs to retrieve an item (e.g. passport) from their stored luggage. You must break the existing seal, permit access, apply a **new seal**, and record the new number.
              </p>

              <div className="space-y-3">
                {/* Select Bag */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-white/50 uppercase tracking-widest font-black pl-1">
                    Select Bag to Open
                  </label>
                  <select
                    value={selectedBagId}
                    onChange={e => setSelectedBagId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold"
                  >
                    {activeBags.map(b => (
                      <option key={b.id} value={b.id} className="bg-ocean-900">
                        {BAG_LABELS[b.bag_type]} (Current Seal: {b.seal_number})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show Current Seal */}
                {currentBag && (
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex justify-between items-center text-[11px]">
                    <span className="text-white/40">Current active seal:</span>
                    <strong className="text-brand-accent font-mono">{currentBag.seal_number}</strong>
                  </div>
                )}

                {/* Input New Seal */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-white/50 uppercase tracking-widest font-black pl-1">
                    New Security Seal Serial #
                  </label>
                  <input
                    type="text"
                    required
                    value={newSealNumber}
                    onChange={e => setNewSealNumber(e.target.value.toUpperCase())}
                    placeholder="Enter serial number of the new zip-lock seal..."
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-brand-light"
                  />
                </div>

                {/* Access Notes */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-white/50 uppercase tracking-widest font-black pl-1">
                    Reason for Access
                  </label>
                  <input
                    type="text"
                    value={accessNotes}
                    onChange={e => setAccessNotes(e.target.value)}
                    placeholder="e.g. Customer retrieved passport, left luggage..."
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand hover:bg-brand/90 text-white font-bold"
                >
                  {loading ? <Spinner size="sm" className="mr-2" /> : null}
                  Record Reseal & Update Seal Numbers
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
