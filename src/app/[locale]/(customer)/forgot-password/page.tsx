'use client'

import { useState } from 'react'
import { Link } from '@/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Logo } from '@/components/ui/Logo'
import { ChevronLeft, Mail, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const t = useTranslations('Password')
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const next = `/${locale}/reset-password`
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(next)}`,
      })
      if (err) setError(err.message)
      else setSent(true)
    } catch {
      setError(t('sendFailed'))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-ocean-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-safe py-3">
        <Link href="/login" className="flex items-center gap-1.5 min-h-11 text-white/70 hover:text-white text-sm font-bold transition-colors w-fit">
          <ChevronLeft size={18} />
          {t('backToLogin')}
        </Link>
      </div>

      <main className="flex-1 flex flex-col justify-center px-6 pb-12 max-w-sm mx-auto w-full">
        <Logo variant="white" size="lg" className="mb-10" />

        {sent ? (
          <div role="status" className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-brand-success/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-brand-success" />
            </div>
            <h1 className="text-xl font-extrabold text-white mb-2">{t('checkEmail')}</h1>
            <p className="text-white/70 text-sm leading-relaxed">
              {t.rich('sentTo', { email: () => <span className="text-white font-bold">{email}</span> })}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex min-h-11 items-center text-brand-light font-bold text-sm hover:text-white transition-colors"
            >
              {t('backToLogin')}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-white mb-2">{t('resetTitle')}</h1>
            <p className="text-white/70 text-sm mb-8">{t('resetDesc')}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label htmlFor="reset-email" className="sr-only">{t('email')}</label>
                <Mail size={18} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-2xl pl-11 pr-4 py-4 text-sm font-medium focus:outline-none focus:border-brand-light focus:bg-white/15 transition-all"
                />
              </div>

              {error && (
                <p role="alert" className="text-red-300 text-sm font-medium px-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand text-white font-bold py-4 rounded-2xl hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? t('sending') : t('sendLink')}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
