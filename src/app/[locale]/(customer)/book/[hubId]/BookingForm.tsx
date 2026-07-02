'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  CalendarDays, Clock, AlertCircle, Shield,
  ShieldCheck, Mail, Smartphone, CheckCircle2,
  User, Fingerprint, Package, Minus, Plus,
  CreditCard
} from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { addHours, startOfHour, format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { type BagCounts } from '@/components/customer/BagSelector'
import { type PayhereFormData } from '@/lib/utils/payhere'
import { type BagType } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

type Hub = {
  id: string
  name: string
  alias: string
  address: string
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

const LOCAL_BAG_LABELS: Record<BagType, string> = {
  small: 'Small',
  regular: 'Regular',
  large: 'Large',
}

const LOCAL_BAG_DESC: Record<BagType, string> = {
  small: 'Backpack, handbag, laptop bag, or briefcases',
  regular: 'Cabin luggage, standard carry-on suitcase, or duffel bag',
  large: 'Large check-in suitcase, backpacker pack, golf clubs, or oversized gear',
}

const LOCAL_BAG_RATES: Record<BagType, number> = {
  small: 200,
  regular: 300,
  large: 400,
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

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

function isValidSriLankanPhone(phone: string): boolean {
  const formatted = formatPhone(phone)
  // Sri Lankan mobile number contains country code (+94) followed by 7 and 8 digits (total 9 digits after +94)
  return /^\+947[0-9]{8}$/.test(formatted)
}

// TODO: Implement advanced Sri Lankan NIC / Passport validation rules if needed.
function isValidId(type: 'NIC' | 'Passport', value: string): boolean {
  const clean = value.trim()
  if (type === 'NIC') {
    // Old NIC: 9 digits followed by V/X. New NIC: 12 digits.
    return /^[0-9]{9}[vVxX]$/.test(clean) || /^[0-9]{12}$/.test(clean) || clean.length >= 5
  }
  return clean.length >= 5
}

function maskIdNumber(idNum: string): string {
  if (!idNum) return ''
  const clean = idNum.trim()
  if (clean.length <= 4) return '*'.repeat(clean.length)
  return '*'.repeat(clean.length - 4) + clean.slice(-4)
}

function parseInitialId(nicPassport: string | null) {
  if (!nicPassport) return { type: 'NIC', number: '' }
  const clean = nicPassport.trim()
  // Basic heuristic: if it has letters inside the prefix or length is shorter, assume Passport
  const isPassport = /^[A-Z][0-9]{7,8}$/i.test(clean) || (clean.length < 10 && /[A-Za-z]/.test(clean.substring(0, 3)))
  return {
    type: isPassport ? 'Passport' : 'NIC',
    number: clean
  }
}

// TODO: Confirm if the billing rounding rules change in future.
function calculateBillableHours(dropOff: Date | null, pickUp: Date | null): number {
  if (!dropOff || !pickUp || pickUp <= dropOff) return 0
  return Math.ceil((pickUp.getTime() - dropOff.getTime()) / (1000 * 60 * 60))
}

function computeTotal(bags: BagCounts, start: Date | null, end: Date | null): number {
  const hours = calculateBillableHours(start, end)
  if (hours <= 0) return 0
  return (Object.entries(bags) as [BagType, number][])
    .reduce((sum, [type, qty]) => sum + LOCAL_BAG_RATES[type] * qty * hours, 0)
}

function isWithinOperatingHours(date: Date | null, openTimeStr: string, closeTimeStr: string): boolean {
  if (!date) return false
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const timeVal = hours * 60 + minutes

  const [openH, openM] = openTimeStr.split(':').map(Number)
  const openVal = openH * 60 + openM

  const [closeH, closeM] = closeTimeStr.split(':').map(Number)
  const closeVal = closeH * 60 + closeM

  return timeVal >= openVal && timeVal <= closeVal
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
    <div className="flex gap-2 justify-center my-3">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input key={i} ref={el => { refs.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1}
          value={value[i] ?? ''} onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className="w-10 h-12 text-center text-lg font-bold text-gray-900 border-2 border-gray-200 rounded-xl focus:border-brand focus:outline-none focus:bg-brand/5 transition-all bg-gray-50"
        />
      ))}
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



// ── Main Component ─────────────────────────────────────────────────────────────

export function BookingForm({ hub, initialProfile }: BookingFormProps) {
  const router = useRouter()
  const payhereFormRef = useRef<HTMLFormElement>(null)
  const [payhereData, setPayhereData] = useState<PayhereFormData | null>(null)

  const defaultStart = startOfHour(addHours(new Date(), 1))
  const defaultEnd = addHours(defaultStart, 4)

  // Core state
  const [paymentMethod, setPaymentMethod] = useState<'pay_online' | 'pay_at_hub'>('pay_online')
  const [hasInsurance, setHasInsurance] = useState(false)
  const [startValue, setStartValue] = useState(toLocalDatetimeValue(defaultStart))
  const [endValue, setEndValue] = useState(toLocalDatetimeValue(defaultEnd))

  // Time fields split
  const [dropOffDate, setDropOffDate] = useState('')
  const [dropOffTime, setDropOffTime] = useState('')
  const [pickUpDate, setPickUpDate] = useState('')
  const [pickUpTime, setPickUpTime] = useState('')

  const [bags, setBags] = useState<BagCounts>(EMPTY_BAGS)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Customer fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [idType, setIdType] = useState<'NIC' | 'Passport'>('NIC')
  const [idNumber, setIdNumber] = useState('')

  // Declarations
  const [noIllegalItems, setNoIllegalItems] = useState(false)
  const [isProhibitedExpanded, setIsProhibitedExpanded] = useState(false)

  // OTP flow state
  const [phoneVerificationStatus, setPhoneVerificationStatus] = useState<'not_verified' | 'otp_sending' | 'otp_sent' | 'otp_verifying' | 'verified' | 'error'>('not_verified')
  const [otpValue, setOtpValue] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Derived
  const isLoggedIn = !!initialProfile
  const startDate = startValue ? new Date(startValue) : null
  const endDate = endValue ? new Date(endValue) : null
  const totalBags = Object.values(bags).reduce((s, n) => s + n, 0)
  const minDatetime = toLocalDatetimeValue(new Date())
  const todayStr = minDatetime.split('T')[0]
  const isFutureStart = startDate ? startDate.getTime() > Date.now() - 5 * 60 * 1000 : false

  // Calculate minimum time for drop-off time input
  const getMinDropOffTime = () => {
    if (dropOffDate === todayStr) {
      const now = new Date()
      // Add a 5-minute buffer and format as HH:MM
      const nowBuffer = new Date(now.getTime() + 5 * 60 * 1000)
      const nowStr = `${String(nowBuffer.getHours()).padStart(2, '0')}:${String(nowBuffer.getMinutes()).padStart(2, '0')}`
      // If current time is past closing time, or before opening time, handle it
      return nowStr > hub.open_time.slice(0, 5) ? nowStr : hub.open_time.slice(0, 5)
    }
    return hub.open_time.slice(0, 5)
  }

  // Calculate minimum time for pick-up time input
  const getMinPickUpTime = () => {
    if (pickUpDate === dropOffDate) {
      // If pick-up is on the same day as drop-off, it must be after drop-off time
      return dropOffTime || hub.open_time.slice(0, 5)
    }
    return hub.open_time.slice(0, 5)
  }

  const isStartWithinOps = isWithinOperatingHours(startDate, hub.open_time, hub.close_time)
  const isEndWithinOps = isWithinOperatingHours(endDate, hub.open_time, hub.close_time)
  const timesWithinOperating = isStartWithinOps && isEndWithinOps

  const timesValid = !!(
    dropOffDate && dropOffTime &&
    pickUpDate && pickUpTime &&
    startDate && endDate &&
    endDate > startDate &&
    timesWithinOperating &&
    isFutureStart
  )

  const hours = calculateBillableHours(startDate, endDate)
  const basePrice = computeTotal(bags, startDate, endDate)
  const insurancePrice = hasInsurance ? (totalBags * 150) : 0
  const totalPrice = basePrice + insurancePrice



  // Split DateTime handling
  useEffect(() => {
    if (startValue && startValue.includes('T')) {
      const [d, t] = startValue.split('T')
      setDropOffDate(d)
      setDropOffTime(t.substring(0, 5))
    }
    if (endValue && endValue.includes('T')) {
      const [d, t] = endValue.split('T')
      setPickUpDate(d)
      setPickUpTime(t.substring(0, 5))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Mount only

  function handleDropOffChange(date: string, time: string) {
    setDropOffDate(date)
    
    let finalTime = time
    if (date === todayStr && time) {
      const minTime = getMinDropOffTime()
      if (time < minTime) {
        finalTime = minTime
      }
    }
    
    setDropOffTime(finalTime)
    
    if (date && finalTime) {
      const combined = `${date}T${finalTime}`
      setStartValue(combined)
      const dt = new Date(combined)
      const currentEnd = endValue ? new Date(endValue) : null
      if (currentEnd && currentEnd <= dt) {
        const newEnd = addHours(dt, 4)
        const newEndStr = toLocalDatetimeValue(newEnd)
        setEndValue(newEndStr)
        const [ed, et] = newEndStr.split('T')
        setPickUpDate(ed)
        setPickUpTime(et.substring(0, 5))
      }
    }
  }

  function handlePickUpChange(date: string, time: string) {
    setPickUpDate(date)
    
    let finalTime = time
    if (date === dropOffDate && time && dropOffTime) {
      if (time < dropOffTime) {
        finalTime = dropOffTime
      }
    }
    
    setPickUpTime(finalTime)
    if (date && finalTime) {
      setEndValue(`${date}T${finalTime}`)
    }
  }

  // Populate from initialProfile
  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name || '')
      setEmail(initialProfile.email || '')
      setPhone(initialProfile.phone || '')
      
      const parsedId = parseInitialId(initialProfile.nic_passport)
      setIdType(parsedId.type as 'NIC' | 'Passport')
      setIdNumber(parsedId.number)

      if (initialProfile.phone) {
        setPhoneVerificationStatus('verified')
      }
    }
  }, [initialProfile])

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
      if (s.start) {
        setStartValue(s.start)
        const [d, t] = s.start.split('T')
        setDropOffDate(d || '')
        setDropOffTime(t ? t.substring(0, 5) : '')
      }
      if (s.end) {
        setEndValue(s.end)
        const [d, t] = s.end.split('T')
        setPickUpDate(d || '')
        setPickUpTime(t ? t.substring(0, 5) : '')
      }
      if (!isLoggedIn) {
        if (s.name) setName(s.name)
        if (s.email) setEmail(s.email)
        if (s.phone) setPhone(s.phone)
        if (s.idType) setIdType(s.idType)
        if (s.idNumber) setIdNumber(s.idNumber)
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
    localStorage.setItem(`luggo_booking_${hub.id}`, JSON.stringify({ bags, start: startValue, end: endValue, name, email, phone, idType, idNumber }))
  }, [bags, startValue, endValue, name, email, phone, idType, idNumber, hub.id, isLoggedIn])

  // Auto-submit PayHere form
  useEffect(() => {
    if (payhereData && payhereFormRef.current) {
      localStorage.removeItem(`luggo_booking_${hub.id}`)
      payhereFormRef.current.submit()
    }
  }, [payhereData, hub.id])



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
          payment_method: paymentMethod,
          has_insurance: hasInsurance,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create booking. Please try again.')
        setLoading(false)
        return
      }
      if (paymentMethod === 'pay_at_hub') {
        router.push(`/booking/${data.bookingId}?payment=success`)
      } else {
        setPayhereData(data.payhere)
      }
    } catch {
      setError('Network error. Please check your connection.')
      setLoading(false)
    }
  }

  function handlePhoneChange(newVal: string) {
    setPhone(newVal)
    if (isLoggedIn && initialProfile?.phone) {
      const formattedNew = formatPhone(newVal)
      const formattedSaved = formatPhone(initialProfile.phone)
      if (formattedNew === formattedSaved && formattedSaved !== '') {
        setPhoneVerificationStatus('verified')
      } else {
        setPhoneVerificationStatus('not_verified')
      }
    } else {
      setPhoneVerificationStatus('not_verified')
    }
  }

  // OTP Send
  async function handleSendPhoneOtp() {
    if (!isValidSriLankanPhone(phone)) {
      setError('Please enter a valid Sri Lankan phone number (e.g. 07XXXXXXXX).')
      return
    }
    setError(null)
    setPhoneVerificationStatus('otp_sending')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatPhone(phone) }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) {
        setPhoneVerificationStatus('error')
        setError(data.error ?? 'Failed to send SMS.')
        return
      }
      setPhoneVerificationStatus('otp_sent')
      setCountdown(60)
    } catch {
      setLoading(false)
      setPhoneVerificationStatus('error')
      setError('Failed to send code. Please check your connection.')
    }
  }

  // OTP Verify
  async function handleVerifyPhoneOtp() {
    if (otpValue.length < OTP_LENGTH) return
    setError(null)
    setPhoneVerificationStatus('otp_verifying')
    setLoading(true)
    try {
      // Save state to localStorage to auto-resume on reload
      const saved = localStorage.getItem(`luggo_booking_${hub.id}`)
      if (saved) {
        const s = JSON.parse(saved)
        localStorage.setItem(`luggo_booking_${hub.id}`, JSON.stringify({ ...s, autoSubmit: true }))
      } else {
        localStorage.setItem(`luggo_booking_${hub.id}`, JSON.stringify({
          bags, start: startValue, end: endValue, name, email, phone, idType, idNumber, autoSubmit: true
        }))
      }

      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formatPhone(phone),
          otp: otpValue,
          name: name.trim(),
          email: email.trim(),
          nic: idNumber.trim()
        }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) {
        setPhoneVerificationStatus('error')
        setError(data.error ?? 'Incorrect or expired code.')
        setOtpValue('')
        return
      }
      setPhoneVerificationStatus('verified')
      router.refresh()
      submitBooking()
    } catch {
      setLoading(false)
      setPhoneVerificationStatus('error')
      setError('Verification failed. Please check your connection.')
    }
  }

  function handlePayClick() {
    setError(null)
    if (!timesValid) {
      setError('Please select valid drop-off and pick-up times within operating hours.')
      return
    }
    if (totalBags === 0) {
      setError('Please add at least one bag.')
      return
    }
    if (!isLoggedIn) {
      if (name.trim().length < 2) {
        setError('Please enter your full name (minimum 2 characters).')
        return
      }
      if (!isEmail(email)) {
        setError('Please enter a valid email address.')
        return
      }
      if (!isValidSriLankanPhone(phone)) {
        setError('Please enter a valid Sri Lankan phone number (e.g. +94 77 123 4567).')
        return
      }
      if (phoneVerificationStatus !== 'verified') {
        setError('Please verify your phone number with the SMS OTP code.')
        return
      }
      if (idNumber.trim() && !isValidId(idType, idNumber)) {
        setError(`Please enter a valid ${idType} number.`)
        return
      }
    }
    if (!noIllegalItems) {
      setError('Please confirm the prohibited items declaration.')
      return
    }
    submitBooking()
  }

  // ── Render Components ──────────────────────────────────────────────────────

  const summaryBlock = (
    <div className="space-y-4">
      <div className="hidden lg:block">
        <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-widest opacity-50">Booking Summary</h3>
      </div>
      
      {/* Hub info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center shrink-0 text-brand">
          <Package size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Hub Location</p>
          <p className="text-sm font-bold text-gray-900 truncate">{hub.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
        {/* Time Window */}
        <div className={`flex items-center gap-4 p-4 transition-opacity ${timesValid ? 'opacity-100' : 'opacity-30'}`}>
          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
            <CalendarDays size={18} className="text-gray-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Time Window</p>
            {timesValid ? (
              <>
                <p className="text-sm font-bold text-gray-900">
                  {startDate && format(startDate, 'dd MMM, HH:mm')} → {endDate && format(endDate, 'dd MMM, HH:mm')}
                </p>
                <p className="text-[10px] text-brand font-black mt-1 uppercase tracking-wider">
                  {hours} hr{hours !== 1 ? 's' : ''} storage duration
                </p>
              </>
            ) : (
              <p className="text-xs font-semibold text-gray-300 italic">Select times to proceed</p>
            )}
          </div>
        </div>

        {/* Bags */}
        <div className={`p-4 transition-opacity ${totalBags > 0 ? 'opacity-100' : 'opacity-30'}`}>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
              <Shield size={18} className="text-gray-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Items</p>
              <p className="text-sm font-bold text-gray-900">
                {totalBags > 0 ? `${totalBags} Item${totalBags > 1 ? 's' : ''}` : 'No items added'}
              </p>
            </div>
          </div>
          {totalBags > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-14">
              {(Object.entries(bags) as [BagType, number][]).filter(([, q]) => q > 0).map(([type, qty]) => (
                <span key={type} className="text-[10px] bg-brand/5 text-brand font-bold px-2.5 py-1 rounded-lg border border-brand/10">
                  {BAG_EMOJIS[type]} {qty}× {LOCAL_BAG_LABELS[type]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price Breakdown */}
        {totalPrice > 0 && (
          <div className="p-4 bg-gray-50/50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 opacity-60">Price Breakdown</p>
            {(Object.entries(bags) as [BagType, number][]).filter(([, q]) => q > 0).map(([type, qty]) => (
              <div key={type} className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-medium">{qty}× {LOCAL_BAG_LABELS[type]} × {hours}h</span>
                <span className="font-bold text-gray-900 tabular-nums font-mono">LKR {(LOCAL_BAG_RATES[type] * qty * hours).toLocaleString()}</span>
              </div>
            ))}
            {hasInsurance && (
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-medium">🛡️ Luggage Protection ({totalBags} bag{totalBags > 1 ? 's' : ''})</span>
                <span className="font-bold text-gray-900 tabular-nums font-mono">LKR {insurancePrice.toLocaleString()}</span>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total Amount</p>
                <p className="text-2xl font-black text-gray-900 leading-none tracking-tight">LKR {totalPrice.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-widest">
                <ShieldCheck size={11} strokeWidth={3} />
                Secure
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guest Summary */}
      {!isLoggedIn && (name || phone || email || idNumber) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Booking Guest</p>
          {name && <p className="text-xs font-bold text-gray-700">Name: <span className="text-gray-900 font-semibold">{name}</span></p>}
          {phone && <p className="text-xs font-bold text-gray-700">Phone: <span className="text-gray-900 font-semibold font-mono">{formatPhone(phone)}</span></p>}
          {email && <p className="text-xs font-bold text-gray-700">Email: <span className="text-gray-900 font-semibold">{email}</span></p>}
          {idNumber && <p className="text-xs font-bold text-gray-700">ID: <span className="text-gray-900 font-semibold font-mono">{idType} ({maskIdNumber(idNumber)})</span></p>}
        </div>
      )}

      {/* Secure Payment Note */}
      {paymentMethod === 'pay_online' && (
        <p className="text-[10px] text-center text-gray-400 font-medium">
          🔒 Secure payment. Booking confirmation will be sent after payment.
        </p>
      )}
    </div>
  )

  return (
    <div className="pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Form Content */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">Book your storage</h2>
              <p className="text-sm text-gray-400">Choose your time, luggage items, and payment method</p>
            </div>

                    {/* Hub Card */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center shrink-0 text-brand">
                          <Package size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900 leading-tight">{hub.name}</h3>
                          <p className="text-xs text-gray-400 font-semibold mt-0.5">{hub.address}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-50 flex flex-wrap gap-x-6 gap-y-2 justify-between items-center">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                          <Clock size={14} className="text-brand" />
                          <span>Operating hours: {hub.open_time.slice(0, 5)} – {hub.close_time.slice(0, 5)}</span>
                        </div>
                        <p className="text-[10px] font-black text-brand uppercase tracking-widest bg-brand/5 px-2.5 py-1 rounded-lg border border-brand/10">Luggo Hub</p>
                      </div>
                    </div>

                    {/* Time selection */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 pl-1">Storage Times</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Drop-off Date/Time */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center pr-1">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">
                              <CalendarDays size={14} className="text-brand" /> Drop-off
                            </label>
                            <span className="text-[9px] font-extrabold text-gray-400 bg-gray-100/80 px-2 py-0.5 rounded-full uppercase">
                              Open {hub.open_time.slice(0, 5)} - {hub.close_time.slice(0, 5)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                            <input
                              type="date"
                              min={minDatetime.split('T')[0]}
                              value={dropOffDate}
                              onChange={e => handleDropOffChange(e.target.value, dropOffTime)}
                              className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-inner"
                            />
                            <input
                              type="time"
                              min={getMinDropOffTime()}
                              max={hub.close_time.slice(0, 5)}
                              value={dropOffTime}
                              onChange={e => handleDropOffChange(dropOffDate, e.target.value)}
                              className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Pick-up Date/Time */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center pr-1">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">
                              <Clock size={14} className="text-brand" /> Pick-up
                            </label>
                            <span className="text-[9px] font-extrabold text-gray-400 bg-gray-100/80 px-2 py-0.5 rounded-full uppercase">
                              Open {hub.open_time.slice(0, 5)} - {hub.close_time.slice(0, 5)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                            <input
                              type="date"
                              min={dropOffDate || minDatetime.split('T')[0]}
                              value={pickUpDate}
                              onChange={e => handlePickUpChange(e.target.value, pickUpTime)}
                              className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-inner"
                            />
                            <input
                              type="time"
                              min={getMinPickUpTime()}
                              max={hub.close_time.slice(0, 5)}
                              value={pickUpTime}
                              onChange={e => handlePickUpChange(pickUpDate, e.target.value)}
                              className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-inner"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Storage Duration Pill */}
                      {timesValid && hours > 0 ? (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl py-2.5 px-4">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                          <p className="text-xs font-bold text-emerald-700">
                            Storage duration: <span className="font-extrabold">{hours} hour{hours !== 1 ? 's' : ''}</span>
                          </p>
                        </div>
                      ) : (
                        (dropOffDate && dropOffTime && pickUpDate && pickUpTime) && (
                          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl py-2.5 px-4">
                            <AlertCircle size={14} className="text-amber-500 shrink-0" />
                            <p className="text-xs font-bold text-amber-700">
                              {!isFutureStart ? 'Drop-off time must be in the future.' : !timesWithinOperating ? 'Selected times must be within hub operating hours.' : 'Pick-up time must be after drop-off time.'}
                            </p>
                          </div>
                        )
                      )}
                    </div>

                    {/* Bag selection */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 pl-1">Luggage Items</h3>
                      <div className="space-y-3.5">
                        {(Object.keys(LOCAL_BAG_LABELS) as BagType[]).map((type) => {
                          const qty = bags[type]
                          const isActive = qty > 0
                          return (
                            <div
                              key={type}
                              className={`bg-white rounded-[2rem] border shadow-sm p-4 flex items-center gap-4 transition-all duration-300 ${
                                isActive ? 'border-brand/40 bg-brand/[0.04] ring-1 ring-brand/10' : 'border-gray-100'
                              }`}
                            >
                              {/* Icon */}
                              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem] flex items-center justify-center text-3xl shrink-0 transition-colors ${
                                isActive ? 'bg-brand/15' : 'bg-gray-50'
                              }`}>
                                {BAG_EMOJIS[type]}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-base">{LOCAL_BAG_LABELS[type]}</p>
                                <p className="text-xs font-bold text-gray-400 mt-0.5 line-clamp-1">{LOCAL_BAG_DESC[type]}</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                  <span className="text-[10px] uppercase font-black text-brand tracking-widest">Rate</span>
                                  <p className="text-sm font-black text-brand tabular-nums font-mono">LKR {LOCAL_BAG_RATES[type].toLocaleString()}/hr</p>
                                </div>
                              </div>

                              {/* Counter */}
                              <div className="flex items-center gap-3 shrink-0 bg-gray-100/50 p-2 rounded-2xl">
                                <button
                                  type="button"
                                  onClick={() => bags[type] > 0 && setBags({ ...bags, [type]: bags[type] - 1 })}
                                  disabled={bags[type] === 0}
                                  className={`w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-sm ${
                                    bags[type] > 0 ? 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50' : 'bg-transparent text-gray-300 cursor-not-allowed'
                                  }`}
                                >
                                  <Minus size={18} strokeWidth={3} />
                                </button>
                                <span className="w-6 text-center font-black text-gray-900 text-xl tabular-nums font-mono">
                                  {bags[type]}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => totalBags < 10 && setBags({ ...bags, [type]: bags[type] + 1 })}
                                  disabled={totalBags >= 10}
                                  className={`w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg ${
                                    totalBags < 10 ? 'bg-brand text-white border border-brand hover:scale-105' : 'bg-transparent text-gray-300 cursor-not-allowed'
                                  }`}
                                >
                                  <Plus size={18} strokeWidth={3} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {totalBags >= 10 && (
                        <p className="text-center text-xs text-amber-600 font-bold bg-amber-50 border border-amber-100 rounded-2xl py-3 px-4 flex items-center justify-center gap-2">
                          <AlertCircle size={14} /> Maximum 10 bags per booking
                        </p>
                      )}
                    </div>

                    {!isLoggedIn && (
                      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 lg:p-8 space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Customer Details</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Required for luggage drop-off</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <FieldInput label="Full name" icon={User} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
                          <FieldInput label="Email address" icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. john@example.com" />
                          
                          <div className="space-y-1">
                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">
                              <Shield size={12} className="text-brand" />
                              ID type
                            </label>
                            <select
                              value={idType}
                              onChange={e => setIdType(e.target.value as 'NIC' | 'Passport')}
                              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all"
                            >
                              <option value="NIC">NIC</option>
                              <option value="Passport">Passport</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <FieldInput
                              label="NIC / Passport number (Optional)"
                              icon={Fingerprint}
                              value={idNumber}
                              onChange={e => setIdNumber(e.target.value)}
                              placeholder={idType === 'NIC' ? 'e.g. 981234567V or 199812345678' : 'e.g. N1234567'}
                            />
                            <p className="text-[10px] text-gray-400 font-semibold pl-1 leading-relaxed">
                              💡 This will be checked against your physical ID at drop-off. If left blank, you can present it directly at the hub counter.
                            </p>
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <FieldInput
                              label="Phone number (SMS OTP verification)"
                              icon={Smartphone}
                              type="tel"
                              value={phone}
                              onChange={e => handlePhoneChange(e.target.value)}
                              placeholder="e.g. +94 77 123 4567"
                              disabled={phoneVerificationStatus === 'verified'}
                            />
                            <p className="text-[10px] text-gray-400 font-semibold pl-1 leading-relaxed">
                              🔒 A 6-digit SMS code will be sent to verify your phone number.
                            </p>
                          </div>
                        </div>

                        {phoneVerificationStatus === 'not_verified' && phone.trim().length >= 9 && (
                          <div className="flex justify-center pt-2">
                            <Button onClick={handleSendPhoneOtp} className="px-6 py-2.5 rounded-xl font-bold">
                              Send Verification Code
                            </Button>
                          </div>
                        )}

                        {phoneVerificationStatus === 'otp_sending' && (
                          <div className="flex items-center justify-center gap-2 py-4">
                            <Spinner className="text-brand" />
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Sending OTP...</p>
                          </div>
                        )}

                        {(phoneVerificationStatus === 'otp_sent' || phoneVerificationStatus === 'otp_verifying') && (
                          <div className="space-y-4">
                            <OtpInput value={otpValue} onChange={v => {
                              setOtpValue(v)
                              if (v.length === OTP_LENGTH) {
                                  setTimeout(handleVerifyPhoneOtp, 100)
                              }
                            }} />
                            
                            <div className="flex justify-center gap-3">
                              <Button
                                onClick={handleVerifyPhoneOtp}
                                loading={phoneVerificationStatus === 'otp_verifying'}
                                disabled={otpValue.length < OTP_LENGTH}
                                className="px-6 py-2 rounded-xl font-bold"
                              >
                                Verify Phone
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Luggage Protection Add-on */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <Shield size={20} className="stroke-[2.5]" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Luggage Protection</p>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Covered up to LKR 40,000 / bag</p>
                          </div>
                        </div>
                        
                        <label className="relative inline-flex items-center cursor-pointer mt-1 select-none">
                          <input
                            type="checkbox"
                            checked={hasInsurance}
                            onChange={e => setHasInsurance(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      <div className="pl-13 text-xs text-gray-500 leading-relaxed space-y-1.5">
                        <p className="font-semibold text-gray-700">
                          🛡️ Opt-in for Luggo Guarantee protection for just <span className="font-black text-emerald-600">LKR 150 per bag</span>.
                        </p>
                        <p>
                          Provides comprehensive coverage up to <span className="font-extrabold text-gray-800">LKR 40,000</span> against accidental damage, loss, or theft during storage.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Payment Method</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Select how you want to pay</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('pay_online')}
                          className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-start text-left gap-1 ${
                            paymentMethod === 'pay_online'
                              ? 'border-brand bg-brand/[0.04] text-gray-900 ring-1 ring-brand/10'
                              : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                          }`}
                        >
                          <p className="font-bold text-sm flex items-center gap-1.5">
                            💳 Pay Online (Card / Wallet)
                          </p>
                          <p className="text-[10px] opacity-70 leading-normal mt-1">
                            Pay securely online using credit/debit card, Genie, or mobile wallets via PayHere.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('pay_at_hub')}
                          className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-start text-left gap-1 ${
                            paymentMethod === 'pay_at_hub'
                              ? 'border-brand bg-brand/[0.04] text-gray-900 ring-1 ring-brand/10'
                              : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                          }`}
                        >
                          <p className="font-bold text-sm flex items-center gap-1.5">
                            💵 Pay at Hub (Cash on Arrival)
                          </p>
                          <p className="text-[10px] opacity-70 leading-normal mt-1">
                            Reserve online now, and pay in cash directly to our counter staff when you walk in to drop off your bags.
                          </p>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-4">
                      <label className={`flex items-start gap-4 cursor-pointer transition-all`}>
                        <div className="relative shrink-0 mt-1">
                          <input
                            type="checkbox"
                            checked={noIllegalItems}
                            onChange={e => setNoIllegalItems(e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
                            noIllegalItems ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-200' : 'border-gray-200 bg-white'
                          }`}>
                            {noIllegalItems && (
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={3}>
                                <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900 leading-snug">
                            I confirm my luggage does not contain prohibited, illegal, hazardous, perishable, or restricted items.
                          </p>
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                            ⚠️ Luggo may refuse storage if luggage appears unsafe, leaking, damaged, suspicious, or against storage rules.
                          </p>
                        </div>
                      </label>

                      <div className="border-t border-gray-50 pt-3">
                        <button
                          type="button"
                          onClick={() => setIsProhibitedExpanded(!isProhibitedExpanded)}
                          className="text-xs text-brand font-black hover:underline tracking-tight flex items-center gap-1"
                        >
                          {isProhibitedExpanded ? 'Hide prohibited items' : 'View prohibited items'}
                        </button>
                        
                        {isProhibitedExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 bg-red-50/50 border border-red-100/50 rounded-2xl p-4 text-xs text-red-900/80 space-y-1.5"
                          >
                            <p className="font-bold text-red-950 uppercase tracking-widest text-[9px] mb-1 pl-1">Prohibited Items List</p>
                            <ul className="list-disc pl-4 space-y-1">
                              <li>Illegal items</li>
                              <li>Weapons</li>
                              <li>Hazardous or flammable items</li>
                              <li>Perishable food</li>
                              <li>Strong-smelling items</li>
                              <li>Leaking liquids</li>
                              <li>Live animals</li>
                              <li>Cash, jewellery, or high-value items</li>
                              <li>Fragile items stored at customer’s own risk</li>
                              <li>Any item restricted by law or hub policy</li>
                            </ul>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

        {/* Right Column: Desktop Summary Sidebar */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-24">
          <div className="p-2">
            {summaryBlock}
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-8 flex items-start gap-4 bg-red-50 border border-red-100 rounded-3xl p-5 shadow-sm max-w-2xl mx-auto lg:mx-0">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-black text-red-900 uppercase tracking-widest mb-1">Attention Required</p>
            <p className="text-sm text-red-700 font-bold">{error}</p>
          </div>
        </div>
      )}

      {/* ── Fixed bottom action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-5 pb-safe z-[200] shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        <div className="max-w-5xl mx-auto flex items-center gap-4">

          {/* Live price pill (Mobile only) */}
          {totalBags > 0 && totalPrice > 0 && (
            <div className="lg:hidden flex-1 min-w-0 bg-gray-50 rounded-2xl px-5 py-2.5 border border-gray-100 shadow-inner">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">
                {totalBags} item{totalBags > 1 ? 's' : ''} · {hours}h
              </p>
              <p className="text-lg font-black text-gray-900 tracking-tight tabular-nums">
                LKR {totalPrice.toLocaleString()}
              </p>
            </div>
          )}

          {/* Next / Pay button */}
          <div className="flex-1">
            <Button
              onClick={handlePayClick}
              loading={loading}
              className="w-full h-14 rounded-2xl font-black text-base shadow-xl shadow-brand/20 transition-all active:scale-95 tracking-tight"
              disabled={!timesValid || totalBags === 0}
            >
              {paymentMethod === 'pay_at_hub' ? 'Confirm Reservation (Pay Cash at Hub)' : (totalPrice > 0 ? `Pay LKR ${totalPrice.toLocaleString()} Online` : 'Confirm & Proceed')}
            </Button>
          </div>
        </div>
      </div>

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
