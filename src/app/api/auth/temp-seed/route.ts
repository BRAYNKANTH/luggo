import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createServiceClient()

  console.log('🚀 DIAGNOSTIC Seeding started...')

  // 1. Diagnostic: List all public users to check for conflicts
  const { data: allPublicUsers, error: listErr } = await supabase.from('users').select('email, role')
  console.log('👥 Current public users:', allPublicUsers || listErr)

  const usersToCreate = [
    {
      email: 'superadmin@test.luggo.lk',
      password: 'password123',
      name: 'Master Admin',
      role: 'master_admin' as const
    },
    {
      email: 'superstaff@test.luggo.lk',
      password: 'password123',
      name: 'Hub Staff',
      role: 'hub_staff' as const,
      hubAlias: 'BIA'
    }
  ]

  const results = []

  for (const u of usersToCreate) {
    try {
      console.log(`\n--- Processing ${u.email} ---`)

      // 2. Aggressive Cleanup
      // Check auth.users by email
      const { data: usersList } = await supabase.auth.admin.listUsers()
      const existingInAuth = usersList?.users.find(au => au.email === u.email)
      
      if (existingInAuth) {
        await supabase.auth.admin.deleteUser(existingInAuth.id)
        console.log(`   Deleted auth user: ${u.email} (${existingInAuth.id})`)
      }

      // Also clean public.users (orphans or previous partial inserts)
      const { error: delErr } = await supabase.from('users').delete().eq('email', u.email)
      if (delErr) console.warn(`   Warning cleaning public entry: ${delErr.message}`)
      else console.log(`   Cleaned public entry for ${u.email}`)

      // A small delay to ensure DB consistency
      await new Promise(r => setTimeout(r, 500))

      // 3. Create User
      const { data: auth, error: authError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name }
      })

      if (authError) {
        console.error(`   ❌ Auth Error for ${u.email}:`, authError.message)
        results.push({ email: u.email, status: 'error', stage: 'auth_create', message: authError.message })
        continue
      }

      const userId = auth.user.id
      console.log(`   ✅ Created auth user: ${userId}`)

      // 4. Update public profile role
      // We wait for the trigger-generated row to exist
      let retryCount = 0
      let profileUpdated = false
      
      while (retryCount < 5 && !profileUpdated) {
        const { error: profileError } = await supabase
          .from('users')
          .update({ role: u.role, name: u.name })
          .eq('id', userId)

        if (!profileError) {
          profileUpdated = true;
          console.log(`   ✅ Updated profile role to ${u.role}`)
        } else {
          console.log(`   ... waiting for trigger (retry ${retryCount+1})`)
          await new Promise(r => setTimeout(r, 500))
          retryCount++
        }
      }

      if (!profileUpdated) {
        results.push({ email: u.email, status: 'error', stage: 'profile_update', message: 'Trigger row did not appear' })
        continue
      }

      // 5. Link Hub if staff
      if (u.role === 'hub_staff' && u.hubAlias) {
        const { data: hub } = await supabase
          .from('hubs')
          .select('id')
          .eq('alias', u.hubAlias)
          .single()

        if (hub) {
          const { error: linkError } = await supabase.from('hub_staff').insert({
            user_id: userId,
            hub_id: hub.id
          })
          
          if (linkError) {
            console.error(`   ❌ Hub link error:`, linkError.message)
          } else {
            console.log(`   ✅ Linked to hub ${u.hubAlias}`)
          }
        }
      }

      results.push({ email: u.email, status: 'success' })
    } catch (err: any) {
      console.error(`   ❌ Exception for ${u.email}:`, err.message)
      results.push({ email: u.email, status: 'error', message: err.message })
    }
  }

  return NextResponse.json({
    message: 'Diagnostic Seeding process completed.',
    results,
    currentPublicUsers: allPublicUsers
  })
}
