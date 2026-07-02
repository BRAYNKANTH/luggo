'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { type PostgrestError, type SupabaseClient } from '@supabase/supabase-js'
import { uuidSchema } from '@/lib/validators/common'
import { type BagType } from '@/types/database'
import { calculateLateFee } from '@/lib/utils/pricing'


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

  // 1. Try to find by booking qr_code
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, hub_id')
    .eq('qr_code', qrCode.trim())
    .single() as { data: { id: string; status: string; hub_id: string } | null; error: unknown }

  if (booking) {
    if (booking.hub_id !== hubId) {
      return { error: 'Wrong location! This booking is registered for a different hub.' }
    }
    const terminal = ['cancelled', 'expired', 'completed']
    if (terminal.includes(booking.status)) {
      return { error: `This booking is already ${booking.status}. Nothing to do.` }
    }
    return { bookingId: booking.id }
  }

  // 2. Try to find by bag tag code
  const { data: tag } = await supabase
    .from('bag_tags')
    .select('current_booking_id, hub_id')
    .eq('tag_code', qrCode.trim())
    .single() as { data: { current_booking_id: string | null; hub_id: string } | null }

  if (tag) {
    if (tag.hub_id !== hubId) {
      return { error: 'Wrong location! This bag tag belongs to a different hub.' }
    }
    if (!tag.current_booking_id) {
      return { error: `Bag tag "${qrCode}" is currently available. No active booking assigned.` }
    }
    return { bookingId: tag.current_booking_id }
  }

  return { error: 'Invalid QR code. This is not a recognized booking QR or Reusable Bag Tag.' }
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

  // If this booking has a pending Pay at Hub payment, mark it as paid since staff is checking them in (collecting cash)
  await svc
    .from('payments' as never)
    .update({ status: 'paid', gateway_ref: 'CASH_PAYMENT_AT_HUB' })
    .eq('booking_id', bookingId)
    .eq('status', 'pending')
    .eq('type', 'booking')
    .eq('gateway_ref', 'PAY_AT_HUB')

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
export async function confirmStickersApplied(
  bookingId: string,
  bagSeals?: Record<string, string>
): Promise<void> {
  await confirmStickers(bookingId, bagSeals)
  redirect(`/staff/booking/${bookingId}/seal`)
}

export async function confirmStickers(
  bookingId: string,
  bagSeals?: Record<string, string>
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
    // Save physical seal number if provided
    const sealNum = bagSeals?.[bag.id]?.trim() || null
    if (sealNum) {
      await svc
        .from('booking_bags' as never)
        .update({ seal_number: sealNum })
        .eq('id', bag.id)
    }

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
        p_metadata: { sticker: stickerCode, seal_number: sealNum }
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

  // Save seal proof record with automated customer confirmation
  const { error: proofError } = await svc
    .from('seal_proofs' as never)
    .insert({
      booking_id: bookingId,
      photo_url: photoPath,
      uploaded_by_staff_id: userId,
      confirmed_by_user_at: new Date().toISOString()
    }) as { error: { message: string } | null }

  if (proofError) return { error: proofError.message }

  // Advance booking status directly to active_storage
  await svc.from('bookings' as never).update({ status: 'active_storage' }).eq('id', bookingId)

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

  // In-app notification (seal is ready & active in storage)
  await svc.from('notifications' as never).insert({
    user_id: booking.user_id,
    type: 'seal_ready',
    message: `Your bags at ${hubName} have been sealed and are now in secure storage. You can view the seal photo in the app.`,
    read: false,
  })

  // SMS — let customer know their bags are in secure storage
  if (booking.users?.phone) {
    const { sendSMS } = await import('@/lib/utils/sms')
    sendSMS(
      booking.users.phone,
      `Luggo: Your bags at ${hubName} have been sealed and are in secure storage! View details: ${appUrl}/booking/${bookingId}`
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
// ─────────────────────────────────────────────
// WAIVE LATE FEE  overstayed → ready_for_release (staff override, supervisor only)
// ─────────────────────────────────────────────
async function checkIsSupervisor(userId: string, svc: SupabaseClient): Promise<boolean> {
  const { data: userRow } = await svc
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  const allowed = ['support_admin', 'ops_admin', 'master_admin']
  return !!(userRow && allowed.includes(userRow.role))
}

export async function waiveAndCompletePickupAction(bookingId: string): Promise<void> {
  const res = await waiveAndCompletePickup(bookingId)
  if (res.error) {
    redirect(`/staff/pickup/${bookingId}?error=${encodeURIComponent(res.error)}`)
  } else {
    redirect(`/staff/booking/${bookingId}`)
  }
}

export async function waiveAndCompletePickup(
  bookingId: string,
  reason?: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // 1. Verify supervisor role
  const isSupervisor = await checkIsSupervisor(userId, svc)
  if (!isSupervisor) {
    return { error: 'Unauthorized. Supervisor or Admin credentials required.' }
  }

  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, status, user_id, hubs(name), users(name, phone, email)')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as {
      data: { id: string; status: string; user_id: string; hubs: { name: string } | null; users: { name: string; phone: string | null; email: string } | null } | null
    }

  if (!booking) return { error: 'Booking not found.' }
  if (booking.status !== 'overstayed' && booking.status !== 'late_fee_pending') {
    return { error: `Staff override only applies to overstayed bookings. Current: ${booking.status}` }
  }

  // Void any pending late fee payments
  await svc
    .from('payments' as never)
    .update({ status: 'failed' })
    .eq('booking_id', bookingId)
    .eq('type', 'late_fee')
    .eq('status', 'pending')

  // Create waiver record
  await svc.from('payments' as never).insert({
    booking_id: bookingId,
    amount: 0,
    status: 'paid',
    type: 'late_fee',
    gateway_ref: `WAIVED_BY_SUPERVISOR_${userId}`
  })

  // Set booking to ready_for_release (so staff must complete handover checklist)
  await svc.from('bookings' as never).update({ status: 'ready_for_release' }).eq('id', bookingId)

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'late_fee_waived',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: { waived_by_staff_id: userId, waiver_reason: reason || 'Not specified' }
  })

  return {}
}

// ─────────────────────────────────────────────
// COMPLETE PICKUP  pickup_requested | ready_for_release → completed
// ─────────────────────────────────────────────
export async function completePickupAction(bookingId: string): Promise<void> {
  const res = await completePickup(bookingId)
  if (res.error) {
    redirect(`/staff/pickup/${bookingId}?error=${encodeURIComponent(res.error)}`)
  } else {
    redirect(`/staff/booking/${bookingId}`)
  }
}

export async function completePickup(
  bookingId: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, status, end_time, user_id, hubs(name), users(name, phone, email), booking_bags(id, bag_tag_id)')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as {
      data: { id: string; status: string; end_time: string; user_id: string; hubs: { name: string } | null; users: { name: string; phone: string | null; email: string } | null; booking_bags: { id: string; bag_tag_id: string | null }[] } | null
    }

  if (!booking) return { error: 'Booking not found.' }

  if (booking.status === 'overstayed' || booking.status === 'late_fee_pending') {
    return { error: 'Customer must settle the late fee before pickup can be completed.' }
  }

  const allowedStatuses = ['pickup_requested', 'active_storage', 'ready_for_release']
  if (!allowedStatuses.includes(booking.status)) {
    return { error: `Cannot complete pickup. Current status: ${booking.status}` }
  }

  // 1. Release all bag tags and update bag statuses
  for (const bag of booking.booking_bags) {
    if (bag.bag_tag_id) {
      await svc
        .from('bag_tags' as never)
        .update({ status: 'available', current_booking_id: null })
        .eq('id', bag.bag_tag_id)
      
      // Audit bag tag released
      await svc.rpc('write_audit_log', {
        p_actor_id: userId,
        p_actor_role: 'hub_staff',
        p_action: 'bag_tag_released',
        p_entity: 'booking_bags',
        p_entity_id: bag.id,
        p_metadata: { bag_tag_id: bag.bag_tag_id }
      })
    }

    await svc
      .from('booking_bags' as never)
      .update({ status: 'released' })
      .eq('id', bag.id)
  }

  // 2. Complete the booking
  await svc.from('bookings' as never).update({ status: 'completed' }).eq('id', bookingId)

  // 3. Audit pickup completed
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'pickup_completed',
    p_entity: 'bookings',
    p_entity_id: bookingId
  })

  const hubName = booking.hubs?.name ?? 'the hub'

  // Notifications
  await svc.from('notifications' as never).insert({
    user_id: booking.user_id,
    type: 'general',
    message: `Your bags have been collected from ${hubName}. Thank you for using Luggo!`,
    read: false,
  })

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
// CREATE WALK-IN BOOKING
// ─────────────────────────────────────────────
export async function createWalkInBooking(input: {
  name: string
  phone: string
  nicPassportRef: string
  bagCount: number
  bagTypes: BagType[]
  expectedPickupTime: string
  paymentMethod: 'pay_online' | 'pay_at_hub'
  hubId: string
}): Promise<{ bookingId?: string; error?: string }> {
  const { svc, userId } = await requireStaff()

  // Calculate pricing
  const now = new Date()
  const expected = new Date(input.expectedPickupTime)
  const hours = Math.max(1, Math.ceil((expected.getTime() - now.getTime()) / (1000 * 60 * 60)))
  const rates = { small: 200, regular: 300, large: 400 }
  const bagPrice = input.bagTypes.reduce((sum, type) => sum + (rates[type as keyof typeof rates] || 300), 0)
  const totalPrice = bagPrice * hours

  const qrCode = `WI-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  // Fetch walk-in guest user
  const { data: walkinUser } = await svc
    .from('users' as never)
    .select('id')
    .eq('email', 'walkin@luggo.lk')
    .single() as { data: { id: string } | null }

  const walkinUserId = walkinUser?.id || '766d7147-0934-41eb-be18-50757f9569bb'

  // Insert Booking
  const { data: booking, error: bookingError } = await svc
    .from('bookings' as never)
    .insert({
      user_id: walkinUserId,
      hub_id: input.hubId,
      status: input.paymentMethod === 'pay_at_hub' ? 'confirmed' : 'pending_payment',
      start_time: now.toISOString(),
      end_time: expected.toISOString(),
      total_price: totalPrice,
      qr_code: qrCode,
      id_verified: true,
      walk_in_name: input.name,
      walk_in_phone: input.phone,
      walk_in_nic_passport_ref: input.nicPassportRef
    })
    .select('id')
    .single() as { data: { id: string } | null; error: PostgrestError | null }

  if (bookingError || !booking) {
    return { error: bookingError?.message || 'Failed to create walk-in booking.' }
  }

  // Insert base booking bags
  const bagsToInsert = input.bagTypes.map(type => ({
    booking_id: booking.id,
    bag_type: type,
    status: 'registered'
  }))

  const { error: bagsError } = await svc.from('booking_bags' as never).insert(bagsToInsert)
  if (bagsError) {
    return { error: bagsError.message }
  }

  // If pay at hub, record cash payment
  if (input.paymentMethod === 'pay_at_hub') {
    await svc.from('payments' as never).insert({
      booking_id: booking.id,
      amount: totalPrice,
      status: 'paid',
      type: 'booking',
      gateway_ref: `CASH_PAYMENT_WALK_IN_${userId}`
    })
    
    // Audit cash payment
    await svc.rpc('write_audit_log', {
      p_actor_id: userId,
      p_actor_role: 'hub_staff',
      p_action: 'cash_payment_confirmed',
      p_entity: 'bookings',
      p_entity_id: booking.id,
      p_metadata: { amount: totalPrice }
    })
  }

  // Audit walk-in booking created
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'walk_in_booking_created',
    p_entity: 'bookings',
    p_entity_id: booking.id,
    p_metadata: { walk_in_phone: input.phone }
  })

  // Send SMS confirmation
  if (input.phone) {
    const { sendSMS } = await import('@/lib/utils/sms')
    sendSMS(
      input.phone,
      `Luggo: Walk-in booking confirmed! Ref: WI-${booking.id.slice(0, 8).toUpperCase()}. Expected pickup: ${input.expectedPickupTime}. Thank you!`
    ).catch(console.error)
  }

  return { bookingId: booking.id }
}

// ─────────────────────────────────────────────
// REGISTER REUSABLE BAG TAGS & SEALS
// ─────────────────────────────────────────────
export async function registerBags(
  bookingId: string,
  bags: Array<{
    tag_code: string
    bag_type: BagType
    seal_number?: string
    seal_status: 'sealed' | 'seal_not_applicable'
    notes?: string
  }>
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // 1. Fetch booking
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, status, user_id, booking_bags(id, bag_tag_id)')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as {
      data: { id: string; status: string; user_id: string; booking_bags: { id: string; bag_tag_id: string | null }[] } | null
    }

  if (!booking) return { error: 'Booking not found.' }

  // 2. Clear any previously assigned tags for this booking (if re-registering)
  for (const b of booking.booking_bags) {
    if (b.bag_tag_id) {
      await svc
        .from('bag_tags' as never)
        .update({ status: 'available', current_booking_id: null })
        .eq('id', b.bag_tag_id)
    }
  }

  // Delete all existing bags for this booking first, so we can clean-slate insert
  await svc.from('booking_bags' as never).delete().eq('booking_id', bookingId)

  // 3. Register bags and assign tags
  for (const bag of bags) {
    const { data: tag } = await svc
      .from('bag_tags' as never)
      .select('id, status, hub_id')
      .eq('tag_code', bag.tag_code.trim())
      .single() as { data: { id: string; status: string; hub_id: string } | null }

    if (!tag) {
      return { error: `Bag Tag "${bag.tag_code}" does not exist in the system.` }
    }

    if (tag.hub_id !== hubId) {
      return { error: `Bag Tag "${bag.tag_code}" is registered to a different hub.` }
    }

    if (tag.status !== 'available') {
      return { error: `Bag Tag "${bag.tag_code}" is currently not available (Status: ${tag.status}).` }
    }

    // B. Insert booking bag
    const { data: insertedBag, error: insertError } = await svc
      .from('booking_bags' as never)
      .insert({
        booking_id: bookingId,
        bag_type: bag.bag_type,
        bag_tag_id: tag.id,
        seal_number: bag.seal_status === 'sealed' ? (bag.seal_number?.trim() || null) : null,
        seal_status: bag.seal_status,
        notes: bag.notes?.trim() || null,
        status: 'stored'
      })
      .select('id')
      .single() as { data: { id: string } | null; error: PostgrestError | null }

    if (insertError || !insertedBag) {
      return { error: `Failed to insert bag: ${insertError?.message || 'Null result'}` }
    }

    // C. Lock bag tag
    await svc
      .from('bag_tags' as never)
      .update({ status: 'in_storage', current_booking_id: bookingId })
      .eq('id', tag.id)

    // D. Audit
    await svc.rpc('write_audit_log', {
      p_actor_id: userId,
      p_actor_role: 'hub_staff',
      p_action: 'bag_tag_assigned',
      p_entity: 'booking_bags',
      p_entity_id: insertedBag.id,
      p_metadata: { tag_code: bag.tag_code }
    })

    if (bag.seal_status === 'sealed') {
      await svc.rpc('write_audit_log', {
        p_actor_id: userId,
        p_actor_role: 'hub_staff',
        p_action: 'seal_number_assigned',
        p_entity: 'booking_bags',
        p_entity_id: insertedBag.id,
        p_metadata: { seal_number: bag.seal_number }
      })
    } else {
      await svc.rpc('write_audit_log', {
        p_actor_id: userId,
        p_actor_role: 'hub_staff',
        p_action: 'seal_not_applicable',
        p_entity: 'booking_bags',
        p_entity_id: insertedBag.id,
        p_metadata: { reason: bag.notes || 'Unsealable' }
      })
    }
  }

  // 4. Update booking status
  await svc
    .from('bookings' as never)
    .update({ status: 'active_storage' })
    .eq('id', bookingId)

  // 5. Audit booking stored
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'booking_moved_to_active_storage',
    p_entity: 'bookings',
    p_entity_id: bookingId
  })

  // Notifications & SMS
  const { data: bookingDetail } = await svc
    .from('bookings' as never)
    .select('id, user_id, hubs(name), users(phone)')
    .eq('id', bookingId)
    .single() as { data: { user_id: string; hubs: { name: string } | null; users: { phone: string | null } | null } | null }

  if (bookingDetail) {
    const hubName = bookingDetail.hubs?.name ?? 'the hub'
    await svc.from('notifications' as never).insert({
      user_id: bookingDetail.user_id,
      type: 'general',
      message: `Your bags have been securely stored at ${hubName}. Reusable tags and seals are registered.`,
      read: false
    })

    if (bookingDetail.users?.phone) {
      const { sendSMS } = await import('@/lib/utils/sms')
      sendSMS(bookingDetail.users.phone, `Luggo: Your drop-off at ${hubName} is complete and bags are in active storage!`).catch(console.error)
    }
  }

  return {}
}

// ─────────────────────────────────────────────
// INCIDENT LOGGING & RESOLUTION
// ─────────────────────────────────────────────
export async function createIncidentReport(
  bookingId: string,
  bagId: string | null,
  incidentType: string,
  description: string
): Promise<{ error?: string }> {
  const { svc, userId, hubId } = await requireStaff()

  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single()

  if (!booking) {
    return { error: 'Booking not found or not at this hub.' }
  }

  const { data: report, error: reportError } = await svc
    .from('incident_reports' as never)
    .insert({
      booking_id: bookingId,
      bag_id: bagId || null,
      incident_type: incidentType,
      description: description,
      status: 'open',
      reported_by_staff_id: userId
    })
    .select('id')
    .single() as { data: { id: string } | null; error: PostgrestError | null }

  if (reportError || !report) {
    return { error: reportError?.message || 'Failed to create incident report.' }
  }

  await svc
    .from('bookings' as never)
    .update({ status: 'exception_hold' })
    .eq('id', bookingId)

  if (bagId) {
    await svc
      .from('booking_bags' as never)
      .update({ status: 'exception_hold' })
      .eq('id', bagId)
  }

  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'incident_created',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: { incident_type: incidentType, incident_report_id: report.id }
  })

  return {}
}

export async function resolveIncidentReport(
  incidentId: string,
  note: string
): Promise<{ error?: string }> {
  const { svc, userId } = await requireStaff()

  const isSupervisor = await checkIsSupervisor(userId, svc)
  if (!isSupervisor) {
    return { error: 'Unauthorized. Only supervisors/admins can resolve incidents.' }
  }

  const { data: report } = await svc
    .from('incident_reports' as never)
    .select('id, booking_id, bag_id')
    .eq('id', incidentId)
    .single() as { data: { id: string; booking_id: string; bag_id: string | null } | null }

  if (!report) return { error: 'Incident report not found.' }

  await svc
    .from('incident_reports' as never)
    .update({
      status: 'resolved',
      resolved_by_supervisor_id: userId,
      resolution_note: note,
      resolved_at: new Date().toISOString()
    })
    .eq('id', incidentId)

  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'incident_resolved',
    p_entity: 'bookings',
    p_entity_id: report.booking_id,
    p_metadata: { incident_id: incidentId, supervisor_approval: true }
  })

  const { data: openIncidents } = await svc
    .from('incident_reports' as never)
    .select('id')
    .eq('booking_id', report.booking_id)
    .eq('status', 'open') as { data: { id: string }[] | null }

  if (!openIncidents || openIncidents.length === 0) {
    await svc
      .from('bookings' as never)
      .update({ status: 'ready_for_release' })
      .eq('id', report.booking_id)

    if (report.bag_id) {
      await svc
        .from('booking_bags' as never)
        .update({ status: 'stored' })
        .eq('id', report.bag_id)
    }

    await svc.rpc('write_audit_log', {
      p_actor_id: userId,
      p_actor_role: 'hub_staff',
      p_action: 'manual_release',
      p_entity: 'bookings',
      p_entity_id: report.booking_id
    })
  }

  return {}
}

export async function waiveLateFeeSupervisor(
  bookingId: string,
  reason: string
): Promise<{ error?: string }> {
  return waiveAndCompletePickup(bookingId, reason)
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

// ─────────────────────────────────────────────
// BYPASS CUSTOMER SEAL CONFIRMATION (VERBAL)
// ─────────────────────────────────────────────
export async function bypassSealConfirmationAction(bookingId: string): Promise<void> {
  await bypassSealConfirmation(bookingId)
  redirect(`/staff/booking/${bookingId}`)
}

export async function bypassSealConfirmation(
  bookingId: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, status')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as { data: { id: string; status: string } | null }

  if (!booking) return { error: 'Booking not found.' }
  if (booking.status !== 'sealed_waiting_user_confirmation') {
    return { error: `Seal confirmation bypass is only valid for sealed bookings waiting for customer confirmation. Current status: ${booking.status}` }
  }

  // 1. Mark seal proof as verbally confirmed
  await svc
    .from('seal_proofs' as never)
    .update({ confirmed_by_user_at: new Date().toISOString() })
    .eq('booking_id', bookingId)

  // 2. Advance status → active_storage
  await svc
    .from('bookings' as never)
    .update({ status: 'active_storage' })
    .eq('id', bookingId)

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'seal_confirmed_verbally_by_staff',
    p_entity: 'bookings',
    p_entity_id: bookingId
  })

  return {}
}

// ─────────────────────────────────────────────
// COMPLETE PICKUP WITH CASH PAYMENT (LATE FEES)
// ─────────────────────────────────────────────
export async function completePickupWithCashAction(bookingId: string): Promise<void> {
  await completePickupWithCash(bookingId)
  redirect(`/staff/booking/${bookingId}`)
}

export async function completePickupWithCash(
  bookingId: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // Fetch booking with bags
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, status, end_time, user_id, hubs(name), users(name, phone, email), booking_bags(id, bag_type)')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as {
      data: {
        id: string
        status: string
        end_time: string
        user_id: string
        hubs: { name: string } | null
        users: { name: string; phone: string | null; email: string } | null
        booking_bags: { id: string; bag_type: BagType }[]
      } | null
    }

  if (!booking) return { error: 'Booking not found.' }
  if (booking.status !== 'overstayed') {
    return { error: `Cash payment bypass is only valid for overstayed bookings. Current status: ${booking.status}` }
  }

  // Calculate late fee
  const end = new Date(booking.end_time)
  const lateFeeAmount = calculateLateFee(booking.booking_bags, end)

  if (lateFeeAmount > 0) {
    // 1. Create a paid payment record for cash
    await svc
      .from('payments' as never)
      .insert({
        booking_id: bookingId,
        amount: lateFeeAmount,
        status: 'paid',
        type: 'late_fee',
        gateway_ref: 'CASH_PAYMENT_BYPASS'
      })

    // 2. Cancel/fail any pending online payments for this late_fee
    await svc
      .from('payments' as never)
      .update({ status: 'failed' })
      .eq('booking_id', bookingId)
      .eq('type', 'late_fee')
      .eq('status', 'pending')
  }

  // 3. Mark booking as completed
  await svc
    .from('bookings' as never)
    .update({ status: 'completed' })
    .eq('id', bookingId)

  // Audit log
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'late_fee_paid_cash_and_pickup_completed',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: { cashPaid: lateFeeAmount }
  })

  const hubName = booking.hubs?.name ?? 'the hub'

  // Notifications
  await svc.from('notifications' as never).insert({
    user_id: booking.user_id,
    type: 'general',
    message: `Your bags have been collected from ${hubName}. Late fee of LKR ${lateFeeAmount.toLocaleString()} was paid in cash. Thank you!`,
    read: false,
  })

  if (booking.users?.phone) {
    const { sendSMS } = await import('@/lib/utils/sms')
    sendSMS(
      booking.users.phone,
      `Luggo: Your bags have been collected from ${hubName}. LKR ${lateFeeAmount.toLocaleString()} late fee paid in cash. Thank you! 🧳`
    ).catch(console.error)
  }

  return {}
}
