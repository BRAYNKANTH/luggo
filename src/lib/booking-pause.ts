// Temporary switch that stops new bookings. Set NEXT_PUBLIC_BOOKINGS_PAUSED=false to re-open.
export const BOOKINGS_PAUSED = process.env.NEXT_PUBLIC_BOOKINGS_PAUSED !== 'false'

// Temporarily hides every hub listing from public pages. Set NEXT_PUBLIC_LISTINGS_HIDDEN=false to show them again.
export const LISTINGS_HIDDEN = process.env.NEXT_PUBLIC_LISTINGS_HIDDEN !== 'false'

export const BOOKINGS_PAUSED_MESSAGE = 'Bookings are temporarily paused. Please check back soon.'
