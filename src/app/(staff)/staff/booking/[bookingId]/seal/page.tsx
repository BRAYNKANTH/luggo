import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { SealPhotoUpload } from '@/components/staff/SealPhotoUpload'

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
    .select('id, status')
    .eq('id', params.bookingId)
    .eq('hub_id', staffRow.hub_id)
    .single() as { data: { id: string; status: string } | null; error: unknown }

  if (!booking) notFound()
  if (booking.status !== 'sealing_in_progress' && booking.status !== 'disputed') {
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

      <div className="px-4 py-5">
        <h1 className="text-xl font-extrabold mb-1">Seal Photo</h1>
        <p className="text-white/50 text-sm mb-2">
          Take a clear photo of all sealed bags with sticker labels visible.
        </p>
        <p className="text-brand-accent text-xs mb-6">
          The customer will see this photo and must confirm the seal before bags go into storage.
        </p>

        <SealPhotoUpload bookingId={params.bookingId} />
      </div>
    </div>
  )
}
