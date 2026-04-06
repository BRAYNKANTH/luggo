import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { type Database, type UserRole } from '@/types/database'

export async function updateSession(request: NextRequest, response?: NextResponse) {
  let supabaseResponse = response || NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
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

  // Public routes: /dashboard, /hubs, /book — guests can browse and book without an account
  // Protected routes: /booking (view existing), /pickup, /profile, /bookings (order history)
  const customerProtected = ['/booking', '/pickup', '/profile', '/bookings']
  if (customerProtected.some(p => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Protect staff routes
  if (pathname.startsWith('/staff') && pathname !== '/staff/login') {
    if (!user) {
      return NextResponse.redirect(new URL('/staff/login', request.url))
    }
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: UserRole } | null; error: unknown }
    if (!profile || profile.role !== 'hub_staff') {
      return NextResponse.redirect(new URL('/staff/login', request.url))
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: UserRole } | null; error: unknown }
    const adminRoles: UserRole[] = ['support_admin', 'ops_admin', 'master_admin']
    if (!profile || !adminRoles.includes(profile.role)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return supabaseResponse
}
