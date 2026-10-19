import { useTranslations } from 'next-intl'
import { BOOKINGS_PAUSED } from '@/lib/booking-pause'

export function BookingPausedBanner() {
  const t = useTranslations('BookingPaused')
  if (!BOOKINGS_PAUSED) return null
  return (
    <div role="status" className="bg-amber-500 px-4 py-2 text-center text-sm font-bold text-ocean-900">
      {t('banner')}
    </div>
  )
}
