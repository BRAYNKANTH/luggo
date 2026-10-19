'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/navigation'
import { LayoutDashboard, MapPin, BookOpen, User, LogIn } from 'lucide-react'

const NAV_ALL = [
  { key: 'home',     href: '/dashboard', icon: LayoutDashboard, badge: false, guestOk: true  },
  { key: 'hubs',     href: '/hubs',      icon: MapPin,          badge: false, guestOk: true  },
  { key: 'bookings', href: '/bookings',  icon: BookOpen,        badge: true,  guestOk: false },
  { key: 'profile',  href: '/profile',   icon: User,            badge: false, guestOk: false },
]

export function BottomNav({ activeCount = 0, isLoggedIn = false }: { activeCount?: number; isLoggedIn?: boolean }) {
  const t = useTranslations('Shell')
  const pathname = usePathname()
  const nav = isLoggedIn
    ? NAV_ALL
    : [
        ...NAV_ALL.filter(n => n.guestOk),
        { key: 'signIn', href: '/login', icon: LogIn, badge: false, guestOk: true },
      ]

  return (
    <nav aria-label={t('navLabel')} className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 pb-safe">
      <div className="flex items-stretch h-[60px]">
        {nav.map(({ key, href, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
          const showBadge = badge && activeCount > 0
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-brand' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="relative">
                <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-brand text-white text-[11px] font-black rounded-full flex items-center justify-center">
                    {activeCount > 9 ? '9+' : activeCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold max-w-full truncate px-1">
                {key === 'signIn' ? t('signIn') : t(`nav.${key}`)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
