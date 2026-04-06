import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Tag, CheckCircle, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { confirmStickersApplied } from '@/lib/staff/actions'
import { BAG_LABELS } from '@/lib/utils/pricing'
import { type BagType } from '@/types/database'

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

  const hubAlias       = staffRow.hubs?.alias ?? ''
  const allHaveSticker = booking.booking_bags.every((b) => b.sticker_number)
  const missingCount   = booking.booking_bags.filter((b) => !b.sticker_number).length

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
          <h1 className="text-xl font-extrabold mb-1">Apply Stickers</h1>
          <p className="text-white/50 text-sm">
            Sticker numbers are pre-assigned. Take each sticker from the pack and paste it on the matching bag.
          </p>
        </div>

        {/* Sticker list — read-only */}
        <div className="space-y-3">
          {booking.booking_bags.map((bag, i) => (
            <div
              key={bag.id}
              className="bg-white/10 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/40 font-bold text-sm shrink-0">
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  {BAG_LABELS[bag.bag_type]}
                </p>
                {bag.sticker_number
                  ? <p className="text-xs text-white/40 mt-0.5">Paste this sticker on the bag</p>
                  : <p className="text-xs text-red-300 mt-0.5">⚠ No sticker assigned yet</p>
                }
              </div>

              {bag.sticker_number ? (
                <div className="flex items-center gap-2 shrink-0 bg-brand-accent/10 px-3 py-1.5 rounded-xl">
                  <Tag size={13} className="text-brand-accent" />
                  <span className="font-mono font-black text-brand-accent text-xl tracking-wider">
                    {hubAlias}-{bag.sticker_number}
                  </span>
                </div>
              ) : (
                <span className="text-white/20 text-xs font-mono">—</span>
              )}
            </div>
          ))}
        </div>

        {/* Missing stickers warning */}
        {!allHaveSticker && (
          <div className="bg-red-500/10 border border-red-400/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-300 font-semibold text-sm">
                {missingCount} bag{missingCount > 1 ? 's' : ''} without sticker
              </p>
              <p className="text-red-200/60 text-xs mt-0.5">
                Stickers were not auto-assigned for this booking. Contact admin — the sticker pool for this hub may need to be set up.
              </p>
            </div>
          </div>
        )}

        {/* Checklist reminder */}
        {allHaveSticker && (
          <div className="bg-white/5 rounded-2xl p-4 space-y-2">
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">Before confirming</p>
            {[
              'Each sticker is firmly attached to its bag',
              'Sticker numbers match what is shown above',
              'All bags are sealed (zip ties or locks applied)',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                <CheckCircle size={14} className="text-brand-accent shrink-0" />
                {item}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky action */}
      {allHaveSticker && (
        <div className="fixed bottom-0 left-0 right-0 bg-ocean-900 border-t border-white/10 px-4 py-4 pb-safe">
          <form action={confirmStickersApplied.bind(null, params.bookingId)}>
            <Button type="submit" fullWidth size="lg">
              ✓ Stickers applied — proceed to seal photo
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
