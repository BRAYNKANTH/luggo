import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Shield, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { SealConfirmForm } from '@/components/customer/SealConfirmForm'
import { BAG_LABELS } from '@/lib/utils/pricing'
import { type BagType } from '@/types/database'

type Bag = { id: string; bag_type: BagType; sticker_number: string | null; hub_alias: string | null; seal_status: string; seal_number: string | null }

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
      booking_bags ( id, bag_type, sticker_number, hub_alias, seal_status, seal_number )
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

  // Load seal proof evidence
  const { data: evidences } = await supabase
    .from('booking_bag_evidence')
    .select('id, bag_id, file_url, uploaded_at')
    .eq('booking_id', params.bookingId) as { data: { id: string; bag_id: string | null; file_url: string; uploaded_at: string }[] | null }

  const signedEvidencesMap: Record<string, string> = {}
  if (evidences && evidences.length > 0) {
    for (const ev of evidences) {
      if (ev.bag_id) {
        const { data: signedData } = await supabase.storage
          .from('seal-proofs')
          .createSignedUrl(ev.file_url, 3600)
        if (signedData?.signedUrl) {
          signedEvidencesMap[ev.bag_id] = signedData.signedUrl
        }
      }
    }
  }

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
            Review each bag&apos;s photo below before confirming.
          </p>
        </div>

        {/* Sticker checklist */}
        <div className="card space-y-4">
          <h2 className="font-bold text-ocean-900 text-sm mb-1 flex items-center gap-2">
            <Tag size={14} className="text-brand" />
            Check sticker labels and seal photos
          </h2>
          <div className="divide-y divide-gray-100">
            {booking.booking_bags.map((bag, i) => {
              const photoUrl = signedEvidencesMap[bag.id]
              const isSealed = bag.seal_status === 'sealed'
              return (
                <div key={bag.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-brand tracking-wider">Bag #{i + 1}</p>
                      <p className="text-sm font-bold text-gray-900">{BAG_LABELS[bag.bag_type]}</p>
                      {isSealed && (
                        <p className="text-xs font-semibold text-amber-600 mt-0.5">🔒 Seal: {bag.seal_number || 'Pending'}</p>
                      )}
                    </div>
                    {bag.sticker_number ? (
                      <span className="font-mono text-xs font-black bg-brand/10 text-brand px-2.5 py-1 rounded-xl">
                        {bag.hub_alias ?? booking.hubs?.alias}-{bag.sticker_number}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 font-bold">No sticker</span>
                    )}
                  </div>
                  {isSealed && photoUrl && (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-100">
                      <Image
                        src={photoUrl}
                        alt={`Seal photo for bag #${i + 1}`}
                        width={600}
                        height={400}
                        className="w-full object-cover max-h-56"
                        unoptimized
                      />
                    </div>
                  )}
                  {isSealed && !photoUrl && (
                    <div className="h-28 rounded-2xl flex items-center justify-center bg-gray-50 border border-dashed border-gray-200">
                      <p className="text-xs text-gray-400 italic">No seal photo uploaded</p>
                    </div>
                  )}
                </div>
              )
            })}
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
