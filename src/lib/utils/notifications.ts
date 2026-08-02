import { sendBookingConfirmedEmail } from '@/lib/utils/email'
import { sendSMS } from '@/lib/utils/sms'
import { formatInSLT } from '@/lib/utils/timezone'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendBookingConfirmedNotification(supabase: any, bookingId: string) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('user_id, start_time, end_time, total_price, qr_code, hubs(name, address), users(name, email, phone)')
    .eq('id', bookingId)
    .single()

  if (!booking) return

  const hubName    = booking.hubs?.name ?? 'the hub'
  const userName   = booking.users?.name ?? 'Customer'
  const userEmail  = booking.users?.email
  const userPhone  = booking.users?.phone
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // In-app notification
  await supabase.from('notifications').insert({
    user_id: booking.user_id,
    type: 'booking_confirmed',
    message: `Your booking at ${hubName} is confirmed. Show your QR code when you arrive.`,
    read: false,
  })

  // Email
  if (userEmail) {
    await sendBookingConfirmedEmail(userEmail, userName, hubName, bookingId, appUrl, {
      startTime: booking.start_time,
      endTime: booking.end_time,
      totalPrice: booking.total_price,
      address: booking.hubs?.address,
    }, booking.qr_code).catch(console.error)
  }

  // SMS
  if (userPhone) {
    const dateStr = formatInSLT(booking.start_time, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
    await sendSMS(
      userPhone,
      `Luggo: Booking confirmed at ${hubName}! Drop-off: ${dateStr}. Total: LKR ${Number(booking.total_price).toLocaleString()}. Ref: ${bookingId.slice(0, 8).toUpperCase()}`
    ).catch(console.error)
  }
}
