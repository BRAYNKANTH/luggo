import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uuidSchema } from '@/lib/validators/common'

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
  if (!uuidSchema.safeParse(bookingId).success) return NextResponse.json({ error: 'Valid bookingId required' }, { status: 400 })
  const { data: booking, error: bookingError } = await supabase.from('bookings').select('id').eq('id', bookingId!).eq('user_id', user.id).maybeSingle()
  if (bookingError) return NextResponse.json({ error: 'Unable to retrieve booking' }, { status: 500 })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // Call the Postgres function we defined in schema.sql
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('calculate_late_fee', {
    p_booking_id: bookingId,
  }) as { data: number | null; error: unknown }

  if (error) return NextResponse.json({ error: 'Failed to calculate late fee' }, { status: 500 })

  return NextResponse.json({ late_fee: data ?? 0 })
}
