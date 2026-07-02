'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateUserRole } from '@/lib/admin/actions'
import { type UserRole } from '@/types/database'
import { AlertCircle } from 'lucide-react'

interface Props {
  userId: string
  currentRole: UserRole
  disabled?: boolean
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'hub_staff', label: 'Hub Staff' },
  { value: 'support_admin', label: 'Support Admin' },
  { value: 'ops_admin', label: 'Ops Admin' },
  { value: 'master_admin', label: 'Master Admin' },
]

export function UserRoleSelector({ userId, currentRole, disabled = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState<UserRole>(currentRole)
  const [error, setError] = useState<string | null>(null)

  function handleChange(newRole: UserRole) {
    if (newRole === role) return
    setError(null)

    startTransition(async () => {
      const result = await updateUserRole(userId, newRole)
      if (result.error) {
        setError(result.error)
        setRole(role) // Reset dropdown on error
      } else {
        setRole(newRole)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-1 w-fit">
      <select
        value={role}
        onChange={(e) => handleChange(e.target.value as UserRole)}
        disabled={disabled || isPending}
        className={`text-xs font-semibold px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white ${
          disabled
            ? 'border-gray-100 text-gray-400 bg-gray-50/50 cursor-not-allowed'
            : 'border-gray-200 text-ocean-900 hover:border-gray-300'
        }`}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-[10px] text-red-500 font-medium flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </span>
      )}
    </div>
  )
}
