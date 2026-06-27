import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyCron } from '@/lib/utils/cron'
import { sendSMS } from '@/lib/utils/sms'
import { sendOverstayedAlertEmail } from '@/lib/utils/email'

/**
 * Cron: mark-overstayed
 * Schedule: every 15 minutes  — "every-15-min" in vercel.json
 *
 * Finds `active_storage` bookings whose `end_time` has passed,
 * marks them `overstayed`, and sends an SMS + email alert to the
 * customer explaining that late fees now apply.
 */
export async function GET(req: NextRequest) {
  const authError = verifyCron(req)
  if (authError) return authError

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // Find newly overstayed bookings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: overdue, error: fetchError } = await (supabase.from('bookings') as any)
    .select(`
      id, end_time, hub_id,
      users ( id, name, email, phone ),
      hubs ( name )
    `)
    .eq('status', 'active_storage')
    .lt('end_time', now) as {
      data: {
        id: string
        end_time: string
        hub_id: string
        users: { id: string; name: string; email: string; phone: string | null } | null
        hubs: { name: string } | null
      }[] | null
      error: unknown
    }

  if (fetchError) {
    console.error('[cron/mark-overstayed] fetch error:', fetchError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const count = overdue?.length ?? 0
  if (count === 0) {
    console.log('[cron/mark-overstayed] no overstayed bookings')
    return NextResponse.json({ marked: 0 })
  }

  const ids = overdue!.map((b) => b.id)

  // Bulk update status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from('bookings') as any)
    .update({ status: 'overstayed' })
    .in('id', ids)

  if (updateError) {
    console.error('[cron/mark-overstayed] update error:', updateError)
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
  }

  console.log(`[cron/mark-overstayed] marked ${count} bookings as overstayed`)

  // Notify each customer (fire-and-forget)
  for (const booking of overdue!) {
    const userId   = booking.users?.id
    const hubName  = booking.hubs?.name ?? 'the hub'
    const userName = booking.users?.name ?? 'Customer'

    // In-app notification
    if (userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('notifications') as any).insert({
        user_id: userId,
        type: 'late_fee',
        message: `Your storage period at ${hubName} has ended. Late fees now apply — please collect your bags soon.`,
        read: false,
      })
    }

    // SMS
    if (booking.users?.phone) {
      sendSMS(
        booking.users.phone,
        `Luggo: Your storage at ${hubName} has ended. Late fees apply until you collect. Visit the app to request pickup.`
      ).catch(console.error)
    }

    // Email
    if (booking.users?.email) {
      sendOverstayedAlertEmail(booking.users.email, userName, hubName, booking.id).catch(console.error)
    }
  }

  return NextResponse.json({ marked: count, ids })
}
