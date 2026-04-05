import React from 'react'
import Link from 'next/link'
import { ChevronLeft, BarChart3 } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { getHubRevenue } from '@/lib/staff/actions'
import { RevenueReport } from '@/components/staff/RevenueReport'

export default async function StaffRevenuePage() {
  const result = await getHubRevenue()

  if ('error' in result) {
    return (
      <div className="min-h-screen bg-[#0f1923] text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-400 font-bold mb-4">Error loading revenue data</p>
        <p className="text-white/40 text-sm mb-6">{result.error}</p>
        <Link href="/staff/dashboard" className="bg-white/10 px-6 py-2 rounded-xl text-sm font-bold">
          Go Back
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1923] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0f1923]/95 backdrop-blur border-b border-white/8 px-4 py-3 flex items-center justify-between">
        <Link href="/staff/dashboard" className="flex items-center gap-1 text-white/50 hover:text-white text-sm transition-colors font-bold">
          <ChevronLeft size={16} /> Dashboard
        </Link>
        <Logo variant="white" size="sm" />
        <SignOutButton portal="staff" iconOnly />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Page title */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-brand/20 flex items-center justify-center">
            <BarChart3 size={24} className="text-brand-light" />
          </div>
          <div>
            <h1 className="text-xl font-black">Revenue Report</h1>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Performance & Earnings</p>
          </div>
        </div>

        <RevenueReport data={result} />
      </div>
    </div>
  )
}
