'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Logo } from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/client'
import { Mail, Smartphone, ArrowRight, ChevronLeft, RefreshCw } from 'lucide-react'

type Tab       = 'signin' | 'signup'
type SignInStep  = 'identifier' | 'otp'
type SignUpStep  = 'details' | 'method' | 'otp'
type Method    = 'email' | 'phone'

const OTP_LENGTH = 6

// ── helpers ──────────────────────────────────────────────────
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('94') && d.length >= 11) return `+${d}`
  if (d.startsWith('0'))  return `+94${d.slice(1)}`
  return `+94${d}`
}
function isEmail(v: string)  { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) }
function isPhone(v: string)  { return v.replace(/\D/g, '').length >= 9 }

// ── OTP boxes ─────────────────────────────────────────────────
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
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    onChange(p)
    refs.current[Math.min(p.length, OTP_LENGTH - 1)]?.focus()
  }
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input key={i} ref={el => { refs.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1}
          value={value[i] ?? ''} onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)} onPaste={handlePaste}
          className="w-11 h-14 text-center text-xl font-extrabold text-ocean-900 border-2 border-gray-200 rounded-2xl focus:border-brand focus:outline-none focus:bg-brand/5 transition-all bg-gray-50"
        />
      ))}
    </div>
  )
}

// ── field ─────────────────────────────────────────────────────
function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        {...props}
        className="w-full bg-white/10 border border-white/10 text-white placeholder-white/30 rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-brand/60 focus:bg-white/15 transition-all"
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ocean-900" />}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/'
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('signin')

  return (
    <div className="min-h-screen bg-ocean-900 flex flex-col">
      <div className="px-4 pt-safe py-4">
        <Link href="/" className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm font-bold transition-colors w-fit">
          <ChevronLeft size={18} /> Home
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-16 max-w-sm mx-auto w-full">
        <Logo variant="white" size="lg" className="mb-8" />

        {/* Tab switcher */}
        <div className="flex bg-white/10 rounded-2xl p-1 mb-8">
          {(['signin','signup'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                tab === t ? 'bg-white text-ocean-900 shadow-sm' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {t === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'signin'
            ? <SignInFlow key="signin" supabase={supabase} returnTo={returnTo} />
            : <SignUpFlow key="signup" supabase={supabase} returnTo={returnTo} />
          }
        </AnimatePresence>

        <p className="text-center text-xs text-white/30 mt-8">
          By continuing you agree to our{' '}
          <Link href="/terms" className="underline hover:text-white/60">Terms</Link>{' '}and{' '}
          <Link href="/privacy" className="underline hover:text-white/60">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SIGN IN — identifier → OTP
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
function SignInFlow({ supabase, returnTo }: { supabase: ReturnType<typeof createClient>, returnTo: string }) {
  const [step, setStep]           = useState<SignInStep>('identifier')
  const [identifier, setIdentifier] = useState('')
  const [method, setMethod]       = useState<Method>('email')
  const [otp, setOtp]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  useEffect(() => {
    if (otp.length === OTP_LENGTH && step === 'otp' && !loading) verify()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, loading])

  const detectedMethod: Method = isEmail(identifier) ? 'email' : 'phone'

  async function send() {
    setError(null); setLoading(true)
    const m = detectedMethod
    setMethod(m)

    if (m === 'email') {
      const { error: e } = await supabase.auth.signInWithOtp({
        email: identifier.trim(), options: { shouldCreateUser: false },
      })
      setLoading(false)
      if (e) { setError(e.message?.toLowerCase().includes('user') ? 'No account found. Please create an account first.' : e.message); return }
    } else {
      const res = await fetch('/api/auth/phone/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatPhone(identifier) }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) { setError(data.error ?? 'Failed to send SMS.'); return }
    }
    setStep('otp'); setCountdown(60)
  }

  async function verify() {
    if (otp.length < OTP_LENGTH || loading) return
    setError(null); setLoading(true)

    if (method === 'email') {
      const { error: e } = await supabase.auth.verifyOtp({
        email: identifier.trim(), token: otp, type: 'email',
      })
      setLoading(false)
      if (e) { setError('Incorrect or expired code.'); setOtp(''); return }
      window.location.href = returnTo
    } else {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatPhone(identifier), otp }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) { setError(data.error ?? 'Incorrect or expired code.'); setOtp(''); return }
      window.location.href = returnTo
    }
  }

  const canSend = isEmail(identifier) || isPhone(identifier)

  return (
    <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.2 }}>
      {step === 'identifier' ? (
        <div className="space-y-4">
          <div>
            <p className="text-white font-extrabold text-xl mb-1">Welcome back</p>
            <p className="text-white/50 text-sm">Enter your email or phone number.</p>
          </div>
          <Field label="Email or phone" type="text" autoComplete="email"
            placeholder="you@email.com or 071 234 5678"
            value={identifier} onChange={e => setIdentifier(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canSend && send()}
          />
          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
          <button onClick={send} disabled={!canSend || loading}
            className="w-full flex items-center justify-center gap-2 bg-brand text-white font-bold py-4 rounded-2xl hover:bg-brand/90 disabled:opacity-40 transition-all">
            {loading ? 'Sending…' : <><span>Send code</span><ArrowRight size={18}/></>}
          </button>
        </div>
      ) : (
        <OtpStep
          method={method}
          identifier={method === 'phone' ? formatPhone(identifier) : identifier}
          otp={otp} setOtp={setOtp}
          loading={loading} error={error} countdown={countdown}
          onVerify={verify}
          onBack={() => { setStep('identifier'); setOtp(''); setError(null) }}
          onResend={() => { setOtp(''); setError(null); send() }}
        />
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SIGN UP — details → method → OTP → done
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
function SignUpFlow({ supabase, returnTo }: { supabase: ReturnType<typeof createClient>, returnTo: string }) {
  const [step, setStep]       = useState<SignUpStep>('details')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [nic, setNic]         = useState('')
  const [method, setMethod]   = useState<'email' | 'phone'>('email')
  const [otp, setOtp]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  useEffect(() => {
    if (otp.length === OTP_LENGTH && step === 'otp' && !loading) verify()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, loading])

  const detailsValid = name.trim().length >= 2 && isEmail(email) && isPhone(phone) && nic.trim().length >= 5

  async function checkAndContinue() {
    setError(null); setLoading(true)
    const res = await fetch('/api/auth/check-exists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), phone: formatPhone(phone) }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.exists) {
      setError(data.field === 'email'
        ? 'An account with this email already exists. Please sign in.'
        : 'An account with this phone number already exists. Please sign in.')
      return
    }
    setStep('method')
  }

  async function send(m: Method) {
    setError(null); setLoading(true); setMethod(m)

    if (m === 'email') {
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
    setStep('otp'); setCountdown(60)
  }

  async function verify() {
    if (otp.length < OTP_LENGTH || loading) return
    setError(null); setLoading(true)

    if (method === 'email') {
      const { error: e } = await supabase.auth.verifyOtp({
        email: email.trim(), token: otp, type: 'email',
      })
      setLoading(false)
      if (e) { setError('Incorrect or expired code.'); setOtp(''); return }
      window.location.href = returnTo
    } else {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatPhone(phone), otp, name: name.trim(), email: email.trim(), nic: nic.trim() }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) { setError(data.error ?? 'Incorrect or expired code.'); setOtp(''); return }
      window.location.href = returnTo
    }
  }

  return (
    <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }} transition={{ duration:0.2 }}>
      {step === 'details' && (
        <div className="space-y-4">
          <div>
            <p className="text-white font-extrabold text-xl mb-1">Create your account</p>
            <p className="text-white/50 text-sm">Fill in your details to get started.</p>
          </div>
          <Field label="Full name" type="text" autoComplete="name" placeholder="Amal Perera"
            value={name} onChange={e => setName(e.target.value)} />
          <Field label="Email address" type="email" autoComplete="email" placeholder="you@email.com"
            value={email} onChange={e => setEmail(e.target.value)} />
          <Field label="Phone number" type="tel" autoComplete="tel" placeholder="071 234 5678"
            value={phone} onChange={e => setPhone(e.target.value)} />
          <Field label="NIC / Passport" type="text" placeholder="987654321V"
            value={nic} onChange={e => setNic(e.target.value)} />
          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
          <button onClick={checkAndContinue} disabled={!detailsValid || loading}
            className="w-full flex items-center justify-center gap-2 bg-brand text-white font-bold py-4 rounded-2xl hover:bg-brand/90 disabled:opacity-40 transition-all">
            {loading ? 'Checking…' : <><span>Continue</span><ArrowRight size={18}/></>}
          </button>
        </div>
      )}

      {step === 'method' && (
        <div className="space-y-4">
          <button onClick={() => setStep('details')} className="flex items-center gap-1 text-white/50 hover:text-white text-sm font-bold mb-2">
            <ChevronLeft size={16}/> Back
          </button>
          <div>
            <p className="text-white font-extrabold text-xl mb-1">Verify your account</p>
            <p className="text-white/50 text-sm">How would you like to receive your verification code?</p>
          </div>
          <button onClick={() => send('email')} disabled={loading}
            className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-brand/40 rounded-2xl p-4 text-left transition-all disabled:opacity-50">
            <div className="h-11 w-11 rounded-xl bg-brand/20 flex items-center justify-center shrink-0">
              <Mail size={20} className="text-brand" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Via Email</p>
              <p className="text-white/40 text-xs mt-0.5 truncate">{email}</p>
            </div>
            <ArrowRight size={16} className="text-white/30 ml-auto" />
          </button>
          <button onClick={() => send('phone')} disabled={loading}
            className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-brand/40 rounded-2xl p-4 text-left transition-all disabled:opacity-50">
            <div className="h-11 w-11 rounded-xl bg-brand/20 flex items-center justify-center shrink-0">
              <Smartphone size={20} className="text-brand" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Via SMS</p>
              <p className="text-white/40 text-xs mt-0.5">{formatPhone(phone)}</p>
            </div>
            <ArrowRight size={16} className="text-white/30 ml-auto" />
          </button>
          {loading && <p className="text-white/50 text-sm text-center">Sending code…</p>}
          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
        </div>
      )}

      {step === 'otp' && (
        <OtpStep
          method={method}
          identifier={method === 'phone' ? formatPhone(phone) : email}
          otp={otp} setOtp={setOtp}
          loading={loading} error={error} countdown={countdown}
          onVerify={verify}
          onBack={() => { setStep('method'); setOtp(''); setError(null) }}
          onResend={() => { setOtp(''); setError(null); send(method) }}
        />
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SHARED OTP STEP
// ═══════════════════════════════════════════════════════════════
function OtpStep({ method, identifier, otp, setOtp, loading, error, countdown, onVerify, onBack, onResend }: {
  method: Method; identifier: string; otp: string; setOtp: (v:string)=>void
  loading: boolean; error: string|null; countdown: number
  onVerify: ()=>void; onBack: ()=>void; onResend: ()=>void
}) {
  return (
    <div className="text-center space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-white/50 hover:text-white text-sm font-bold mx-auto">
        <ChevronLeft size={16}/> Back
      </button>
      <div className="h-16 w-16 rounded-3xl bg-brand/20 flex items-center justify-center mx-auto">
        {method === 'email' ? <Mail size={28} className="text-brand"/> : <Smartphone size={28} className="text-brand"/>}
      </div>
      <div>
        <p className="text-white font-extrabold text-xl">Enter your code</p>
        <p className="text-white/50 text-sm mt-1">Sent to <span className="text-white font-bold">{identifier}</span></p>
      </div>
      <OtpInput value={otp} onChange={setOtp} />
      {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
      <button onClick={onVerify} disabled={otp.length < OTP_LENGTH || loading}
        className="w-full flex items-center justify-center gap-2 bg-brand text-white font-bold py-4 rounded-2xl hover:bg-brand/90 disabled:opacity-40 transition-all">
        {loading ? 'Verifying…' : 'Verify code'}
      </button>
      <button onClick={onResend} disabled={countdown > 0 || loading}
        className="flex items-center justify-center gap-1.5 mx-auto text-sm font-bold text-white/40 hover:text-white/70 disabled:opacity-40 transition-colors">
        <RefreshCw size={13}/>
        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
      </button>
    </div>
  )
}
