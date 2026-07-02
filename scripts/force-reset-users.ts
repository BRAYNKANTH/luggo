import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function forceReset() {
  const emails = ['admin@luggo.lk', 'staff@luggo.lk']

  console.log('Cleaning up users in database...')

  for (const email of emails) {
    console.log(`\nProcessing ${email}...`)

    // 1. Delete from public.users first to avoid any unique constraint conflicts on email
    const { error: dbDelError } = await supabase
      .from('users')
      .delete()
      .eq('email', email)

    if (dbDelError) {
      console.log(`   Note: failed to delete from public.users:`, dbDelError.message)
    } else {
      console.log(`   Deleted from public.users table if existed.`)
    }

    // 2. Fetch all auth users to find the ID
    const { data: authUsersResult, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.error('Error fetching auth users:', listError.message)
      return
    }

    const existingAuth = authUsersResult?.users?.find(
      user => user.email?.toLowerCase() === email.toLowerCase()
    )

    if (existingAuth) {
      console.log(`   User exists in auth.users (ID: ${existingAuth.id}). Deleting...`)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingAuth.id)
      if (deleteError) {
        console.error(`   Error deleting auth user:`, deleteError.message)
      } else {
        console.log(`   Deleted auth user successfully.`)
      }
    }
  }

  // Sleep 1 second to let deletes commit/cascade
  await new Promise(resolve => setTimeout(resolve, 1000))

  console.log('\n--- Recreating Users ---')

  const testUsers = [
    {
      email: 'admin@luggo.lk',
      password: 'password123',
      name: 'Master Admin',
      role: 'master_admin'
    },
    {
      email: 'staff@luggo.lk',
      password: 'password123',
      name: 'Hub Staff',
      role: 'hub_staff',
      hubAlias: 'BIA'
    }
  ]

  for (const u of testUsers) {
    console.log(`\nCreating ${u.name} (${u.email})...`)

    // Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name }
    })

    if (authError) {
      console.error(`   Error creating auth user:`, authError.message)
      continue
    }

    const userId = authData.user?.id
    if (userId) {
      console.log(`   Auth user created successfully with ID: ${userId}`)

      // Sleep a short time for public.users trigger to finish
      await new Promise(resolve => setTimeout(resolve, 500))

      // Update their role and name in the public profile
      const { error: profileError } = await supabase
        .from('users')
        .update({ 
          name: u.name, 
          role: u.role,
          email: u.email
        })
        .eq('id', userId)

      if (profileError) {
        // Try inserting directly in case trigger failed/didn't run
        console.log(`   Update failed (${profileError.message}). Attempting insert...`)
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            name: u.name,
            role: u.role,
            email: u.email
          })
        if (insertError) {
          console.error(`   Failed to setup public profile:`, insertError.message)
        } else {
          console.log(`   Public profile inserted with role: ${u.role}`)
        }
      } else {
        console.log(`   Public profile updated to role: ${u.role}`)
      }

      // Link to Hub if staff
      if (u.role === 'hub_staff' && u.hubAlias) {
        const { data: hub } = await supabase
          .from('hubs')
          .select('id')
          .eq('alias', u.hubAlias)
          .single()

        if (hub) {
          const { error: linkError } = await supabase
            .from('hub_staff')
            .insert({ user_id: userId, hub_id: hub.id })
          
          if (linkError) {
            console.error(`   Error linking to hub:`, linkError.message)
          } else {
            console.log(`   Linked to hub: ${u.hubAlias}`)
          }
        } else {
          console.error(`   Could not find hub with alias: ${u.hubAlias}`)
        }
      }
    }
  }

  console.log('\n✅ Force reset complete!')
}

forceReset().catch(console.error)
