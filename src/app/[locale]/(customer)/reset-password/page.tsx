"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, Link } from '@/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Same rule as signUpSchema's password, with a translated message.
function isStrongPassword(password: string) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
}

export default function ResetPasswordPage() {
  const t = useTranslations('Password')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!isStrongPassword(password)) { setError(t('rules')); return }
    if (password !== confirmation) { setError(t('mismatch')); return }
    setLoading(true)
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password })
      if (updateError) { setError(updateError.message); return }
      router.replace('/profile?password=updated')
    } catch {
      setError(t('updateFailed'))
    } finally { setLoading(false) }
  }
  const toggleLabels = { showPasswordLabel: t('show'), hidePasswordLabel: t('hide') }
  return (
    <main className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-ocean-900 mb-3">{t('newTitle')}</h1>
      <p className="text-sm text-gray-600 mb-6">{t('rules')}</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">{t('newPassword')}
          <Input type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} {...toggleLabels} />
        </label>
        <label className="block text-sm font-medium">{t('confirmPassword')}
          <Input type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} {...toggleLabels} />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading} disabled={loading}>{t('save')}</Button>
      </form>
      <Link href="/forgot-password" className="inline-flex min-h-11 items-center mt-3 text-sm text-brand font-semibold">{t('requestAnother')}</Link>
    </main>
  )
}
