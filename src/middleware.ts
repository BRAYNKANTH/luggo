import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n-config'
import { canonicalHost } from '@/lib/site-url'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
})

function isCustomerRoute(pathname: string): boolean {
  let cleanPath = pathname
  const parts = pathname.split('/')
  
  // Strip locale prefix if present
  if (parts.length > 1 && ['en', 'si', 'ta'].includes(parts[1])) {
    cleanPath = '/' + parts.slice(2).join('/')
  }

  // Bypass API, staff, admin, auth, login, and forgot-password pages
  if (
    cleanPath.startsWith('/api/') ||
    cleanPath.startsWith('/staff') ||
    cleanPath.startsWith('/admin') ||
    cleanPath.startsWith('/auth') ||
    cleanPath === '/login' ||
    cleanPath === '/forgot-password' ||
    cleanPath === '/maintenance' ||
    cleanPath.includes('.')
  ) {
    return false
  }

  return true
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''

  if (hostname.startsWith('www.')) {
    const redirectUrl = url.clone()
    redirectUrl.host = canonicalHost
    return NextResponse.redirect(redirectUrl, 308)
  }

  // Check if it is a customer route to display the maintenance page
  if (!hostname.startsWith('staff.') && isCustomerRoute(url.pathname)) {
    let localePrefix = ''
    const parts = url.pathname.split('/')
    if (parts.length > 1 && ['en', 'si', 'ta'].includes(parts[1])) {
      localePrefix = `/${parts[1]}`
    }
    url.pathname = `${localePrefix}/maintenance`
  }

  // 1. Bypass i18n for API routes
  if (url.pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    return await updateSession(request, response)
  }

  // 2. Handle locale routing
  const response = await intlMiddleware(request)
  
  // If the i18n middleware wants to redirect, do it immediately
  if (response.status >= 300 && response.status < 400) {
    return response
  }

  // 2. Handle subdomain routing for staff
  if (hostname.startsWith('staff.')) {
    if (url.pathname === '/') {
      return NextResponse.rewrite(new URL('/staff/dashboard', request.url))
    }
    if (!url.pathname.startsWith('/staff')) {
      return NextResponse.rewrite(new URL(`/staff${url.pathname}`, request.url))
    }
  }

  // 3. Update session while preserving the response from intlMiddleware
  return await updateSession(request, response)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|googleceb893e01d277b28\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)',
  ],
}
