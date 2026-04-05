import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendSMS } from '@/lib/utils/sms'

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Rate limit: max 1 OTP per 60 seconds per phone
  const { data: recent } = await supabase
    .from('phone_otps')
    .select('created_at')
    .eq('phone', phone)
    .is('used_at', null)
    .gte('created_at', new Date(Date.now() - 60_000).toISOString())
    .limit(1)
    .single() as { data: { created_at: string } | null }

  if (recent) {
    return NextResponse.json({ error: 'Please wait 60 seconds before requesting another code.' }, { status: 429 })
  }

  const otp = generateOtp()
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString()

  // Store OTP — if this fails the table doesn't exist or RLS is blocking
  const { error: insertError } = await supabase
    .from('phone_otps' as never)
    .insert({ phone, otp, expires_at: expiresAt }) as { error: { message: string } | null }

  if (insertError) {
    console.error('phone_otps insert failed:', insertError.message)
    return NextResponse.json(
      { error: 'Server error storing OTP. Run the phone_otps SQL migration in Supabase.' },
      { status: 500 }
    )
  }

  // Send via text.lk
  try {
    await sendSMS(phone, `Your Luggo verification code is: ${otp}. Valid for 5 minutes.`)
  } catch {
    return NextResponse.json({ error: 'Failed to send SMS. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
