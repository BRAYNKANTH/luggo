'use client'

import { useState, useEffect } from 'react'
import { Package, ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  completePartialPickupAction,
  reportPickupIncidentAction,
  processPhoneDeadPickupOverrideAction,
  waiveAndCompletePickupAction,
  completePickupAction,
  getSupervisorsAction,
  sendPickupOTPAction,
  verifyPickupOTPAction,
  completePickupWithCashAction
} from '@/lib/staff/actions'
import { BAG_LABELS } from '@/lib/utils/pricing'
import { type BagType } from '@/types/database'

interface Bag {
  id: string
  bag_type: BagType
  sticker_number: string | null
  seal_number: string | null
  bag_tag_id: string | null
  seal_status: 'sealed' | 'seal_not_applicable'
  status: string
}

interface PickupBooking {
  id: string
  status: string
  end_time: string
  total_price: number
  slot_number: number | null
  walk_in_name: string | null
  walk_in_phone: string | null
  walk_in_nic_passport_ref: string | null
  pickup_otp_verified_at: string | null
  pickup_override_supervisor_id: string | null
}

interface StaffPickupConsoleProps {
  booking: PickupBooking
  bags: Bag[]
  fee: number
  isSupervisor: boolean
}

export function StaffPickupConsole({
  booking,
  bags,
  fee,
  isSupervisor
}: StaffPickupConsoleProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // OTP States
  const [otpValue, setOtpValue] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  // Checkboxes for partial pickup selection
  const [selectedBagIds, setSelectedBagIds] = useState<string[]>(() => bags.filter(b => b.status !== 'released').map(b => b.id))

  // Seal Condition Checklist per bag: 'intact' | 'broken' | 'missing'
  const [bagConditions, setBagConditions] = useState<Record<string, 'intact' | 'broken' | 'missing'>>(() => {
    const states: Record<string, 'intact' | 'broken' | 'missing'> = {}
    for (const b of bags) {
      states[b.id] = 'intact'
    }
    return states
  })

  // Dispute / Incident states
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeBagId, setDisputeBagId] = useState<string>('')
  const [disputeType, setDisputeType] = useState('broken_seal')
  const [disputeNotes, setDisputeNotes] = useState('')

  // Supervisor phone dead override states
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [supervisors, setSupervisors] = useState<{ id: string; name: string }[]>([])
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('')
  const [overrideReason, setOverrideReason] = useState('Customer phone is dead, verified physical ID matches booking name')

  useEffect(() => {
    if (showOverrideForm) {
      getSupervisorsAction().then(res => {
        if (res.supervisors) setSupervisors(res.supervisors)
      })
    }
  }, [showOverrideForm])

  // Detect if any seal is broken or missing, and auto-flag a dispute if so
  const hasDamagedSeals = Object.values(bagConditions).some(c => c !== 'intact')

  function handleBagToggle(id: string) {
    setSelectedBagIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleConditionChange(bagId: string, status: 'intact' | 'broken' | 'missing') {
    setBagConditions(prev => ({ ...prev, [bagId]: status }))
    if (status !== 'intact') {
      setDisputeBagId(bagId)
      setDisputeType(status === 'broken' ? 'broken_seal' : 'missing_tag')
      setShowDisputeForm(true)
    }
  }

  async function handleDisputeSubmit() {
    if (!disputeNotes.trim()) {
      setError('Please provide notes explaining the incident details.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await reportPickupIncidentAction(
        booking.id,
        disputeBagId || null,
        disputeType,
        disputeNotes
      )
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess('Incident filed successfully. Booking is placed on holding dispute.')
        window.location.reload()
      }
    } catch {
      setError('Failed to report incident.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePhoneDeadOverrideSubmit() {
    if (!selectedSupervisorId) return
    setError(null)
    setLoading(true)
    try {
      const res = await processPhoneDeadPickupOverrideAction(
        booking.id,
        selectedSupervisorId,
        overrideReason
      )
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess('Supervisor override applied! Ready for release.')
        window.location.reload()
      }
    } catch {
      setError('Failed to apply supervisor override.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendOTP() {
    setOtpSending(true)
    setError(null)
    try {
      const res = await sendPickupOTPAction(booking.id)
      if (res.error) {
        setError(res.error)
      } else {
        setOtpSent(true)
        setSuccess('Pickup SMS OTP sent to customer phone.')
      }
    } catch {
      setError('Failed to send OTP.')
    } finally {
      setOtpSending(false)
    }
  }

  async function handleVerifyOTP() {
    if (!otpValue.trim()) return
    setOtpVerifying(true)
    setError(null)
    try {
      const res = await verifyPickupOTPAction(booking.id, otpValue)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess('OTP verified successfully!')
        window.location.reload()
      }
    } catch {
      setError('Failed to verify OTP.')
    } finally {
      setOtpVerifying(false)
    }
  }

  async function handleHandover() {
    if (selectedBagIds.length === 0) {
      setError('Please select at least one bag to release.')
      return
    }
    if (hasDamagedSeals) {
      setError('Cannot complete handover with damaged/missing seals. File a dispute incident.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const isPartial = selectedBagIds.length !== bags.filter(b => b.status !== 'released').length
      
      if (isPartial) {
        const res = await completePartialPickupAction(booking.id, selectedBagIds)
        if (res.error) {
          setError(res.error)
        } else {
          setSuccess('Partial pickup processed successfully!')
          window.location.reload()
        }
      } else {
        // Complete full pickup
        await completePickupAction(booking.id)
      }
    } catch {
      setError('An error occurred during pickup.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 text-red-200">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 border border-green-500/30 p-4 rounded-xl flex items-start gap-3 text-green-200">
          <CheckCircle size={18} className="shrink-0 mt-0.5" />
          <p className="text-sm font-bold">{success}</p>
        </div>
      )}

      {/* Override Trigger Section (Priority 6 - Phone Dead) */}
      {booking.status !== 'ready_for_release' && booking.status !== 'exception_hold' && (
        <div className="flex justify-end pr-1">
          <button
            type="button"
            onClick={() => {
              setShowOverrideForm(!showOverrideForm)
              setShowDisputeForm(false)
            }}
            className="text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
          >
            🔑 Phone Dead / Lost QR Override
          </button>
        </div>
      )}

      {/* Supervisor Override Form */}
      {showOverrideForm && (
        <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">Lost QR / Dead Phone Supervisor Override</h3>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest pl-1">
              Select Supervisor
            </label>
            <select
              value={selectedSupervisorId}
              onChange={e => setSelectedSupervisorId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-light font-bold"
            >
              <option value="" className="bg-ocean-900 text-white/40">Select Supervisor...</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id} className="bg-ocean-900 text-white font-bold">{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest pl-1">
              Verification Details / Reason
            </label>
            <input
              type="text"
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-xs focus:outline-none"
            />
          </div>

          <Button
            onClick={handlePhoneDeadOverrideSubmit}
            disabled={loading || !selectedSupervisorId}
            className="w-full bg-amber-500 hover:bg-amber-600 text-ocean-900 font-extrabold"
          >
            {loading ? <Spinner size="sm" className="mr-2" /> : null}
            Authorize Handover Without QR Scan
          </Button>
        </div>
      )}

      {/* Bags Checklist / Custody Management (Priority 9 - Partial Pickups & Priority 11 - Conditions) */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <Package size={16} className="text-brand-light" />
          Select Bags & Verify Seals
        </h2>

        <div className="space-y-4">
          {bags.map((bag) => {
            const isReleased = bag.status === 'released'
            const isChecked = selectedBagIds.includes(bag.id)
            const condition = bagConditions[bag.id] || 'intact'

            return (
              <div key={bag.id} className={`p-4.5 rounded-3xl border transition-all duration-300 ${isReleased ? 'bg-white/5 opacity-40 border-white/5' : isChecked ? 'bg-white/15 border-white/30 shadow-premium' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      disabled={isReleased || loading}
                      checked={isChecked}
                      onChange={() => handleBagToggle(bag.id)}
                      className="mt-1 w-5 h-5 rounded-lg text-brand border-white/30 bg-white/5 checked:bg-brand focus:ring-2 focus:ring-brand/40 cursor-pointer transition-all duration-300"
                    />
                    <div>
                      <p className={`font-bold text-sm ${isChecked ? 'text-white' : 'text-white/50'}`}>
                        {BAG_LABELS[bag.bag_type]}
                      </p>
                      {bag.seal_status === 'sealed' ? (
                        <p className="text-[10px] text-brand-accent font-mono font-bold mt-0.5">
                          🔒 Seal #: {bag.seal_number || 'Missing'}
                        </p>
                      ) : (
                        <p className="text-[10px] text-white/40 font-bold italic mt-0.5">
                          Unsealable
                        </p>
                      )}
                      {isReleased && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-green-400 bg-green-400/10 px-2 py-0.5 rounded mt-1.5 inline-block">
                          Already Handed Over
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Seal condition selectors (Priority 11) */}
                  {!isReleased && (
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Seal Status</span>
                      <div className="flex gap-1 bg-black/35 p-1 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleConditionChange(bag.id, 'intact')}
                          className={`px-3 py-1.5 rounded-xl transition-all duration-300 ${condition === 'intact' ? 'bg-emerald-600 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                        >
                          Intact
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConditionChange(bag.id, 'broken')}
                          className={`px-3 py-1.5 rounded-xl transition-all duration-300 ${condition === 'broken' ? 'bg-rose-600 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                        >
                          Broken
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConditionChange(bag.id, 'missing')}
                          className={`px-3 py-1.5 rounded-xl transition-all duration-300 ${condition === 'missing' ? 'bg-amber-600 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                        >
                          Missing
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pickup Verification Card */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <CheckCircle size={16} className="text-brand-light" />
          Pickup Identity Verification
        </h2>

        {booking.pickup_otp_verified_at ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3 text-green-300">
            <CheckCircle size={20} className="shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">✓ Verified via SMS OTP</p>
              <p className="text-[10px] text-green-400/80 mt-0.5">
                Customer phone OTP verification succeeded at {new Date(booking.pickup_otp_verified_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ) : booking.pickup_override_supervisor_id ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-amber-300">
            <CheckCircle size={20} className="shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">✓ Supervisor Override Approved</p>
              <p className="text-[10px] text-amber-400/80 mt-0.5">Physical ID checked & approved by supervisor</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-white/60 leading-relaxed font-semibold">
              Verification of customer identity is required. Send a one-time passcode to the customer&apos;s registered phone, or request a supervisor override if they cannot access their phone.
            </p>

            {otpSent ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Enter 4-digit code"
                    value={otpValue}
                    onChange={e => setOtpValue(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand font-mono font-bold tracking-widest text-center"
                  />
                  <Button
                    onClick={handleVerifyOTP}
                    loading={otpVerifying}
                    disabled={otpValue.length < 4}
                    className="bg-brand text-white font-extrabold px-6"
                  >
                    Verify OTP
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="text-[10px] font-black uppercase text-brand hover:underline"
                >
                  Resend Code
                </button>
              </div>
            ) : (
              <Button
                onClick={handleSendOTP}
                loading={otpSending}
                fullWidth
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5"
              >
                Send SMS Verification OTP
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Incident / Dispute Reporting Console (Priority 12) */}
      {showDisputeForm && (
        <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-red-400 flex items-center gap-1.5">
              <ShieldAlert size={14} /> Report Custody Incident / Dispute
            </h3>
            <button
              type="button"
              onClick={() => setShowDisputeForm(false)}
              className="text-[10px] text-white/40 hover:text-white font-bold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <label className="block text-[10px] text-white/50 uppercase tracking-widest">Incident Type</label>
              <select
                value={disputeType}
                onChange={e => setDisputeType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold"
              >
                <option value="broken_seal" className="bg-ocean-900">Broken Zip Seal</option>
                <option value="missing_tag" className="bg-ocean-900">Missing QR Tag</option>
                <option value="luggage_damage" className="bg-ocean-900">Exterior Bag Damage</option>
                <option value="missing_items" className="bg-ocean-900">Customer Claims Missing Item</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] text-white/50 uppercase tracking-widest">Affected Bag</label>
              <select
                value={disputeBagId}
                onChange={e => setDisputeBagId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white"
              >
                <option value="" className="bg-ocean-900">All Booking Bags</option>
                {bags.map(b => (
                  <option key={b.id} value={b.id} className="bg-ocean-900">
                    {BAG_LABELS[b.bag_type]} (Seal: {b.seal_number || 'None'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] text-white/50 uppercase tracking-widest pl-1">Incident Report Notes</label>
            <textarea
              value={disputeNotes}
              onChange={e => setDisputeNotes(e.target.value)}
              placeholder="Provide exact details (e.g. seal is physically cut, wheel broken, or customer claims lock was tampered)..."
              className="w-full h-20 bg-black/30 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-red-200/30 focus:outline-none focus:border-red-500"
            />
          </div>

          <Button
            onClick={handleDisputeSubmit}
            loading={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
          >
            ⚠️ Submit Dispute Report & Lock Storage
          </Button>
        </div>
      )}

      {/* Pickup Action Buttons */}
      {booking.status !== 'exception_hold' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-ocean-900 border-t border-white/10 px-4 py-4 pb-safe space-y-2">
          {fee > 0 ? (
            <div className="space-y-2 px-4 max-w-lg mx-auto">
              <div className="bg-red-500/10 border border-red-400/20 rounded-xl px-4 py-2 text-center">
                <p className="text-red-300 text-xs font-bold">Collect LKR {fee.toLocaleString()} Cash or wait for online payment.</p>
              </div>

              <form action={completePickupWithCashAction.bind(null, booking.id)}>
                <Button 
                  type="submit" 
                  fullWidth 
                  size="lg" 
                  disabled={loading || (!booking.pickup_otp_verified_at && !booking.pickup_override_supervisor_id)}
                  className="bg-brand text-white font-extrabold"
                >
                  💵 Confirm LKR {fee.toLocaleString()} Cash Paid & Handover
                </Button>
              </form>
              
              {isSupervisor ? (
                <form action={waiveAndCompletePickupAction.bind(null, booking.id)}>
                  <Button type="submit" fullWidth size="lg" className="bg-amber-600 hover:bg-amber-500 text-white">
                    ⚠️ Authorize Waiver (Supervisor Override)
                  </Button>
                </form>
              ) : (
                <div className="text-center text-white/40 text-xs italic bg-white/5 py-3 rounded-xl">
                  * Supervisor approval required to waive late fees
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 max-w-lg mx-auto">
              {(!booking.pickup_otp_verified_at && !booking.pickup_override_supervisor_id) ? (
                <p className="text-center text-[10px] text-amber-400 font-extrabold uppercase tracking-wider mb-2">
                  ⚠️ Verification Required to Complete Release
                </p>
              ) : null}
              <Button
                onClick={handleHandover}
                disabled={
                  loading ||
                  selectedBagIds.length === 0 ||
                  (!booking.pickup_otp_verified_at && !booking.pickup_override_supervisor_id)
                }
                fullWidth
                size="lg"
              >
                {loading ? <Spinner size="sm" /> : '✓ Confirm Handover & Release Selected Bags'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
