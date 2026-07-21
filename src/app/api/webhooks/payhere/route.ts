import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyPayhereIPN } from '@/lib/utils/payhere'

/**
 * PayHere IPN (Instant Payment Notification) webhook.
 * PayHere POSTs form-encoded data after every payment attempt.
 * Must respond 200 OK quickly — PayHere retries on failure.
 *
 * order_id formats:
 *   {bookingId}        → initial booking payment
 *   lf-{paymentId}     → late fee payment
 *
 * NOTE: Uses service-role client — RLS must not block these updates.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const merchant_id      = formData.get('merchant_id')?.toString() ?? ''
    const order_id         = formData.get('order_id')?.toString() ?? ''
    const payment_id       = formData.get('payment_id')?.toString() ?? ''
    const payhere_amount   = formData.get('payhere_amount')?.toString() ?? ''
    const payhere_currency = formData.get('payhere_currency')?.toString() ?? ''
    const status_code      = formData.get('status_code')?.toString() ?? ''
    const md5sig           = formData.get('md5sig')?.toString() ?? ''

    const merchant_secret = process.env.PAYHERE_MERCHANT_SECRET!
    const expectedMerchantId = process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID!

    console.log('[PayHere IPN] Received:', { order_id, status_code, payhere_amount })

    const isValid = verifyPayhereIPN({
      merchant_id, order_id, payhere_amount, payhere_currency,
      status_code, md5sig, merchant_secret,
    })

    if (!isValid) {
      console.warn('[PayHere IPN] Invalid signature or non-success status', { order_id, status_code })
      return NextResponse.json({ received: true })
    }

    if (merchant_id !== expectedMerchantId || payhere_currency !== 'LKR') {
      console.warn('[PayHere IPN] Merchant or currency mismatch', { merchant_id, payhere_currency, order_id })
      return NextResponse.json({ received: true })
    }

    // Service client — bypasses RLS for trusted server-side updates
    const supabase = createServiceClient()

    // ── Late fee payment: order_id = "lf-{paymentId}" ────────────────────
    if (order_id.startsWith('lf-')) {
      const paymentId = order_id.slice(3)

      const { data: lateFeePayment } = await supabase
        .from('payments' as never)
        .select('id, booking_id, amount')
        .eq('id', paymentId)
        .eq('type', 'late_fee')
        .eq('status', 'pending')
        .maybeSingle() as { data: { id: string; booking_id: string; amount: number } | null }

      if (!lateFeePayment || Number(payhere_amount) !== Number(lateFeePayment.amount)) {
        console.warn('[PayHere IPN] Late fee amount mismatch', { paymentId, payhere_amount })
        return NextResponse.json({ received: true })
      }

      await supabase
        .from('payments' as never)
        .update({ status: 'paid', gateway_ref: payment_id })
        .eq('id', lateFeePayment.id)
        .eq('status', 'pending')

      if (lateFeePayment.booking_id) {
        const bookingId = lateFeePayment.booking_id
        const { error } = await supabase
          .from('bookings' as never)
          .update({ status: 'pickup_requested' })
          .eq('id', bookingId)
          .in('status', ['active_storage', 'overstayed'])

        if (error) {
          console.error('[PayHere IPN] Failed to advance booking after late fee', bookingId, error)
        } else {
          console.log('[PayHere IPN] Late fee paid, pickup_requested', bookingId)
          await sendLateFeeNotification(supabase, bookingId, Number(payhere_amount)).catch(console.error)
        }
      }

      return NextResponse.json({ received: true })
    }

    // ── Early check-in fee payment: order_id = "ec-{paymentId}" ───────────
    if (order_id.startsWith('ec-')) {
      const paymentId = order_id.slice(3)

      const { data: ecPayment } = await supabase
        .from('payments' as never)
        .select('id, booking_id, amount, status')
        .eq('id', paymentId)
        .eq('type', 'early_checkin')
        .maybeSingle() as { data: { id: string; booking_id: string; amount: number; status: string } | null }

      if (!ecPayment) {
        console.warn('[PayHere IPN] Early check-in payment not found', { paymentId })
        return NextResponse.json({ received: true })
      }

      if (ecPayment.status === 'paid') {
        console.log('[PayHere IPN] Early check-in payment already processed (idempotent)', { paymentId })
        return NextResponse.json({ received: true })
      }

      if (ecPayment.status !== 'pending') {
        console.warn('[PayHere IPN] Early check-in payment not pending', { paymentId, status: ecPayment.status })
        return NextResponse.json({ received: true })
      }

      if (Number(payhere_amount) !== Number(ecPayment.amount)) {
        console.warn('[PayHere IPN] Early check-in amount mismatch', { paymentId, payhere_amount, expected: ecPayment.amount })
        return NextResponse.json({ received: true })
      }

      await supabase
        .from('payments' as never)
        .update({ status: 'paid', gateway_ref: payment_id })
        .eq('id', ecPayment.id)

      if (ecPayment.booking_id) {
        const bookingId = ecPayment.booking_id
        
        const { data: booking } = await supabase
          .from('bookings' as never)
          .select('status')
          .eq('id', bookingId)
          .single() as { data: { status: string } | null }

        if (booking && booking.status === 'early_checkin_pending_payment') {
          const { error } = await supabase
            .from('bookings' as never)
            .update({ 
              status: 'arrived', 
              early_checkin_payment_status: 'paid' 
            })
            .eq('id', bookingId)
            .eq('status', 'early_checkin_pending_payment')

          if (error) {
            console.error('[PayHere IPN] Failed to update booking after early check-in payment', bookingId, error)
          } else {
            console.log('[PayHere IPN] Early check-in payment confirmed, booking status: arrived', bookingId)
          }
        } else {
          console.log('[PayHere IPN] Booking is already processed or not in early_checkin_pending_payment status', { bookingId, status: booking?.status })
        }
      }

      return NextResponse.json({ received: true })
    }

    // ── Extension payment: order_id = "ext_{paymentId}_{hours}" ───────────────────
    if (order_id.startsWith('ext_') || order_id.startsWith('ext-')) {
      const isUnderscore = order_id.startsWith('ext_')
      const parts = isUnderscore ? order_id.split('_') : order_id.split('-')
      const paymentId = parts[1]
      let addedHours = parts[2] ? parseInt(parts[2], 10) : 0

      const { data: extPayment } = await supabase
        .from('payments' as never)
        .select('id, booking_id, amount')
        .eq('id', paymentId)
        .eq('type', 'extension')
        .eq('status', 'pending')
        .maybeSingle() as { data: { id: string; booking_id: string; amount: number } | null }

      if (!extPayment || Number(payhere_amount) !== Number(extPayment.amount)) {
        console.warn('[PayHere IPN] Extension amount mismatch', { paymentId, payhere_amount })
        return NextResponse.json({ received: true })
      }

      await supabase
        .from('payments' as never)
        .update({ status: 'paid', gateway_ref: payment_id })
        .eq('id', extPayment.id)
        .eq('status', 'pending')

      if (extPayment.booking_id) {
        const bookingId = extPayment.booking_id
        
        const { data: booking } = await supabase
          .from('bookings' as never)
          .select('hub_id, end_time, status, booking_bags(bag_type)')
          .eq('id', bookingId)
          .single() as { data: { hub_id: string; end_time: string; status: string; booking_bags: { bag_type: string }[] } | null }

        if (booking) {
          if (!addedHours) {
            // Fallback to calculation if hours not in orderId
            const { getHubBagRates } = await import('@/lib/utils/hubPricing')
            const fallbackRates = await getHubBagRates(supabase, booking.hub_id)
            const hourlyRate = booking.booking_bags.reduce(
              (total, bag) => total + (fallbackRates[bag.bag_type as keyof typeof fallbackRates]?.hourlyRate || 0),
              0
            )
            if (hourlyRate > 0) {
              addedHours = Math.round(extPayment.amount / hourlyRate)
            }
          }

          if (addedHours > 0) {
            const oldEnd = new Date(booking.end_time)
            const baseTime = Math.max(oldEnd.getTime(), Date.now())
            const newEnd = new Date(baseTime + addedHours * 60 * 60 * 1000)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updateData: any = { end_time: newEnd.toISOString() }
            if (['overstayed', 'late_fee_pending'].includes(booking.status)) {
              updateData.status = 'active_storage'
            }

            await supabase
              .from('bookings' as never)
              .update(updateData)
              .eq('id', bookingId)

            console.log(`[PayHere IPN] Booking ${bookingId} extended by ${addedHours}h to ${newEnd.toISOString()} (status reset to active_storage if overdue)`)
            await sendExtensionNotification(supabase, bookingId, extPayment.amount, addedHours).catch(console.error)
          } else {
            console.error(`[PayHere IPN] Failed to calculate or find addedHours for extension`, bookingId, extPayment.amount)
          }
        }
      }

      return NextResponse.json({ received: true })
    }

    // ── Initial booking payment: order_id = {bookingId} ──────────────────
    const { data: bookingPayment } = await supabase
      .from('payments' as never)
      .select('id, amount')
      .eq('booking_id', order_id)
      .eq('type', 'booking')
      .eq('status', 'pending')
      .maybeSingle() as { data: { id: string; amount: number } | null }

    if (!bookingPayment || Number(payhere_amount) !== Number(bookingPayment.amount)) {
      console.warn('[PayHere IPN] Booking amount mismatch', { order_id, payhere_amount })
      return NextResponse.json({ received: true })
    }

    await supabase
      .from('payments' as never)
      .update({ status: 'paid', gateway_ref: payment_id })
      .eq('id', bookingPayment.id)
      .eq('status', 'pending')

    const { error } = await supabase
      .from('bookings' as never)
      .update({ status: 'confirmed' })
      .eq('id', order_id)
      .eq('status', 'pending_payment')

    if (error) {
      console.error('[PayHere IPN] Failed to update booking', order_id, error)
    } else {
      console.log('[PayHere IPN] Booking confirmed', order_id)
      // Auto-assign sticker numbers to all bags at confirmation time
      const { autoAssignStickers } = await import('@/lib/utils/stickerAssignment')
      await autoAssignStickers(order_id).catch(console.error)
      await sendBookingConfirmedNotification(supabase, order_id).catch(console.error)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[PayHere IPN] Error:', err)
    return NextResponse.json({ received: true })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendBookingConfirmedNotification(supabase: any, bookingId: string) {
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
    const { sendBookingConfirmedEmail } = await import('@/lib/utils/email')
    await sendBookingConfirmedEmail(userEmail, userName, hubName, bookingId, appUrl, {
      startTime: booking.start_time,
      endTime: booking.end_time,
      totalPrice: booking.total_price,
      address: booking.hubs?.address,
    }, booking.qr_code).catch(console.error)
  }

  // SMS
  if (userPhone) {
    const { sendSMS } = await import('@/lib/utils/sms')
    const start = new Date(booking.start_time)
    const dateStr = start.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
    await sendSMS(
      userPhone,
      `Luggo: Booking confirmed at ${hubName}! Drop-off: ${dateStr}. Total: LKR ${Number(booking.total_price).toLocaleString()}. View QR: ${appUrl}/booking/${bookingId}`
    ).catch(console.error)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendLateFeeNotification(supabase: any, bookingId: string, amount: number) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('user_id, hubs(name), users(name, email, phone)')
    .eq('id', bookingId)
    .single()

  if (!booking) return

  const hubName   = booking.hubs?.name ?? 'the hub'
  const userName  = booking.users?.name ?? 'Customer'
  const userEmail = booking.users?.email
  const userPhone = booking.users?.phone

  await supabase.from('notifications').insert({
    user_id: booking.user_id,
    type: 'late_fee',
    message: `Late fee of LKR ${amount.toLocaleString()} paid. Your pickup at ${hubName} is confirmed.`,
    read: false,
  })

  if (userPhone) {
    const { sendSMS } = await import('@/lib/utils/sms')
    await sendSMS(userPhone, `Luggo: Late fee of LKR ${amount.toLocaleString()} received. Please collect your bags at ${hubName}.`).catch(console.error)
  }

  if (userEmail) {
    const { sendLateFeeReceiptEmail } = await import('@/lib/utils/email')
    await sendLateFeeReceiptEmail(userEmail, userName, hubName, amount).catch(console.error)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendExtensionNotification(supabase: any, bookingId: string, amount: number, hours: number) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('user_id, end_time, hubs(name), users(name, email, phone)')
    .eq('id', bookingId)
    .single()

  if (!booking) return

  const userPhone = booking.users?.phone
  const newEnd    = new Date(booking.end_time)
  const timeStr   = newEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr   = newEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

  await supabase.from('notifications').insert({
    user_id: booking.user_id,
    type: 'general',
    message: `Booking extended by ${hours} hours. Your new pickup time is ${dateStr}, ${timeStr}.`,
    read: false,
  })

  if (userPhone) {
    const { sendSMS } = await import('@/lib/utils/sms')
    await sendSMS(userPhone, `Luggo: Extension of ${hours}h confirmed! New pickup: ${dateStr} @ ${timeStr}. Paid: LKR ${amount.toLocaleString()}.`).catch(console.error)
  }
}
