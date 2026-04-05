'use client'

import { LogOut } from 'lucide-react'
import { signOut, signOutStaff, signOutAdmin } from '@/lib/auth/actions'
import { cn } from '@/lib/utils/cn'

interface SignOutButtonProps {
  portal?: 'customer' | 'staff' | 'admin'
  className?: string
  iconOnly?: boolean
}

export function SignOutButton({
  portal = 'customer',
  className,
  iconOnly,
}: SignOutButtonProps) {
  const action = portal === 'staff' ? signOutStaff : portal === 'admin' ? signOutAdmin : signOut

  return (
    <form action={action}>
      <button
        type="submit"
        className={cn(
          'flex items-center gap-1.5 text-sm font-medium transition-colors',
          portal === 'staff'
            ? 'text-white/60 hover:text-white'
            : 'text-gray-500 hover:text-brand-danger',
          className
        )}
        aria-label="Sign out"
      >
        <LogOut size={16} />
        {!iconOnly && 'Sign out'}
      </button>
    </form>
  )
}
