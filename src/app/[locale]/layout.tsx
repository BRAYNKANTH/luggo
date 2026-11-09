import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { MotionConfig } from '@/components/shared/MotionProvider'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { siteUrl } from '@/lib/site-url'
import { BookingPausedBanner } from '@/components/shared/BookingPausedBanner'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: '%s | Luggo',
    default: 'Luggo | Luggage Storage Network in Sri Lanka',
  },
  description: 'Luggo connects travellers with partner luggage storage hubs in Sri Lanka. Book online and pay by the hour.',
  keywords: [
    'luggage storage Sri Lanka',
    'left luggage Sri Lanka',
    'short term luggage storage',
    'luggage storage network',
    'store bags safely',
    'travel hands-free',
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
    title: 'Luggo — Luggage Storage Network in Sri Lanka',
    description: 'Hourly luggage storage with partner hubs in Sri Lanka. Book online.',
    images: [{ url: '/images/hubs/bia.png', width: 1200, height: 630, alt: 'Luggo luggage storage' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luggo — Luggage Storage Network in Sri Lanka',
    description: 'Hourly luggage storage with partner hubs in Sri Lanka.',
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
  viewportFit: 'cover',
}

export default async function RootLayout(
  props: {
    children: React.ReactNode
    params: Promise<{ locale: string }>
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  const messages = await getMessages()

  return (
    <html lang={locale}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#011a2e" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>

      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Colombo">
          <BookingPausedBanner />
          <MotionConfig>{children}</MotionConfig>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
