import { getTranslations } from 'next-intl/server'
import { useFormatter, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Link } from '@/navigation'
import { BookingStatusBadge } from '@/components/customer/BookingStatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { Clock, ChevronRight, Package, MapPin } from 'lucide-react'

import { type BookingStatus } from '@/types/database'
import { titleMetadata } from '@/lib/i18n/metadata'

export const generateMetadata = titleMetadata('bookings')

type BookingItem = {
  id: string
  status: BookingStatus
  start_time: string
  end_time: string
  total_price: number
  created_at: string
  hubs: { name: string; alias: string } | null
}

const ACTIVE_STATUSES: BookingStatus[] = [
  'pending_payment', 'confirmed', 'arrived', 'sealing_in_progress',
  'sealed_waiting_user_confirmation', 'active_storage', 'overstayed',
  'pickup_requested', 'disputed',
]

export default async function AllBookingsPage() {
  const t = await getTranslations('Bookings')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, start_time, end_time, total_price, created_at, hubs(name, alias)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }) as { data: BookingItem[] | null }

  const all = bookings ?? []
  const active = all.filter(b => ACTIVE_STATUSES.includes(b.status))
  const past   = all.filter(b => !ACTIVE_STATUSES.includes(b.status))

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title={t('title')} />

      <div className="px-4 md:px-6 py-6 space-y-8">
        {all.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-brand/8 rounded-3xl flex items-center justify-center">
                <Package size={40} className="text-brand/60" aria-hidden="true" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-ocean-900 rounded-2xl flex items-center justify-center shadow-lg">
                <MapPin size={16} className="text-white" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('emptyTitle')}</h2>
            <p className="text-sm text-gray-600 mb-1 max-w-xs">
              {t('emptyBody')}
            </p>
            <p className="text-xs text-gray-600 mb-8">{t('emptyPerks')}</p>
            <Link href="/hubs" className="inline-flex min-h-11 items-center bg-brand text-white text-sm font-bold px-8 py-3 rounded-2xl hover:bg-ocean-600 transition-colors shadow-lg shadow-brand/20">
              {t('findHub')}
            </Link>
          </div>
        ) : (
          <>
            {/* Active */}
            {active.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  {t('active', { count: active.length })}
                </h2>
                <div className="space-y-2">
                  {active.map(b => <BookingCard key={b.id} booking={b} />)}
                </div>
              </section>
            )}

            {/* Past */}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  {t('past', { count: past.length })}
                </h2>
                <div className="space-y-2">
                  {past.map(b => <BookingCard key={b.id} booking={b} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BookingCard({ booking: b }: { booking: BookingItem }) {
  const t = useTranslations('Bookings')
  const format = useFormatter()
  return (
    <Link href={`/booking/${b.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-brand/30 hover:shadow-md transition-all flex items-center gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">{b.hubs?.name ?? t('hub')}</p>
            <BookingStatusBadge status={b.status} />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={11} aria-hidden="true" />
              {format.dateTime(new Date(b.start_time), { day: '2-digit', month: 'short' })} – {format.dateTime(new Date(b.end_time), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-700">LKR {b.total_price.toLocaleString()}</p>
        </div>
        <ChevronRight size={16} className="text-gray-400 shrink-0" aria-hidden="true" />
      </div>
    </Link>
  )
}
