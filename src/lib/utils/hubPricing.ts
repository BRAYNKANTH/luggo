import { type SupabaseClient } from '@supabase/supabase-js'
import { type BagType } from '@/types/database'
import { DEFAULT_BAG_RATES, type BagRates } from '@/lib/utils/pricing'

/**
 * Fetches this hub's effective bag rates from hub_bag_rates, falling back to
 * DEFAULT_BAG_RATES for any bag type the hub doesn't have a row for.
 */
export async function getHubBagRates(supabase: SupabaseClient, hubId: string): Promise<BagRates> {
  const { data } = await supabase
    .from('hub_bag_rates' as never)
    .select('bag_type, hourly_rate, daily_cap')
    .eq('hub_id', hubId) as {
      data: { bag_type: BagType; hourly_rate: number; daily_cap: number }[] | null
    }

  const rates: BagRates = { ...DEFAULT_BAG_RATES }
  data?.forEach(row => {
    rates[row.bag_type] = { hourlyRate: Number(row.hourly_rate), dailyCap: Number(row.daily_cap) }
  })
  return rates
}
