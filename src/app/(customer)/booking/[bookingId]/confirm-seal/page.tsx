import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Shield, Tag, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { SealConfirmForm } from '@/components/customer/SealConfirmForm'
import { BAG_LABELS } from '@/lib/utils/pricing'
import { type BagType } from '@/types/database'

type Bag = { id: string; bag_type: BagType; sticker_number: string | null; hub_alias: string | null }
type SealProof = { id: string; photo_url: string; uploaded_at: string }

export default async function ConfirmSealPage({
  params,
}: {
  params: { bookingId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load booking — must be owned by user and in correct status
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, status,
      hubs ( name, alias ),
      booking_bags ( id, bag_type, sticker_number, hub_alias )
    `)
    .eq('id', params.bookingId)
    .eq('user_id', user.id)
    .single() as {
      data: {
        id: string
        status: string
        hubs: { name: string; alias: string } | null
        booking_bags: Bag[]
      } | null
      error: unknown
    }

  if (!booking) notFound()

  // Only allow access if waiting for confirmation
  if (booking.status !== 'sealed_waiting_user_confirmation') {
    redirect(`/booking/${params.bookingId}`)
  }

  // Load seal proof
  const { data: proof } = await supabase
    .from('seal_proofs')
    .select('id, photo_url, uploaded_at')
    .eq('booking_id', params.bookingId)
    .single() as { data: SealProof | null; error: unknown }

  if (!proof) {
    redirect(`/booking/${params.bookingId}`)
  }

  // Generate signed URL for the private photo (valid 1 hour)
  const { data: signedData } = await supabase.storage
    .from('seal-proofs')
    .createSignedUrl(proof.photo_url, 3600)

  const photoUrl = signedData?.signedUrl ?? null

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href={`/booking/${params.bookingId}`}
            className="text-gray-400 hover:text-ocean-900 transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="flex-1 flex justify-center">
            <Logo size="sm" />
          </div>
          <div className="w-6" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Trust header */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 rounded-full bg-brand/10 items-center justify-center mb-3">
            <Shield size={26} className="text-brand" />
          </div>
          <h1 className="text-xl font-extrabold text-ocean-900">Confirm Your Seal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hub staff have sealed your bags at{' '}
            <span className="font-semibold text-ocean-900">{booking.hubs?.name}</span>.
            Review the photo below before confirming.
          </p>
        </div>

        {/* Seal photo */}
        <div className="card overflow-hidden p-0">
          <div className="bg-ocean-900 px-4 py-2.5 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-brand-success animate-pulse" />
            <p className="text-white text-xs font-medium">
              Photo taken by hub staff
            </p>
          </div>
          {photoUrl ? (
            <div className="relative w-full">
              <Image
                src={photoUrl}
                alt="Sealed bags photo"
                width={600}
                height={400}
                className="w-full object-cover max-h-80"
                unoptimized
                priority
              />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center bg-gray-100">
              <p className="text-sm text-gray-400">Photo unavailable</p>
            </div>
          )}
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Tap and hold to zoom on mobile
            </p>
          </div>
        </div>

        {/* Sticker checklist */}
        <div className="card">
          <h2 className="font-bold text-ocean-900 text-sm mb-3 flex items-center gap-2">
            <Tag size={14} className="text-brand" />
            Check sticker labels on each bag
          </h2>
          <div className="space-y-2">
            {booking.booking_bags.map((bag) => (
              <div
                key={bag.id}
                className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-2 text-gray-700">
                  <Package size={14} className="text-gray-400" />
                  {BAG_LABELS[bag.bag_type]}
                </div>
                {bag.sticker_number ? (
                  <span className="font-mono text-xs font-bold bg-brand/10 text-brand px-2.5 py-1 rounded-lg">
                    {bag.hub_alias ?? booking.hubs?.alias}-{bag.sticker_number}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">No sticker</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
          <p className="text-xs text-blue-800 font-semibold mb-1">What to check:</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>All your bags are visible in the photo</li>
            <li>Sticker labels match the numbers shown above</li>
            <li>Bags appear undamaged and properly sealed</li>
          </ul>
        </div>

        {/* Confirm / Dispute */}
        <SealConfirmForm bookingId={params.bookingId} />

      </div>
    </div>
  )
}
