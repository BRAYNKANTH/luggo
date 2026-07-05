import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    id: 'luggo-customer',
    name: 'Luggo — Luggage Storage',
    short_name: 'Luggo',
    description: 'Safe, affordable luggage storage at hubs across Sri Lanka.',
    start_url: '/hubs',
    scope: '/',
    display: 'standalone',
    background_color: '#011a2e',
    theme_color: '#038cc9',
    orientation: 'portrait-primary',
    categories: ['travel', 'utilities'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.svg',
        sizes: '180x180',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Find a Hub',
        short_name: 'Hubs',
        url: '/hubs',
        description: 'Browse luggage storage hubs near you',
      },
      {
        name: 'My Bookings',
        short_name: 'Bookings',
        url: '/bookings',
        description: 'View and manage your bookings',
      },
    ],
  }, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400, must-revalidate',
    }
  })
}
