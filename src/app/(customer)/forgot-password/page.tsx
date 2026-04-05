'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { ChevronLeft, Mail, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
    })

    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-ocean-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-safe py-4">
        <Link href="/login" className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm font-bold transition-colors w-fit">
          <ChevronLeft size={18} />
          Back to login
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        <Logo variant="white" size="lg" className="mb-10" />

        {sent ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-brand-success/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-brand-success" />
            </div>
            <h2 className="text-xl font-extrabold text-white mb-2">Check your email</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              We sent a password reset link to <span className="text-white font-bold">{email}</span>.
              Check your inbox and follow the link.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-brand font-bold text-sm hover:text-brand/80 transition-colors"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-white mb-2">Reset password</h1>
            <p className="text-white/60 text-sm mb-8">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-white/10 border border-white/10 text-white placeholder-white/30 rounded-2xl pl-11 pr-4 py-4 text-sm font-medium focus:outline-none focus:border-brand/60 focus:bg-white/15 transition-all"
                />
              </div>

              {error && (
                <p className="text-brand-danger text-sm font-medium px-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand text-white font-bold py-4 rounded-2xl hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
