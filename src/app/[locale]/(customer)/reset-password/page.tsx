"use client"

import { useState } from 'react'
import { useRouter, Link } from '@/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { signUpSchema } from '@/lib/validators/auth'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const result = signUpSchema.shape.password.safeParse(password)
    if (!result.success) { setError(result.error.issues[0].message); return }
    if (password !== confirmation) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password })
      if (updateError) { setError(updateError.message); return }
      router.replace('/profile?password=updated')
    } catch {
      setError('Unable to update your password. Please try again.')
    } finally { setLoading(false) }
  }
  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-ocean-900 mb-3">Set a new password</h1>
      <p className="text-sm text-gray-500 mb-6">Use at least 8 characters, one uppercase letter, and one number.</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">New password
          <Input type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">Confirm password
          <Input type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading} disabled={loading}>Save password</Button>
      </form>
      <Link href="/forgot-password" className="block mt-5 text-sm text-brand">Request another reset link</Link>
    </div>
  )
}
