import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const { email, phone } = await req.json()
  const supabase = createServiceClient()

  // Check email
  if (email) {
    const { data: byEmail } = await supabase
      .from('users' as never)
      .select('id')
      .eq('email', email.trim())
      .maybeSingle() as { data: { id: string } | null }

    if (byEmail) {
      return NextResponse.json({ exists: true, field: 'email' })
    }
  }

  // Check phone
  if (phone) {
    const { data: byPhone } = await supabase
      .from('users' as never)
      .select('id')
      .eq('phone', phone)
      .maybeSingle() as { data: { id: string } | null }

    if (byPhone) {
      return NextResponse.json({ exists: true, field: 'phone' })
    }
  }

  return NextResponse.json({ exists: false })
}
