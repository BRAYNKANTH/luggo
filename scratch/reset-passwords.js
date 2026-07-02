const { createClient } = require('@supabase/supabase-js')
require('path')
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const targets = [
    { email: 'superadmin@test.luggo.lk', role: 'master_admin', name: 'Super Admin' },
    { email: 'staff@luggo.lk', role: 'hub_staff', name: 'Hub Staff' },
    { email: 'superstaff@test.luggo.lk', role: 'hub_staff', name: 'Super Staff' },
    { email: 'staff2@luggo.lk', role: 'hub_staff', name: 'Hub Staff 2' }
  ]

  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) {
    console.error('Error listing auth users:', error.message)
    return
  }

  for (const t of targets) {
    const user = users.find(u => u.email?.toLowerCase() === t.email.toLowerCase())
    if (user) {
      console.log(`Resetting password for ${t.email} (ID: ${user.id})...`)
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: 'password123'
      })
      if (updateError) {
        console.error(`Error updating password for ${t.email}:`, updateError.message)
      } else {
        console.log(`Password reset to 'password123' successfully for ${t.email}!`)
      }

      // Sync public profile
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: t.email,
          role: t.role,
          name: t.name
        }, { onConflict: 'id' })

      if (profileError) {
        console.error(`Error syncing public profile for ${t.email}:`, profileError.message)
      } else {
        console.log(`Public profile synced for ${t.email} (role: ${t.role}).`)
      }
    } else {
      console.log(`User ${t.email} not found in Auth. Re-creating...`)
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: t.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { name: t.name }
      })

      if (createError) {
        console.error(`Error creating user ${t.email}:`, createError.message)
      } else if (created.user) {
        console.log(`Created user ${t.email} successfully! ID: ${created.user.id}`)
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: created.user.id,
            email: t.email,
            role: t.role,
            name: t.name
          })
        if (profileError) {
          console.error(`Error inserting public profile for ${t.email}:`, profileError.message)
        } else {
          console.log(`Inserted public profile for ${t.email} successfully!`)
        }
      }
    }
  }

  console.log('\nPassword reset run completed!')
}

run().catch(console.error)
