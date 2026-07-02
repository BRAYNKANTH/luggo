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
  const { data, error } = await supabase.from('bag_tags').select('id').limit(1)
  if (error) {
    console.log('Error querying bag_tags:', error.message)
  } else {
    console.log('Successfully queried bag_tags table! Result:', data)
  }
}

run().catch(console.error)
