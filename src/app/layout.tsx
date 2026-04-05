import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://luggo.lk'), // Update this with your actual domain
  title: {
    template: '%s | Luggo',
    default: 'Luggo | Luggage Storage Network in Sri Lanka — Store Bags Safely',
  },
  description: 'Store your luggage at trusted spots across Sri Lanka. Luggo connects travellers with verified storage locations in Colombo, Kandy, Galle & more. Book in minutes.',
  keywords: [
    'luggage storage Sri Lanka',
    'bag storage Colombo',
    'left luggage Sri Lanka',
    'short term luggage storage',
    'store bags safely',
    'luggage storage network',
    'luggage storage near me',
    'travel hands-free',
    'verified storage locations',
    'Colombo luggage storage',
    'Kandy luggage storage',
    'Galle luggage storage',
    'Ella luggage storage',
    'Negombo luggage storage',
    'BIA Airport luggage storage',
    'Colombo Airport bag storage',
  ],

  authors: [{ name: 'Luggo' }],

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
    title: 'Luggo — Sri Lanka\'s #1 Luggage Storage Service',
    description: 'Safe, affordable luggage storage at trusted hubs across Sri Lanka. Book in 60 seconds.',
    images: [{ url: '/images/hubs/bia.png', width: 1200, height: 630, alt: 'Luggo Luggage Storage BIA Hub' }],
  },

  // ── Twitter / X ────────────────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'Luggo — Luggage Storage Made Easy',
    description: 'Safe, affordable luggage storage at hubs across Sri Lanka.',
    images: ['/images/hubs/bia.png'],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Service',
              'name': 'Luggo: Sri Lanka\'s Premier Luggage Storage',
              'description': 'Search for Luggo hubs to find safe, affordable luggage storage at Colombo Fort, BIA Airport Katunayake, Galle, Kandy, and Ella.',
              'slogan': 'Travel light. Explore more with Luggo.',
              'brand': {
                '@type': 'Brand',
                'name': 'Luggo',
                'logo': 'https://luggo.lk/icon.svg'
              },
              'provider': {
                '@type': 'LocalBusiness',
                'name': 'Luggo Sri Lanka',
                'image': 'https://luggo.lk/icon.svg',
                'priceRange': 'LKR 200 - LKR 400 per hour',
                'address': {
                  '@type': 'PostalAddress',
                  'addressLocality': 'Colombo',
                  'addressRegion': 'Western Province',
                  'addressCountry': 'LK'
                }
              },
              'areaServed': {
                '@type': 'Country',
                'name': 'Sri Lanka'
              },
              'hasOfferCatalog': {
                '@type': 'OfferCatalog',
                'name': 'Luggage Storage Services',
                'itemListElement': [
                  {
                    '@type': 'Offer',
                    'itemOffered': {
                      '@type': 'Service',
                      'name': 'Small Bag / Backpack Storage'
                    }
                  },
                  {
                    '@type': 'Offer',
                    'itemOffered': {
                      '@type': 'Service',
                      'name': 'Regular / Cabin Bag Storage'
                    }
                  },
                  {
                    '@type': 'Offer',
                    'itemOffered': {
                      '@type': 'Service',
                      'name': 'Large Suitcase Storage'
                    }
                  }
                ]
              }
            })

          }}
        />
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
