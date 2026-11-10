'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { BOOKINGS_PAUSED } from '@/lib/booking-pause'

// Sticky so it stays visible; publishes its height as --banner-h so fixed navs can sit below it.
// Rendered by the staff and admin layouts: the customer-facing notice is not for them.
export function HidePausedBanner() {
  return <style>{'[data-paused-banner]{display:none}'}</style>
}

export function BookingPausedBanner() {
  const t = useTranslations('BookingPaused')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--banner-h', `${el.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--banner-h')
    }
  }, [])

  if (!BOOKINGS_PAUSED) return null
  return (
    <div ref={ref} role="status" data-paused-banner className="sticky top-0 z-[60] bg-amber-500 px-4 py-2 text-center text-sm font-bold text-ocean-900">
      {t('banner')}
    </div>
  )
}
