import { notFound } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
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
    <div className="max-w-5xl mx-auto px-4 md:px-6">
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

      <div className="py-4">
        <BookingForm hub={hub} initialProfile={profile} />
      </div>
    </div>
  )
}
