import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * DEV-ONLY: Creates test staff accounts.
 * Hit GET /api/debug/seed-staff to run.
 * Remove this file before going to production.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const svc = createServiceClient()
  const results: Record<string, string> = {}

  const staffToCreate = [
    { email: 'staff@luggo.lk',  password: 'Staff1234!', name: 'Kamal Perera',   phone: '+94771000001', hubAlias: 'FORT' },
    { email: 'staff2@luggo.lk', password: 'Staff1234!', name: 'Nimal Fernando',  phone: '+94771000002', hubAlias: 'BIA'  },
  ]

  for (const s of staffToCreate) {
    try {
      // Get hub
      const { data: hub } = await svc
        .from('hubs')
        .select('id')
        .eq('alias', s.hubAlias)
        .single() as { data: { id: string } | null }

      if (!hub) {
        // Try first active hub
        const { data: fallback } = await svc
          .from('hubs')
          .select('id')
          .eq('active', true)
          .order('name')
          .limit(1)
          .single() as { data: { id: string } | null }

        if (!fallback) {
          results[s.email] = `ERROR: No hub found for alias ${s.hubAlias}`
          continue
        }
      }

      const hubId = (hub ?? (await svc.from('hubs').select('id').eq('active', true).order('name').limit(1).single()).data as { id: string } | null)?.id
      if (!hubId) { results[s.email] = 'ERROR: hub not found'; continue }

      // Check if auth user already exists
      const { data: existingList } = await svc.auth.admin.listUsers()
      const existing = existingList?.users?.find(u => u.email === s.email)

      let userId: string

      if (existing) {
        userId = existing.id
        // Update password to ensure it's correct
        await svc.auth.admin.updateUserById(userId, { password: s.password })
        results[s.email] = 'updated password'
      } else {
        // Create new auth user
        const { data: created, error: createErr } = await svc.auth.admin.createUser({
          email: s.email,
          password: s.password,
          email_confirm: true,
          user_metadata: { name: s.name },
        })

        if (createErr || !created.user) {
          results[s.email] = `ERROR creating auth user: ${createErr?.message}`
          continue
        }

        userId = created.user.id
        results[s.email] = 'created'
      }

      // Upsert public.users
      await svc.from('users' as never).upsert({
        id: userId,
        name: s.name,
        email: s.email,
        phone: s.phone,
        role: 'hub_staff',
      }, { onConflict: 'id' })

      // Ensure unique constraint exists (best-effort)
      try { await svc.rpc('create_hub_staff_constraint' as never) } catch { /* ignore */ }

      // Upsert hub_staff
      const { data: existingStaff } = await svc
        .from('hub_staff' as never)
        .select('id, active')
        .eq('user_id', userId)
        .eq('hub_id', hubId)
        .maybeSingle() as { data: { id: string; active: boolean } | null }

      if (existingStaff) {
        await svc.from('hub_staff' as never).update({ active: true }).eq('id', existingStaff.id)
        results[s.email] += ' (hub_staff reactivated)'
      } else {
        await svc.from('hub_staff' as never).insert({ user_id: userId, hub_id: hubId, active: true })
        results[s.email] += ' (hub_staff inserted)'
      }

    } catch (err) {
      results[s.email] = `EXCEPTION: ${String(err)}`
    }
  }

  return NextResponse.json({
    done: true,
    results,
    credentials: [
      { email: 'staff@luggo.lk',  password: 'Staff1234!', hub: 'FORT' },
      { email: 'staff2@luggo.lk', password: 'Staff1234!', hub: 'BIA'  },
    ],
  })
}
