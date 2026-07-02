const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function run() {
  console.log('Checking if walkin@luggo.lk exists in public.users...')
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'walkin@luggo.lk')
    .maybeSingle()

  if (existingUser) {
    console.log('Walk-in guest user already exists in DB with ID:', existingUser.id)
    return
  }

  console.log('Creating walkin@luggo.lk auth user...')
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: 'walkin@luggo.lk',
    password: 'system_walkin_guest_secure_pass_2026',
    email_confirm: true,
    user_metadata: { name: 'Walk-In Guest' }
  })

  if (authError) {
    console.error('Error creating auth user:', authError.message)
    return
  }

  const userId = authUser.user.id
  console.log('Auth user created successfully with ID:', userId)

  // Sleep 1 second for triggers to catch up
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Verify if public profile was auto-created, if not insert it
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('id', userId)
    .maybeSingle()

  if (dbError || !dbUser) {
    console.log('Trigger did not run or insert user. Manually inserting into public.users...')
    const { error: insertError } = await supabase.from('users').upsert({
      id: userId,
      name: 'Walk-In Guest',
      email: 'walkin@luggo.lk',
      role: 'customer'
    })
    if (insertError) {
      console.error('Failed to manually insert public profile:', insertError.message)
    } else {
      console.log('Successfully inserted walk-in guest into public.users!')
    }
  } else {
    // Make sure role is customer
    await supabase.from('users').update({ role: 'customer' }).eq('id', userId)
    console.log('Walk-in user profile verified in public.users:', dbUser)
  }
}

run().catch(console.error)
