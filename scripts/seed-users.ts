
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
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

async function seedUsers() {
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

  // Load existing auth users to prevent duplicates and handle pre-existing accounts
  const { data: authUsersResult, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Error fetching auth users:', listError.message)
    return
  }
  const authUsers = authUsersResult?.users ?? []

  for (const u of testUsers) {
    console.log(`\nCreating ${u.name} (${u.email})...`)

    const existingAuth = authUsers.find(user => user.email?.toLowerCase() === u.email.toLowerCase())

    if (existingAuth) {
      console.log(`   User already exists in Auth. Updating password to "${u.password}"...`)
      const { error: resetError } = await supabase.auth.admin.updateUserById(existingAuth.id, {
        password: u.password
      })
      if (resetError) {
        console.error(`   Error resetting password:`, resetError.message)
      } else {
        console.log(`   Password reset completed successfully via Supabase Admin API!`)
      }
      await setupPublicProfile(existingAuth.id, u)
      continue
    }

    // 1. Create Auth User
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

    if (authData.user) {
      console.log(`   Auth user created: ${authData.user.id}`)
      await setupPublicProfile(authData.user.id, u)
    }
  }

  console.log('\n✅ Seeding complete!')
}

async function setupPublicProfile(userId: string, config: any) {
  // 2. Ensure public profile has the correct role
  // (The DB trigger might have already created it, so we update)
  const { error: profileError } = await supabase
    .from('users')
    .update({ 
      name: config.name, 
      role: config.role,
      email: config.email // Ensure email is set if trigger missed it
    })
    .eq('id', userId)

  if (profileError) {
    console.error(`   Error updating public profile:`, profileError.message)
    return
  }
  console.log(`   Public profile set to role: ${config.role}`)

  // 3. Link to Hub if staff
  if (config.role === 'hub_staff' && config.hubAlias) {
    const { data: hub } = await supabase
      .from('hubs')
      .select('id')
      .eq('alias', config.hubAlias)
      .single()

    if (hub) {
      // Check if already linked
      const { data: existingLink } = await supabase
        .from('hub_staff')
        .select('id')
        .eq('user_id', userId)
        .eq('hub_id', hub.id)
        .maybeSingle()

      if (!existingLink) {
        const { error: linkError } = await supabase
          .from('hub_staff')
          .insert({ user_id: userId, hub_id: hub.id })
        
        if (linkError) {
          console.error(`   Error linking to hub:`, linkError.message)
        } else {
          console.log(`   Linked to hub: ${config.hubAlias}`)
        }
      } else {
        console.log(`   Already linked to hub: ${config.hubAlias}`)
      }
    } else {
      console.error(`   Could not find hub with alias: ${config.hubAlias}`)
    }
  }
}

seedUsers().catch(console.error)
