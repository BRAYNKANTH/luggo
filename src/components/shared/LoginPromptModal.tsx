"use client"

import { Link, usePathname } from '@/navigation'
import { LogIn, Luggage } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'

export function LoginPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  return <Dialog open={open} onClose={onClose} title="Sign in to book">
    <div className="h-16 w-16 rounded-3xl bg-ocean-50 flex items-center justify-center mb-5"><Luggage size={32} className="text-ocean-600" /></div>
    <p className="text-gray-600 text-sm leading-relaxed mb-6">Create a free account to book storage, track your bags, and manage your bookings.</p>
    <div className="space-y-3">
      <Link href={`/login?returnTo=${encodeURIComponent(pathname)}`} className="flex items-center justify-center gap-2 w-full bg-ocean-600 text-white font-bold py-4 rounded-2xl hover:bg-ocean-700"><LogIn size={18} />Sign in / Create account</Link>
      <button type="button" onClick={onClose} className="w-full min-h-11 text-gray-600 font-medium py-2 text-sm hover:text-gray-900">Continue browsing</button>
    </div>
  </Dialog>
}
