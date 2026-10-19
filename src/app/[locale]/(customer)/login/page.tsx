'use client'

import { OtpInput } from '@/components/ui/OtpInput'

import { Suspense, useState, useEffect, useId } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@/navigation'
import { useSearchParams } from 'next/navigation'
import { Logo } from '@/components/ui/Logo'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
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

const headingClass = 'text-white font-extrabold text-xl mb-1'
const backClass = 'flex items-center gap-1 min-h-11 text-white/70 hover:text-white text-sm font-bold'
const primaryClass = 'w-full flex items-center justify-center gap-2 bg-brand text-white font-bold py-4 rounded-2xl hover:bg-brand/90 disabled:opacity-40 transition-all'

// ── Text field ────────────────────────────────────────────────
function Field({ label, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        {...props}
        id={inputId}
        className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-brand-light focus:bg-white/15 transition-all"
      />
    </div>
  )
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="text-red-300 text-sm font-medium">{children}</p>
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
  const t = useTranslations('Login')
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/'
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('signin')

  return (
    <div className="min-h-screen bg-ocean-900 flex flex-col">
      <div className="px-4 pt-safe py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-1.5 min-h-11 text-white/70 hover:text-white text-sm font-bold transition-colors w-fit">
          <ChevronLeft size={18} /> {t('home')}
        </Link>
        <LanguageSwitcher />
      </div>

      <main className="flex-1 flex flex-col justify-center px-6 pb-16 max-w-sm mx-auto w-full">
        <Logo variant="white" size="lg" className="mb-8" />

        {/* Tab switcher */}
        <div className="flex bg-white/10 rounded-2xl p-1 mb-8">
          {(['signin','signup'] as Tab[]).map(value => (
            <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)}
              className={`flex-1 min-h-11 py-2.5 text-sm font-bold rounded-xl transition-all ${
                tab === value ? 'bg-white text-ocean-900 shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              {value === 'signin' ? t('signIn') : t('createAccount')}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'signin'
            ? <SignInFlow key="signin" supabase={supabase} returnTo={returnTo} />
            : <SignUpFlow key="signup" supabase={supabase} returnTo={returnTo} />
          }
        </AnimatePresence>

        <p className="text-center text-xs text-white/70 mt-8">
          {t.rich('agree', {
            terms: (chunks) => <Link href="/terms" className="underline hover:text-white">{chunks}</Link>,
            privacy: (chunks) => <Link href="/privacy" className="underline hover:text-white">{chunks}</Link>,
          })}
        </p>
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SIGN IN — identifier → OTP
// ═══════════════════════════════════════════════════════════════
function SignInFlow({ supabase, returnTo }: { supabase: ReturnType<typeof createClient>, returnTo: string }) {
  const t = useTranslations('Login')
  const [step, setStep]           = useState<SignInStep>('identifier')
  const [identifier, setIdentifier] = useState('')
  const [method, setMethod]       = useState<Method>('email')
  const [otp, setOtp]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

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
      if (e) { setError(e.message?.toLowerCase().includes('user') ? t('noAccount') : e.message); return }
    } else {
      const res = await fetch('/api/auth/phone/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatPhone(identifier) }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) { setError(data.error ?? t('smsFailed')); return }
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
      if (e) { setError(t('badCode')); setOtp(''); return }
      window.location.href = returnTo
    } else {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatPhone(identifier), otp }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) { setError(data.error ?? t('badCode')); setOtp(''); return }
      window.location.href = returnTo
    }
  }

  const canSend = isEmail(identifier) || isPhone(identifier)

  return (
    <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.2 }}>
      {step === 'identifier' ? (
        <div className="space-y-4">
          <div>
            <h1 className={headingClass}>{t('welcomeBack')}</h1>
            <p className="text-white/70 text-sm">{t('welcomeBackDesc')}</p>
          </div>
          <Field label={t('emailOrPhone')} type="text" autoComplete="email"
            placeholder={t('emailOrPhonePlaceholder')}
            value={identifier} onChange={e => setIdentifier(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canSend && send()}
          />
          {error && <ErrorText>{error}</ErrorText>}
          <button type="button" onClick={send} disabled={!canSend || loading} className={primaryClass}>
            {loading ? t('sending') : <><span>{t('sendCode')}</span><ArrowRight size={18}/></>}
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
function SignUpFlow({ supabase, returnTo }: { supabase: ReturnType<typeof createClient>, returnTo: string }) {
  const t = useTranslations('Login')
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
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const detailsValid = name.trim().length >= 2 && isEmail(email) && isPhone(phone) && nic.trim().length >= 5

  async function checkAndContinue() {
    setError(null); setLoading(true)
    const res = await fetch('/api/auth/check-exists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), phone: formatPhone(phone) }),
    })
    const data = await res.json()
    setLoading(false)
    if (!data.canProceed) {
      setError(t('cannotCreate'))
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
      if (!res.ok) { setError(data.error ?? t('smsFailed')); return }
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
      if (e) { setError(t('badCode')); setOtp(''); return }
      window.location.href = returnTo
    } else {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatPhone(phone), otp, name: name.trim(), email: email.trim(), nic: nic.trim() }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) { setError(data.error ?? t('badCode')); setOtp(''); return }
      window.location.href = returnTo
    }
  }

  return (
    <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }} transition={{ duration:0.2 }}>
      {step === 'details' && (
        <div className="space-y-4">
          <div>
            <h1 className={headingClass}>{t('createTitle')}</h1>
            <p className="text-white/70 text-sm">{t('createDesc')}</p>
          </div>
          <Field label={t('fullName')} type="text" autoComplete="name" placeholder={t('fullNamePlaceholder')}
            value={name} onChange={e => setName(e.target.value)} />
          <Field label={t('email')} type="email" autoComplete="email" placeholder="you@email.com"
            value={email} onChange={e => setEmail(e.target.value)} />
          <Field label={t('phone')} type="tel" autoComplete="tel" placeholder="071 234 5678"
            value={phone} onChange={e => setPhone(e.target.value)} />
          <Field label={t('nic')} type="text" placeholder="987654321V"
            value={nic} onChange={e => setNic(e.target.value)} />
          {error && <ErrorText>{error}</ErrorText>}
          <button type="button" onClick={checkAndContinue} disabled={!detailsValid || loading} className={primaryClass}>
            {loading ? t('checking') : <><span>{t('continue')}</span><ArrowRight size={18}/></>}
          </button>
        </div>
      )}

      {step === 'method' && (
        <div className="space-y-4">
          <button type="button" onClick={() => setStep('details')} className={`${backClass} mb-2`}>
            <ChevronLeft size={16}/> {t('back')}
          </button>
          <div>
            <h1 className={headingClass}>{t('verifyTitle')}</h1>
            <p className="text-white/70 text-sm">{t('verifyDesc')}</p>
          </div>
          <button type="button" onClick={() => send('email')} disabled={loading}
            className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-brand/40 rounded-2xl p-4 text-left transition-all disabled:opacity-50">
            <div className="h-11 w-11 rounded-xl bg-brand/20 flex items-center justify-center shrink-0">
              <Mail size={20} className="text-brand-light" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm">{t('viaEmail')}</p>
              <p className="text-white/70 text-xs mt-0.5 truncate">{email}</p>
            </div>
            <ArrowRight size={16} className="text-white/50 ml-auto" />
          </button>
          <button type="button" onClick={() => send('phone')} disabled={loading}
            className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-brand/40 rounded-2xl p-4 text-left transition-all disabled:opacity-50">
            <div className="h-11 w-11 rounded-xl bg-brand/20 flex items-center justify-center shrink-0">
              <Smartphone size={20} className="text-brand-light" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{t('viaSms')}</p>
              <p className="text-white/70 text-xs mt-0.5">{formatPhone(phone)}</p>
            </div>
            <ArrowRight size={16} className="text-white/50 ml-auto" />
          </button>
          {loading && <p role="status" className="text-white/70 text-sm text-center">{t('sending')}</p>}
          {error && <ErrorText>{error}</ErrorText>}
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
  const t = useTranslations('Login')
  return (
    <div className="text-center space-y-6">
      <button type="button" onClick={onBack} className={`${backClass} mx-auto`}>
        <ChevronLeft size={16}/> {t('back')}
      </button>
      <div className="h-16 w-16 rounded-3xl bg-brand/20 flex items-center justify-center mx-auto">
        {method === 'email' ? <Mail size={28} className="text-brand-light"/> : <Smartphone size={28} className="text-brand-light"/>}
      </div>
      <div>
        <h1 className={headingClass}>{t('enterCode')}</h1>
        <p className="text-white/70 text-sm mt-1">{t.rich('sentTo', { target: () => <span className="text-white font-bold">{identifier}</span> })}</p>
      </div>
      <OtpInput dark value={otp} onChange={setOtp} label={t('codeLabel')} hint={t('codeHint')} />
      {error && <ErrorText>{error}</ErrorText>}
      <button type="button" onClick={onVerify} disabled={otp.length < OTP_LENGTH || loading} className={primaryClass}>
        {loading ? t('verifying') : t('verifyCode')}
      </button>
      <button type="button" onClick={onResend} disabled={countdown > 0 || loading}
        className="flex items-center justify-center gap-1.5 mx-auto min-h-11 px-3 text-sm font-bold text-white/70 hover:text-white disabled:opacity-50 transition-colors">
        <RefreshCw size={13}/>
        {countdown > 0 ? t('resendIn', { seconds: countdown }) : t('resend')}
      </button>
    </div>
  )
}
