'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MapPin, BookOpen, User, LogIn } from 'lucide-react'

const NAV_ALL = [
  { label: 'Home',     href: '/dashboard', icon: LayoutDashboard, badge: false, guestOk: true  },
  { label: 'Hubs',     href: '/hubs',      icon: MapPin,          badge: false, guestOk: true  },
  { label: 'Bookings', href: '/bookings',  icon: BookOpen,        badge: true,  guestOk: false },
  { label: 'Profile',  href: '/profile',   icon: User,            badge: false, guestOk: false },
]

export function BottomNav({ activeCount = 0, isLoggedIn = false }: { activeCount?: number; isLoggedIn?: boolean }) {
  const pathname = usePathname()
  const nav = isLoggedIn
    ? NAV_ALL
    : [
        ...NAV_ALL.filter(n => n.guestOk),
        { label: 'Sign In', href: '/login', icon: LogIn, badge: false, guestOk: true },
      ]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 pb-safe">
      <div className="flex items-stretch h-[60px]">
        {nav.map(({ label, href, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          const showBadge = badge && activeCount > 0
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-brand' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-brand text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {activeCount > 9 ? '9+' : activeCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold ${active ? 'opacity-100' : 'opacity-70'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
