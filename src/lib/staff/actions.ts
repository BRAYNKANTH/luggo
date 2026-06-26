'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { type PostgrestError } from '@supabase/supabase-js'
import { uuidSchema } from '@/lib/validators/common'


// ─────────────────────────────────────────────
// HELPER — get authenticated staff + their hub
// Returns anon client for reads (respects RLS) + service client for writes
// ─────────────────────────────────────────────
async function requireStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: staffRow } = await supabase
    .from('hub_staff')
    .select('hub_id, hubs(alias)')
    .eq('user_id', user.id)
    .eq('active', true)
    .single() as {
      data: { hub_id: string; hubs: { alias: string } | null } | null
      error: PostgrestError | null
    }

  if (!staffRow) {
    redirect('/staff/login')
  }

  // Service client for writes — bypasses RLS for trusted staff operations
  const svc = createServiceClient()

  return { supabase, svc, userId: user.id, hubId: staffRow.hub_id, hubAlias: staffRow.hubs?.alias ?? '' }
}

// ─────────────────────────────────────────────
// RESOLVE QR CODE → booking ID
// ─────────────────────────────────────────────
export async function resolveQRCode(
  qrCode: string
): Promise<{ bookingId?: string; error?: string }> {
  if (!qrCode.trim()) return { error: 'Empty QR code' }
  const { supabase, hubId } = await requireStaff()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, hub_id')
    .eq('qr_code', qrCode.trim())
    .single() as { data: { id: string; status: string; hub_id: string } | null; error: unknown }

  if (!booking) {
    return { error: 'Invalid QR code. This is not a recognized Luggo booking.' }
  }

  if (booking.hub_id !== hubId) {
    return { error: 'Wrong location! This booking is registered for a different hub.' }
  }

  const terminal = ['cancelled', 'expired', 'completed']
  if (terminal.includes(booking.status)) {
    return { error: `This booking is already ${booking.status}. Nothing to do.` }
  }

  return { bookingId: booking.id }
}

// ─────────────────────────────────────────────
// MARK ARRIVED  confirmed → arrived
// Form-action wrapper (returns void for <form action={...}>)
// ─────────────────────────────────────────────
export async function markArrivedAction(bookingId: string): Promise<void> {
  await markArrived(bookingId)
  redirect(`/staff/booking/${bookingId}`)
}

export async function markArrived(
  bookingId: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }
  
  const { svc, hubId, userId } = await requireStaff()

  const { error } = await svc
    .from('bookings' as never)
    .update({ status: 'arrived' })
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .eq('status', 'confirmed')

  if (error) return { error: (error as { message: string }).message }

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'customer_arrived',
    p_entity: 'bookings',
    p_entity_id: bookingId
  })

  return {}
}

// ─────────────────────────────────────────────
// CONFIRM STICKERS APPLIED  arrived → sealing_in_progress
// Stickers are pre-assigned at booking confirmation.
// Staff physically takes the sticker from the pack, pastes it on the bag,
// then taps confirm — this just advances the status.
// ─────────────────────────────────────────────
export async function confirmStickersApplied(bookingId: string): Promise<void> {
  await confirmStickers(bookingId)
  redirect(`/staff/booking/${bookingId}/seal`)
}

export async function confirmStickers(
  bookingId: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, userId, hubId } = await requireStaff()

  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, status, id_verified, booking_bags(id, sticker_number)')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as {
      data: {
        id: string
        status: string
        id_verified: boolean
        booking_bags: { id: string; sticker_number: string | null }[]
      } | null
    }

  if (!booking) return { error: 'Booking not found.' }
  if (booking.status !== 'arrived') {
    return { error: `Booking must be in "arrived" status. Current: ${booking.status}` }
  }
  if (!booking.id_verified) {
    return { error: 'Customer identity must be verified before applying stickers.' }
  }

  // Record sticker assignments
  const hubAlias = await svc
    .from('hub_staff' as never)
    .select('hubs(alias)')
    .eq('user_id', userId)
    .single() as { data: { hubs: { alias: string } | null } | null }

  const alias = (hubAlias.data as { hubs: { alias: string } | null } | null)?.hubs?.alias ?? ''

  for (const bag of booking.booking_bags) {
    if (bag.sticker_number) {
      const stickerCode = `${alias}-${bag.sticker_number}`
      await svc
        .from('sticker_assignments' as never)
        .insert({
          booking_bag_id: bag.id,
          sticker_number: stickerCode,
          assigned_by_staff_id: userId,
        })
      
      // Audit each sticker
      await svc.rpc('write_audit_log', {
        p_actor_id: userId,
        p_actor_role: 'hub_staff',
        p_action: 'sticker_assigned',
        p_entity: 'booking_bags',
        p_entity_id: bag.id,
        p_metadata: { sticker: stickerCode }
      })
    }
  }

  // Advance status → sealing_in_progress
  await svc
    .from('bookings' as never)
    .update({ status: 'sealing_in_progress' })
    .eq('id', bookingId)

  return {}
}

// ─────────────────────────────────────────────
// SAVE SEAL PROOF  sealing_in_progress → sealed_waiting_user_confirmation
// ─────────────────────────────────────────────
export async function saveSealProof(
  bookingId: string,
  photoPath: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }
  if (!photoPath) return { error: 'Photo path is required' }

  const { svc, userId, hubId } = await requireStaff()

  // Verify booking
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, status, user_id, hubs(name), users(name, phone, email)')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as {
      data: { id: string; status: string; user_id: string; hubs: { name: string } | null; users: { name: string; phone: string | null; email: string } | null } | null
    }

  if (!booking) return { error: 'Booking not found.' }
  if (booking.status !== 'sealing_in_progress' && booking.status !== 'disputed') {
    return { error: `Expected "sealing_in_progress" or "disputed" status. Got: ${booking.status}` }
  }

  // Save seal proof record
  const { error: proofError } = await svc
    .from('seal_proofs' as never)
    .insert({ booking_id: bookingId, photo_url: photoPath, uploaded_by_staff_id: userId }) as { error: { message: string } | null }

  if (proofError) return { error: proofError.message }

  // Advance booking status
  await svc.from('bookings' as never).update({ status: 'sealed_waiting_user_confirmation' }).eq('id', bookingId)

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'seal_proof_uploaded',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: { photo: photoPath }
  })

  const hubName = booking.hubs?.name ?? 'the hub'
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // In-app notification
  await svc.from('notifications' as never).insert({
    user_id: booking.user_id,
    type: 'seal_ready',
    message: `Your bags at ${hubName} have been sealed. Please review and confirm the seal in the app.`,
    read: false,
  })

  // SMS — let customer know to check the app
  if (booking.users?.phone) {
    const { sendSMS } = await import('@/lib/utils/sms')
    sendSMS(
      booking.users.phone,
      `Luggo: Your bags at ${hubName} have been sealed! Please open the app to review the seal photo and confirm. ${appUrl}/booking/${bookingId}`
    ).catch(console.error)
  }

  return {}
}

export async function uploadSealProof(
  bookingId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Photo is required.' }
  }

  if (!file.type.startsWith('image/')) {
    return { error: 'Please upload an image file.' }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: 'Photo must be under 10 MB.' }
  }

  const { svc } = await requireStaff()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${bookingId}/${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await svc.storage
    .from('seal-proofs')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` }
  }

  return saveSealProof(bookingId, path)
}

// ─────────────────────────────────────────────
// WAIVE LATE FEE & COMPLETE  overstayed → completed (staff override)
// Form-action wrapper
// ─────────────────────────────────────────────
export async function waiveAndCompletePickupAction(bookingId: string): Promise<void> {
  await waiveAndCompletePickup(bookingId)
  redirect(`/staff/booking/${bookingId}`)
}

export async function waiveAndCompletePickup(
  bookingId: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, status, user_id, hubs(name), users(name, phone, email)')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as {
      data: { id: string; status: string; user_id: string; hubs: { name: string } | null; users: { name: string; phone: string | null; email: string } | null } | null
    }

  if (!booking) return { error: 'Booking not found.' }
  if (booking.status !== 'overstayed') {
    return { error: `Staff override only applies to overstayed bookings. Current: ${booking.status}` }
  }

  // Void any pending late fee payments
  await svc
    .from('payments' as never)
    .update({ status: 'failed' })
    .eq('booking_id', bookingId)
    .eq('type', 'late_fee')
    .eq('status', 'pending')

  // Complete the booking
  await svc.from('bookings' as never).update({ status: 'completed' }).eq('id', bookingId)

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'waive_late_fee_and_complete',
    p_entity: 'bookings',
    p_entity_id: bookingId
  })

  const hubName = booking.hubs?.name ?? 'the hub'

  // In-app notification
  await svc.from('notifications' as never).insert({
    user_id: booking.user_id,
    type: 'general',
    message: `Your bags have been collected from ${hubName}. Thank you for using Luggo!`,
    read: false,
  })

  // SMS confirmation
  if (booking.users?.phone) {
    const { sendSMS } = await import('@/lib/utils/sms')
    sendSMS(
      booking.users.phone,
      `Luggo: Your bags have been collected from ${hubName}. Thank you for using Luggo! 🧳`
    ).catch(console.error)
  }

  return {}
}

// ─────────────────────────────────────────────
// COMPLETE PICKUP  pickup_requested → completed
// Form-action wrapper
// ─────────────────────────────────────────────
export async function completePickupAction(bookingId: string): Promise<void> {
  await completePickup(bookingId)
  redirect(`/staff/booking/${bookingId}`)
}

export async function completePickup(
  bookingId: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, status, end_time, user_id, hubs(name), users(name, phone, email)')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as {
      data: { id: string; status: string; end_time: string; user_id: string; hubs: { name: string } | null; users: { name: string; phone: string | null; email: string } | null } | null
    }

  if (!booking) return { error: 'Booking not found.' }

  if (booking.status === 'overstayed') {
    return { error: 'Customer must pay the late fee via their app before you can complete this pickup.' }
  }

  const allowedStatuses = ['pickup_requested']
  if (!allowedStatuses.includes(booking.status)) {
    return { error: `Cannot complete pickup. Booking must be in pickup_requested status. Current: ${booking.status}` }
  }

  // Complete the booking
  await svc.from('bookings' as never).update({ status: 'completed' }).eq('id', bookingId)

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'pickup_completed',
    p_entity: 'bookings',
    p_entity_id: bookingId
  })

  const hubName = booking.hubs?.name ?? 'the hub'

  // In-app notification
  await svc.from('notifications' as never).insert({
    user_id: booking.user_id,
    type: 'general',
    message: `Your bags have been collected from ${hubName}. Thank you for using Luggo!`,
    read: false,
  })

  // SMS confirmation
  if (booking.users?.phone) {
    const { sendSMS } = await import('@/lib/utils/sms')
    sendSMS(
      booking.users.phone,
      `Luggo: Your bags have been collected from ${hubName}. Thank you for using Luggo! 🧳`
    ).catch(console.error)
  }

  return {}
}

// ─────────────────────────────────────────────
// HUB MANAGEMENT — Revenue, History, Profile
// ─────────────────────────────────────────────

export async function getHubRevenue() {
  const { supabase, hubId } = await requireStaff()

  // Fetch all successful payments for bookings at this hub
  const { data: payments, error } = await supabase
    .from('payments')
    .select('amount, created_at, type, bookings!inner(hub_id)')
    .eq('bookings.hub_id', hubId)
    .eq('status', 'paid') as { data: { amount: number; created_at: string; type: string }[] | null, error: { message: string } | null }

  if (error) return { error: error.message }

  const payArr = payments || []

  // Aggregate stats
  const total = payArr.reduce((sum, p) => sum + p.amount, 0)
  const byType = payArr.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + p.amount
    return acc
  }, {} as Record<string, number>)

  // Last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recent = payArr.filter(p => new Date(p.created_at) >= thirtyDaysAgo)
  const recentTotal = recent.reduce((sum, p) => sum + p.amount, 0)

  return {
    total,
    recentTotal,
    byType,
    paymentCount: payArr.length
  }
}

export async function getHubBookings(filters?: { status?: string }) {
  const { supabase, hubId } = await requireStaff()

  let query = supabase
    .from('bookings')
    .select('id, status, start_time, end_time, total_price, id_verified, created_at, users(name, phone)')
    .eq('hub_id', hubId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query as { data: { id: string; status: string; start_time: string; end_time: string; total_price: number; id_verified: boolean; created_at: string; users: { name: string; phone: string | null } | null }[] | null, error: { message: string } | null }

  if (error) return { error: error.message }
  return { bookings: data || [] }
}

export async function updateHubProfile(updates: {
  name?: string
  address?: string
  open_time?: string
  close_time?: string
  active?: boolean
  active_days?: string[]
}) {
  const { svc, hubId } = await requireStaff()

  const { error } = await svc
    .from('hubs')
    .update(updates)
    .eq('id', hubId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getHubProfile() {
  const { supabase, hubId } = await requireStaff()

  const { data, error } = await supabase
    .from('hubs')
    .select('*')
    .eq('id', hubId)
    .single()

  if (error) return { error: error.message }
  return { hub: data }
}

export async function verifyIdentity(bookingId: string, metadata?: Record<string, unknown>) {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }
  
  const { svc, hubId, userId } = await requireStaff()

  const { error } = await svc
    .from('bookings' as never)
    .update({ id_verified: true })
    .eq('id', bookingId)
    .eq('hub_id', hubId)

  if (error) return { error: (error as { message: string }).message }

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'identity_verified',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: metadata || null
  })

  return { success: true }
}

export async function rejectBookingIdentity(bookingId: string, reason: string) {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }
  if (!reason.trim()) return { error: 'Rejection reason is required' }
  
  const { svc, userId } = await requireStaff()

  // Audit the identity verification rejection / escalation
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'identity_verification_rejected',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: {
      rejectionReason: reason.trim(),
      escalated: true,
      rejectedAt: new Date().toISOString(),
      rejectedByStaffId: userId
    }
  })

  return { success: true }
}
