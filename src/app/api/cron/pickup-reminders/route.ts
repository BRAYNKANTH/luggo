import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyCron } from '@/lib/utils/cron'
import { sendSMS } from '@/lib/utils/sms'
import { sendPickupReminderEmail } from '@/lib/utils/email'
import { format } from 'date-fns'

/**
 * Cron: pickup-reminders
 * Schedule: every 30 minutes  — "every-30-min" in vercel.json
 *
 * Finds `active_storage` bookings whose `end_time` falls in the
 * next 60–90 minute window and sends a one-shot pickup reminder
 * via SMS + email.
 *
 * The 60–90 min window prevents double-sending:
 *   Run at :00 catches bookings ending :60-:90 (i.e. 1:00-1:30)
 *   Run at :30 catches bookings ending 1:30-2:00
 * Each booking's end_time can only land in one 30-min window.
 */
export async function GET(req: NextRequest) {
  const authError = verifyCron(req)
  if (authError) return authError

  const supabase = createServiceClient()
  const now = Date.now()

  const windowEnd   = new Date(now + 90 * 60 * 1000).toISOString()   // now + 90 min

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upcoming, error: fetchError } = await (supabase.from('bookings') as any)
    .select(`
      id, end_time,
      users ( id, name, email, phone ),
      hubs ( name )
    `)
    .eq('status', 'active_storage')
    .lte('end_time', windowEnd)
    .is('reminder_sent_at', null) as {
      data: {
        id: string
        end_time: string
        users: { id: string; name: string; email: string; phone: string | null } | null
        hubs: { name: string } | null
      }[] | null
      error: unknown
    }

  if (fetchError) {
    console.error('[cron/pickup-reminders] fetch error:', fetchError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const count = upcoming?.length ?? 0
  if (count === 0) {
    console.log('[cron/pickup-reminders] no upcoming pickups in window')
    return NextResponse.json({ sent: 0 })
  }

  console.log(`[cron/pickup-reminders] sending reminders for ${count} bookings`)
  let sent = 0

  for (const booking of upcoming!) {
    const userId   = booking.users?.id
    const hubName  = booking.hubs?.name ?? 'the hub'
    const userName = booking.users?.name ?? 'Customer'
    const endTime  = new Date(booking.end_time)
    const minutesLeft = Math.round((endTime.getTime() - now) / 60000)
    const endFormatted = format(endTime, 'h:mm a')

    // Mark as sent immediately to avoid race conditions or duplicate sends
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('bookings') as any)
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', booking.id)

    // In-app notification
    if (userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('notifications') as any).insert({
        user_id: userId,
        type: 'pickup_reminder',
        message: `Reminder: your storage at ${hubName} ends at ${endFormatted} (in ~${minutesLeft} min). Please collect your bags on time to avoid late fees.`,
        read: false,
      })
    }

    // SMS
    if (booking.users?.phone) {
      sendSMS(
        booking.users.phone,
        `Luggo: Your storage at ${hubName} ends at ${endFormatted} (~${minutesLeft} min). Collect your bags on time to avoid late fees.`
      ).catch(console.error)
    }

    // Email
    if (booking.users?.email) {
      sendPickupReminderEmail(booking.users.email, userName, hubName, booking.id, endFormatted, minutesLeft).catch(console.error)
    }

    sent++
  }

  return NextResponse.json({ sent })
}
