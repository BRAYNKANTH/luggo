import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n-config'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
})

export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // 1. Handle locale routing
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
