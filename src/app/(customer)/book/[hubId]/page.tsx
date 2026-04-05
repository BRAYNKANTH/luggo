import { notFound } from 'next/navigation'
import { Clock, MapPin, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { BookingForm } from './BookingForm'

type Hub = {
  id: string
  name: string
  alias: string
  address: string
  open_time: string
  close_time: string
  active: boolean
}

export default async function BookPage({ params }: { params: { hubId: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('id, name, email, phone, nic_passport')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const { data: hub } = await supabase
    .from('hubs')
    .select('id, name, alias, address, open_time, close_time, active')
    .eq('id', params.hubId)
    .single() as { data: Hub | null; error: unknown }

  if (!hub || !hub.active) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={`Book at ${hub.name}`}
        backHref={`/hubs/${hub.id}`}
        action={
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
            <ShieldCheck size={14} />
            <span className="hidden sm:inline">Secure checkout</span>
          </div>
        }
      />

      {/* Hub info strip */}
      <div className="mx-4 md:mx-6 mt-4 bg-ocean-900 rounded-2xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">{hub.name}</p>
          <p className="text-white/50 text-xs mt-0.5 flex items-center gap-1">
            <MapPin size={10} /> {hub.address}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-[10px] font-medium">Open hours</p>
          <p className="text-white/80 text-xs font-semibold flex items-center gap-1 mt-0.5">
            <Clock size={10} />
            {hub.open_time.slice(0, 5)}–{hub.close_time.slice(0, 5)}
          </p>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        <BookingForm hub={hub} initialProfile={profile} />
      </div>
    </div>
  )
}
