'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  signInSchema,
  signUpSchema,
  updateProfileSchema,
  type SignInInput,
  type SignUpInput,
  type UpdateProfileInput,
} from '@/lib/validators/auth'
import { type UserRole } from '@/types/database'

// Supabase partial-select results don't infer well — use this cast helper
type RoleRow = { role: UserRole }

// ─────────────────────────────────────────────
// CUSTOMER SIGN UP
// ─────────────────────────────────────────────
export async function signUpCustomer(
  data: SignUpInput
): Promise<{ error?: string }> {
  const parsed = signUpSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) return { error: error.message }

  // The DB trigger creates the base profile; patch phone if provided
  if (parsed.data.phone) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('users') as any)
        .update({ phone: parsed.data.phone })
        .eq('id', user.id)
    }
  }

  redirect('/profile?welcome=1')
}

// ─────────────────────────────────────────────
// CUSTOMER SIGN IN
// ─────────────────────────────────────────────
export async function signInCustomer(
  data: SignInInput
): Promise<{ error?: string }> {
  const parsed = signInSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Incorrect email or password.' }
    }
    return { error: error.message }
  }

  redirect('/dashboard')
}

// ─────────────────────────────────────────────
// STAFF SIGN IN
// ─────────────────────────────────────────────
export async function signInStaff(
  data: SignInInput
): Promise<{ error?: string }> {
  const parsed = signInSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Incorrect email or password.' }
    }
    return { error: error.message }
  }

  // Verify this account is actually hub_staff
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication failed.' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: RoleRow | null; error: unknown }

  if (!profile || profile.role !== 'hub_staff') {
    await supabase.auth.signOut()
    return { error: 'This account does not have staff access. Contact your manager.' }
  }

  redirect('/staff/dashboard')
}

// ─────────────────────────────────────────────
// ADMIN SIGN IN
// ─────────────────────────────────────────────
export async function signInAdmin(
  data: SignInInput
): Promise<{ error?: string }> {
  const parsed = signInSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Incorrect email or password.' }
    }
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication failed.' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: RoleRow | null; error: unknown }

  const adminRoles: UserRole[] = ['support_admin', 'ops_admin', 'master_admin']
  if (!profile || !adminRoles.includes(profile.role)) {
    await supabase.auth.signOut()
    return { error: 'This account does not have admin access.' }
  }

  redirect('/admin/dashboard')
}

// ─────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function signOutStaff(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/staff/login')
}

export async function signOutAdmin(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

// ─────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────
export async function updateProfile(
  data: UpdateProfileInput
): Promise<{ error?: string; success?: boolean }> {
  const parsed = updateProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('users') as any)
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      nic_passport: parsed.data.nic_passport || null,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

// ─────────────────────────────────────────────
// CANCEL BOOKING
// ─────────────────────────────────────────────
export async function cancelBooking(bookingId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only allow cancellation of own bookings in cancellable states
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('bookings') as any)
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('user_id', user.id)
    .in('status', ['pending_payment', 'confirmed'])

  redirect(`/booking/${bookingId}`)
}

// ─────────────────────────────────────────────
// CONFIRM SEAL
// sealed_waiting_user_confirmation → active_storage
// ─────────────────────────────────────────────
export async function confirmSeal(bookingId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify booking ownership + correct status
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', bookingId)
    .eq('user_id', user.id)
    .single() as { data: { id: string; status: string } | null; error: unknown }

  if (!booking || booking.status !== 'sealed_waiting_user_confirmation') {
    redirect(`/booking/${bookingId}`)
  }

  // Mark seal proof as confirmed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('seal_proofs') as any)
    .update({ confirmed_by_user_at: new Date().toISOString() })
    .eq('booking_id', bookingId)

  // Advance booking to active storage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('bookings') as any)
    .update({ status: 'active_storage' })
    .eq('id', bookingId)

  redirect(`/booking/${bookingId}?sealed=confirmed`)
}

// ─────────────────────────────────────────────
// DISPUTE SEAL
// sealed_waiting_user_confirmation → disputed
// ─────────────────────────────────────────────
export async function disputeSeal(
  bookingId: string,
  reason: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (!reason.trim()) return { error: 'Please describe the problem.' }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', bookingId)
    .eq('user_id', user.id)
    .single() as { data: { id: string; status: string } | null; error: unknown }

  if (!booking || booking.status !== 'sealed_waiting_user_confirmation') {
    return { error: 'This booking cannot be disputed right now.' }
  }

  // Create complaint record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('complaints') as any)
    .insert({
      booking_id: bookingId,
      user_id: user.id,
      description: reason.trim(),
      status: 'open',
    })

  // Mark booking as disputed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('bookings') as any)
    .update({ status: 'disputed' })
    .eq('id', bookingId)

  redirect(`/booking/${bookingId}?sealed=disputed`)
}

// ─────────────────────────────────────────────
// EXTEND BOOKING
// ─────────────────────────────────────────────
export async function extendBooking(
  bookingId: string,
  additionalHours: number
): Promise<{ error?: string; payhere?: Record<string, unknown> }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (additionalHours <= 0) return { error: 'Invalid extension duration.' }

  // Fetch booking and its bags to calculate price
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, end_time, user_id, status,
      hubs ( name, alias ),
      booking_bags ( bag_type )
    `)
    .eq('id', bookingId)
    .eq('user_id', user.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .single() as { data: any | null }

  if (!booking) return { error: 'Booking not found.' }
  
  const allowedStatuses = ['confirmed', 'arrived', 'sealing_in_progress', 'sealed_waiting_user_confirmation', 'active_storage', 'overstayed']
  if (!allowedStatuses.includes(booking.status)) {
    return { error: 'This booking cannot be extended.' }
  }

  // Calculate price for extension
  const { BAG_RATES } = await import('@/lib/utils/pricing')
  const extensionPrice = booking.booking_bags.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (total: number, bag: any) => total + (BAG_RATES[bag.bag_type as keyof typeof BAG_RATES] || 0) * additionalHours,
    0
  )

  if (extensionPrice <= 0) return { error: 'Failed to calculate extension price.' }

  // Create pending payment record — use service role to bypass RLS
  const serviceClient = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payment, error: pError } = await (serviceClient.from('payments') as any)
    .insert({
      booking_id: bookingId,
      amount: extensionPrice,
      status: 'pending',
      type: 'extension',
    })
    .select('id')
    .single()

  if (pError || !payment) {
    console.error('[extendBooking] payment insert error:', pError)
    return { error: pError?.message ?? 'Failed to create extension payment.' }
  }

  // Build PayHere form data
  const { generatePayhereHash, PAYHERE_ENDPOINT } = await import('@/lib/utils/payhere')
  const merchantId = process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID!
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET!
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const { data: profile } = await supabase
    .from('users')
    .select('name, email, phone')
    .eq('id', user.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .single() as { data: any | null }

  const nameParts = (profile?.name ?? 'Customer').trim().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || 'N/A'
  
  const orderId = `ext-${payment.id}`

  const payhereData = {
    merchant_id: merchantId,
    return_url: `${appUrl}/booking/${bookingId}?payment=ext_success`,
    cancel_url: `${appUrl}/booking/${bookingId}?payment=cancelled`,
    notify_url: process.env.NEXT_PUBLIC_PAYHERE_NOTIFY_URL || `${appUrl}/api/webhooks/payhere`,
    order_id: orderId,
    items: `Extension (+${additionalHours}h) for Booking #${bookingId.slice(0, 8).toUpperCase()}`,
    currency: 'LKR',
    amount: extensionPrice.toFixed(2),
    first_name: firstName,
    last_name: lastName,
    email: profile?.email ?? user.email ?? '',
    phone: profile?.phone ?? '0000000000',
    address: booking.hubs?.name ?? 'Luggo Hub',
    city: 'Colombo',
    country: 'Sri Lanka',
    hash: generatePayhereHash(merchantId, orderId, extensionPrice, 'LKR', merchantSecret),
    endpoint: PAYHERE_ENDPOINT,
  }

  return { payhere: payhereData }
}

// ─────────────────────────────────────────────
// MARK ALL NOTIFICATIONS READ
// ─────────────────────────────────────────────
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('notifications') as any)
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)
  redirect('/notifications')
}
