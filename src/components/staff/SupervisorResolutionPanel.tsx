'use client'

import { useState, useTransition } from 'react'
import { resolveIncidentReport, waiveAndCompletePickup, completePickup } from '@/lib/staff/actions'
import { Button } from '@/components/ui/Button'
import { Shield, Sparkles, CheckSquare, AlertOctagon } from 'lucide-react'

interface ExceptionCase {
  id: string
  exception_type: string
  description: string
  status: string
}

interface Props {
  bookingId: string
  exceptions: ExceptionCase[]
  supervisorUserId: string
}

export function SupervisorResolutionPanel({ bookingId, exceptions, supervisorUserId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Input states
  const [resolutionNote, setResolutionNote] = useState('')
  const [selectedExId, setSelectedExId] = useState(exceptions[0]?.id || '')
  
  const [waiverReason, setWaiverReason] = useState('')
  const [releaseReason, setReleaseReason] = useState('')

  function handleResolveCase() {
    setError(null)
    setSuccessMsg(null)

    if (!resolutionNote.trim()) {
      return setError('Please provide resolution details/notes.')
    }
    if (!selectedExId) {
      return setError('Please select an exception case to resolve.')
    }

    startTransition(async () => {
      const res = await resolveIncidentReport(selectedExId, resolutionNote)
      if (res.error) {
        setError(res.error)
        return
      }

      setSuccessMsg('Case resolved successfully!')
      setResolutionNote('')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    })
  }

  function handleWaiveFee() {
    setError(null)
    setSuccessMsg(null)

    if (!waiverReason.trim()) {
      return setError('Please specify the reason for waiving late fees.')
    }

    startTransition(async () => {
      const res = await waiveAndCompletePickup(bookingId)
      if (res.error) {
        setError(res.error)
        return
      }

      setSuccessMsg('Late fees waived! Booking ready for release.')
      setWaiverReason('')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    })
  }

  function handleForceRelease() {
    setError(null)
    setSuccessMsg(null)

    if (!releaseReason.trim()) {
      return setError('Please specify the security override justification.')
    }

    startTransition(async () => {
      const res = await completePickup(bookingId)
      if (res.error) {
        setError(res.error)
        return
      }

      setSuccessMsg('Manual override completed! Booking released.')
      setReleaseReason('')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    })
  }

  return (
    <div className="bg-brand/10 border border-brand/20 rounded-3xl p-5 space-y-6">
      <div className="flex items-center gap-2 border-b border-brand/10 pb-2 text-brand-light">
        <Shield size={18} />
        <h3 className="text-sm font-bold uppercase tracking-wider">Supervisor Action Panel</h3>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 p-4 rounded-2xl text-xs font-semibold text-center">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-400 p-4 rounded-2xl text-xs font-semibold text-center">
          {error}
        </div>
      )}

      <div className="space-y-6 divide-y divide-white/5">
        {/* 1. Resolve Exceptions */}
        {exceptions.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">Resolve Logged Exception</h4>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] text-white/40 font-semibold mb-1">Select Active Exception</label>
                <select
                  value={selectedExId}
                  onChange={(e) => setSelectedExId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-white text-xs"
                >
                  {exceptions.map(ex => (
                    <option key={ex.id} value={ex.id} className="bg-ocean-900 text-white">
                      {ex.exception_type.replace(/_/g, ' ')}: {ex.description.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-white/40 font-semibold mb-1">Resolution Detail</label>
                <input
                  type="text"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Verified bag contents with customer, seal replaced..."
                  className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-white text-xs"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleResolveCase}
                loading={isPending}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                <CheckSquare size={13} className="mr-1.5" /> Resolve Exception Case
              </Button>
            </div>
          </div>
        )}

        {/* 2. Waive Late Fee */}
        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">Late Fee Waiver Override</h4>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[10px] text-white/40 font-semibold mb-1">Reason / Justification</label>
              <input
                type="text"
                value={waiverReason}
                onChange={(e) => setWaiverReason(e.target.value)}
                placeholder="e.g. Flight delay, verified airline cancellation notice..."
                className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-white text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleWaiveFee}
              loading={isPending}
              className="bg-amber-600 hover:bg-amber-500"
            >
              <Sparkles size={13} className="mr-1.5" /> Approve Waiver & Release
            </Button>
          </div>
        </div>

        {/* 3. Manual Release Override */}
        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">Emergency Manual Release</h4>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[10px] text-white/40 font-semibold mb-1">Override Security Justification</label>
              <input
                type="text"
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                placeholder="e.g. Customer ID missing but verified via OTP SMS & supervisor verbal approval..."
                className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-white text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleForceRelease}
              loading={isPending}
              className="bg-red-600 hover:bg-red-500"
            >
              <AlertOctagon size={13} className="mr-1.5" /> Emergency Bypass Complete Handover
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
