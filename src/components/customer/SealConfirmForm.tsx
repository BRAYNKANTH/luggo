'use client'

import { useState } from 'react'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { confirmSeal, disputeSeal } from '@/lib/auth/actions'

interface SealConfirmFormProps {
  bookingId: string
}

export function SealConfirmForm({ bookingId }: SealConfirmFormProps) {
  const [mode, setMode] = useState<'idle' | 'dispute'>('idle')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    await confirmSeal(bookingId)
    // confirmSeal redirects on success — no need to setLoading(false)
  }

  async function handleDispute() {
    setError(null)
    if (!reason.trim()) {
      setError('Please describe what looks wrong.')
      return
    }
    setLoading(true)
    const result = await disputeSeal(bookingId, reason)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // disputeSeal redirects on success
  }

  if (mode === 'dispute') {
    return (
      <div className="space-y-4">
        {/* Dispute header */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
          <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-ocean-900 text-sm">Report a problem</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Describe what looks wrong. Our support team will review immediately.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ocean-800 mb-1.5">
            What&apos;s the problem?
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. Sticker numbers don't match what I was told, bag looks damaged, wrong bags in photo…"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-ocean-900
                       placeholder:text-gray-400 resize-none
                       focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        {error && (
          <p className="text-sm text-brand-danger font-medium">{error}</p>
        )}

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => { setMode('idle'); setError(null) }}
            disabled={loading}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            variant="danger"
            onClick={handleDispute}
            loading={loading}
            className="flex-[2]"
          >
            Submit dispute
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Confirm button */}
      <Button
        fullWidth
        size="lg"
        onClick={handleConfirm}
        loading={loading}
        className="bg-brand-success hover:bg-green-600"
      >
        <CheckCircle size={18} />
        Yes, bags are properly sealed
      </Button>

      {/* Dispute link */}
      <button
        type="button"
        onClick={() => setMode('dispute')}
        disabled={loading}
        className="w-full text-center text-sm text-gray-500 hover:text-brand-danger
                   transition-colors flex items-center justify-center gap-1 py-1"
      >
        <AlertTriangle size={13} />
        Something looks wrong
      </button>
    </div>
  )
}
