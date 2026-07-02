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
  const { data: dbUser, error } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', 'walkin@luggo.lk')
    .maybeSingle()

  if (error) {
    console.error('DB Error:', error.message)
  } else {
    console.log('Walkin User DB Profile:', dbUser)
  }
}

check().catch(console.error)
