import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      console.log('[Auth Callback] Code exchange success')
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('[Auth Callback] Code exchange error:', error.message)
    }
  } else if (token_hash && type) {
    console.log('[Auth Callback] Verifying token_hash...', { type })
    const { error } = await supabase.auth.verifyOtp({ 
      token_hash, 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: type as any 
    })
    if (!error) {
      console.log('[Auth Callback] Token verification success')
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('[Auth Callback] Token verification error:', error.message)
    }
  } else {
    // If no code/token, check if we already have a session (magic link might have already set it)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      console.log('[Auth Callback] Existing session found, redirecting to', next)
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.warn('[Auth Callback] No code, no token, and no existing session found')
  }

  // Something went wrong — send back to login with error
  console.error('[Auth Callback] Failed to establish session', { code: !!code, token: !!token_hash })
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
