import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { BookingForm } from './BookingForm'
import { getHubBagRates } from '@/lib/utils/hubPricing'
import { BOOKINGS_PAUSED, LISTINGS_HIDDEN } from '@/lib/booking-pause'
import { Link } from '@/navigation'

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
  if (LISTINGS_HIDDEN) return { title: t('book') }
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

  if (BOOKINGS_PAUSED) {
    const tPaused = await getTranslations('BookingPaused')
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ocean-900">{tPaused('title')}</h1>
        <p className="mt-3 text-gray-600">{tPaused('body')}</p>
        <Link href="/hubs" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-ocean-600 px-6 py-3 font-bold text-white">
          {tPaused('browseHubs')}
        </Link>
      </div>
    )
  }

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
