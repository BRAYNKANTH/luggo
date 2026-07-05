import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    id: 'luggo-admin',
    name: 'Luggo Admin Panel',
    short_name: 'Luggo Admin',
    description: 'Luggo System Administrator Dashboard.',
    start_url: '/admin/login',
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
        name: 'Admin Login',
        short_name: 'Login',
        url: '/admin/login',
      },
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        url: '/admin/dashboard',
      },
    ],
  }, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400, must-revalidate',
    }
  })
}
