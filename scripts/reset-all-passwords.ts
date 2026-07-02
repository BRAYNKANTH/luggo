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

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function resetAll() {
  console.log('Fetching auth users...')
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  })

  if (authError) {
    console.error('Error listing auth users:', authError.message)
    return
  }

  const targets = [
    { email: 'superadmin@test.luggo.lk', role: 'master_admin', name: 'Super Admin' },
    { email: 'admin@luggo.lk', role: 'master_admin', name: 'Master Admin' },
    { email: 'staff@luggo.lk', role: 'hub_staff', name: 'Hub Staff' }
  ]

  for (const target of targets) {
    console.log(`\nProcessing ${target.email}...`)
    const authUser = users.find(u => u.email?.toLowerCase() === target.email.toLowerCase())

    if (authUser) {
      console.log(`   Found in auth.users (ID: ${authUser.id}). Resetting password to "password123"...`)
      const { error: resetError } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: 'password123'
      })
      if (resetError) {
        console.error(`   Error resetting password:`, resetError.message)
      } else {
        console.log(`   Password reset successfully!`)
      }

      // Sync role in public.users
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: authUser.id,
          name: target.name,
          email: target.email,
          role: target.role
        }, { onConflict: 'id' })

      if (dbError) {
        console.error(`   Error updating public profile role:`, dbError.message)
      } else {
        console.log(`   Public profile updated to role: ${target.role}`)
      }
    } else {
      console.log(`   Not found in auth.users. Attempting to create...`)
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: target.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { name: target.name }
      })

      if (createError) {
        console.error(`   Error creating user:`, createError.message)
      } else if (createData.user) {
        const newId = createData.user.id
        console.log(`   Created auth user successfully (ID: ${newId})`)

        const { error: dbError } = await supabase
          .from('users')
          .upsert({
            id: newId,
            name: target.name,
            email: target.email,
            role: target.role
          }, { onConflict: 'id' })

        if (dbError) {
          console.error(`   Error inserting public profile:`, dbError.message)
        } else {
          console.log(`   Public profile created with role: ${target.role}`)
        }
      }
    }
  }

  console.log('\n✅ Reset execution complete!')
}

resetAll().catch(console.error)
