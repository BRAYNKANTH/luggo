import { createClient } from '@/lib/supabase/server'
import { HubList } from '@/components/hubs/HubList'
import { PageHeader } from '@/components/shared/PageHeader'

type Hub = {
  id: string
  name: string
  alias: string
  location: string
  address: string
  open_time: string
  close_time: string
  latitude: number | null
  longitude: number | null
  image_url: string | null
}

export default async function HubsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let hubs: Hub[] = []
  const { data, error } = await supabase
    .from('hubs')
    .select('id, name, alias, location, address, open_time, close_time, latitude, longitude, image_url')
    .eq('active', true)
    .order('name')

  if (error) {
    const { data: fallback, error: fallbackErr } = await supabase
      .from('hubs')
      .select('id, name, alias, location, address, open_time, close_time')
      .eq('active', true)
      .order('name')
    if (fallbackErr) {
      const { data: bare } = await supabase
        .from('hubs')
        .select('id, name, alias, location, address, open_time, close_time')
        .order('name')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hubs = (bare ?? []).map((h: any) => ({ ...h, latitude: null, longitude: null, image_url: null })) as Hub[]
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hubs = (fallback ?? []).map((h: any) => ({ ...h, latitude: null, longitude: null, image_url: null })) as Hub[]
    }
  } else {
    hubs = (data ?? []) as Hub[]
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Find a Hub" subtitle={`${hubs.length} location${hubs.length !== 1 ? 's' : ''} available`} />
      <HubList hubs={hubs} isLoggedIn={!!user} />
    </div>
  )
}
