'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
    const supabase = createClient()

    const channel = supabase
      .channel(`rt-refresh:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          const newStatus = payload.new?.status as string | undefined
          if (!newStatus) return
          if (newStatus === lastStatus.current) return
          lastStatus.current = newStatus

          // Only refresh if status is in watchlist (or no filter set)
          if (!watchStatuses || watchStatuses.includes(newStatus)) {
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bookingId, router, watchStatuses])

  return null
}
