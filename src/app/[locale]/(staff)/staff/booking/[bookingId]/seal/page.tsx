import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { SealPhotoUpload } from '@/components/staff/SealPhotoUpload'
import { type BagType } from '@/types/database'

export default async function StaffSealPage({
  params,
}: {
  params: { bookingId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: staffRow } = await supabase
    .from('hub_staff')
    .select('hub_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .single() as { data: { hub_id: string } | null; error: unknown }

  if (!staffRow) redirect('/staff/login')

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, 
      status,
      booking_bags ( id, bag_type, seal_status, seal_number )
    `)
    .eq('id', params.bookingId)
    .eq('hub_id', staffRow.hub_id)
    .single() as { data: { id: string; status: string; booking_bags: { id: string; bag_type: BagType; seal_status: string; seal_number: string | null }[] } | null; error: unknown }

  if (!booking) notFound()
  if (booking.status !== 'sealing_in_progress' && booking.status !== 'arrived' && booking.status !== 'confirmed') {
    redirect(`/staff/booking/${params.bookingId}`)
  }

  return (
    <div className="min-h-screen bg-ocean-900 text-white">
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

      <div className="px-4 py-5 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-extrabold mb-1">Upload Bag Seal Evidence</h1>
          <p className="text-white/50 text-xs">
            Take a clear photo of the physical seal for each bag.
          </p>
        </div>

        <SealPhotoUpload bookingId={params.bookingId} bags={booking.booking_bags} />
      </div>
    </div>
  )
}
