'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { signInStaff } from '@/lib/auth/actions'
import { signInSchema, type SignInInput } from '@/lib/validators/auth'

export default function StaffLoginPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) })

  async function onSubmit(data: SignInInput) {
    setServerError(null)
    const result = await signInStaff(data)
    if (result?.error) setServerError(result.error)
  }

  return (
    <div className="min-h-screen bg-ocean-900 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-10 text-center">
        <Logo size="lg" variant="white" />
        <div className="mt-4 inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full">
          <ShieldCheck size={14} />
          Hub Staff Portal
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
        <h2 className="text-xl font-bold text-ocean-900 mb-1">Staff sign in</h2>
        <p className="text-sm text-gray-500 mb-6">
          Use your Luggo staff credentials to continue.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            id="staff-email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="staff@luggo.lk"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="staff-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password')}
          />

          {serverError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-brand-danger font-medium">
              {serverError}
            </div>
          )}

          <Button type="submit" fullWidth loading={isSubmitting} size="lg" className="mt-2">
            Sign in
          </Button>
        </form>
      </div>

      <p className="mt-8 text-white/40 text-xs text-center">
        Having trouble? Contact your hub manager.
      </p>
    </div>
  )
}
