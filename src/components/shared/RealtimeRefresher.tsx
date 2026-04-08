'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface RealtimeRefresherProps {
  /** The booking ID to watch */
  bookingId: string
  /**
   * Only refresh when status changes TO one of these values.
   * Leave empty to refresh on any change.
   */
  watchStatuses?: string[]
}

/**
 * Invisible component — refreshes the current Server Component subtree
 * whenever the booking row changes in Supabase.
 *
 * Drop into any server-component page to get live updates without
 * converting the whole page to a client component.
 */
export function RealtimeRefresher({ bookingId, watchStatuses }: RealtimeRefresherProps) {
  const router = useRouter()
  const lastStatus = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/status`, { cache: 'no-store' })
        if (!res.ok) return

        const data = await res.json()
        const newStatus = data.status as string | undefined
        if (!newStatus || cancelled) return
        if (newStatus === lastStatus.current) return

        if (lastStatus.current !== null && (!watchStatuses || watchStatuses.includes(newStatus))) {
          router.refresh()
        }

        lastStatus.current = newStatus
      } catch {
        // Best-effort polling only.
      }
    }

    void poll()
    const interval = window.setInterval(poll, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [bookingId, router, watchStatuses])

  return null
}
