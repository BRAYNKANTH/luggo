import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { StickersAndSealForm } from '@/components/staff/StickersAndSealForm'
import { type BagType } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Stickers — Staff' }

type Bag = { id: string; bag_type: BagType; sticker_number: string | null }

export default async function StaffStickersPage({
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
    .select('id, status, booking_bags(id, bag_type, sticker_number)')
    .eq('id', params.bookingId)
    .eq('hub_id', staffRow.hub_id)
    .single() as {
      data: { id: string; status: string; booking_bags: Bag[] } | null
      error: unknown
    }

  if (!booking) notFound()
  if (booking.status !== 'arrived') {
    redirect(`/staff/booking/${params.bookingId}`)
  }

  const hubAlias = staffRow.hubs?.alias ?? ''

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

      <div className="px-4 py-5 space-y-4">
        <div>
          <h1 className="text-xl font-extrabold mb-1">Apply Stickers & Seals</h1>
          <p className="text-white/50 text-sm">
            Paste the pre-assigned stickers and lock zipper seals on each bag, then scan the seal barcodes below.
          </p>
        </div>

        <StickersAndSealForm
          bookingId={booking.id}
          bags={booking.booking_bags}
          hubAlias={hubAlias}
        />
      </div>
    </div>
  )
}
