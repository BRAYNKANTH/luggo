'use client'

import { useState } from 'react'
import { ShieldCheck, AlertTriangle, RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { verifyIdentity, rejectBookingIdentity } from '@/lib/staff/actions'

interface StaffVerificationFormProps {
  bookingId: string
}

export function StaffVerificationForm({ bookingId }: StaffVerificationFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Checklist items
  const [checklist, setChecklist] = useState({
    qrScanned: true, // starts checked as they are viewing the page
    phoneConfirmed: false,
    idTypeMatched: false,
    idNumberMatched: false,
    idNameMatched: false,
    idPhotoMatched: false,
    bagCountMatched: false,
    bagConditionChecked: false,
    prohibitedConfirmed: false,
  })

  // Rejection/escalation state
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const handleCheckboxChange = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // All checklist items must be ticked to approve
  const allTicked = Object.values(checklist).every(v => v === true)

  async function handleApprove() {
    if (!allTicked) return
    setError(null)
    setLoading(true)
    try {
      const result = await verifyIdentity(bookingId, {
        verifiedPhone: checklist.phoneConfirmed,
        idTypeMatched: checklist.idTypeMatched,
        idNumberMatched: checklist.idNumberMatched,
        idNameMatched: checklist.idNameMatched,
        idPhotoMatchedPerson: checklist.idPhotoMatched,
        bagCountMatched: checklist.bagCountMatched,
        bagConditionChecked: checklist.bagConditionChecked,
        prohibitedItemsConfirmed: checklist.prohibitedConfirmed,
        acceptedAt: new Date().toISOString(),
      })

      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess('Identity verified successfully!')
        window.location.reload()
      }
    } catch {
      setError('An error occurred during verification.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      setError('Please specify a rejection reason.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const result = await rejectBookingIdentity(bookingId, rejectionReason)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess('Rejection/Escalation logged successfully.')
        setShowRejectForm(false)
        setRejectionReason('')
        window.location.reload()
      }
    } catch {
      setError('An error occurred while logging the rejection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="text-brand-light shrink-0" size={20} />
        <h3 className="text-sm font-black uppercase tracking-wider text-white">Staff drop-off verification</h3>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold p-4 rounded-xl flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-300 text-xs font-semibold p-4 rounded-xl flex items-start gap-2">
          <ShieldCheck size={16} className="shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'qrScanned' as const, label: 'Booking QR/code scanned & matched' },
          { key: 'phoneConfirmed' as const, label: 'Phone SMS OTP verified or phone confirmed' },
          { key: 'idTypeMatched' as const, label: 'Physical ID type matches booking ID type' },
          { key: 'idNumberMatched' as const, label: 'Physical ID number matches booking ID number' },
          { key: 'idNameMatched' as const, label: 'ID name matches/reasonably matches full name' },
          { key: 'idPhotoMatched' as const, label: 'ID photo matches the person dropping off' },
          { key: 'bagCountMatched' as const, label: 'Bag count matches booking quantity' },
          { key: 'bagConditionChecked' as const, label: 'Bag exterior condition checked (no leaks/damage)' },
          { key: 'prohibitedConfirmed' as const, label: 'Prohibited-items declaration confirmed verbally' },
        ].map(item => (
          <label key={item.key} className="flex items-start gap-3 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={checklist[item.key]}
              onChange={() => handleCheckboxChange(item.key)}
              disabled={item.key === 'qrScanned'} // always true
              className="mt-0.5 w-4 h-4 rounded text-brand border-white/20 bg-white/10 checked:bg-brand focus:ring-0 focus:ring-offset-0 shrink-0"
            />
            <span className={`${checklist[item.key] ? 'text-white font-bold' : 'text-white/50'}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>

      {/* Warning if ID mismatched / suspicious */}
      <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleApprove}
          disabled={!allTicked || loading || showRejectForm}
          className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-white/40"
        >
          {loading && !showRejectForm ? <RefreshCw className="animate-spin mr-2" size={16} /> : <ShieldCheck className="mr-2" size={16} />}
          Approve Match & Verify Identity
        </Button>

        <button
          type="button"
          onClick={() => setShowRejectForm(!showRejectForm)}
          className="px-4 py-2.5 rounded-xl border border-red-500/30 hover:border-red-500/60 bg-red-500/10 hover:bg-red-500/20 text-red-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
        >
          <XCircle size={15} />
          Reject / Escalate
        </button>
      </div>

      {/* Reject / Escalate Form */}
      {showRejectForm && (
        <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-4 space-y-3">
          <label className="block text-[10px] font-black text-red-300 uppercase tracking-widest pl-1">
            Specify Rejection / Escalation Reason
          </label>
          <textarea
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="e.g. ID number mismatch, suspicious items, or guest refused declaration..."
            className="w-full h-20 bg-black/30 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-red-200/30 focus:outline-none focus:border-red-500"
          />
          <Button
            onClick={handleReject}
            loading={loading}
            className="w-full bg-red-600 hover:bg-red-500"
          >
            Submit Rejection & Notify Supervisor
          </Button>
        </div>
      )}
    </div>
  )
}
