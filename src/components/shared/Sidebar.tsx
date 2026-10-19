'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/navigation'
import { MapPin, LayoutDashboard, BookOpen, User, LogOut, LogIn } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { signOut } from '@/lib/auth/actions'

const NAV_ALL = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard, guestOk: true  },
  { key: 'hubs',      href: '/hubs',      icon: MapPin,          guestOk: true  },
  { key: 'bookings',  href: '/bookings',  icon: BookOpen,        guestOk: false },
  { key: 'profile',   href: '/profile',   icon: User,            guestOk: false },
] as const

export function Sidebar({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const t = useTranslations('Shell')
  const pathname = usePathname()
  const nav = NAV_ALL.filter(n => isLoggedIn || n.guestOk)

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 h-[100dvh] shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-50">
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </div>

      {/* Nav */}
      <nav aria-label={t('navLabel')} className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ key, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                active
                  ? 'bg-brand/10 text-brand'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {t(`nav.${key}`)}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pt-3">
        <LanguageSwitcher />
      </div>

      {/* Sign out (logged in) / Sign in (guest) */}
      <div className="px-3 py-3 border-t border-gray-50 mt-3">
        {isLoggedIn ? (
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
            >
              <LogOut size={18} />
              {t('signOut')}
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-semibold text-gray-600 hover:bg-brand/8 hover:text-brand transition-all duration-150"
          >
            <LogIn size={18} />
            {t('signIn')}
          </Link>
        )}
      </div>
    </aside>
  )
}
