const { createClient } = require('@supabase/supabase-js')
require('path')
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const hubs = [
    { id: '7ea5a69a-cfc7-4c28-b938-91040e9803b1', alias: 'CMB' },
    { id: '05bc7cc9-9d2b-4541-9302-d2de3a62a586', alias: 'FORT' },
    { id: '5d51323e-6515-4a2b-a309-f832e25f0732', alias: 'BIA' }
  ]

  const tags = []
  for (const hub of hubs) {
    for (let i = 101; i <= 110; i++) {
      const code = `${hub.alias}-A-${i}`
      tags.push({
        tag_code: code,
        qr_code_value: code,
        hub_id: hub.id,
        status: 'available'
      })
    }
  }

  const { data, error } = await supabase
    .from('bag_tags')
    .upsert(tags, { onConflict: 'tag_code' })
    .select()

  if (error) {
    console.error('Error seeding tags:', error.message)
  } else {
    console.log(`Seeded ${data.length} reusable tags successfully!`)
  }
}

run().catch(console.error)
