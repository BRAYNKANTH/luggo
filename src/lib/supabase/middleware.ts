import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { type Database, type UserRole } from '@/types/database'

export async function updateSession(request: NextRequest, response?: NextResponse) {
  const supabaseResponse = response || NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Normalize localized pathnames (e.g. /en/booking -> /booking)
  let checkPathname = pathname
  const localeMatch = pathname.match(/^\/(en|si|ta)(\/|$)/)
  if (localeMatch) {
    checkPathname = pathname.replace(/^\/(en|si|ta)/, '')
    if (!checkPathname.startsWith('/')) {
      checkPathname = '/' + checkPathname
    }
  }

  const loginRedirect = (path: string) => {
    const target = request.nextUrl.clone()
    target.pathname = path
    target.search = ''
    const redirectResponse = NextResponse.redirect(target)
    supabaseResponse.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  // Public routes: /dashboard, /hubs, /book — guests can browse and book without an account
  // Protected routes: /booking (view existing), /pickup, /profile, /bookings (order history)
  const customerProtected = ['/booking', '/pickup', '/profile', '/bookings', '/notifications', '/reset-password']
  if (customerProtected.some(p => checkPathname === p || checkPathname.startsWith(`${p}/`))) {
    if (!user) {
      const locale = localeMatch ? localeMatch[1] : 'en'
      return loginRedirect(`/${locale}/login`)
    }
  }

  // Protect staff routes
  if (checkPathname.startsWith('/staff') && checkPathname !== '/staff/login') {
    if (!user) {
      const locale = localeMatch ? localeMatch[1] : 'en'
      return loginRedirect(`/${locale}/staff/login`)
    }
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: UserRole } | null; error: unknown }
    if (!profile || profile.role !== 'hub_staff') {
      const locale = localeMatch ? localeMatch[1] : 'en'
      return loginRedirect(`/${locale}/staff/login`)
    }
  }

  // Protect admin routes
  if (checkPathname.startsWith('/admin') && checkPathname !== '/admin/login') {
    if (!user) {
      const locale = localeMatch ? localeMatch[1] : 'en'
      return loginRedirect(`/${locale}/admin/login`)
    }
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: UserRole } | null; error: unknown }
    const adminRoles: UserRole[] = ['support_admin', 'ops_admin', 'master_admin']
    if (!profile || !adminRoles.includes(profile.role)) {
      const locale = localeMatch ? localeMatch[1] : 'en'
      return loginRedirect(`/${locale}/admin/login`)
    }
  }

  return supabaseResponse
}
