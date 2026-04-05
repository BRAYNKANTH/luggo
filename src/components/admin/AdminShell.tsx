'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/ui/Logo'
import { SignOutButton } from '@/components/shared/SignOutButton'
import {
  LayoutDashboard,
  BookOpen,
  Building2,
  Tag,
  CreditCard,
  MessageSquare,
  Users,
  MapPinned,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'

const NAV = [
  { href: '/admin/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/admin/bookings',   label: 'Bookings',         icon: BookOpen },
  { href: '/admin/hubs',       label: 'Hubs',             icon: Building2 },
  { href: '/admin/stickers',   label: 'Sticker Batches',  icon: Tag },
  { href: '/admin/nearby',     label: 'Nearby Places',    icon: MapPinned },
  { href: '/admin/payments',   label: 'Payments',         icon: CreditCard },
  { href: '/admin/complaints', label: 'Complaints',       icon: MessageSquare },
  { href: '/admin/users',      label: 'Users',            icon: Users },
  { href: '/admin/staff',      label: 'Staff',            icon: ShieldCheck },
]

interface AdminShellProps {
  children: React.ReactNode
  userName: string
  userRole: string
}

export function AdminShell({ children, userName, userRole }: AdminShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebar = (
    <aside className="w-72 bg-ocean-900 text-white flex flex-col h-full shadow-[10px_0_40px_rgba(0,0,0,0.1)]">
      {/* Premium Logo Header */}
      <div className="px-8 py-10 border-b border-white/5 flex items-center justify-between">
        <Logo variant="white" size="sm" />
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-white/30 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center justify-between px-4 py-3.5 rounded-[1.2rem] text-sm font-bold transition-all ${
                active
                  ? 'bg-brand text-white shadow-lg shadow-brand/20'
                  : 'text-white/40 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                 <Icon size={18} strokeWidth={active ? 2.5 : 2} className={active ? 'text-white' : 'group-hover:text-brand-light transition-colors'} />
                 <span className="tracking-tight">{label}</span>
              </div>
              {active && <ChevronRight size={14} className="opacity-50" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer Profile */}
      <div className="px-6 py-8 border-t border-white/5 bg-black/10">
        <div className="flex items-center gap-4 mb-6">
           <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-light">
              <Users size={18} />
           </div>
           <div className="min-w-0">
             <p className="text-[10px] text-white/30 font-black uppercase tracking-widest leading-none mb-1">Authenticated as</p>
             <p className="text-sm font-black text-white truncate">{userName}</p>
             <p className="text-[10px] text-brand-light font-bold uppercase tracking-widest mt-0.5">
               {userRole.replace(/_/g, ' ')}
             </p>
           </div>
        </div>
        <SignOutButton portal="admin" />
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-gray-50/50 flex overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] flex lg:hidden">
          <div className="fixed inset-0 bg-ocean-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setMobileOpen(false)} />
          <motion.div 
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            className="relative z-50 flex h-full w-72"
          >
            {sidebar}
          </motion.div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto scroll-smooth">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between bg-ocean-900 px-6 py-5 sticky top-0 z-40 border-b border-white/5 shadow-xl shadow-ocean-900/10">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="text-white/50 hover:text-white transition-colors">
              <Menu size={24} />
            </button>
            <Logo variant="white" size="sm" />
          </div>
          <div className="h-8 w-8 rounded-full bg-brand/20 border border-brand/30" />
        </div>
        
        <div className="flex-1 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
