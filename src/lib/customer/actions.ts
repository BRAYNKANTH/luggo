'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generatePayhereHash, PAYHERE_ENDPOINT, type PayhereFormData } from '@/lib/utils/payhere'
import { sendSMS } from '@/lib/utils/sms'
import { sendPickupRequestedEmail } from '@/lib/utils/email'
import { uuidSchema } from '@/lib/validators/common'

// ---------------------------------------------------------------------------
// requestPickup
// Transitions: active_storage | overstayed → pickup_requested
// Also notifies hub staff via in-app notification + SMS
// ---------------------------------------------------------------------------
export async function requestPickup(bookingId: string): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership + current status
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, hub_id, users ( name, phone ), hubs ( name )')
    .eq('id', bookingId)
    .eq('user_id', user.id)
    .single() as {
      data: {
        id: string
        status: string
        hub_id: string
        users: { name: string; phone: string | null } | null
        hubs: { name: string } | null
      } | null
      error: unknown
    }

  if (!booking) return { error: 'Booking not found' }

  const allowed = ['active_storage', 'overstayed']
  if (!allowed.includes(booking.status)) {
    return { error: 'Booking is not eligible for pickup' }
  }

  // Advance status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from('bookings') as any)
    .update({ status: 'pickup_requested' })
    .eq('id', bookingId)

  if (updateError) return { error: 'Failed to request pickup' }

  // Notify customer (in-app)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('notifications') as any).insert({
    user_id: user.id,
    type: 'pickup_reminder',
    message: `Your pickup request at ${booking.hubs?.name} has been received. Please head to the hub.`,
    read: false,
  })

  // Notify hub staff (in-app) — all active staff at the hub
  const { data: staffList } = await supabase
    .from('hub_staff')
    .select('user_id')
    .eq('hub_id', booking.hub_id)
    .eq('active', true) as { data: { user_id: string }[] | null; error: unknown }

  if (staffList && staffList.length > 0) {
    const staffNotifications = staffList.map((s) => ({
      user_id: s.user_id,
      type: 'general' as const,
      message: `Pickup requested by ${booking.users?.name ?? 'a customer'} — please prepare the bags.`,
      read: false,
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('notifications') as any).insert(staffNotifications)
  }

  // SMS to customer
  if (booking.users?.phone) {
    sendSMS(
      booking.users.phone,
      `Luggo: Your pickup request at ${booking.hubs?.name} is confirmed. Please show your QR code at the counter.`
    ).catch(console.error)
  }

  // Email to customer — fetch email separately (not in booking select)
  const { data: userRow } = await supabase
    .from('users')
    .select('email')
    .eq('id', user.id)
    .single() as { data: { email: string } | null; error: unknown }

  if (userRow?.email) {
    sendPickupRequestedEmail(
      userRow.email,
      booking.users?.name ?? 'Customer',
      booking.hubs?.name ?? 'the hub'
    ).catch(console.error)
  }

  return {}
}

// ---------------------------------------------------------------------------
// createLateFeePayment
// Creates a pending late_fee payment record and returns PayHere form data.
// order_id format: lf-{paymentId}  (webhook uses this prefix to distinguish)
// ---------------------------------------------------------------------------
export async function createLateFeePayment(
  bookingId: string
): Promise<{ error?: string; formData?: PayhereFormData }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership + current status
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, hub_id, users ( name, email, phone ), hubs ( name )')
    .eq('id', bookingId)
    .eq('user_id', user.id)
    .single() as {
      data: {
        id: string
        status: string
        hub_id: string
        users: { name: string; email: string; phone: string | null } | null
        hubs: { name: string } | null
      } | null
      error: unknown
    }

  if (!booking) return { error: 'Booking not found' }

  const allowed = ['active_storage', 'overstayed']
  if (!allowed.includes(booking.status)) {
    return { error: 'No late fee applicable' }
  }

  // Calculate late fee via Postgres RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lateFee, error: rpcError } = await (supabase.rpc as any)(
    'calculate_late_fee',
    { p_booking_id: bookingId }
  ) as { data: number | null; error: { message: string } | null }

  if (rpcError) {
    console.error('[createLateFeePayment] RPC error:', rpcError)
    return { error: 'Failed to calculate late fee. Please try again.' }
  }
  if (lateFee == null || lateFee <= 0) {
    return { error: 'No late fee to pay' }
  }

  // Create pending late_fee payment record
  const serviceClient = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payment, error: paymentError } = await (serviceClient as any)
    .from('payments')
    .insert({
      booking_id: bookingId,
      amount: lateFee,
      status: 'pending',
      type: 'late_fee',
    })
    .select('id')
    .single() as { data: { id: string } | null; error: unknown }

  if (paymentError || !payment) return { error: 'Failed to create payment record' }

  const merchantId = process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID!
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET!
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  const orderId = `lf-${payment.id}`
  const currency = 'LKR'

  const hash = generatePayhereHash(merchantId, orderId, lateFee, currency, merchantSecret)

  const nameParts = (booking.users?.name ?? 'Customer').split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || firstName

  const formData: PayhereFormData = {
    merchant_id: merchantId,
    return_url: `${baseUrl}/booking/${bookingId}?payment=lf_success`,
    cancel_url: `${baseUrl}/pickup/${bookingId}?payment=cancelled`,
    notify_url: process.env.NEXT_PUBLIC_PAYHERE_NOTIFY_URL || `${baseUrl}/api/webhooks/payhere`,
    order_id: orderId,
    items: `Late storage fee — ${booking.hubs?.name}`,
    currency,
    amount: lateFee.toFixed(2),
    first_name: firstName,
    last_name: lastName,
    email: booking.users?.email ?? '',
    phone: booking.users?.phone ?? '',
    address: 'N/A',
    city: 'Colombo',
    country: 'Sri Lanka',
    hash,
    endpoint: PAYHERE_ENDPOINT,
  }

  return { formData }
}

// ---------------------------------------------------------------------------
// requestPickupAction — void wrapper for use in <form action>
// Only used when no late fee (zero-fee path)
// ---------------------------------------------------------------------------
export async function requestPickupAction(bookingId: string): Promise<void> {
  const result = await requestPickup(bookingId)
  if (result.error) {
    redirect(`/booking/${bookingId}?pickup_error=${encodeURIComponent(result.error)}`)
  } else {
    redirect(`/booking/${bookingId}?pickup=requested`)
  }
}
