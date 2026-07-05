import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    id: 'luggo-staff',
    name: 'Luggo Staff Console',
    short_name: 'Luggo Staff',
    description: 'Luggo Hub Operator and Staff Custody Console.',
    start_url: '/staff/login',
    scope: '/',
    display: 'standalone',
    background_color: '#011a2e',
    theme_color: '#011a2e',
    orientation: 'portrait-primary',
    categories: ['utilities'],
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
        name: 'Staff Login',
        short_name: 'Login',
        url: '/staff/login',
      },
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        url: '/staff/dashboard',
      },
    ],
  }, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400, must-revalidate',
    }
  })
}
