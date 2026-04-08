import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: { bookingId: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', params.bookingId)
    .eq('user_id', user.id)
    .maybeSingle() as { data: { status: string } | null; error: unknown }

  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ status: booking.status })
}

