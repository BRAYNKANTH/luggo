// Temporary switch that stops new bookings. Set NEXT_PUBLIC_BOOKINGS_PAUSED=false to re-open.
export const BOOKINGS_PAUSED = process.env.NEXT_PUBLIC_BOOKINGS_PAUSED !== 'false'

export const BOOKINGS_PAUSED_MESSAGE = 'Bookings are temporarily paused. Please check back soon.'
