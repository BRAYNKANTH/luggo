const { createClient } = require('@supabase/supabase-js')
require('path')
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data: dbUser, error } = await supabase
    .from('users')
    .select('id, email, role, name')
    .in('email', ['superadmin@test.luggo.lk', 'superstaff@test.luggo.lk', 'staff@luggo.lk', 'walkin@luggo.lk'])

  console.log('Error:', error)
  console.log('Public users profiles:', dbUser)
}

run()
