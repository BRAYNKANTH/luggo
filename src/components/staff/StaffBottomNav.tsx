'use client'

import React from 'react'
import { Link, usePathname } from '@/navigation'
import { LayoutDashboard, Calendar, History, BarChart3, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Home',     href: '/staff/dashboard', icon: LayoutDashboard },
  { label: 'Schedule', href: '/staff/schedule',  icon: Calendar },
  { label: 'Revenue',  href: '/staff/reports/revenue', icon: BarChart3 },
  { label: 'History',  href: '/staff/bookings',  icon: History },
  { label: 'Profile',  href: '/staff/profile',   icon: Settings },
]

export function StaffBottomNav() {
  const pathname = usePathname()

  // Hide nav on login page
  if (pathname === '/staff/login') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-[#0f1923]/90 backdrop-blur-xl border-t border-white/5 pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-90 ${
                isActive ? 'text-brand-light font-black' : 'text-white/30 font-medium'
              }`}
            >
              <Icon size={isActive ? 22 : 18} />
              <span className={`text-[9px] uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-brand-light rounded-b-full shadow-lg shadow-brand-light/40" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
