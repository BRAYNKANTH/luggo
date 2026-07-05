'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { type PostgrestError, type SupabaseClient } from '@supabase/supabase-js'
import { uuidSchema } from '@/lib/validators/common'
import { type BagType } from '@/types/database'
import { calculateLateFee, calculateEarlyCheckinDecision, calculateBookingPrice } from '@/lib/utils/pricing'


// ─────────────────────────────────────────────
// HELPER — get authenticated staff + their hub
// Returns anon client for reads (respects RLS) + service client for writes
// ─────────────────────────────────────────────
async function requireStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: staffRows } = await supabase
    .from('hub_staff')
    .select('hub_id, hubs(alias)')
    .eq('user_id', user.id)
    .eq('active', true)
    .limit(1) as {
      data: { hub_id: string; hubs: { alias: string } | null }[] | null
      error: PostgrestError | null
    }

  const staffRow = staffRows?.[0] || null
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

  // Fetch current booking start_time and end_time
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('start_time, end_time')
    .eq('id', bookingId)
    .single() as { data: { start_time: string; end_time: string } | null }

  if (!booking) return { error: 'Booking not found.' }

  const bookedStart = new Date(booking.start_time)
  const bookedEnd = new Date(booking.end_time)
  const now = new Date()

  let newStart = bookedStart.toISOString()
  let newEnd = bookedEnd.toISOString()

  // Shift pickup deadline if checking in early
  if (now < bookedStart) {
    const earlyArrivalMs = bookedStart.getTime() - now.getTime()
    newStart = now.toISOString()
    newEnd = new Date(bookedEnd.getTime() - earlyArrivalMs).toISOString()
  }

  const { error } = await svc
    .from('bookings' as never)
    .update({ 
      status: 'arrived',
      start_time: newStart,
      end_time: newEnd
    })
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
export async function uploadSealProof(
  bookingId: string,
  bagId: string,
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

  const { svc, userId } = await requireStaff()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${bookingId}/${bagId}_${Date.now()}.${ext}`
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

  // Insert evidence
  const { error: evidenceError } = await svc
    .from('booking_bag_evidence' as never)
    .insert({
      booking_id: bookingId,
      bag_id: bagId,
      evidence_type: 'seal_photo',
      file_url: path,
      uploaded_by_staff_id: userId
    }) as { error: { message: string } | null }

  if (evidenceError) return { error: evidenceError.message }

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'booking_bag_evidence_uploaded',
    p_entity: 'booking_bag_evidence',
    p_entity_id: bookingId,
    p_metadata: { photo: path, bag_id: bagId, evidence_type: 'seal_photo' }
  })

  return {}
}

export async function finalizeCheckInAction(
  bookingId: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // Verify that all bags have a seal photo upload (if they are sealed)
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, status, user_id, hubs(name), users(name, phone, email), booking_bags(id, seal_status)')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as {
      data: { id: string; status: string; user_id: string; hubs: { name: string } | null; users: { name: string; phone: string | null; email: string } | null; booking_bags: { id: string; seal_status: string }[] } | null
    }

  if (!booking) return { error: 'Booking not found.' }

  const allowed = ['sealing_in_progress', 'arrived', 'confirmed']
  if (!allowed.includes(booking.status)) {
    return { error: `Invalid status: ${booking.status}` }
  }

  // Check if at least one photo is uploaded for each sealed bag
  const sealedBagIds = booking.booking_bags.filter(b => b.seal_status === 'sealed').map(b => b.id)
  if (sealedBagIds.length > 0) {
    const { data: uploaded } = await svc
      .from('booking_bag_evidence' as never)
      .select('bag_id')
      .eq('booking_id', bookingId)
      .in('bag_id', sealedBagIds) as { data: { bag_id: string }[] | null }

    const uploadedBagIds = new Set(uploaded?.map(u => u.bag_id) || [])
    for (const id of sealedBagIds) {
      if (!uploadedBagIds.has(id)) {
        return { error: 'Please upload a seal photo for all sealed bags before finalizing.' }
      }
    }
  }

  // Update booking status directly to active_storage
  const { error: bookingError } = await svc
    .from('bookings' as never)
    .update({ status: 'active_storage' })
    .eq('id', bookingId)

  if (bookingError) return { error: bookingError.message }

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'booking_checkin_finalized',
    p_entity: 'bookings',
    p_entity_id: bookingId
  })

  // SMS — let customer know their bags are in secure storage
  if (booking.users?.phone) {
    const { sendSMS } = await import('@/lib/utils/sms')
    const hubName = booking.hubs?.name ?? 'the hub'
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? ''
    await sendSMS(
      booking.users.phone,
      `Luggo: Your bags at ${hubName} have been sealed and are in secure storage! View details: ${appUrl}/booking/${bookingId}`
    ).catch(console.error)
  }

  return {}
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
    .select('id, status, start_time, end_time, user_id, hubs(name), users(name, phone, email), booking_bags(id, bag_tag_id, bag_type), pickup_otp_verified_at, pickup_override_supervisor_id')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as {
      data: { id: string; status: string; start_time: string; end_time: string; user_id: string; hubs: { name: string } | null; users: { name: string; phone: string | null; email: string } | null; booking_bags: { id: string; bag_tag_id: string | null; bag_type: BagType }[]; pickup_otp_verified_at: string | null; pickup_override_supervisor_id: string | null } | null
    }

  if (!booking) return { error: 'Booking not found.' }

  if (!booking.pickup_otp_verified_at && !booking.pickup_override_supervisor_id) {
    return { error: 'OTP verification or Supervisor Override is required before releasing bags.' }
  }

  const allowedStatuses = ['pickup_requested', 'active_storage', 'ready_for_release']
  if (!allowedStatuses.includes(booking.status)) {
    return { error: `Cannot complete pickup. Current status: ${booking.status}` }
  }

  // Calculate late fee dynamically at checkout
  const start = new Date(booking.start_time)
  const end = new Date(booking.end_time)
  const now = new Date()
  const lateFeeAmount = calculateLateFee(booking.booking_bags, start, end, now)

  if (lateFeeAmount > 0) {
    // Check if they paid it or if it is waived
    const { data: paidLateFees } = await svc
      .from('payments' as never)
      .select('amount, gateway_ref')
      .eq('booking_id', bookingId)
      .eq('type', 'late_fee')
      .eq('status', 'paid') as { data: { amount: number; gateway_ref: string | null }[] | null }

    const isWaived = paidLateFees?.some(p => p.gateway_ref?.startsWith('WAIVED_BY_SUPERVISOR_')) ?? false
    if (!isWaived) {
      const totalPaid = paidLateFees?.reduce((acc, p) => acc + p.amount, 0) ?? 0
      if (totalPaid < lateFeeAmount) {
        return { error: `Customer must settle the late fee of LKR ${(lateFeeAmount - totalPaid).toLocaleString()} before pickup can be completed.` }
      }
    }
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
      .update({ status: 'released', bag_tag_id: null })
      .eq('id', bag.id)
  }

  // 2. Complete the booking and clear OTP states
  await svc.from('bookings' as never).update({
    status: 'completed',
    pickup_otp: null,
    pickup_otp_expires_at: null,
    pickup_otp_verified_at: null,
    pickup_override_supervisor_id: null,
    pickup_override_reason: null,
    pickup_override_at: null
  }).eq('id', bookingId)

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
    await sendSMS(
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
  
  // Fetch hub capacity
  const { data: hub } = await svc
    .from('hubs' as never)
    .select('capacity')
    .eq('id', input.hubId)
    .single() as { data: { capacity: number } | null }

  if (!hub) return { error: 'Hub not found.' }

  // Overlap capacity check — matching online bookings logic
  const { data: overlappingBookings } = await svc
    .from('bookings' as never)
    .select('id, booking_bags(id)')
    .eq('hub_id', input.hubId)
    .not('status', 'in', '("cancelled","expired","completed")')
    .lt('start_time', expected.toISOString())
    .gt('end_time', now.toISOString()) as { data: { id: string; booking_bags: unknown[] }[] | null }

  const curBags = overlappingBookings?.reduce((acc, b) => acc + (b.booking_bags?.length ?? 0), 0) ?? 0

  if (curBags + input.bagTypes.length > hub.capacity) {
    return { error: `This hub does not have enough space for walk-in booking. Current load: ${curBags}/${hub.capacity} bags.` }
  }

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
    await svc.from('bookings' as never).delete().eq('id', booking.id)
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
    await sendSMS(
      input.phone,
      `Luggo: Walk-in booking confirmed! Ref: WI-${booking.id.slice(0, 8).toUpperCase()}. Expected pickup: ${input.expectedPickupTime}. Thank you!`
    ).catch(console.error)
  }

  return { bookingId: booking.id }
}

// ─────────────────────────────────────────────
// ALLOCATE STORAGE SLOT FOR BOOKING (Timezone-safe)
// ─────────────────────────────────────────────
export async function allocateSlotForBooking(
  supabase: SupabaseClient,
  hubId: string,
  bookingId: string
): Promise<number> {
  // 1. Fetch occupied slot numbers
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('slot_number, status, end_time')
    .eq('hub_id', hubId)
    .not('slot_number', 'is', null)
    .in('status', [
      'confirmed',
      'pending_payment',
      'arrived',
      'identity_verified',
      'sealing_in_progress',
      'sealed_waiting_user_confirmation',
      'active_storage',
      'pickup_requested',
      'overstayed',
      'late_fee_pending'
    ])

  if (error) {
    throw new Error(`Failed to query slots: ${error.message}`)
  }

  const now = new Date()
  const occupiedSlots = new Set<number>()
  if (bookings) {
    for (const b of bookings) {
      if (b.status === 'confirmed' || b.status === 'pending_payment') {
        // If booking pickup time has passed, release slot (meaning we don't count it as occupied)
        const pickupTime = new Date(b.end_time)
        if (pickupTime <= now) {
          continue
        }
      }
      occupiedSlots.add(b.slot_number)
    }
  }

  // 2. Find first free slot between 1 and 20
  let allocatedSlot = 0
  for (let i = 1; i <= 20; i++) {
    if (!occupiedSlots.has(i)) {
      allocatedSlot = i
      break
    }
  }

  if (allocatedSlot === 0) {
    throw new Error('All 20 storage slots are currently occupied at this hub.')
  }

  // 3. Save allocated slot
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ slot_number: allocatedSlot })
    .eq('id', bookingId)

  if (updateError) {
    throw new Error(`Failed to save slot allocation: ${updateError.message}`)
  }

  return allocatedSlot
}

// ─────────────────────────────────────────────
// REGISTER REUSABLE BAG TAGS & SEALS (Slot-Based)
// ─────────────────────────────────────────────
export async function registerBags(
  bookingId: string,
  bags: Array<{
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
    .select('id, status, user_id, slot_number')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as {
      data: { id: string; status: string; user_id: string; slot_number: number | null } | null
    }

  if (!booking) return { error: 'Booking not found.' }

  // 2. Auto allocate slot if missing
  let slotNumber = booking.slot_number
  if (!slotNumber) {
    try {
      slotNumber = await allocateSlotForBooking(svc, hubId, bookingId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Slot allocation failed'
      return { error: msg }
    }
  }

  // Delete all existing bags for this booking first, so we can clean-slate insert
  await svc.from('booking_bags' as never).delete().eq('booking_id', bookingId)

  // 3. Register bags
  for (const bag of bags) {
    // Insert booking bag (no bag_tag_id needed now!)
    const { data: insertedBag, error: insertError } = await svc
      .from('booking_bags' as never)
      .insert({
        booking_id: bookingId,
        bag_type: bag.bag_type,
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

    // D. Audit
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
    p_entity_id: bookingId,
    p_metadata: { slot_number: slotNumber }
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
      await sendSMS(bookingDetail.users.phone, `Luggo: Your drop-off at ${hubName} is complete and bags are in active storage!`).catch(console.error)
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

  // 1. Transition booking to exception_hold
  const { error: bookingError } = await svc
    .from('bookings' as never)
    .update({ status: 'exception_hold' })
    .eq('id', bookingId)

  if (bookingError) {
    return { error: bookingError.message }
  }

  // 2. Insert incident report record
  const { error: incidentError } = await svc
    .from('incident_reports' as never)
    .insert({
      booking_id: bookingId,
      incident_type: 'customer_dispute',
      description: `Identity verification rejected: ${reason.trim()}`,
      status: 'open',
      reported_by_staff_id: userId
    })

  if (incidentError) {
    // Attempt to revert status if incident insert failed
    await svc.from('bookings' as never).update({ status: 'arrived' }).eq('id', bookingId)
    return { error: incidentError.message }
  }

  // 3. Audit the identity verification rejection / escalation
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
    .select('id, status, start_time, end_time, user_id, hubs(name), users(name, phone, email), booking_bags(id, bag_type, bag_tag_id)')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as {
      data: {
        id: string
        status: string
        start_time: string
        end_time: string
        user_id: string
        hubs: { name: string } | null
        users: { name: string; phone: string | null; email: string } | null
        booking_bags: { id: string; bag_type: BagType; bag_tag_id: string | null }[]
      } | null
    }

  if (!booking) return { error: 'Booking not found.' }
  const allowed = ['active_storage', 'overstayed', 'pickup_requested', 'late_fee_pending']
  if (!allowed.includes(booking.status)) {
    return { error: `Cash payment bypass is not valid for bookings in status: ${booking.status}` }
  }

  // Calculate late fee
  const start = new Date(booking.start_time)
  const end = new Date(booking.end_time)
  const now = new Date()
  const lateFeeAmount = calculateLateFee(booking.booking_bags, start, end, now)

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

  // 3. Release all bag tags and update bag statuses
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
      .update({ status: 'released', bag_tag_id: null })
      .eq('id', bag.id)
  }

  // 4. Complete the booking and clear OTP states
  await svc.from('bookings' as never).update({
    status: 'completed',
    pickup_otp: null,
    pickup_otp_expires_at: null,
    pickup_otp_verified_at: null,
    pickup_override_supervisor_id: null,
    pickup_override_reason: null,
    pickup_override_at: null
  }).eq('id', bookingId)

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
    await sendSMS(
      booking.users.phone,
      `Luggo: Your bags have been collected from ${hubName}. LKR ${lateFeeAmount.toLocaleString()} late fee paid in cash. Thank you! 🧳`
    ).catch(console.error)
  }

  return {}
}

// ─────────────────────────────────────────────
// EARLY CHECK-IN OPERATIONS (Hardened & Recalculated)
// ─────────────────────────────────────────────

export async function createEarlyCheckinPaymentLink(bookingId: string): Promise<string> {
  // Uses the customer's booking detail page which contains the PayHere payment button
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.luggo.lk'
  return `${baseUrl}/booking/${bookingId}`
}

export async function processStandardCheckInAction(
  bookingId: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // 1. Fetch booking details to calculate early drop-off details on the server
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('status, start_time, end_time, total_price, booking_bags(bag_type)')
    .eq('id', bookingId)
    .single() as { data: { status: string; start_time: string; end_time: string; total_price: number; booking_bags: { bag_type: BagType }[] } | null }

  if (!booking) return { error: 'Booking not found.' }
  if (booking.status !== 'confirmed') {
    return { error: 'This booking has already been processed or is not in a confirmable status. Refresh the page.' }
  }

  // bagCollectedAt represents the time Luggo staff physically accepted the customer's luggage at the hub counter.
  // This controls the billing duration (early check-in minutes).
  const bagCollectedAt = new Date()
  const bookedStartTime = new Date(booking.start_time)
  const bookedEndTime = new Date(booking.end_time)

  const decision = calculateEarlyCheckinDecision({
    bookedStartTime,
    bookedEndTime,
    actualCheckInTime: bagCollectedAt,
    bags: booking.booking_bags,
    earlyBufferMinutes: 15
  })

  // Prevent bypass of payment if they are more than 15 minutes early
  if (decision.requiresAction) {
    return { error: 'Customer is more than 15 minutes early. Payment or shifted window is required.' }
  }

  const resolvedCheckInType = decision.isEarly ? 'free_buffer' : 'none'

  // 2. Update booking (bagCollectedAt is saved to actual_check_in_time)
  const { error } = await svc
    .from('bookings' as never)
    .update({
      status: 'arrived',
      actual_check_in_time: bagCollectedAt.toISOString(), // bagCollectedAt controls billing
      early_checkin_minutes: decision.earlyMinutes,
      early_checkin_type: resolvedCheckInType,
      early_checkin_fee: 0,
      early_checkin_payment_status: 'paid',
      early_checkin_handled_by_staff_id: userId,
      early_checkin_handled_at: bagCollectedAt.toISOString()
    })
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .eq('status', 'confirmed')

  if (error) return { error: error.message }

  // 3. Resolve pending base payment (cash on arrival) if any
  await svc
    .from('payments' as never)
    .update({ 
      status: 'paid', 
      gateway_ref: 'CASH_PAYMENT_AT_HUB', 
      collected_by_staff_id: userId, 
      collected_at: bagCollectedAt.toISOString() 
    })
    .eq('booking_id', bookingId)
    .eq('status', 'pending')
    .eq('type', 'booking')
    .eq('gateway_ref', 'PAY_AT_HUB')

  // 4. Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'customer_arrived',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: { early_checkin_type: resolvedCheckInType, early_minutes: decision.earlyMinutes }
  })

  return {}
}

export async function processCashEarlyCheckInAction(
  bookingId: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // 1. Fetch booking details to calculate early drop-off details on the server
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('status, start_time, end_time, total_price, booking_bags(bag_type)')
    .eq('id', bookingId)
    .single() as { data: { status: string; start_time: string; end_time: string; total_price: number; booking_bags: { bag_type: BagType }[] } | null }

  if (!booking) return { error: 'Booking not found.' }
  if (booking.status !== 'confirmed') {
    return { error: 'This booking has already been processed or is not in a confirmable status. Refresh the page.' }
  }

  // bagCollectedAt represents the time Luggo staff physically accepted the luggage at the counter.
  // This controls the billing duration.
  const bagCollectedAt = new Date()
  const bookedStartTime = new Date(booking.start_time)
  const bookedEndTime = new Date(booking.end_time)

  const decision = calculateEarlyCheckinDecision({
    bookedStartTime,
    bookedEndTime,
    actualCheckInTime: bagCollectedAt,
    bags: booking.booking_bags,
    earlyBufferMinutes: 15
  })

  if (!decision.requiresAction || decision.earlyCheckinFee <= 0) {
    return { error: 'No extra check-in fee is required for this timing.' }
  }

  // 2. Prevent duplicate cash payment insertion
  const { data: existingCash } = await svc
    .from('payments' as never)
    .select('id')
    .eq('booking_id', bookingId)
    .eq('type', 'early_checkin')
    .eq('status', 'paid')
    .maybeSingle()

  if (existingCash) {
    return { error: 'An early check-in fee has already been paid for this booking.' }
  }

  // 3. Create paid early_checkin payment record
  const { data: payment, error: paymentError } = await svc
    .from('payments' as never)
    .insert({
      booking_id: bookingId,
      amount: decision.earlyCheckinFee,
      status: 'paid',
      type: 'early_checkin',
      gateway_ref: 'CASH_AT_COUNTER',
      method: 'cash',
      collected_by_staff_id: userId,
      collected_at: new Date().toISOString() // paymentPaidAt controls payment audit only
    })
    .select('id')
    .single() as { data: { id: string } | null; error: PostgrestError | null }

  if (paymentError || !payment) {
    return { error: `Failed to record payment: ${paymentError?.message || 'Null'}` }
  }

  // 4. Update booking
  const { error: bookingError } = await svc
    .from('bookings' as never)
    .update({
      status: 'arrived',
      actual_check_in_time: bagCollectedAt.toISOString(), // bagCollectedAt controls billing
      early_checkin_minutes: decision.earlyMinutes,
      early_checkin_type: 'pay_extra',
      early_checkin_extra_hours: decision.extraHours,
      early_checkin_fee: decision.earlyCheckinFee,
      early_checkin_payment_status: 'paid',
      early_checkin_payment_id: payment.id,
      early_checkin_handled_by_staff_id: userId,
      early_checkin_handled_at: bagCollectedAt.toISOString()
    })
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .eq('status', 'confirmed')

  if (bookingError) return { error: bookingError.message }

  // 5. Resolve pending base payment (cash on arrival) if any
  await svc
    .from('payments' as never)
    .update({ 
      status: 'paid', 
      gateway_ref: 'CASH_PAYMENT_AT_HUB', 
      collected_by_staff_id: userId, 
      collected_at: bagCollectedAt.toISOString() 
    })
    .eq('booking_id', bookingId)
    .eq('status', 'pending')
    .eq('type', 'booking')
    .eq('gateway_ref', 'PAY_AT_HUB')

  // 6. Audit cash collected
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'early_checkin_cash_collected',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: {
      early_checkin_type: 'pay_extra',
      early_minutes: decision.earlyMinutes,
      extraHours: decision.extraHours,
      amount: decision.earlyCheckinFee,
      staff_id: userId
    }
  })

  return {}
}

export async function processOnlineEarlyCheckInAction(
  bookingId: string
): Promise<{ error?: string; paymentLink?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // 1. Fetch booking details to calculate early drop-off details on the server
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('status, start_time, end_time, total_price, booking_bags(bag_type)')
    .eq('id', bookingId)
    .single() as { data: { status: string; start_time: string; end_time: string; total_price: number; booking_bags: { bag_type: BagType }[] } | null }

  if (!booking) return { error: 'Booking not found.' }
  if (booking.status !== 'confirmed') {
    return { error: 'This booking has already been processed or is not in a confirmable status. Refresh the page.' }
  }

  // bagCollectedAt represents the time Luggo staff physically accepted the luggage at the counter.
  // This controls the billing duration.
  const bagCollectedAt = new Date()
  const bookedStartTime = new Date(booking.start_time)
  const bookedEndTime = new Date(booking.end_time)

  const decision = calculateEarlyCheckinDecision({
    bookedStartTime,
    bookedEndTime,
    actualCheckInTime: bagCollectedAt,
    bags: booking.booking_bags,
    earlyBufferMinutes: 15
  })

  if (!decision.requiresAction || decision.earlyCheckinFee <= 0) {
    return { error: 'No extra check-in fee is required for this timing.' }
  }

  // 2. Concurrency check: Reuse existing pending payment if it already exists to prevent duplicate payment links
  const { data: existingPayment } = await svc
    .from('payments' as never)
    .select('id, amount')
    .eq('booking_id', bookingId)
    .eq('type', 'early_checkin')
    .eq('status', 'pending')
    .maybeSingle() as { data: { id: string; amount: number } | null }

  let paymentId = existingPayment?.id
  let paymentLink = ''

  if (existingPayment) {
    if (Number(existingPayment.amount) !== Number(decision.earlyCheckinFee)) {
      await svc
        .from('payments' as never)
        .update({ amount: decision.earlyCheckinFee })
        .eq('id', existingPayment.id)
    }
    paymentId = existingPayment.id
    paymentLink = await createEarlyCheckinPaymentLink(bookingId)
  } else {
    // Create new pending payment
    const { data: payment, error: paymentError } = await svc
      .from('payments' as never)
      .insert({
        booking_id: bookingId,
        amount: decision.earlyCheckinFee,
        status: 'pending',
        type: 'early_checkin',
        method: 'online'
      })
      .select('id')
      .single() as { data: { id: string } | null; error: PostgrestError | null }

    if (paymentError || !payment) {
      return { error: `Failed to record pending payment: ${paymentError?.message || 'Null'}` }
    }
    paymentId = payment.id
    paymentLink = await createEarlyCheckinPaymentLink(bookingId)
  }

  // 3. Update booking status to early_checkin_pending_payment
  const { error: bookingError } = await svc
    .from('bookings' as never)
    .update({
      status: 'early_checkin_pending_payment',
      actual_check_in_time: bagCollectedAt.toISOString(), // bagCollectedAt controls billing
      early_checkin_minutes: decision.earlyMinutes,
      early_checkin_type: 'pay_extra',
      early_checkin_extra_hours: decision.extraHours,
      early_checkin_fee: decision.earlyCheckinFee,
      early_checkin_payment_status: 'pending',
      early_checkin_payment_id: paymentId,
      early_checkin_handled_by_staff_id: userId,
      early_checkin_handled_at: bagCollectedAt.toISOString()
    })
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .eq('status', 'confirmed')

  if (bookingError) return { error: bookingError.message }

  // Send SMS to customer if they have a phone number
  const { data: bookingDetail } = await svc
    .from('bookings' as never)
    .select('users(phone)')
    .eq('id', bookingId)
    .single() as { data: { users: { phone: string | null } | null } | null }

  if (bookingDetail?.users?.phone) {
    const { sendSMS } = await import('@/lib/utils/sms')
    await sendSMS(
      bookingDetail.users.phone,
      `Luggo: You arrived early. Please pay LKR ${decision.earlyCheckinFee} to confirm early storage. ${paymentLink}`
    ).catch(console.error)
  }

  // 4. Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'early_checkin_payment_initiated',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: {
      early_checkin_type: 'pay_extra',
      early_minutes: decision.earlyMinutes,
      fee: decision.earlyCheckinFee,
      payment_method: 'online',
      payment_id: paymentId
    }
  })

  return { paymentLink }
}

export async function processShiftBookingCheckInAction(
  bookingId: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // 1. Fetch booking details to calculate shift details on the server
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('status, start_time, end_time, total_price, booking_bags(bag_type)')
    .eq('id', bookingId)
    .single() as { data: { status: string; start_time: string; end_time: string; total_price: number; booking_bags: { bag_type: BagType }[] } | null }

  if (!booking) return { error: 'Booking not found.' }
  if (booking.status !== 'confirmed') {
    return { error: 'This booking has already been processed or is not in a confirmable status. Refresh the page.' }
  }

  // bagCollectedAt represents the time Luggo staff physically accepted the luggage at the counter.
  // This controls the billing duration and shifting offset.
  const bagCollectedAt = new Date()
  const bookedStartTime = new Date(booking.start_time)
  const bookedEndTime = new Date(booking.end_time)

  const decision = calculateEarlyCheckinDecision({
    bookedStartTime,
    bookedEndTime,
    actualCheckInTime: bagCollectedAt,
    bags: booking.booking_bags,
    earlyBufferMinutes: 15
  })

  if (!decision.isEarly) {
    return { error: 'Customer is not early. Shift is not applicable.' }
  }

  // Prevent shifting in the past or invalid values
  if (decision.shiftedEndTime <= bagCollectedAt) {
    return { error: 'Shifted pickup time cannot be in the past.' }
  }

  // 2. Update booking times and status (shifting based on bagCollectedAt)
  const { error: bookingError } = await svc
    .from('bookings' as never)
    .update({
      status: 'arrived',
      start_time: decision.shiftedStartTime.toISOString(), // shiftedStartTime = bagCollectedAt
      end_time: decision.shiftedEndTime.toISOString(),     // shiftedEndTime = bagCollectedAt + originalDuration
      original_start_time: booking.start_time,
      original_end_time: booking.end_time,
      actual_check_in_time: bagCollectedAt.toISOString(), // bagCollectedAt controls billing
      early_checkin_minutes: decision.earlyMinutes,
      early_checkin_type: 'shift_booking',
      early_checkin_fee: 0,
      early_checkin_payment_status: 'paid',
      early_checkin_handled_by_staff_id: userId,
      early_checkin_handled_at: bagCollectedAt.toISOString()
    })
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .eq('status', 'confirmed')

  if (bookingError) return { error: bookingError.message }

  // 3. Resolve pending base payment (cash on arrival) if any
  await svc
    .from('payments' as never)
    .update({ 
      status: 'paid', 
      gateway_ref: 'CASH_PAYMENT_AT_HUB', 
      collected_by_staff_id: userId, 
      collected_at: bagCollectedAt.toISOString() 
    })
    .eq('booking_id', bookingId)
    .eq('status', 'pending')
    .eq('type', 'booking')
    .eq('gateway_ref', 'PAY_AT_HUB')

  // 4. Audit checkin shift decision
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'early_checkin_decision',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: {
      early_checkin_type: 'shift_booking',
      early_minutes: decision.earlyMinutes,
      oldStartTime: booking.start_time,
      oldEndTime: booking.end_time,
      newStartTime: decision.shiftedStartTime.toISOString(),
      newEndTime: decision.shiftedEndTime.toISOString(),
      fee: 0,
      staff_id: userId
    }
  })

  return {}
}

export async function processSupervisorOverrideCheckInAction(
  bookingId: string,
  supervisorId: string,
  reason: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // 1. Verify supervisor role
  const { data: supervisor } = await svc
    .from('users' as never)
    .select('role')
    .eq('id', supervisorId)
    .single() as { data: { role: string } | null }

  if (!supervisor || !['support_admin', 'ops_admin', 'master_admin'].includes(supervisor.role)) {
    return { error: 'Invalid Supervisor ID or unauthorized role.' }
  }

  // 2. Fetch booking details to calculate override details on the server
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('status, start_time, end_time, total_price, booking_bags(bag_type)')
    .eq('id', bookingId)
    .single() as { data: { status: string; start_time: string; end_time: string; total_price: number; booking_bags: { bag_type: BagType }[] } | null }

  if (!booking) return { error: 'Booking not found.' }
  if (booking.status !== 'confirmed') {
    return { error: 'This booking has already been processed or is not in a confirmable status. Refresh the page.' }
  }

  // bagCollectedAt represents the time Luggo staff physically accepted the luggage at the counter.
  // This controls the billing duration.
  const bagCollectedAt = new Date()
  const bookedStartTime = new Date(booking.start_time)
  const bookedEndTime = new Date(booking.end_time)

  const decision = calculateEarlyCheckinDecision({
    bookedStartTime,
    bookedEndTime,
    actualCheckInTime: bagCollectedAt,
    bags: booking.booking_bags,
    earlyBufferMinutes: 15
  })

  // 3. Update booking with override details
  const { error: bookingError } = await svc
    .from('bookings' as never)
    .update({
      status: 'arrived',
      actual_check_in_time: bagCollectedAt.toISOString(), // bagCollectedAt controls billing
      early_checkin_minutes: decision.earlyMinutes,
      early_checkin_type: 'supervisor_override',
      early_checkin_fee: 0,
      early_checkin_payment_status: 'paid',
      early_checkin_handled_by_staff_id: supervisorId,
      early_checkin_handled_at: bagCollectedAt.toISOString()
    })
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .eq('status', 'confirmed')

  if (bookingError) return { error: bookingError.message }

  // 4. Resolve pending base payment (cash on arrival) if any
  await svc
    .from('payments' as never)
    .update({ 
      status: 'paid', 
      gateway_ref: 'CASH_PAYMENT_AT_HUB', 
      collected_by_staff_id: userId, 
      collected_at: bagCollectedAt.toISOString() 
    })
    .eq('booking_id', bookingId)
    .eq('status', 'pending')
    .eq('type', 'booking')
    .eq('gateway_ref', 'PAY_AT_HUB')

  // 5. Audit overrides
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'early_checkin_supervisor_override',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: {
      early_checkin_type: 'supervisor_override',
      early_minutes: decision.earlyMinutes,
      waived_amount: decision.earlyCheckinFee,
      original_fee: decision.earlyCheckinFee,
      supervisor_id: supervisorId,
      override_reason: reason,
      staff_id: userId
    }
  })

  return {}
}

export async function completeOnlineEarlyCheckInAction(
  bookingId: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // Fetch early check-in payment details and confirm status
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('status, early_checkin_payment_id')
    .eq('id', bookingId)
    .single() as { data: { status: string; early_checkin_payment_id: string | null } | null }

  if (!booking) return { error: 'Booking not found.' }
  if (booking.status !== 'early_checkin_pending_payment') {
    return { error: 'Booking is not in pending early check-in payment status.' }
  }
  if (!booking.early_checkin_payment_id) {
    return { error: 'Early check-in payment reference not found.' }
  }

  const { data: payment } = await svc
    .from('payments' as never)
    .select('status')
    .eq('id', booking.early_checkin_payment_id)
    .single() as { data: { status: string } | null }

  if (!payment || payment.status !== 'paid') {
    return { error: 'Early check-in fee has not been paid yet.' }
  }

  // Update booking status to arrived and payment status to paid
  const { error: bookingError } = await svc
    .from('bookings' as never)
    .update({
      status: 'arrived',
      early_checkin_payment_status: 'paid'
    })
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .eq('status', 'early_checkin_pending_payment')

  if (bookingError) return { error: bookingError.message }

  // Resolve pending base payment (cash on arrival) if any
  await svc
    .from('payments' as never)
    .update({ 
      status: 'paid', 
      gateway_ref: 'CASH_PAYMENT_AT_HUB', 
      collected_by_staff_id: userId, 
      collected_at: new Date().toISOString() 
    })
    .eq('booking_id', bookingId)
    .eq('status', 'pending')
    .eq('type', 'booking')
    .eq('gateway_ref', 'PAY_AT_HUB')

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'early_checkin_payment_completed',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: { payment_id: booking.early_checkin_payment_id }
  })

  return {}
}

export async function getSupervisorsAction(): Promise<{ supervisors?: { id: string; name: string }[]; error?: string }> {
  const { svc } = await requireStaff()
  const { data, error } = await svc
    .from('users' as never)
    .select('id, name')
    .in('role', ['support_admin', 'ops_admin', 'master_admin'])
  
  if (error) return { error: error.message }
  return { supervisors: data as { id: string; name: string }[] }
}

export async function processSupervisorIdOverrideAction(
  bookingId: string,
  supervisorId: string,
  reason: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // Verify supervisor exists and is a supervisor/admin
  const { data: supervisor } = await svc
    .from('users' as never)
    .select('role')
    .eq('id', supervisorId)
    .single() as { data: { role: string } | null }

  if (!supervisor || !['support_admin', 'ops_admin', 'master_admin'].includes(supervisor.role)) {
    return { error: 'Invalid supervisor credentials.' }
  }

  // Update id_verified
  const { error } = await svc
    .from('bookings' as never)
    .update({ id_verified: true })
    .eq('id', bookingId)
    .eq('hub_id', hubId)

  if (error) return { error: error.message }

  // Audit log
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'identity_verification_supervisor_override',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: {
      supervisor_id: supervisorId,
      override_reason: reason
    }
  })

  return {}
}

export async function processPhoneDeadPickupOverrideAction(
  bookingId: string,
  supervisorId: string,
  reason: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // Verify supervisor exists and is a supervisor/admin
  const { data: supervisor } = await svc
    .from('users' as never)
    .select('role')
    .eq('id', supervisorId)
    .single() as { data: { role: string } | null }

  if (!supervisor || !['support_admin', 'ops_admin', 'master_admin'].includes(supervisor.role)) {
    return { error: 'Invalid supervisor credentials.' }
  }

  // Check if booking is in release-eligible state
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('status')
    .eq('id', bookingId)
    .single() as { data: { status: string } | null }

  if (!booking) return { error: 'Booking not found.' }

  // Update status to ready_for_release
  const { error } = await svc
    .from('bookings' as never)
    .update({
      status: 'ready_for_release',
      pickup_override_supervisor_id: supervisorId,
      pickup_override_reason: reason,
      pickup_override_at: new Date().toISOString(),
      pickup_otp_verified_at: null
    })
    .eq('id', bookingId)
    .eq('hub_id', hubId)

  if (error) return { error: error.message }

  // Audit log
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'phone_dead_pickup_supervisor_override',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: {
      supervisor_id: supervisorId,
      override_reason: reason
    }
  })

  return {}
}

export async function recordBagAccessEventAction(
  bookingId: string,
  bagId: string,
  newSealNumber: string,
  notes: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, userId } = await requireStaff()

  // Get old seal number
  const { data: bag } = await svc
    .from('booking_bags' as never)
    .select('seal_number')
    .eq('id', bagId)
    .eq('booking_id', bookingId)
    .single() as { data: { seal_number: string | null } | null }

  if (!bag) return { error: 'Bag not found.' }

  const oldSealNumber = bag.seal_number

  // Update seal number in booking_bags
  const { error } = await svc
    .from('booking_bags' as never)
    .update({ 
      seal_number: newSealNumber,
      notes: notes ? `Accessed & Resealed: ${notes}` : 'Accessed & Resealed'
    })
    .eq('id', bagId)

  if (error) return { error: error.message }

  // Audit log
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'bag_controlled_access_event',
    p_entity: 'booking_bags',
    p_entity_id: bagId,
    p_metadata: {
      booking_id: bookingId,
      old_seal_number: oldSealNumber,
      new_seal_number: newSealNumber,
      notes
    }
  })

  return {}
}

export async function completePartialPickupAction(
  bookingId: string,
  bagIds: string[]
): Promise<{ error?: string; completed?: boolean }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // Verify booking
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, status, pickup_otp_verified_at, pickup_override_supervisor_id')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as { data: { id: string; status: string; pickup_otp_verified_at: string | null; pickup_override_supervisor_id: string | null } | null }

  if (!booking) return { error: 'Booking not found.' }

  if (!booking.pickup_otp_verified_at && !booking.pickup_override_supervisor_id) {
    return { error: 'OTP verification or Supervisor Override is required before releasing bags.' }
  }

  // Verify all bags exist and belong to the booking
  const { data: bookingBags } = await svc
    .from('booking_bags' as never)
    .select('id, status, bag_tag_id')
    .eq('booking_id', bookingId) as { data: { id: string; status: string; bag_tag_id: string | null }[] | null }

  if (!bookingBags) return { error: 'No bags found for this booking.' }

  // 1. Release bag tags for the selected bags
  const tagIds = bookingBags
    .filter(b => bagIds.includes(b.id) && b.bag_tag_id)
    .map(b => b.bag_tag_id)
    .filter((id): id is string => !!id)

  if (tagIds.length > 0) {
    await svc
      .from('bag_tags' as never)
      .update({ status: 'available', current_booking_id: null })
      .in('id', tagIds)

    for (const tid of tagIds) {
      const b = bookingBags.find(bag => bag.bag_tag_id === tid)
      if (b) {
        await svc.rpc('write_audit_log', {
          p_actor_id: userId,
          p_actor_role: 'hub_staff',
          p_action: 'bag_tag_released',
          p_entity: 'booking_bags',
          p_entity_id: b.id,
          p_metadata: { bag_tag_id: tid }
        })
      }
    }
  }

  // 2. Update status of selected bags to 'released' and clear tag reference
  const { error } = await svc
    .from('booking_bags' as never)
    .update({ status: 'released', bag_tag_id: null })
    .in('id', bagIds)

  if (error) return { error: error.message }

  // Check if there are any remaining bags in storage
  const remainingBags = bookingBags.filter(b => !bagIds.includes(b.id) && b.status !== 'released')
  const isFullyCompleted = remainingBags.length === 0

  // 3. Update booking status and clear OTP/override
  const { error: bError } = await svc
    .from('bookings' as never)
    .update({
      status: isFullyCompleted ? 'completed' : 'active_storage',
      pickup_otp: null,
      pickup_otp_expires_at: null,
      pickup_otp_verified_at: null,
      pickup_override_supervisor_id: null,
      pickup_override_reason: null,
      pickup_override_at: null
    })
    .eq('id', bookingId)
    .eq('hub_id', hubId)

  if (bError) return { error: bError.message }

  // Audit log
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'partial_pickup_processed',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: {
      released_bag_ids: bagIds,
      is_fully_completed: isFullyCompleted
    }
  })

  return { completed: isFullyCompleted }
}

export async function reportPickupIncidentAction(
  bookingId: string,
  bagId: string | null,
  incidentType: string,
  notes: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // Insert into incident_reports
  const { error: reportError } = await svc
    .from('incident_reports' as never)
    .insert({
      booking_id: bookingId,
      bag_id: bagId,
      incident_type: incidentType,
      description: notes,
      status: 'open',
      reported_by_staff_id: userId
    })

  if (reportError) return { error: reportError.message }

  // Flag booking as disputed
  const { error: statusError } = await svc
    .from('bookings' as never)
    .update({ status: 'disputed' })
    .eq('id', bookingId)
    .eq('hub_id', hubId)

  if (statusError) return { error: statusError.message }

  // Update selected bag status to disputed if applicable
  if (bagId) {
    await svc
      .from('booking_bags' as never)
      .update({ status: 'disputed' })
      .eq('id', bagId)
  }

  // Audit log
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'incident_report_filed',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: {
      bag_id: bagId,
      incident_type: incidentType,
      notes
    }
  })

  return {}
}

export async function getStaffCashReconciliationAction(): Promise<{
  error?: string
  totalCollected?: number
  breakdown?: { type: string; total: number; count: number }[]
}> {
  const { svc, userId } = await requireStaff()

  // Query paid cash payments collected by this staff today (local server time date range)
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  const { data: payments, error } = await svc
    .from('payments' as never)
    .select('amount, type')
    .eq('status', 'paid')
    .eq('method', 'cash')
    .eq('collected_by_staff_id', userId)
    .gte('collected_at', startOfDay.toISOString())
    .lte('collected_at', endOfDay.toISOString()) as { data: { amount: number; type: string }[] | null; error: PostgrestError | null }

  if (error) return { error: error.message }
  if (!payments) return { totalCollected: 0, breakdown: [] }

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Aggregate breakdown
  const groups: Record<string, { type: string; total: number; count: number }> = {}
  for (const p of payments) {
    if (!groups[p.type]) {
      groups[p.type] = { type: p.type, total: 0, count: 0 }
    }
    groups[p.type].total += Number(p.amount)
    groups[p.type].count += 1
  }

  return {
    totalCollected,
    breakdown: Object.values(groups)
  }
}

export async function updateBookingBagsAction(
  bookingId: string,
  updatedBags: Array<{ id?: string; bag_type: BagType; seal_status: string; seal_number: string | null; notes: string | null }>
): Promise<{ error?: string; difference?: number }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, userId } = await requireStaff()

  // 1. Fetch booking details to calculate new price
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('start_time, end_time, total_price')
    .eq('id', bookingId)
    .single() as { data: { start_time: string; end_time: string; total_price: number } | null }

  if (!booking) return { error: 'Booking not found.' }

  // Recalculate price of updated bags
  const start = new Date(booking.start_time)
  const end = new Date(booking.end_time)
  const newPrice = calculateBookingPrice(updatedBags, start, end)
  const priceDifference = newPrice - booking.total_price

  // 2. Fetch existing bags
  const { data: existingBags } = await svc
    .from('booking_bags' as never)
    .select('id')
    .eq('booking_id', bookingId) as { data: { id: string }[] | null }

  if (!existingBags) return { error: 'Existing bags not found.' }
  const existingIds = existingBags.map((b) => b.id)
  const updatedIds = updatedBags.map((b) => b.id).filter((id): id is string => !!id)

  // Determine deletions
  const toDelete = existingIds.filter((id) => !updatedIds.includes(id))

  // Delete removed bags
  if (toDelete.length > 0) {
    const { error: delError } = await svc
      .from('booking_bags' as never)
      .delete()
      .in('id', toDelete)
    if (delError) return { error: `Failed to remove bags: ${delError.message}` }
  }

  // Update or insert bags
  for (const bag of updatedBags) {
    if (bag.id) {
      // Update existing
      const { error: updError } = await svc
        .from('booking_bags' as never)
        .update({
          bag_type: bag.bag_type,
          seal_status: bag.seal_status,
          seal_number: bag.seal_number,
          notes: bag.notes
        })
        .eq('id', bag.id)
      if (updError) return { error: `Failed to update bag: ${updError.message}` }
    } else {
      // Insert new
      const { error: insError } = await svc
        .from('booking_bags' as never)
        .insert({
          booking_id: bookingId,
          bag_type: bag.bag_type,
          seal_status: bag.seal_status,
          seal_number: bag.seal_number,
          notes: bag.notes,
          status: 'pending_acceptance'
        })
      if (insError) return { error: `Failed to add bag: ${insError.message}` }
    }
  }

  // Update booking price
  const { error: bookingPriceError } = await svc
    .from('bookings' as never)
    .update({ total_price: newPrice })
    .eq('id', bookingId)

  if (bookingPriceError) return { error: `Failed to update booking total: ${bookingPriceError.message}` }

  // If there is an increased price difference, record a pending difference payment
  if (priceDifference > 0) {
    const { error: paymentError } = await svc
      .from('payments' as never)
      .insert({
        booking_id: bookingId,
        amount: priceDifference,
        status: 'pending',
        type: 'booking',
        gateway_ref: 'PAY_AT_HUB', // Default cash collected at counter for manual additions
        method: 'cash'
      })
    if (paymentError) return { error: `Failed to create difference payment record: ${paymentError.message}` }
  }

  // Audit log
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'booking_bags_modified_at_counter',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: {
      old_price: booking.total_price,
      new_price: newPrice,
      price_difference: priceDifference
    }
  })

  return { difference: priceDifference }
}

export async function sendPickupOTPAction(
  bookingId: string
): Promise<{ error?: string; success?: boolean }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, hubId, userId } = await requireStaff()

  // Verify booking at the staff's hub
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, status, users(phone), hubs(name)')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as { data: { id: string; status: string; users: { phone: string | null } | null; hubs: { name: string } | null } | null }

  if (!booking) return { error: 'Booking not found.' }

  const allowed = ['active_storage', 'overstayed', 'pickup_requested', 'ready_for_release']
  if (!allowed.includes(booking.status)) {
    return { error: 'Booking is not eligible for pickup OTP verification.' }
  }

  const phone = booking.users?.phone
  if (!phone) {
    return { error: 'No verified phone number found on the customer profile.' }
  }

  // Generate 4-digit OTP
  const crypto = await import('crypto')
  const otp = crypto.randomInt(1000, 10000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

  // Save to booking
  const { error: updateError } = await svc
    .from('bookings' as never)
    .update({
      pickup_otp: otp,
      pickup_otp_expires_at: expiresAt.toISOString(),
      pickup_otp_verified_at: null // Reset verification state if re-sending
    })
    .eq('id', bookingId)

  if (updateError) return { error: 'Failed to generate OTP.' }

  // Send SMS
  const { sendSMS } = await import('@/lib/utils/sms')
  const hubName = booking.hubs?.name ?? 'the hub'
  try {
    await sendSMS(
      phone,
      `Luggo: Your pickup verification code for ${hubName} is: ${otp}. Valid for 10 minutes. Do not share this code. 🧳`
    )
  } catch (err) {
    console.error('Failed to send SMS OTP:', err)
    return { error: 'OTP generated, but failed to send SMS. Please verify manually or try again.' }
  }

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'pickup_otp_sent',
    p_entity: 'bookings',
    p_entity_id: bookingId
  })

  return { success: true }
}

export async function verifyPickupOTPAction(
  bookingId: string,
  otp: string
): Promise<{ error?: string; success?: boolean }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const cleanOtp = otp.trim()
  if (!cleanOtp) return { error: 'OTP code is required.' }

  const { svc, hubId, userId } = await requireStaff()

  // Verify booking
  const { data: booking } = await svc
    .from('bookings' as never)
    .select('id, pickup_otp, pickup_otp_expires_at')
    .eq('id', bookingId)
    .eq('hub_id', hubId)
    .single() as { data: { id: string; pickup_otp: string | null; pickup_otp_expires_at: string | null } | null }

  if (!booking) return { error: 'Booking not found.' }

  if (!booking.pickup_otp || !booking.pickup_otp_expires_at) {
    return { error: 'No OTP requested for this booking. Please trigger code resend.' }
  }

  const now = new Date()
  const expiry = new Date(booking.pickup_otp_expires_at)
  if (now > expiry) {
    return { error: 'OTP has expired. Please trigger code resend.' }
  }

  if (booking.pickup_otp !== cleanOtp) {
    return { error: 'Incorrect OTP code.' }
  }

  // Update verified status
  const { error: updateError } = await svc
    .from('bookings' as never)
    .update({
      pickup_otp_verified_at: now.toISOString()
    })
    .eq('id', bookingId)

  if (updateError) return { error: 'Failed to verify OTP.' }

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: 'hub_staff',
    p_action: 'pickup_otp_verified',
    p_entity: 'bookings',
    p_entity_id: bookingId
  })

  return { success: true }
}

