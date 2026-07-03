'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, CreditCard, Clock, RefreshCw, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import {
  processStandardCheckInAction,
  processCashEarlyCheckInAction,
  processOnlineEarlyCheckInAction,
  processShiftBookingCheckInAction,
  processSupervisorOverrideCheckInAction,
  completeOnlineEarlyCheckInAction,
  getSupervisorsAction
} from '@/lib/staff/actions'
import { formatInSLT } from '@/lib/utils/timezone'
import { type BookingStatus, type BagType } from '@/types/database'
import { BAG_RATES } from '@/lib/utils/pricing'

interface StaffCheckInWizardProps {
  booking: {
    id: string
    status: BookingStatus
    start_time: string
    end_time: string
    total_price: number
    walk_in_name: string | null
    walk_in_phone: string | null
    booking_bags: { id: string; bag_type: BagType }[]
  }
  isCashPaymentPending: boolean
}

export function StaffCheckInWizard({ booking, isCashPaymentPending }: StaffCheckInWizardProps) {
  const router = useRouter()
  const supabase = createClient()

  // Calculate early minutes
  const [actualCheckInTime] = useState(() => new Date())
  const bookedStartTime = new Date(booking.start_time)
  const bookedEndTime = new Date(booking.end_time)

  const earlyMinutes = Math.ceil((bookedStartTime.getTime() - actualCheckInTime.getTime()) / (60 * 1000))
  const totalHourlyBagRate = booking.booking_bags.reduce((total, bag) => total + BAG_RATES[bag.bag_type], 0)
  const extraHours = earlyMinutes > 15 ? Math.ceil(earlyMinutes / 60) : 0
  const earlyCheckinFee = extraHours * totalHourlyBagRate

  // Option B shift values
  const originalDurationMs = bookedEndTime.getTime() - bookedStartTime.getTime()
  const shiftedStartTime = actualCheckInTime
  const shiftedEndTime = new Date(actualCheckInTime.getTime() + originalDurationMs)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'initial' | 'waiting_online_payment' | 'supervisor_override'>('initial')
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [paymentPaid, setPaymentPaid] = useState(false)

  // Supervisor override state
  const [supervisors, setSupervisors] = useState<{ id: string; name: string }[]>([])
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('')
  const [overrideReason, setOverrideReason] = useState('Staff-approved exception')

  useEffect(() => {
    if (step === 'supervisor_override') {
      getSupervisorsAction().then(res => {
        if (res.supervisors) setSupervisors(res.supervisors)
      })
    }
  }, [step])

  // Normal check-in handler
  async function handleNormalCheckIn() {
    setLoading(true)
    setError(null)
    const checkInType = earlyMinutes > 0 && earlyMinutes <= 15 ? 'free_buffer' : 'none'
    try {
      const res = await processStandardCheckInAction(booking.id, Math.max(0, earlyMinutes), checkInType)
      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    } catch {
      setError('A system error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Option A: Cash Payment
  async function handleCashCheckIn() {
    if (!window.confirm(`Confirm collection of LKR ${earlyCheckinFee} Cash and complete check-in?`)) return
    setLoading(true)
    setError(null)
    try {
      const res = await processCashEarlyCheckInAction(booking.id, earlyMinutes, extraHours, earlyCheckinFee)
      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    } catch {
      setError('A system error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Option A: Send Online Payment
  async function handleSendPaymentLink() {
    setLoading(true)
    setError(null)
    try {
      const res = await processOnlineEarlyCheckInAction(booking.id, earlyMinutes, extraHours, earlyCheckinFee)
      if (res.error) {
        setError(res.error)
      } else if (res.paymentLink) {
        setPaymentLink(res.paymentLink)
        // Fetch payment record ID
        const { data: p } = await supabase
          .from('payments')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('type', 'early_checkin')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (p) setPaymentId(p.id)
        setStep('waiting_online_payment')
      }
    } catch {
      setError('A system error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Option A Online: Verify payment status
  async function checkOnlinePaymentStatus() {
    if (!paymentId) return
    setLoading(true)
    try {
      const { data: pay } = await supabase
        .from('payments')
        .select('status')
        .eq('id', paymentId)
        .single()
      
      if (pay?.status === 'paid') {
        setPaymentPaid(true)
      } else {
        setError('Payment is still pending. Customer must pay via link.')
      }
    } catch {
      setError('Failed to check payment status.')
    } finally {
      setLoading(false)
    }
  }

  // Option A Online: Complete Check-In
  async function handleCompleteOnlineCheckIn() {
    setLoading(true)
    setError(null)
    try {
      const res = await completeOnlineEarlyCheckInAction(booking.id)
      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    } catch {
      setError('A system error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Option B: Shift Booking
  async function handleShiftCheckIn() {
    const startStr = formatInSLT(shiftedStartTime, { hour: '2-digit', minute: '2-digit', hour12: true })
    const endStr = formatInSLT(shiftedEndTime, { hour: '2-digit', minute: '2-digit', hour12: true })
    if (!window.confirm(`Shift booking earlier? New storage window will be ${startStr} – ${endStr}.`)) return
    setLoading(true)
    setError(null)
    try {
      const res = await processShiftBookingCheckInAction(
        booking.id,
        earlyMinutes,
        actualCheckInTime.toISOString(),
        shiftedStartTime.toISOString(),
        shiftedEndTime.toISOString(),
        booking.start_time,
        booking.end_time
      )
      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    } catch {
      setError('A system error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Supervisor Override Action
  async function handleSupervisorOverride() {
    if (!selectedSupervisorId) {
      setError('Please select a supervisor.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await processSupervisorOverrideCheckInAction(
        booking.id,
        earlyMinutes,
        selectedSupervisorId,
        overrideReason
      )
      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    } catch {
      setError('A system error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render Case 1: Within Booked Drop-Off time ──
  if (earlyMinutes <= 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3 text-emerald-400">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-white">Within booked check-in time</p>
            <p className="text-white/60 text-xs mt-0.5">Customer is within the booked check-in time.</p>
            {isCashPaymentPending && (
              <p className="text-amber-400 text-xs font-bold mt-1">
                💵 Collect LKR {booking.total_price.toLocaleString()} Cash for base booking
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            onClick={handleNormalCheckIn}
            disabled={loading}
            className={`w-full sm:w-auto ${isCashPaymentPending ? 'bg-amber-500 hover:bg-amber-600 text-ocean-900 font-extrabold border-none' : ''}`}
          >
            {loading ? <Spinner size="sm" /> : isCashPaymentPending ? `💵 Collect LKR ${booking.total_price.toLocaleString()} Cash & Check In` : 'Continue Check-In'}
          </Button>
        </div>
      </div>
    )
  }

  // ── Render Case 2: Within 15-minute free buffer ──
  if (earlyMinutes > 0 && earlyMinutes <= 15) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3 text-brand-light">
          <Clock size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-white">Free buffer allowed</p>
            <p className="text-white/60 text-xs mt-0.5">
              Customer is {earlyMinutes} minutes early. Free early check-in is allowed. Original pickup time remains {formatInSLT(bookedEndTime, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}.
            </p>
            {isCashPaymentPending && (
              <p className="text-amber-400 text-xs font-bold mt-1">
                💵 Collect LKR {booking.total_price.toLocaleString()} Cash for base booking
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            onClick={handleNormalCheckIn}
            disabled={loading}
            className={`w-full sm:w-auto ${isCashPaymentPending ? 'bg-amber-500 hover:bg-amber-600 text-ocean-900 font-extrabold border-none' : ''}`}
          >
            {loading ? <Spinner size="sm" /> : isCashPaymentPending ? `💵 Collect LKR ${booking.total_price.toLocaleString()} Cash & Check In` : 'Check In'}
          </Button>
        </div>
      </div>
    )
  }

  // ── Render Case 3: Waiting for online payment screen ──
  if (step === 'waiting_online_payment') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3 text-amber-400">
          <Spinner size="sm" className="shrink-0 mt-0.5 text-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white">Waiting for customer payment</p>
            <p className="text-white/60 text-xs mt-0.5">
              Sent online payment link for early check-in fee of LKR {earlyCheckinFee.toLocaleString()}.
            </p>
            <p className="text-brand-light font-mono text-[10px] truncate mt-1 bg-black/30 p-2 rounded border border-white/5">
              {paymentLink}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl flex items-start gap-2.5 text-red-200 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {paymentPaid ? (
            <Button onClick={handleCompleteOnlineCheckIn} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500">
              {loading ? <Spinner size="sm" /> : 'Complete Check-In'}
            </Button>
          ) : (
            <>
              <Button onClick={checkOnlinePaymentStatus} disabled={loading} variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5 flex items-center justify-center gap-1.5">
                {loading ? <Spinner size="sm" /> : (
                  <>
                    <RefreshCw size={14} />
                    Refresh Payment Status
                  </>
                )}
              </Button>
              <Button onClick={() => setStep('initial')} variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5">
                Back
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Render Case 4: Supervisor Override entry screen ──
  if (step === 'supervisor_override') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3 text-red-400">
          <Shield size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-white">Supervisor Override Check-In</p>
            <p className="text-white/60 text-xs mt-0.5">Require supervisor authorization to waive the early check-in fee.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl flex items-start gap-2.5 text-red-200 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Authorized Supervisor</label>
            <select
              value={selectedSupervisorId}
              onChange={(e) => setSelectedSupervisorId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-light"
            >
              <option value="" className="bg-ocean-900 text-white/40">Select Supervisor...</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id} className="bg-ocean-900 text-white font-bold">{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Waiver Reason</label>
            <select
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-light"
            >
              <option value="VIP customer" className="bg-ocean-900 text-white">VIP customer</option>
              <option value="Operational delay" className="bg-ocean-900 text-white">Operational delay</option>
              <option value="System issue" className="bg-ocean-900 text-white">System issue</option>
              <option value="Staff-approved exception" className="bg-ocean-900 text-white">Staff-approved exception</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSupervisorOverride} disabled={loading || !selectedSupervisorId} className="flex-1 bg-red-600 hover:bg-red-500">
            {loading ? <Spinner size="sm" /> : 'Authorize & Check In'}
          </Button>
          <Button onClick={() => setStep('initial')} variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5">
            Back
          </Button>
        </div>
      </div>
    )
  }

  // ── Render Case 5: Over 15 minutes early decision wizard ──
  return (
    <div className="space-y-4">
      {/* Alert Header */}
      <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl p-5 flex items-start gap-3">
        <AlertCircle size={22} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm text-white">Early drop-off detected</p>
          <p className="text-white/60 text-xs mt-0.5">
            Customer is **{earlyMinutes} minutes early**. Payment or window shifting is required before checking in.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl flex items-start gap-2.5 text-red-200 text-xs font-semibold">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Grid containing Option A and Option B Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* OPTION A CARD */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h3 className="font-black text-sm text-brand-light uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={15} />
              Option A: Pay early check-in fee
            </h3>
            <p className="text-xs text-white/70 leading-normal">
              Collect payment for early drop-off. Customer keeps their original pickup deadline.
            </p>
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-[11px] space-y-1 text-white/50">
              <p>• Extra hours: <strong className="text-white font-extrabold">{extraHours} hr{extraHours !== 1 ? 's' : ''}</strong></p>
              <p>• Extra fee: <strong className="text-brand-accent font-extrabold">LKR {earlyCheckinFee.toLocaleString()}</strong></p>
              <p>• Pickup deadline remains: <strong className="text-white font-extrabold">{formatInSLT(bookedEndTime, { hour: '2-digit', minute: '2-digit', hour12: true })}</strong></p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleCashCheckIn} disabled={loading} size="sm" className="bg-amber-500 hover:bg-amber-600 text-ocean-900 font-extrabold w-full">
              {loading ? <Spinner size="sm" /> : '💵 Collect Cash & Check In'}
            </Button>
            <Button onClick={handleSendPaymentLink} disabled={loading} size="sm" variant="outline" className="border-white/15 text-white hover:bg-white/5 w-full">
              ✉ Send Online Payment Link
            </Button>
          </div>
        </div>

        {/* OPTION B CARD */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h3 className="font-black text-sm text-brand-light uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={15} />
              Option B: Shift booking earlier
            </h3>
            <p className="text-xs text-white/70 leading-normal">
              No extra payment is collected. The pickup deadline will shift earlier by the early arrival amount.
            </p>
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-[11px] space-y-1 text-white/50">
              <p>• New drop-off time: <strong className="text-white font-extrabold">{formatInSLT(shiftedStartTime, { hour: '2-digit', minute: '2-digit', hour12: true })}</strong></p>
              <p>• New pickup deadline: <strong className="text-brand-accent font-extrabold">{formatInSLT(shiftedEndTime, { hour: '2-digit', minute: '2-digit', hour12: true })}</strong></p>
              <p>• Extra fee: <strong className="text-green-400 font-extrabold">LKR 0</strong></p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleShiftCheckIn} disabled={loading} size="sm" className="w-full">
              {loading ? <Spinner size="sm" /> : '✓ Shift Time & Check In'}
            </Button>
          </div>
        </div>
      </div>

      {/* Supervisor Override Option */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => setStep('supervisor_override')}
          className="text-xs font-bold text-red-400/70 hover:text-red-400 flex items-center gap-1 bg-red-500/5 hover:bg-red-500/10 px-4 py-2.5 rounded-xl border border-red-500/10 transition-colors"
        >
          <UserCheck size={14} />
          Supervisor Override (Waive Fee)
        </button>
      </div>
    </div>
  )
}
