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
  await intlMiddleware(request)

  // 2. Handle subdomain routing for staff
  if (hostname.startsWith('staff.')) {
    if (url.pathname === '/') {
      return NextResponse.rewrite(new URL('/staff/dashboard', request.url))
    }
    // If not already in /staff, rewrite to /staff/*
    if (!url.pathname.startsWith('/staff')) {
      return NextResponse.rewrite(new URL(`/staff${url.pathname}`, request.url))
    }
  }

  // 3. Update session
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
