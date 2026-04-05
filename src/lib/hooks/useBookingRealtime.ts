'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type BookingStatus } from '@/types/database'

/**
 * Subscribes to Supabase Realtime for a single booking row.
 * Returns the live booking status, updating whenever the DB row changes.
 */
export function useBookingRealtime(
  bookingId: string,
  initialStatus: BookingStatus
): BookingStatus {
  const [status, setStatus] = useState<BookingStatus>(initialStatus)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`booking:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          const newStatus = payload.new?.status as BookingStatus | undefined
          if (newStatus) setStatus(newStatus)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bookingId])

  return status
}
