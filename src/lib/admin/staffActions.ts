'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null; error: unknown }

  const adminRoles = ['support_admin', 'ops_admin', 'master_admin']
  if (!profile || !adminRoles.includes(profile.role)) {
    redirect('/admin/login')
  }

  return createServiceClient()
}

// ─────────────────────────────────────────────
// CREATE STAFF MEMBER
// Looks up existing user by email, or creates a new one.
// Then inserts hub_staff row.
// ─────────────────────────────────────────────
export async function createStaffMember({
  email,
  name,
  hubId,
}: {
  email: string
  name: string
  hubId: string
}): Promise<{ error?: string; created?: boolean }> {
  const svc = await requireAdmin()

  if (!email) return { error: 'Email is required.' }
  if (!hubId)  return { error: 'Hub is required.' }

  // Check if user already exists in our users table
  const { data: existingUser } = await svc
    .from('users' as never)
    .select('id, role')
    .eq('email', email.toLowerCase())
    .single() as { data: { id: string; role: string } | null }

  let userId: string
  let created = false

  if (existingUser) {
    userId = existingUser.id

    // Ensure role is hub_staff (upgrade if currently customer)
    if (existingUser.role === 'customer') {
      await svc
        .from('users' as never)
        .update({ role: 'hub_staff' })
        .eq('id', userId)
    }
  } else {
    // Create Supabase Auth user and send magic link
    if (!name.trim()) return { error: 'Full name is required when creating a new account.' }

    const { data: authData, error: authError } = await svc.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      user_metadata: { name: name.trim() },
    })

    if (authError || !authData.user) {
      return { error: authError?.message ?? 'Failed to create auth user.' }
    }

    userId = authData.user.id

    // Insert users row
    const { error: userInsertError } = await svc
      .from('users' as never)
      .insert({
        id: userId,
        name: name.trim(),
        email: email.toLowerCase(),
        phone: null,
        role: 'hub_staff',
      }) as { error: { message: string } | null }

    if (userInsertError) {
      return { error: userInsertError.message }
    }

    // Send magic link so they can set up login
    await svc.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
    })

    created = true
  }

  // Check if already assigned to this hub
  const { data: existingAssignment } = await svc
    .from('hub_staff' as never)
    .select('id, active')
    .eq('user_id', userId)
    .eq('hub_id', hubId)
    .single() as { data: { id: string; active: boolean } | null }

  if (existingAssignment) {
    if (existingAssignment.active) {
      return { error: 'This person is already an active staff member at this hub.' }
    }
    // Reactivate
    await svc
      .from('hub_staff' as never)
      .update({ active: true })
      .eq('id', existingAssignment.id)

    return { created }
  }

  // Insert new hub_staff row
  const { error: staffInsertError } = await svc
    .from('hub_staff' as never)
    .insert({ user_id: userId, hub_id: hubId, active: true }) as { error: { message: string } | null }

  if (staffInsertError) {
    return { error: staffInsertError.message }
  }

  return { created }
}
