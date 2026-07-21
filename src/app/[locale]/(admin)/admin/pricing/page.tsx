import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'
import { HubPricingCard } from '@/components/admin/HubPricingCard'
import { DEFAULT_BAG_RATES, type BagRates } from '@/lib/utils/pricing'
import { type UserRole, type BagType } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pricing — Admin' }

export default async function AdminPricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single() as { data: { name: string; role: UserRole } | null; error: unknown }

  const { data: hubs } = await supabase
    .from('hubs')
    .select('id, name, alias, active')
    .order('name') as {
      data: { id: string; name: string; alias: string; active: boolean }[] | null
      error: unknown
    }

  const { data: rateRows } = await supabase
    .from('hub_bag_rates' as never)
    .select('hub_id, bag_type, hourly_rate, daily_cap') as {
      data: { hub_id: string; bag_type: BagType; hourly_rate: number; daily_cap: number }[] | null
      error: unknown
    }

  const ratesByHub: Record<string, BagRates> = {}
  for (const hub of hubs ?? []) {
    ratesByHub[hub.id] = { ...DEFAULT_BAG_RATES }
  }
  for (const row of rateRows ?? []) {
    if (!ratesByHub[row.hub_id]) ratesByHub[row.hub_id] = { ...DEFAULT_BAG_RATES }
    ratesByHub[row.hub_id][row.bag_type] = { hourlyRate: Number(row.hourly_rate), dailyCap: Number(row.daily_cap) }
  }

  return (
    <AdminShell userName={profile?.name ?? '—'} userRole={profile?.role ?? 'admin'}>
      <div className="px-6 py-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-extrabold text-ocean-900 mb-1">Pricing</h1>
        <p className="text-sm text-gray-400 mb-8">
          Set the hourly rate and daily cap for each bag size, per hub. Changes apply immediately to new bookings,
          extensions, and late fees at that hub — existing bookings already priced are not affected.
        </p>

        <div className="space-y-4">
          {hubs?.map((hub) => (
            <HubPricingCard
              key={hub.id}
              hubId={hub.id}
              hubName={hub.name}
              hubAlias={hub.alias}
              hubActive={hub.active}
              rates={ratesByHub[hub.id] ?? DEFAULT_BAG_RATES}
            />
          ))}
        </div>

        {(!hubs || hubs.length === 0) && (
          <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <p className="font-medium">No hubs yet</p>
            <p className="text-sm mt-1">Add a hub first from the Hubs page, then set its pricing here.</p>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
