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

async function check() {
  console.log('--- Checking public.users ---')
  const { data: dbUsers, error: dbError } = await supabase
    .from('users')
    .select('email, role')
  
  if (dbError) {
    console.error('DB Error:', dbError.message)
  } else {
    console.log('All DB User Emails:', dbUsers)
  }

  console.log('--- Trial Create Dummy ---')
  const res = await supabase.auth.admin.createUser({
    email: 'test_dummy@luggo.lk',
    password: 'password123',
    email_confirm: true,
    user_metadata: { name: 'Test Dummy' }
  })
  console.log('Response Error:', JSON.stringify(res.error, null, 2))
  console.log('Response Data:', res.data)
  
  if (res.data?.user) {
    console.log('Cleaning up dummy user...')
    await supabase.auth.admin.deleteUser(res.data.user.id)
    await supabase.from('users').delete().eq('email', 'test_dummy@luggo.lk')
  }
  console.log('--- Post Trial List ---')
  const { data: { users } } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  })
  console.log('All Auth User Emails:', users.map(u => u.email))
}

check().catch(console.error)
