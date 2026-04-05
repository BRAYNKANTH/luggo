'use client'

import { useBookingRealtime } from '@/lib/hooks/useBookingRealtime'
import { BookingStatusBadge } from '@/components/customer/BookingStatusBadge'
import { type BookingStatus } from '@/types/database'

interface RealtimeStatusBadgeProps {
  bookingId: string
  initialStatus: BookingStatus
}

/**
 * Renders a BookingStatusBadge that updates in real-time
 * as the booking status changes in the database.
 */
export function RealtimeStatusBadge({ bookingId, initialStatus }: RealtimeStatusBadgeProps) {
  const status = useBookingRealtime(bookingId, initialStatus)
  return <BookingStatusBadge status={status} />
}
