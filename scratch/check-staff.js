const { createClient } = require('@supabase/supabase-js')
require('path')
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  console.log('--- HUBS ---')
  const { data: hubs } = await supabase.from('hubs').select('id, name, alias, active')
  console.log(hubs)

  console.log('--- STAFF LINKS ---')
  const { data: staff } = await supabase
    .from('hub_staff')
    .select('id, user_id, hub_id, active, users(email, name, role), hubs(name, alias)')
  console.log(JSON.stringify(staff, null, 2))
}

run().catch(console.error)
