import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createBookingSchema } from '@/lib/validators/booking'
import { calculateBookingPrice } from '@/lib/utils/pricing'
import { getHubBagRates } from '@/lib/utils/hubPricing'
import { generatePayhereHash, PAYHERE_ENDPOINT, type PayhereFormData } from '@/lib/utils/payhere'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate body
    const body = await req.json().catch(() => null)
    const parsed = createBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const {
      hub_id,
      start_time,
      end_time,
      bags,
      payment_method = 'pay_online',
      has_insurance = false,
      terms_accepted,
      terms_version,
      privacy_version,
    } = parsed.data

    if (payment_method === 'pay_online' && (!process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID || !process.env.PAYHERE_MERCHANT_SECRET || !process.env.NEXT_PUBLIC_APP_URL)) {
      return NextResponse.json({ error: 'Online payment is temporarily unavailable. Please select payment at the hub.' }, { status: 503 })
    }

    // Fetch hub
    const { data: hub } = await supabase
      .from('hubs')
      .select('id, name, alias, active, capacity')
      .eq('id', hub_id)
      .single() as {
        data: { id: string; name: string; alias: string; active: boolean; capacity: number } | null
        error: unknown
      }

    if (!hub || !hub.active) {
      return NextResponse.json({ error: 'Hub not found or inactive' }, { status: 404 })
    }

    // Fetch user profile for PayHere
    const { data: profile } = await supabase
      .from('users')
      .select('name, email, phone')
      .eq('id', user.id)
      .single() as {
        data: { name: string; email: string; phone: string | null } | null
        error: unknown
      }

    // Calculate price
    const rates = await getHubBagRates(supabase, hub_id)
    const basePrice = calculateBookingPrice(bags, new Date(start_time), new Date(end_time), rates)
    const insurancePrice = has_insurance ? (bags.length * 150) : 0
    const totalPrice = basePrice + insurancePrice
    const uuid = crypto.randomUUID().replace(/-/g, '')
    const qrCode = has_insurance ? `${uuid}_ins` : uuid

    // The service-only RPC serializes capacity checks per hub and rolls back
    // the entire booking if any bag or payment insert fails.
    const serviceClient = createServiceClient()
    const { data: booking, error: bookingError } = await serviceClient.rpc('create_booking_with_payment', {
      p_booking: {
        user_id: user.id, hub_id, start_time, end_time,
        total_price: totalPrice, qr_code: qrCode, terms_accepted,
        terms_version: terms_version || 'v1.0', privacy_version: privacy_version || 'v1.0',
      },
      p_bags: bags,
      p_pay_at_hub: payment_method === 'pay_at_hub',
    })
    if (bookingError || !booking) {
      console.error('Booking creation failed:', bookingError)
      const status = bookingError?.code === 'P0001' ? 409 : bookingError?.code === 'P0002' ? 404 : 500
      const error = status === 409 ? 'This hub does not have enough space for the selected time slot.' : status === 404 ? 'Hub not found or inactive' : 'Failed to create booking'
      return NextResponse.json({ error }, { status })
    }

    if (has_insurance) {
      await serviceClient.rpc('write_audit_log', {
        p_actor_id: user.id,
        p_actor_role: 'customer',
        p_action: 'booking_insurance_purchased',
        p_entity: 'bookings',
        p_entity_id: booking.id,
        p_metadata: { insurance_fee: insurancePrice, coverage_limit: 40000 }
      })
    }

    if (payment_method === 'pay_at_hub') {
      const { sendBookingConfirmedNotification } = await import('@/lib/utils/notifications')
      await sendBookingConfirmedNotification(supabase, booking.id).catch(console.error)
      return NextResponse.json({ bookingId: booking.id })
    }

    // Build PayHere form data
    const merchantId = process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID!
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET!
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!

    const nameParts = (profile?.name ?? 'Customer').trim().split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || 'N/A'

    const payhereData: PayhereFormData = {
      merchant_id: merchantId,
      return_url: `${appUrl}/booking/${booking.id}?payment=success`,
      cancel_url: `${appUrl}/book/${hub_id}?payment=cancelled`,
      notify_url: process.env.NEXT_PUBLIC_PAYHERE_NOTIFY_URL || `${appUrl}/api/webhooks/payhere`,
      order_id: booking.id,
      items: `Luggo Storage at ${hub.name} — ${bags.length} bag(s)`,
      currency: 'LKR',
      amount: totalPrice.toFixed(2),
      first_name: firstName,
      last_name: lastName,
      email: profile?.email ?? user.email ?? '',
      phone: profile?.phone ?? '0000000000',
      address: hub.name,
      city: 'Colombo',
      country: 'Sri Lanka',
      hash: generatePayhereHash(merchantId, booking.id, totalPrice, 'LKR', merchantSecret),
      endpoint: PAYHERE_ENDPOINT,
    }


    return NextResponse.json({ bookingId: booking.id, payhere: payhereData })
  } catch (err) {
    console.error('POST /api/bookings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') ?? '20')
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return NextResponse.json({ error: 'limit must be an integer from 1 to 100' }, { status: 400 })

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id, status, start_time, end_time, total_price, qr_code, created_at,
        hubs ( name, alias, location ),
        booking_bags ( id, bag_type, sticker_number )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return NextResponse.json({ bookings: bookings ?? [] })
  } catch (err) {
    console.error('GET /api/bookings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
