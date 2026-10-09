'use client'

import { usePathname } from '@/navigation'
import { Sidebar } from '@/components/shared/Sidebar'
import { BottomNav } from '@/components/shared/BottomNav'
import { InstallPrompt } from '@/components/shared/InstallPrompt'

const AUTH_PATHS = ['/login', '/forgot-password', '/reset-password']

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
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      <a href="#main-content" className="skip-link">Skip to content</a>
      {/* Sidebar — desktop only */}
      <Sidebar isLoggedIn={isLoggedIn} />

      {/* Scrollable content */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 overflow-y-auto overscroll-contain">
        <div className="min-h-full pb-nav md:pb-8">
          {children}
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav activeCount={activeCount} isLoggedIn={isLoggedIn} />
      <InstallPrompt />
    </div>
  )
}
