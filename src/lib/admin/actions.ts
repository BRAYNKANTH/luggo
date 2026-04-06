'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { type ComplaintStatus, type UserRole } from '@/types/database'
import { uuidSchema, capacitySchema } from '@/lib/validators/common'

// ---------------------------------------------------------------------------
// Guard: caller must be an admin role
// ---------------------------------------------------------------------------
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: 'Not authenticated' }

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: UserRole } | null; error: unknown }

  const adminRoles: UserRole[] = ['support_admin', 'ops_admin', 'master_admin']
  if (!data || !adminRoles.includes(data.role)) {
    return { supabase: null, error: 'Forbidden' }
  }

  const svc = createServiceClient()
  return { supabase, svc, userId: user.id, role: data.role, error: null }
}

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------
export async function updateComplaintStatus(
  complaintId: string,
  status: ComplaintStatus
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(complaintId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, userId, role, error: authError } = await requireAdmin()
  if (authError || !svc) return { error: authError ?? 'Auth error' }

  const { error } = await svc
    .from('complaints' as never)
    .update({ status })
    .eq('id', complaintId)

  if (error) return { error: 'Failed to update complaint' }

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: role,
    p_action: 'complaint_status_updated',
    p_entity: 'complaints',
    p_entity_id: complaintId,
    p_metadata: { status }
  })

  revalidatePath('/admin/complaints')
  return {}
}

// ---------------------------------------------------------------------------
// Hubs — image upload
// ---------------------------------------------------------------------------
export async function uploadHubImage(
  hubId: string,
  formData: FormData
): Promise<{ error?: string; url?: string }> {
  const { supabase, error: authError } = await requireAdmin()
  if (authError || !supabase) return { error: authError ?? 'Auth error' }

  const file = formData.get('image') as File | null
  if (!file || file.size === 0) return { error: 'No file provided' }

  const maxSize = 5 * 1024 * 1024 // 5 MB
  if (file.size > maxSize) return { error: 'Image must be smaller than 5 MB' }

  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) return { error: 'Only JPG, PNG, and WebP are supported' }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `hubs/${hubId}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('hub-images')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) return { error: `Upload failed: ${uploadError.message}` }

  const { data: { publicUrl } } = supabase.storage
    .from('hub-images')
    .getPublicUrl(path)

  // Bust CDN cache by appending a timestamp query param
  const urlWithCache = `${publicUrl}?t=${Date.now()}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (supabase.from('hubs') as any)
    .update({ image_url: urlWithCache })
    .eq('id', hubId)

  if (dbError) return { error: 'Image uploaded but failed to save URL' }

  revalidatePath('/admin/hubs')
  revalidatePath('/hubs')
  revalidatePath('/')
  return { url: urlWithCache }
}

// ---------------------------------------------------------------------------
// Hubs
// ---------------------------------------------------------------------------
export async function toggleHubActive(
  hubId: string,
  active: boolean
): Promise<{ error?: string }> {
  const { supabase, error: authError } = await requireAdmin()
  if (authError || !supabase) return { error: authError ?? 'Auth error' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('hubs') as any)
    .update({ active })
    .eq('id', hubId)

  if (error) return { error: 'Failed to update hub' }
  revalidatePath('/admin/hubs')
  return {}
}

export async function updateHubCapacity(
  hubId: string,
  capacity: number
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(hubId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const validCap = capacitySchema.safeParse(capacity)
  if (!validCap.success) return { error: validCap.error.issues[0].message }

  const { svc, userId, role, error: authError } = await requireAdmin()
  if (authError || !svc) return { error: authError ?? 'Auth error' }

  const { error } = await svc
    .from('hubs' as never)
    .update({ capacity })
    .eq('id', hubId)

  if (error) return { error: 'Failed to update capacity' }

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: role,
    p_action: 'hub_capacity_updated',
    p_entity: 'hubs',
    p_entity_id: hubId,
    p_metadata: { capacity }
  })

  revalidatePath('/admin/hubs')
  return {}
}

// ---------------------------------------------------------------------------
// Sticker Batches
// ---------------------------------------------------------------------------
export async function createStickerBatch(
  hubId: string,
  prefix: string,
  fromNumber: number,
  toNumber: number
): Promise<{ error?: string }> {
  const { supabase, error: authError } = await requireAdmin()
  if (authError || !supabase) return { error: authError ?? 'Auth error' }

  if (fromNumber >= toNumber) return { error: 'From must be less than To' }
  if (toNumber - fromNumber > 1000) return { error: 'Batch size cannot exceed 1000' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('sticker_batches') as any).insert({
    hub_id: hubId,
    prefix: prefix.toUpperCase(),
    from_number: fromNumber,
    to_number: toNumber,
  })

  if (error) return { error: 'Failed to create batch' }
  revalidatePath('/admin/stickers')
  return {}
}

// ---------------------------------------------------------------------------
// Nearby Places
// ---------------------------------------------------------------------------
export async function createNearbyPlace(data: {
  hubId: string
  name: string
  category: string
  description: string
  distanceKm: number
  mapUrl: string
}): Promise<{ error?: string }> {
  const { supabase, error: authError } = await requireAdmin()
  if (authError || !supabase) return { error: authError ?? 'Auth error' }

  if (!data.name.trim())     return { error: 'Name is required' }
  if (!data.category.trim()) return { error: 'Category is required' }
  if (data.distanceKm <= 0)  return { error: 'Distance must be greater than 0' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('nearby_places') as any).insert({
    hub_id:       data.hubId,
    name:         data.name.trim(),
    category:     data.category,
    description:  data.description.trim() || null,
    distance_km:  data.distanceKm,
    map_url:      data.mapUrl.trim() || null,
  })

  if (error) return { error: 'Failed to create place' }
  revalidatePath('/admin/nearby')
  revalidatePath(`/hubs/${data.hubId}`)
  return {}
}

export async function deleteNearbyPlace(placeId: string): Promise<{ error?: string }> {
  const { supabase, error: authError } = await requireAdmin()
  if (authError || !supabase) return { error: authError ?? 'Auth error' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('nearby_places') as any)
    .delete()
    .eq('id', placeId)

  if (error) return { error: 'Failed to delete place' }
  revalidatePath('/admin/nearby')
  return {}
}

// ---------------------------------------------------------------------------
// Bookings — admin override
// ---------------------------------------------------------------------------
export async function adminUpdateBookingStatus(
  bookingId: string,
  status: string
): Promise<{ error?: string }> {
  const validId = uuidSchema.safeParse(bookingId)
  if (!validId.success) return { error: validId.error.issues[0].message }

  const { svc, userId, role, error: authError } = await requireAdmin()
  if (authError || !svc) return { error: authError ?? 'Auth error' }

  const { error } = await svc
    .from('bookings' as never)
    .update({ status })
    .eq('id', bookingId)

  if (error) return { error: 'Failed to update booking' }

  // Audit
  await svc.rpc('write_audit_log', {
    p_actor_id: userId,
    p_actor_role: role,
    p_action: 'admin_status_override',
    p_entity: 'bookings',
    p_entity_id: bookingId,
    p_metadata: { status }
  })

  revalidatePath('/admin/bookings')
  return {}
}
