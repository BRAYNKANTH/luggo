import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { WalkInForm } from '@/components/staff/WalkInForm'
import { getHubBagRates } from '@/lib/utils/hubPricing'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Walk-In — Staff' }

export default async function WalkInBookingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: staffRow } = await supabase
    .from('hub_staff')
    .select('hub_id, hubs(name)')
    .eq('user_id', user.id)
    .eq('active', true)
    .single() as {
      data: { hub_id: string; hubs: { name: string } | null } | null
      error: unknown
    }

  if (!staffRow) redirect('/staff/login')

  const hubId = staffRow.hub_id
  const hubName = staffRow.hubs?.name ?? 'Assigned Hub'
  const rates = await getHubBagRates(supabase, hubId)

  return (
    <div className="min-h-screen bg-ocean-900 text-white pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <Link
          href="/staff/dashboard"
          className="flex items-center gap-1 text-white/60 hover:text-white text-sm"
        >
          <ChevronLeft size={16} />
          Dashboard
        </Link>
        <Logo variant="white" size="sm" />
        <div className="w-10" />
      </div>

      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-light">New Walk-In customer</span>
          <h1 className="text-2xl font-extrabold mb-1 tracking-tight">Create Walk-In Booking</h1>
          <p className="text-white/50 text-xs">
            Register a walk-in guest at <strong className="text-white/80 font-bold">{hubName}</strong>. Fill customer details and expect pickup date/time to calculate fee.
          </p>
        </div>

        <WalkInForm hubId={hubId} rates={rates} />
      </div>
    </div>
  )
}
