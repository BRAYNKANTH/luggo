import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { siteUrl } from '@/lib/site-url'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Luggo',
  },

  openGraph: {
    type: 'website',
    siteName: 'Luggo',
    title: 'Luggo — Sri Lanka\'s #1 Luggage Storage Service',
    description: 'Safe, affordable luggage storage at trusted hubs across Sri Lanka. Book in 60 seconds.',
    images: [{ url: '/images/hubs/bia.png', width: 1200, height: 630, alt: 'Luggo Luggage Storage BIA Hub' }],
  },
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

export default async function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#011a2e" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>

      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
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
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
