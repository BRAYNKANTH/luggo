import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { BookingForm } from './BookingForm'
import { getHubBagRates } from '@/lib/utils/hubPricing'

type Hub = {
  id: string
  name: string
  alias: string
  address: string
  open_time: string
  close_time: string
  active: boolean
}

export async function generateMetadata(props: { params: Promise<{ hubId: string; locale: string }> }): Promise<Metadata> {
  const params = await props.params
  const t = await getTranslations({ locale: params.locale, namespace: 'Meta' })
  const supabase = await createClient()
  const { data: hub } = await supabase
    .from('hubs')
    .select('name')
    .eq('id', params.hubId)
    .single() as { data: { name: string } | null }
  return { title: hub ? t('bookHub', { name: hub.name }) : t('book') }
}

export default async function BookPage(props: { params: Promise<{ hubId: string }> }) {
  const params = await props.params;
  const t = await getTranslations('Booking')
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

  const rates = await getHubBagRates(supabase, hub.id)

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6">
      <PageHeader
        title={t('pageTitle', { name: hub.name })}
        backHref={`/hubs/${hub.id}`}
        action={
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
            <ShieldCheck size={14} />
            <span className="hidden sm:inline">{t('secureCheckout')}</span>
          </div>
        }
      />

      <div className="py-4">
        <BookingForm hub={hub} initialProfile={profile} rates={rates} />
      </div>
    </div>
  )
}
