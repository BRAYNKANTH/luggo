import withPWAInit from '@ducanh2912/next-pwa'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // Enable PWA in production/staging builds
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    // Serve /offline when navigating while offline
    document: '/offline',
  },
  workboxOptions: {
    disableDevLogs: true,
    // API routes are always network-only — never serve stale data
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/.*\/api\/.*/i,
        handler: 'NetworkOnly',
      },
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rghrvdmedbbnevycfnpm.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        pathname: '/**',
      },
    ],
  },
}

export default withPWA(withNextIntl(nextConfig))
