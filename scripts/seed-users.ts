
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
  console.log('🚀 Starting user seeding...')

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

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name }
    })

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log(`   User already exists in Auth. Skipping creation.`)
        // If exists, we still need to ensure they are in public.users with the right role
        const { data: existingAuth } = await supabase.from('users').select('id').eq('email', u.email).maybeSingle()
        if (existingAuth) {
          await setupPublicProfile(existingAuth.id, u)
        }
      } else {
        console.error(`   Error creating auth user:`, authError.message)
      }
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
