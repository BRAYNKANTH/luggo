'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/shared/Sidebar'
import { BottomNav } from '@/components/shared/BottomNav'
import { InstallPrompt } from '@/components/shared/InstallPrompt'

const AUTH_PATHS = ['/login', '/forgot-password']

export function CustomerShell({
  children,
  activeCount = 0,
  isLoggedIn = false,
}: {
  children: React.ReactNode
  activeCount?: number
  isLoggedIn?: boolean
}) {
  const pathname = usePathname()

  if (AUTH_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar — desktop only */}
      <Sidebar isLoggedIn={isLoggedIn} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="min-h-full pb-nav md:pb-8">
          {children}
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav activeCount={activeCount} isLoggedIn={isLoggedIn} />
      <InstallPrompt />
    </div>
  )
}
