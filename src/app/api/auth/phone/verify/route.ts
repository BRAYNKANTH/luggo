import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { clearRateLimit, hitRateLimit } from '@/lib/security/rateLimit'
import { createServiceClient } from '@/lib/supabase/service'
import { createServerClient } from '@supabase/ssr'
import { verifyPhoneCodeSchema, phoneAliases } from '@/lib/validators/phone'

function hashOtp(otp: string) {
  return createHash('sha256').update(otp).digest('hex')
}

function getClientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function POST(req: NextRequest) {
  const parsed = verifyPhoneCodeSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { otp, name, email, nic } = parsed.data
  const phone = parsed.data.phone!

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

  // Only one concurrent request may consume the code.
  const { data: consumed, error: consumeError } = await supabase
    .from('phone_otps' as never)
    .update({ used_at: new Date().toISOString() })
    .eq('phone', phone)
    .eq('otp', otpHash)
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .select('phone')
  if (consumeError) return NextResponse.json({ error: 'Verification unavailable.' }, { status: 500 })
  if (!consumed?.length) return NextResponse.json({ error: 'Incorrect or expired code.' }, { status: 400 })
  clearRateLimit(`otp-verify:phone:${phone}`)

  // ── 2. Find or create user ─────────────────────────────────
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

  const { data: { user: currentUser } } = await sessionClient.auth.getUser()

  if (currentUser) {
    // Check if the phone number is already registered to another user
    const { data: phoneUser, error: phoneLookupError } = await supabase
      .from('users' as never)
      .select('id')
      .in('phone', phoneAliases(phone))
      .maybeSingle() as { data: { id: string } | null; error: unknown }

    if (phoneLookupError) return NextResponse.json({ error: 'Unable to retrieve account.' }, { status: 500 })
    if (phoneUser && phoneUser.id !== currentUser.id) {
      return NextResponse.json({ error: 'This phone number is already registered to another account.' }, { status: 400 })
    }

    // Update Auth user phone
    const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(
      currentUser.id,
      { phone, phone_confirm: true }
    )
    if (updateAuthErr) {
      console.error('[Verify] updateAuthErr:', updateAuthErr)
      return NextResponse.json({ error: 'Failed to update phone number in auth service.' }, { status: 500 })
    }

    // Update users table in db
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateDbErr } = await (supabase.from('users') as any)
      .update({ name: name?.trim() || currentUser.user_metadata?.name || '', phone, nic_passport: nic?.trim() || null })
      .eq('id', currentUser.id)

    if (updateDbErr) {
      console.error('[Verify] updateDbErr:', updateDbErr)
      return NextResponse.json({ error: 'Failed to update user profile in database.' }, { status: 500 })
    }

    return response
  }

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from('users' as never)
    .select('id, email')
    .in('phone', phoneAliases(phone))
    .maybeSingle() as { data: { id: string; email: string | null } | null; error: unknown }

  if (profileLookupError) return NextResponse.json({ error: 'Unable to retrieve account.' }, { status: 500 })
  let accountEmail: string

  if (existingProfile) {
    // email can be null for phone-only users — fall back to synthetic address
    accountEmail = existingProfile.email || `${phone.replace(/\D/g, '')}@phone.luggo.lk`
  } else {
    // A phone code cannot prove ownership of a supplied email address.
    const finalEmail = `${phone.replace(/\+/g, '')}@phone.luggo.lk`
    const finalName  = name?.trim()  || phone

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: finalEmail,
      email_confirm: true,
      phone,
      phone_confirm: true,
      user_metadata: { name: finalName, phone, contact_email: email || null },
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
