import { type MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Luggo — Luggage Storage',
    short_name: 'Luggo',
    description: 'Safe, affordable luggage storage at hubs across Sri Lanka.',
    start_url: '/hubs',
    id: '/',
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
        url: '/booking',
        description: 'View and manage your bookings',
      },
    ],
    screenshots: [],
  }
}
