'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MapPin, BookOpen, User, LogOut, LogIn } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { signOut } from '@/lib/auth/actions'

const NAV_ALL = [
  { label: 'Home',        href: '/dashboard', icon: LayoutDashboard, guestOk: true  },
  { label: 'Map View',    href: '/hubs',      icon: MapPin,          guestOk: true  },
  { label: 'My Bookings', href: '/bookings',  icon: BookOpen,        guestOk: false },
  { label: 'Profile',     href: '/profile',   icon: User,            guestOk: false },
]

export function Sidebar({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const pathname = usePathname()
  const nav = NAV_ALL.filter(n => isLoggedIn || n.guestOk)

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 h-screen shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-50">
        <Logo size="sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                active
                  ? 'bg-brand/10 text-brand'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out (logged in) / Sign in (guest) */}
      <div className="px-3 py-3 border-t border-gray-50">
        {isLoggedIn ? (
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-semibold text-gray-500 hover:bg-brand/8 hover:text-brand transition-all duration-150"
          >
            <LogIn size={18} />
            Sign in
          </Link>
        )}
      </div>
    </aside>
  )
}
