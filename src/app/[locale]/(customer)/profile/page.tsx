'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User, CheckCircle, Phone, Fingerprint, Mail, ShieldCheck, AlertTriangle, LogOut, ChevronRight } from 'lucide-react'
import { Link } from '@/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { PageHeader } from '@/components/shared/PageHeader'
import { updateProfile, signOut } from '@/lib/auth/actions'
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validators/auth'
import { useUser } from '@/lib/hooks/useUser'

export default function ProfilePage({ searchParams }: { searchParams: { welcome?: string } }) {
  const { profile, loading } = useUser()
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
  })

  useEffect(() => {
    if (profile) reset({ name: profile.name, phone: profile.phone ?? '', nic_passport: profile.nic_passport ?? '' })
  }, [profile, reset])

  async function onSubmit(data: UpdateProfileInput) {
    setServerError(null)
    setSaved(false)
    const result = await updateProfile(data)
    if (result?.error) setServerError(result.error)
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" className="text-brand" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="My Profile"
        action={
          <form action={signOut}>
            <button type="submit" className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
              <LogOut size={14} /> Sign out
            </button>
          </form>
        }
      />

      <div className="px-4 md:px-6 py-6 space-y-5">
        {/* Welcome banner */}
        {searchParams.welcome && (
          <div className="bg-brand/10 border border-brand/20 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle size={18} className="text-brand mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-ocean-900 text-sm">Welcome to Luggo!</p>
              <p className="text-xs text-gray-600 mt-0.5">Complete your profile to enable fast checkout.</p>
            </div>
          </div>
        )}

        {/* Account info card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-ocean-900 flex items-center justify-center shrink-0">
              <User size={26} className="text-white/80" />
            </div>
            <div>
              <p className="font-bold text-gray-900">{profile?.name}</p>
              <p className="text-sm text-gray-500">{profile?.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-brand">
                <ShieldCheck size={14} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Account</p>
                <p className="text-xs font-semibold text-gray-700 capitalize">{profile?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-brand">
                <Mail size={14} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Email</p>
                <p className="text-xs font-semibold text-gray-700 truncate">{profile?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">Edit Details</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <User size={12} /> Full Name
              </label>
              <Input id="profile-name" type="text" autoComplete="name" error={errors.name?.message} {...register('name')} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Phone size={12} /> Phone Number
              </label>
              <Input id="profile-phone" type="tel" autoComplete="tel" placeholder="07XXXXXXXX"
                error={errors.phone?.message} {...register('phone')} />
              <p className="text-xs text-gray-400 mt-1">Used for SMS alerts and notifications</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Fingerprint size={12} /> NIC / Passport
              </label>
              <Input id="profile-nic" type="text" placeholder="e.g. 200012345678"
                error={errors.nic_passport?.message} {...register('nic_passport')} />
              <p className="text-xs text-gray-400 mt-1">Required to release your bags at check-out</p>
            </div>

            {serverError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2 text-xs text-red-700">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                {serverError}
              </div>
            )}

            {saved && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2 text-xs text-green-700 font-semibold">
                <CheckCircle size={14} />
                Profile saved successfully
              </div>
            )}

            <Button type="submit" fullWidth loading={isSubmitting} disabled={!isDirty} className="mt-2">
              Save Changes
            </Button>
          </form>
        </div>

        {/* General Options */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3">General</h2>
          <Link href="/" className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all text-sm font-semibold text-ocean-900 group">
            <span className="group-hover:text-brand transition-colors">Visit Public Homepage</span>
            <ChevronRight size={16} className="text-gray-400 group-hover:text-brand transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  )
}
