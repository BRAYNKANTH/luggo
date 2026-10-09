import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyPayhereIPN } from '@/lib/utils/payhere'
import { sendBookingConfirmedNotification } from '@/lib/utils/notifications'
import { uuidSchema } from '@/lib/validators/common'
import { parseExtensionOrder } from '@/lib/utils/paymentOrder'

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

    if (!merchant_secret || !expectedMerchantId) throw new Error('Payment gateway is not configured')
    if (!payment_id || !Number.isFinite(Number(payhere_amount)) || Number(payhere_amount) <= 0) return NextResponse.json({ received: true })

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

    const supabase = createServiceClient()
    let paymentId: string | undefined
    let extensionHours: number | null = null
    let extensionEnd: string | null = null
    const extension = parseExtensionOrder(order_id)
    if (extension) {
      paymentId = extension.paymentId
      extensionHours = extension.hours
      extensionEnd = extension.endTime
    } else if (order_id.startsWith('lf-') || order_id.startsWith('ec-')) {
      paymentId = order_id.slice(3)
    } else if (uuidSchema.safeParse(order_id).success) {
      const { data: payment, error } = await supabase.from('payments')
        .select('id').eq('booking_id', order_id).eq('type', 'booking')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      paymentId = payment?.id
    }
    if (!uuidSchema.safeParse(paymentId).success) return NextResponse.json({ received: true })

    // Verify order type as well as amount before the service-only transaction.
    const expectedType = extension ? 'extension' : order_id.startsWith('lf-') ? 'late_fee' : order_id.startsWith('ec-') ? 'early_checkin' : 'booking'
    const { data: payment, error: lookupError } = await supabase.from('payments')
      .select('type').eq('id', paymentId!).maybeSingle()
    if (lookupError) throw lookupError
    if (!payment || payment.type !== expectedType) return NextResponse.json({ received: true })
    const { data: result, error } = await supabase.rpc('apply_payhere_payment', {
      p_payment_id: paymentId,
      p_amount: Number(payhere_amount),
      p_gateway_ref: payment_id,
      p_extension_hours: extensionHours,
      p_extension_end: extensionEnd,
    })
    if (error) throw error
    if (result?.processed && result.changed) {
      if (result.type === 'booking') {
        const { autoAssignStickers } = await import('@/lib/utils/stickerAssignment')
        await autoAssignStickers(result.booking_id).catch(console.error)
        await sendBookingConfirmedNotification(supabase, result.booking_id).catch(console.error)
      } else if (result.type === 'late_fee') {
        await sendLateFeeNotification(supabase, result.booking_id, Number(payhere_amount)).catch(console.error)
      } else if (result.type === 'extension') {
        await sendExtensionNotification(supabase, result.booking_id, Number(payhere_amount), extensionHours!).catch(console.error)
      }
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[PayHere IPN] Error:', err)
    return NextResponse.json({ error: 'Payment processing failed; retry required' }, { status: 500 })
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
  const timeStr   = newEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Colombo' })
  const dateStr   = newEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'Asia/Colombo' })

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
