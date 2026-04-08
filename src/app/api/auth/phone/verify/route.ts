import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { clearRateLimit, hitRateLimit } from '@/lib/security/rateLimit'
import { createServiceClient } from '@/lib/supabase/service'
import { createServerClient } from '@supabase/ssr'

function hashOtp(otp: string) {
  return createHash('sha256').update(otp).digest('hex')
}

function getClientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function POST(req: NextRequest) {
  const { phone, otp, name, email, nic } = await req.json()
  if (!phone || !otp) {
    return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 })
  }

  const clientIp = getClientIp(req)
  if (!hitRateLimit(`otp-verify:ip:${clientIp}`, 20, 10 * 60_000).allowed) {
    return NextResponse.json({ error: 'Too many verification attempts. Please try again later.' }, { status: 429 })
  }

  if (!hitRateLimit(`otp-verify:phone:${phone}`, 8, 10 * 60_000).allowed) {
    return NextResponse.json({ error: 'Too many verification attempts for this number. Please request a new code later.' }, { status: 429 })
  }

  const supabase = createServiceClient()
  const otpHash = hashOtp(String(otp))

  // ── 1. Verify OTP ──────────────────────────────────────────
  const { data: record } = await supabase
    .from('phone_otps' as never)
    .select('otp, expires_at')
    .eq('phone', phone)
    .eq('otp', otpHash)
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: { otp: string; expires_at: string } | null }

  if (!record) {
    return NextResponse.json({ error: 'Incorrect or expired code.' }, { status: 400 })
  }

  clearRateLimit(`otp-verify:ip:${clientIp}`)
  clearRateLimit(`otp-verify:phone:${phone}`)

  // Mark OTP as used
  await supabase
    .from('phone_otps' as never)
    .update({ used_at: new Date().toISOString() })
    .eq('phone', phone)
    .eq('otp', otpHash)
    .is('used_at', null)

  // ── 2. Find or create user ─────────────────────────────────
  const { data: existingProfile } = await supabase
    .from('users' as never)
    .select('id, email')
    .eq('phone', phone)
    .maybeSingle() as { data: { id: string; email: string | null } | null }

  let accountEmail: string

  if (existingProfile) {
    // email can be null for phone-only users — fall back to synthetic address
    accountEmail = existingProfile.email || `${phone.replace(/\D/g, '')}@phone.luggo.lk`
  } else {
    const finalEmail = email?.trim() || `${phone.replace(/\+/g, '')}@phone.luggo.lk`
    const finalName  = name?.trim()  || phone

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: finalEmail,
      email_confirm: true,
      phone,
      phone_confirm: true,
      user_metadata: { name: finalName, phone },
    })

    if (createErr || !created.user) {
      console.error('[Verify] createUser error:', createErr)
      return NextResponse.json({ error: createErr?.message || 'Failed to create account.' }, { status: 500 })
    }

    accountEmail = finalEmail

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('users') as any)
      .update({ name: finalName, phone, nic_passport: nic?.trim() || null })
      .eq('id', created.user.id)
  }

  // ── 3. Generate hashed token server-side ───────────────────
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: accountEmail,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  })

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('[Verify] generateLink error:', linkErr, 'props:', linkData?.properties)
    return NextResponse.json({ error: 'Failed to generate session token.' }, { status: 500 })
  }

  // ── 4. Exchange token → session, write cookies onto response ─
  // Must create supabase client against the response object so cookies are
  // included in the response the browser actually receives.
  const response = NextResponse.json({ success: true })

  const sessionClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: verifyErr } = await sessionClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyErr) {
    console.error('[Verify] verifyOtp error:', verifyErr)
    return NextResponse.json({ error: verifyErr.message }, { status: 500 })
  }

  return response
}
