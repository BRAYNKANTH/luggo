'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, Clock, AlertCircle, Shield,
  ShieldCheck, Mail, Smartphone, RefreshCw, CheckCircle2,
  User, Fingerprint, ChevronLeft, Package, Minus, Plus, ArrowRight
} from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { addHours, startOfHour, format, differenceInHours } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { type BagCounts } from '@/components/customer/BagSelector'
import { type PayhereFormData } from '@/lib/utils/payhere'
import { createClient } from '@/lib/supabase/client'
import { BAG_LABELS, BAG_RATES } from '@/lib/utils/pricing'
import { type BagType } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

type Hub = {
  id: string
  name: string
  alias: string
  open_time: string
  close_time: string
}

type Profile = {
  id: string
  name: string
  email: string
  phone: string | null
  nic_passport: string | null
}

interface BookingFormProps {
  hub: Hub
  initialProfile: Profile | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

const EMPTY_BAGS: BagCounts = { small: 0, regular: 0, large: 0 }
const OTP_LENGTH = 6
const BAG_EMOJIS: Record<BagType, string> = { small: '🎒', regular: '🧳', large: '🛄' }
const BAG_DESC: Record<BagType, string> = {
  small:   'Backpacks & hand luggage',
  regular: 'Standard cabin carry-ons',
  large:   'Check-in suitcases',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('94') && d.length >= 11) return `+${d}`
  if (d.startsWith('0')) return `+94${d.slice(1)}`
  return d.length > 0 ? `+94${d}` : ''
}

function isEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) }
function isPhone(v: string) { return v.replace(/\D/g, '').length >= 9 }

function computeTotal(bags: BagCounts, start: Date | null, end: Date | null): number {
  if (!start || !end || end <= start) return 0
  const hours = Math.ceil(differenceInHours(end, start)) || 1
  return (Object.entries(bags) as [BagType, number][])
    .reduce((sum, [type, qty]) => sum + BAG_RATES[type] * qty * hours, 0)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  function handleChange(i: number, v: string) {
    if (!/^\d*$/.test(v)) return
    const chars = value.split('')
    chars[i] = v.slice(-1)
    const next = chars.join('').slice(0, OTP_LENGTH)
    onChange(next)
    if (v && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus()
  }
  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus()
  }
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input key={i} ref={el => { refs.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1}
          value={value[i] ?? ''} onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className="w-11 h-13 text-center text-xl font-bold text-gray-900 border-2 border-gray-200 rounded-2xl focus:border-brand focus:outline-none focus:bg-brand/5 transition-all bg-gray-50"
        />
      ))}
    </div>
  )
}

function StepProgress({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['When?', 'Bags', 'Review']
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all ${
                done ? 'bg-emerald-500' : active ? 'bg-gray-900' : 'bg-gray-100'
              }`}>
                {done
                  ? <CheckCircle2 size={14} className="text-white" />
                  : <span className={`text-[10px] md:text-xs font-bold ${active ? 'text-white' : 'text-gray-400'}`}>{n}</span>
                }
              </div>
              <span className={`text-[9px] md:text-[10px] font-semibold ${active ? 'text-gray-900' : done ? 'text-emerald-600' : 'text-gray-300'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 md:w-20 h-px mx-1 md:mx-2 mb-3.5 transition-colors ${n < current ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function FieldInput({ label, icon: Icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: React.ElementType }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">
        {Icon && <Icon size={12} className="text-brand" />}
        {label}
      </label>
      <input
        {...props}
        className="w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all"
      />
    </div>
  )
}

// ── Slide animation variants ───────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function BookingForm({ hub, initialProfile }: BookingFormProps) {
  const supabase = createClient()
  const payhereFormRef = useRef<HTMLFormElement>(null)
  const [payhereData, setPayhereData] = useState<PayhereFormData | null>(null)

  const defaultStart = startOfHour(addHours(new Date(), 1))
  const defaultEnd = addHours(defaultStart, 4)

  // Core state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1)
  const [direction, setDirection] = useState(1)
  const [startValue, setStartValue] = useState(toLocalDatetimeValue(defaultStart))
  const [endValue, setEndValue] = useState(toLocalDatetimeValue(defaultEnd))
  const [bags, setBags] = useState<BagCounts>(EMPTY_BAGS)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Guest fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nic, setNic] = useState('')

  // Declarations
  const [noIllegalItems, setNoIllegalItems] = useState(false)

  // OTP flow
  const [showVerify, setShowVerify] = useState(false)
  const [verifyMethod, setVerifyMethod] = useState<'email' | 'phone' | null>(null)
  const [otpStep, setOtpStep] = useState<'method' | 'otp'>('method')
  const [otpValue, setOtpValue] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Derived
  const isLoggedIn = !!initialProfile
  const startDate = startValue ? new Date(startValue) : null
  const endDate = endValue ? new Date(endValue) : null
  const totalBags = Object.values(bags).reduce((s, n) => s + n, 0)
  const minDatetime = toLocalDatetimeValue(new Date())
  const timesValid = !!(startDate && endDate && endDate > startDate)
  const detailsValid = name.trim().length >= 2 && isEmail(email) && isPhone(phone) && nic.trim().length >= 5
  const totalPrice = computeTotal(bags, startDate, endDate)
  const hours = startDate && endDate && endDate > startDate
    ? Math.ceil(differenceInHours(endDate, startDate)) || 1 : 0

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Restore localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`luggo_booking_${hub.id}`)
    if (!saved) return
    try {
      const s = JSON.parse(saved)
      if (s.bags) setBags(s.bags)
      if (s.start) setStartValue(s.start)
      if (s.end) setEndValue(s.end)
      if (!isLoggedIn) {
        if (s.name) setName(s.name)
        if (s.email) setEmail(s.email)
        if (s.phone) setPhone(s.phone)
        if (s.nic) setNic(s.nic)
      }
      if (s.autoSubmit && isLoggedIn) {
        localStorage.setItem(`luggo_booking_${hub.id}`, JSON.stringify({ ...s, autoSubmit: false }))
        setTimeout(() => submitBooking({ bags: s.bags, start: s.start, end: s.end }), 800)
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub.id, isLoggedIn])

  // Save guest state
  useEffect(() => {
    if (isLoggedIn) return
    localStorage.setItem(`luggo_booking_${hub.id}`, JSON.stringify({ bags, start: startValue, end: endValue, name, email, phone, nic }))
  }, [bags, startValue, endValue, name, email, phone, nic, hub.id, isLoggedIn])

  // Auto-submit PayHere form
  useEffect(() => {
    if (payhereData && payhereFormRef.current) {
      localStorage.removeItem(`luggo_booking_${hub.id}`)
      payhereFormRef.current.submit()
    }
  }, [payhereData, hub.id])

  // Navigation
  function goTo(step: 1 | 2 | 3) {
    setDirection(step > wizardStep ? 1 : -1)
    setError(null)
    setWizardStep(step)
  }

  function next() {
    if (wizardStep === 1) {
      if (!timesValid) { setError('Please select valid drop-off and pick-up times.'); return }
      goTo(2)
    } else if (wizardStep === 2) {
      if (totalBags === 0) { setError('Please add at least one bag.'); return }
      goTo(3)
    }
  }

  function back() {
    if (wizardStep === 2) goTo(1)
    else if (wizardStep === 3) goTo(2)
  }

  // Booking submission
  async function submitBooking(overridePayload?: { bags: Record<string, number>; start: string; end: string }) {
    setError(null)
    setLoading(true)

    const activeBags = overridePayload?.bags ?? bags
    const activeStart = overridePayload?.start ? new Date(overridePayload.start) : startDate
    const activeEnd = overridePayload?.end ? new Date(overridePayload.end) : endDate

    const bagArray = Object.entries(activeBags)
      .flatMap(([type, qty]) => Array(qty as number).fill({ bag_type: type }))

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hub_id: hub.id,
          start_time: activeStart?.toISOString(),
          end_time: activeEnd?.toISOString(),
          bags: bagArray,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create booking. Please try again.')
        setLoading(false)
        return
      }
      setPayhereData(data.payhere)
    } catch {
      setError('Network error. Please check your connection.')
      setLoading(false)
    }
  }

  function handlePayClick() {
    setError(null)
    if (isLoggedIn) {
      submitBooking()
    } else {
      if (!detailsValid) { setError('Please fill in all your details.'); return }
      setShowVerify(true)
      setOtpStep('method')
      setOtpValue('')
    }
  }

  // OTP
  async function sendOtp(method: 'email' | 'phone') {
    setError(null)
    setLoading(true)
    setVerifyMethod(method)
    if (method === 'email') {
      const { error: e } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, data: { name: name.trim(), phone: formatPhone(phone), nic_passport: nic.trim() } },
      })
      setLoading(false)
      if (e) { setError(e.message); return }
    } else {
      const res = await fetch('/api/auth/phone/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatPhone(phone) }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) { setError(data.error ?? 'Failed to send SMS.'); return }
    }
    setOtpStep('otp')
    setCountdown(60)
  }

  async function verifyOtp() {
    if (otpValue.length < OTP_LENGTH) return
    setError(null)
    setLoading(true)
    if (verifyMethod === 'email') {
      const { error: e } = await supabase.auth.verifyOtp({ email: email.trim(), token: otpValue, type: 'email' })
      if (e) { setError('Incorrect or expired code.'); setOtpValue(''); setLoading(false); return }
      setLoading(false)
      setShowVerify(false)
      submitBooking()
    } else {
      const saved = localStorage.getItem(`luggo_booking_${hub.id}`)
      if (saved) {
        const s = JSON.parse(saved)
        localStorage.setItem(`luggo_booking_${hub.id}`, JSON.stringify({ ...s, autoSubmit: true }))
      }
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatPhone(phone), otp: otpValue, name: name.trim(), email: email.trim(), nic: nic.trim() }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) { setError(data.error ?? 'Incorrect code.'); setOtpValue(''); return }
      window.location.reload()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb-32">
      <StepProgress current={wizardStep} />

      <div className="overflow-hidden relative">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={wizardStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.22, ease: 'easeInOut' }}
          >

            {/* ── STEP 1: WHEN? ─────────────────────────────────────────── */}
            {wizardStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">When do you need storage?</h2>
                  <p className="text-sm text-gray-400">Set your drop-off and pick-up times</p>
                </div>

                {/* Drop-off */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <CalendarDays size={12} className="text-brand" /> Drop-off
                  </label>
                  <input
                    type="datetime-local"
                    value={startValue}
                    min={minDatetime}
                    onChange={e => {
                      setStartValue(e.target.value)
                      if (endValue && e.target.value >= endValue)
                        setEndValue(toLocalDatetimeValue(addHours(new Date(e.target.value), 4)))
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all"
                  />
                </div>

                {/* Pick-up */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <Clock size={12} className="text-brand" /> Pick-up
                  </label>
                  <input
                    type="datetime-local"
                    value={endValue}
                    min={startValue || minDatetime}
                    onChange={e => setEndValue(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all"
                  />
                </div>

                {/* Duration pill */}
                {timesValid && (
                  <div className="flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl py-2 px-4 mx-4">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <p className="text-[11px] font-semibold text-emerald-700">
                      {hours} hr{hours !== 1 ? 's' : ''} storage
                    </p>
                    <span className="text-emerald-400">·</span>
                    <p className="text-[10px] text-emerald-600 font-medium">
                      {startDate && format(startDate, 'dd MMM')} → {endDate && format(endDate, 'dd MMM, HH:mm')}
                    </p>
                  </div>
                )}

                <p className="text-center text-xs text-gray-400">
                  Hub opens {hub.open_time.slice(0, 5)} – {hub.close_time.slice(0, 5)}
                </p>
              </div>
            )}

            {/* ── STEP 2: BAGS ──────────────────────────────────────────── */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">What are you storing?</h2>
                  <p className="text-sm text-gray-400">Select the number of each bag type</p>
                </div>

                {(Object.keys(BAG_LABELS) as BagType[]).map((type) => (
                  <div
                    key={type}
                    className={`bg-white rounded-2xl border shadow-sm p-3 flex items-center gap-3 transition-all ${
                      bags[type] > 0 ? 'border-brand/30 bg-brand/[0.02]' : 'border-gray-100'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-11 h-11 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors ${
                      bags[type] > 0 ? 'bg-brand/10' : 'bg-gray-50'
                    }`}>
                      {BAG_EMOJIS[type]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-[13px] md:text-sm">{BAG_LABELS[type]}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{BAG_DESC[type]}</p>
                      <p className="text-[10px] md:text-xs font-semibold text-brand mt-0.5">LKR {BAG_RATES[type].toLocaleString()}/hr</p>
                    </div>

                    {/* Counter */}
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => bags[type] > 0 && setBags({ ...bags, [type]: bags[type] - 1 })}
                        disabled={bags[type] === 0}
                        className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                          bags[type] > 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                      <span className="w-4 text-center font-bold text-gray-900 text-sm md:text-base tabular-nums">
                        {bags[type]}
                      </span>
                      <button
                        type="button"
                        onClick={() => totalBags < 10 && setBags({ ...bags, [type]: bags[type] + 1 })}
                        disabled={totalBags >= 10}
                        className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                          totalBags < 10 ? 'bg-brand text-white' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))}

                {totalBags >= 10 && (
                  <p className="text-center text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-100 rounded-2xl py-2.5">
                    Maximum 10 bags per booking
                  </p>
                )}
              </div>
            )}

            {/* ── STEP 3: REVIEW & PAY ──────────────────────────────────── */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Review your booking</h2>
                  <p className="text-sm text-gray-400">Confirm details before paying</p>
                </div>

                {/* Summary card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 bg-brand/8 rounded-xl flex items-center justify-center shrink-0">
                      <CalendarDays size={14} className="text-brand" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400">Time Window</p>
                      <p className="text-xs font-bold text-gray-900">
                        {startDate && format(startDate, 'dd MMM, HH:mm')} → {endDate && format(endDate, 'dd MMM, HH:mm')}
                      </p>
                      <p className="text-[10px] text-brand font-medium">{hours}h storage</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 bg-brand/8 rounded-xl flex items-center justify-center shrink-0">
                      <Package size={14} className="text-brand" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold text-gray-400">Bags</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {(Object.entries(bags) as [BagType, number][]).filter(([, q]) => q > 0).map(([type, qty]) => (
                          <span key={type} className="text-[10px] bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded-full">
                            {BAG_EMOJIS[type]} {qty}× {BAG_LABELS[type]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Price breakdown</p>
                  {(Object.entries(bags) as [BagType, number][]).filter(([, q]) => q > 0).map(([type, qty]) => (
                    <div key={type} className="flex justify-between text-xs">
                      <span className="text-gray-600">{qty}× {BAG_LABELS[type]} × {hours}h</span>
                      <span className="font-semibold text-gray-900">LKR {(BAG_RATES[type] * qty * hours).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-sm">Total</span>
                    <span className="text-lg font-bold text-gray-900">LKR {totalPrice.toLocaleString()}</span>
                  </div>
                </div>

                {/* Illegal items declaration */}
                <label className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                  noIllegalItems
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-gray-200 bg-white hover:border-brand/30'
                }`}>
                  <div className="relative shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={noIllegalItems}
                      onChange={e => setNoIllegalItems(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      noIllegalItems ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'
                    }`}>
                      {noIllegalItems && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-snug">
                      I confirm I will not store any illegal items
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      No weapons, controlled substances, perishables, hazardous materials, or items prohibited under
                      Sri Lankan law. See{' '}
                      <a
                        href="/terms#prohibited"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-brand font-semibold hover:underline"
                      >
                        Section 3 of our Terms
                      </a>
                      {' '}for the full list.
                    </p>
                  </div>
                </label>

                {/* Identity — logged in */}
                {isLoggedIn ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                      <User size={18} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-xs truncate">{initialProfile!.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{initialProfile!.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">
                      <ShieldCheck size={12} />
                      Verified
                    </div>
                  </div>
                ) : (
                  /* Guest identity form */
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Shield size={14} className="text-brand" />
                      <p className="text-xs font-bold text-gray-900">Your Details</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FieldInput label="Full Name" icon={User} value={name} onChange={e => setName(e.target.value)} placeholder="Amal Perera" />
                      <FieldInput label="Phone" icon={Smartphone} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX" />
                      <FieldInput label="Email" icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                      <FieldInput label="NIC / Passport" icon={Fingerprint} value={nic} onChange={e => setNic(e.target.value)} placeholder="987654321V" />
                    </div>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* ── Fixed bottom action bar ── */}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-4 pb-safe z-[200] shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {/* Back button */}
          {wizardStep > 1 && (
            <button onClick={back}
              className="flex items-center justify-center w-12 h-12 rounded-2xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Live price pill (step 2 only) */}
          {wizardStep === 2 && totalBags > 0 && totalPrice > 0 && (
            <div className="flex-1 min-w-0 bg-gray-50 rounded-2xl px-4 py-2.5 border border-gray-100">
              <p className="text-[10px] text-gray-400 font-medium">{totalBags} bag{totalBags > 1 ? 's' : ''} · {hours}h</p>
              <p className="text-sm font-bold text-gray-900">LKR {totalPrice.toLocaleString()}</p>
            </div>
          )}

          {/* Next / Pay button */}
          {wizardStep < 3 ? (
            <Button
              onClick={next}
              className="flex-1 h-12 rounded-2xl font-bold text-sm"
              disabled={wizardStep === 1 ? !timesValid : totalBags === 0}
            >
              Next →
            </Button>
          ) : (
            <Button
              onClick={handlePayClick}
              loading={loading}
              className="flex-1 h-12 rounded-2xl font-bold text-sm"
              disabled={(!isLoggedIn && !detailsValid) || !noIllegalItems}
            >
              {totalPrice > 0 ? `Pay LKR ${totalPrice.toLocaleString()}` : 'Confirm & Pay'}
            </Button>
          )}
        </div>
      </div>

      {/* ── OTP Verification Modal ── */}
      <AnimatePresence>
        {showVerify && (
          <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowVerify(false); setOtpStep('method'); setOtpValue('') }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl">

              {otpStep === 'method' ? (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck size={28} className="text-brand" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Verify your identity</h3>
                    <p className="text-sm text-gray-400 mt-1">Choose how to receive your verification code</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { method: 'email' as const, icon: Mail, label: 'Via Email', sub: email },
                      { method: 'phone' as const, icon: Smartphone, label: 'Via SMS', sub: formatPhone(phone) },
                    ].map(({ method, icon: Icon, label, sub }) => (
                      <button key={method} onClick={() => sendOtp(method)} disabled={loading}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-brand/30 hover:bg-brand/4 transition-all text-left disabled:opacity-50">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                          <Icon size={20} className="text-brand" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{label}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{sub}</p>
                        </div>
                        <ArrowRight size={16} className="text-gray-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                  {loading && <div className="flex justify-center"><Spinner size="sm" className="text-brand" /></div>}
                  {error && <p className="text-center text-xs text-red-500 font-medium">{error}</p>}
                </div>
              ) : (
                <div className="space-y-5 text-center">
                  <div>
                    <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-3 relative">
                      <div className="absolute inset-0 rounded-2xl border-2 border-brand/20 animate-ping opacity-20" />
                      {verifyMethod === 'email' ? <Mail size={26} className="text-brand" /> : <Smartphone size={26} className="text-brand" />}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Enter verification code</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Sent to your {verifyMethod === 'email' ? 'email' : 'phone'}
                    </p>
                  </div>
                  <OtpInput value={otpValue} onChange={v => {
                    setOtpValue(v)
                    if (v.length === OTP_LENGTH) setTimeout(verifyOtp, 100)
                  }} />
                  {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                  <Button fullWidth loading={loading} onClick={verifyOtp}
                    disabled={otpValue.length < OTP_LENGTH}
                    className="h-12 rounded-2xl font-bold">
                    Verify & Pay
                  </Button>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => sendOtp(verifyMethod!)} disabled={countdown > 0 || loading}
                      className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-brand disabled:opacity-40 transition-colors">
                      <RefreshCw size={12} />
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                    </button>
                    <button onClick={() => { setOtpStep('method'); setOtpValue(''); setError(null) }}
                      className="text-xs text-gray-300 hover:text-gray-500 transition-colors">
                      ← Change method
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden PayHere form */}
      <form ref={payhereFormRef} method="POST" action={payhereData?.endpoint || ''} style={{ display: 'none' }}>
        {payhereData && Object.entries(payhereData)
          .filter(([key]) => key !== 'endpoint')
          .map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={String(value)} />
          ))}
      </form>
    </div>
  )
}
