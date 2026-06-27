import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createBookingSchema } from '@/lib/validators/booking'
import { calculateBookingPrice } from '@/lib/utils/pricing'
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
    const body = await req.json()
    const parsed = createBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { hub_id, start_time, end_time, bags, payment_method = 'pay_online' } = parsed.data

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

    // Capacity check — count active bags overlapping the requested window
    const { data: overlappingBookings } = await supabase
      .from('bookings')
      .select('id, booking_bags(id)')
      .eq('hub_id', hub_id)
      .not('status', 'in', '("cancelled","expired","completed")')
      .lt('start_time', end_time)
      .gt('end_time', start_time) as { data: { id: string; booking_bags: unknown[] }[] | null }

    const curBags = overlappingBookings?.reduce((acc, b) => acc + (b.booking_bags?.length ?? 0), 0) ?? 0

    if (curBags + bags.length > hub.capacity) {
      return NextResponse.json(
        { error: 'This hub does not have enough space for the selected time slot. Please choose another hub or reduce the number of bags.' },
        { status: 409 }
      )
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
    const totalPrice = calculateBookingPrice(bags, new Date(start_time), new Date(end_time))

    // Create booking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: booking, error: bookingError } = await (supabase.from('bookings') as any)
      .insert({
        user_id: user.id,
        hub_id,
        status: payment_method === 'pay_at_hub' ? 'confirmed' : 'pending_payment',
        start_time,
        end_time,
        total_price: totalPrice,
        qr_code: crypto.randomUUID().replace(/-/g, ''),
      })
      .select('id, qr_code')
      .single() as { data: { id: string; qr_code: string } | null; error: unknown }

    if (bookingError || !booking) {
      console.error('Booking creation failed:', bookingError)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // Create booking bags
    const bagRows = bags.map((bag) => ({
      booking_id: booking.id,
      bag_type: bag.bag_type,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('booking_bags') as any).insert(bagRows)

    // Create pending payment record
    const serviceClient = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (serviceClient.from('payments') as any).insert({
      booking_id: booking.id,
      amount: totalPrice,
      status: 'pending',
      type: 'booking',
      gateway_ref: payment_method === 'pay_at_hub' ? 'PAY_AT_HUB' : null
    })

    if (payment_method === 'pay_at_hub') {
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
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)

    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        id, status, start_time, end_time, total_price, qr_code, created_at,
        hubs ( name, alias, location ),
        booking_bags ( id, bag_type, sticker_number )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    return NextResponse.json({ bookings: bookings ?? [] })
  } catch (err) {
    console.error('GET /api/bookings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
