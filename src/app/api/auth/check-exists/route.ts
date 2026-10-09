import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { normalizePhone, phoneAliases } from '@/lib/validators/phone'
import { hitRateLimit } from '@/lib/security/rateLimit'

export async function POST(req: NextRequest) {
  const input = z.object({ email: z.string().trim().email().optional().or(z.literal('')), phone: z.string().optional() }).safeParse(await req.json().catch(() => null))
  if (!input.success || (!input.data.email && !input.data.phone)) return NextResponse.json({ error: 'Valid email or phone required' }, { status: 400 })
  const { email, phone: rawPhone } = input.data
  const phone = rawPhone ? normalizePhone(rawPhone) : null
  if (rawPhone && !phone) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!hitRateLimit(`check-exists:${ip}`, 30, 60_000).allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const supabase = createServiceClient()
  let exists = false

  // Check email
  if (email) {
    const { data: byEmail } = await supabase
      .from('users' as never)
      .select('id')
      .ilike('email', email.toLowerCase().replace(/[%_]/g, value => `\\${value}`))
      .maybeSingle() as { data: { id: string } | null }

    if (byEmail) {
      exists = true
    }
  }

  // Check phone
  if (phone) {
    const { data: byPhone } = await supabase
      .from('users' as never)
      .select('id')
      .in('phone', phoneAliases(phone))
      .maybeSingle() as { data: { id: string } | null }

    if (byPhone) {
      exists = true
    }
  }

  return NextResponse.json({ canProceed: !exists })
}
