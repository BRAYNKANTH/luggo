'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LayoutDashboard } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { signInAdmin } from '@/lib/auth/actions'
import { signInSchema, type SignInInput } from '@/lib/validators/auth'

export default function AdminLoginPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) })

  async function onSubmit(data: SignInInput) {
    setServerError(null)
    const result = await signInAdmin(data)
    if (result?.error) setServerError(result.error)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <Logo size="md" />
        <div className="mt-3 inline-flex items-center gap-2 text-gray-500 text-sm font-medium">
          <LayoutDashboard size={16} />
          Admin Dashboard
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-ocean-900 mb-1">Admin sign in</h2>
        <p className="text-sm text-gray-500 mb-6">
          Authorised personnel only.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            id="admin-email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="admin@luggo.lk"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="admin-password"
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

      <p className="mt-6 text-gray-400 text-xs text-center">
        Luggo Admin &mdash; Authorised access only
      </p>
    </div>
  )
}
