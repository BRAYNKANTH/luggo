'use client'

import { useEffect, useState } from 'react'
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
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/status`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data.status) {
          setStatus(data.status as BookingStatus)
        }
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
  }, [bookingId])

  return status
}
