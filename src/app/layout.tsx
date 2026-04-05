import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | Luggo',
    default: 'Luggo — Luggage Storage Made Easy',
  },
  description: 'Safe, affordable luggage storage at hubs across Sri Lanka. Book online in seconds.',
  keywords: ['luggage storage', 'bag storage', 'Sri Lanka', 'Colombo', 'travel'],
  authors: [{ name: 'Luggo' }],

  // ── PWA Metadata (Disabled) ────────────────────────────────────────────────
  // manifest: '/manifest.webmanifest',

  // ── Apple / iOS PWA ────────────────────────────────────────────────────────
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Luggo',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.svg',
  },

  // ── Open Graph ─────────────────────────────────────────────────────────────
  openGraph: {
    type: 'website',
    siteName: 'Luggo',
    title: 'Luggo — Luggage Storage Made Easy',
    description: 'Safe, affordable luggage storage at hubs across Sri Lanka.',
  },

  // ── Twitter / X ────────────────────────────────────────────────────────────
  twitter: {
    card: 'summary',
    title: 'Luggo — Luggage Storage Made Easy',
    description: 'Safe, affordable luggage storage at hubs across Sri Lanka.',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#038cc9' },
    { media: '(prefers-color-scheme: dark)',  color: '#011a2e' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#011a2e" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                  for (let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
            `,
          }}
        />
        {children}
      </body>
    </html>
  )
}
