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
    .select('status, user_id, hub_id')
    .eq('id', params.bookingId)
    .maybeSingle() as { data: { status: string; user_id: string; hub_id: string } | null; error: unknown }

  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 1. Authorize: Customer who owns the booking
  if (booking.user_id === user.id) {
    return NextResponse.json({ status: booking.status })
  }

  // 2. Authorize: Staff linked to the booking's hub
  const { data: staffLink } = await supabase
    .from('hub_staff')
    .select('id')
    .eq('user_id', user.id)
    .eq('hub_id', booking.hub_id)
    .eq('active', true)
    .maybeSingle()

  if (staffLink) {
    return NextResponse.json({ status: booking.status })
  }

  // 3. Authorize: Admins
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as { data: { role: string } | null }

  if (userProfile && ['support_admin', 'ops_admin', 'master_admin'].includes(userProfile.role)) {
    return NextResponse.json({ status: booking.status })
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}

