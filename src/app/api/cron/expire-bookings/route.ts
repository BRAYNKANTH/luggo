import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyCron } from '@/lib/utils/cron'

/**
 * Cron: expire-bookings
 * Schedule: every 5 minutes  — "every-5-min" in vercel.json
 *
 * Finds bookings stuck in `pending_payment` for > 30 minutes
 * and moves them to `expired`. No customer notification — they
 * abandoned the payment flow.
 */
export async function GET(req: NextRequest) {
  const authError = verifyCron(req)
  if (authError) return authError

  const supabase = createServiceClient()
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  // Fetch affected bookings first (for logging)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stale, error: fetchError } = await (supabase.from('bookings') as any)
    .select('id')
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff) as { data: { id: string }[] | null; error: unknown }

  if (fetchError) {
    console.error('[cron/expire-bookings] fetch error:', fetchError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const count = stale?.length ?? 0
  if (count === 0) {
    console.log('[cron/expire-bookings] nothing to expire')
    return NextResponse.json({ expired: 0 })
  }

  const ids = stale!.map((b) => b.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from('bookings') as any)
    .update({ status: 'expired' })
    .in('id', ids)

  if (updateError) {
    console.error('[cron/expire-bookings] update error:', updateError)
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
  }

  console.log(`[cron/expire-bookings] expired ${count} bookings:`, ids)
  return NextResponse.json({ expired: count, ids })
}
