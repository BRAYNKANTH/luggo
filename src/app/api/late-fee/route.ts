import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/late-fee?bookingId=xxx
 * Returns the current late fee for a booking (0 if not overdue).
 * Used by the pickup flow to display the fee before the customer pays.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bookingId = req.nextUrl.searchParams.get('bookingId')
  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  // Call the Postgres function we defined in schema.sql
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('calculate_late_fee', {
    p_booking_id: bookingId,
  }) as { data: number | null; error: unknown }

  if (error) return NextResponse.json({ error: 'Failed to calculate late fee' }, { status: 500 })

  return NextResponse.json({ late_fee: data ?? 0 })
}
