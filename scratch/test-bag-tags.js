const { createClient } = require('@supabase/supabase-js')
require('path')
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function run() {
  // 1. Get first active hub
  const { data: hubs, error: hubError } = await supabase
    .from('hubs')
    .select('id, name, alias')
    .eq('active', true)
    .limit(1)

  if (hubError || !hubs || hubs.length === 0) {
    console.error('No active hubs found to assign tags to:', hubError?.message)
    return
  }

  const hub = hubs[0]
  console.log(`Using Hub: ${hub.name} (Alias: ${hub.alias}, ID: ${hub.id})`)

  // 2. Generate and insert 10 test tags
  const tags = []
  for (let i = 101; i <= 110; i++) {
    const code = `${hub.alias}-A-${i}`
    tags.push({
      tag_code: code,
      qr_code_value: code, // Set qr_code_value matching tag_code
      hub_id: hub.id,
      status: 'available'
    })
  }

  // Insert tags (ignore duplicates if they exist already)
  const { data, error } = await supabase
    .from('bag_tags')
    .upsert(tags, { onConflict: 'tag_code' })
    .select()

  if (error) {
    console.error('Error inserting test bag tags:', error.message)
  } else {
    console.log(`Successfully seeded ${data.length} test bag tags:`, data.map(t => t.tag_code))
  }
}

run().catch(console.error)
