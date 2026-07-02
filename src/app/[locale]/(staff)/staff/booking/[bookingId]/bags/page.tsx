import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { BagRegistrationForm } from '@/components/staff/BagRegistrationForm'
import { type BagType } from '@/types/database'
import { allocateSlotForBooking } from '@/lib/staff/actions'

type Bag = { 
  id: string
  bag_type: BagType
  seal_number: string | null
  bag_tag_id: string | null
  seal_status: 'sealed' | 'seal_not_applicable'
  notes: string | null
}

type BookingDetail = {
  id: string
  status: string
  walk_in_name: string | null
  walk_in_phone: string | null
  slot_number: number | null
  users: { name: string; phone: string | null } | null
  booking_bags: Bag[]
}

export default async function BagRegistrationPage({
  params,
}: {
  params: { bookingId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: staffRow } = await supabase
    .from('hub_staff')
    .select('hub_id, hubs(alias)')
    .eq('user_id', user.id)
    .eq('active', true)
    .single() as {
      data: { hub_id: string; hubs: { alias: string } | null } | null
      error: unknown
    }

  if (!staffRow) redirect('/staff/login')

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, 
      status, 
      walk_in_name,
      walk_in_phone,
      slot_number,
      users(name, phone),
      booking_bags(id, bag_type, seal_number, bag_tag_id, seal_status, notes)
    `)
    .eq('id', params.bookingId)
    .eq('hub_id', staffRow.hub_id)
    .single() as {
      data: BookingDetail | null
      error: unknown
    }

  if (!booking) notFound()

  // Allowed statuses to enter bag registration: arrived, sealing_in_progress, identity_verified
  const allowed = ['arrived', 'sealing_in_progress', 'identity_verified', 'confirmed']
  if (!allowed.includes(booking.status)) {
    redirect(`/staff/booking/${params.bookingId}`)
  }

  // Allocate slot number on load if it is missing
  let slotNumber = booking.slot_number
  if (!slotNumber) {
    try {
      slotNumber = await allocateSlotForBooking(supabase, staffRow.hub_id, booking.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Slot allocation failed'
      redirect(`/staff/booking/${params.bookingId}?error=${encodeURIComponent(msg)}`)
    }
  }

  const customerName = booking.walk_in_name || booking.users?.name || 'Walk-In Guest'

  return (
    <div className="min-h-screen bg-ocean-900 text-white pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <Link
          href={`/staff/booking/${params.bookingId}`}
          className="flex items-center gap-1 text-white/60 hover:text-white text-sm"
        >
          <ChevronLeft size={16} />
          Back
        </Link>
        <Logo variant="white" size="sm" />
        <div className="w-10" />
      </div>

      <div className="px-4 py-5 space-y-4 max-w-4xl mx-auto">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-light">Step 2 of 2</span>
          <h1 className="text-2xl font-extrabold mb-1 tracking-tight">Register Bag Seals</h1>
          <p className="text-white/50 text-xs">
            Verify and enter/scan physical zip-lock seals for customer **{customerName}**.
          </p>
        </div>

        <BagRegistrationForm
          bookingId={booking.id}
          initialBags={booking.booking_bags}
          slotNumber={slotNumber}
        />
      </div>
    </div>
  )
}
