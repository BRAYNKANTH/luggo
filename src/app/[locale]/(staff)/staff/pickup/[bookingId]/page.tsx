import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Package, AlertTriangle, ShieldAlert, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { BookingStatusBadge } from '@/components/customer/BookingStatusBadge'
import { completePickupAction, waiveAndCompletePickupAction, resolveIncidentReport } from '@/lib/staff/actions'
import { BAG_LABELS } from '@/lib/utils/pricing'
import { type BookingStatus, type BagType } from '@/types/database'
import { isPast } from 'date-fns'
import { LiveStorageCountdown } from '@/components/staff/LiveStorageCountdown'

type Bag = { 
  id: string
  bag_type: BagType
  sticker_number: string | null
  seal_number: string | null
  bag_tag_id: string | null
  seal_status: 'sealed' | 'seal_not_applicable'
  status: string
  bag_tags: { tag_code: string } | null
}

type Booking = {
  id: string
  status: BookingStatus
  end_time: string
  total_price: number
  walk_in_name: string | null
  walk_in_phone: string | null
  walk_in_nic_passport_ref: string | null
  slot_number: number | null
  users: { name: string; phone: string | null } | null
  booking_bags: Bag[]
  hubs: { alias: string } | null
}

type Incident = {
  id: string
  incident_type: string
  description: string
  status: string
  reported_by_staff_id: string
  users: { name: string } | null
}

export default async function StaffPickupPage({
  params,
  searchParams,
}: {
  params: { bookingId: string }
  searchParams?: { error?: string }
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
      id, status, end_time, total_price, slot_number,
      walk_in_name, walk_in_phone, walk_in_nic_passport_ref,
      users ( name, phone ),
      booking_bags ( id, bag_type, sticker_number, seal_number, bag_tag_id, seal_status, status, bag_tags ( tag_code ) ),
      hubs ( alias )
    `)
    .eq('id', params.bookingId)
    .eq('hub_id', staffRow.hub_id)
    .single() as { data: Booking | null; error: unknown }

  if (!booking) notFound()

  // Get user role for supervisor permission check
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null; error: unknown }

  const isSupervisor = userProfile && ['support_admin', 'ops_admin', 'master_admin'].includes(userProfile.role)

  // Fetch open incidents if in exception_hold
  let incidents: Incident[] = []
  if (booking.status === 'exception_hold') {
    const { data: incidentList } = await supabase
      .from('incident_reports')
      .select(`
        id, incident_type, description, status, reported_by_staff_id,
        users:reported_by_staff_id ( name )
      `)
      .eq('booking_id', booking.id)
      .eq('status', 'open') as {
        data: {
          id: string
          incident_type: string
          description: string
          status: string
          reported_by_staff_id: string
          users: { name: string } | null
        }[] | null
        error: unknown
      }

    if (incidentList) {
      incidents = incidentList.map(item => ({
        id: item.id,
        incident_type: item.incident_type,
        description: item.description,
        status: item.status,
        reported_by_staff_id: item.reported_by_staff_id,
        users: Array.isArray(item.users) ? (item.users[0] as { name: string } | null) : item.users
      }))
    }
  }

  const allowed: BookingStatus[] = ['pickup_requested', 'active_storage', 'overstayed', 'late_fee_pending', 'ready_for_release', 'exception_hold']
  if (!allowed.includes(booking.status)) {
    redirect(`/staff/booking/${params.bookingId}`)
  }

  // Calculate late fee using Postgres function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lateFee } = await (supabase.rpc as any)('calculate_late_fee', {
    p_booking_id: params.bookingId,
  }) as { data: number | null; error: unknown }

  const isOverdue = isPast(new Date(booking.end_time))
  const fee = lateFee ?? 0

  const customerName = booking.walk_in_name || booking.users?.name || 'Walk-In Guest'
  const customerPhone = booking.walk_in_phone || booking.users?.phone || 'No phone'

  // Server action handler helper for inline resolution forms
  async function resolveIncidentAction(formData: FormData) {
    'use server'
    const incidentId = formData.get('incidentId') as string
    const note = formData.get('note') as string
    if (!incidentId || !note) return
    await resolveIncidentReport(incidentId, note)
    redirect(`/staff/pickup/${params.bookingId}`)
  }

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

      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        {searchParams?.error && (
          <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 text-red-200">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm font-bold">{decodeURIComponent(searchParams.error)}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">Process Handover</h1>
          <BookingStatusBadge status={booking.status} />
        </div>

        {/* Customer Profile */}
        <div className="bg-white/10 rounded-2xl p-4 space-y-2">
          <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">Customer Details</p>
          <p className="font-bold">{customerName}</p>
          <p className="text-white/50 text-xs">{customerPhone}</p>
          {booking.walk_in_nic_passport_ref && (
            <p className="text-brand-light text-xs font-mono tracking-wider pt-1">
              ID Reference: {booking.walk_in_nic_passport_ref}
            </p>
          )}
        </div>

        {/* Storage Slot Retrieval Banner */}
        {booking.slot_number && (
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-ocean-900 shrink-0">
                <MapPin size={18} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Retrieve Location</p>
                <p className="text-sm font-extrabold text-white">Storage Slot #{booking.slot_number}</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full border border-amber-400/20">
              Assigned Shelf
            </span>
          </div>
        )}

        {/* Live ticking countdown timer */}
        <LiveStorageCountdown endTime={booking.end_time} status={booking.status} />

        {/* Incidents resolver console */}
        {booking.status === 'exception_hold' && incidents.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-red-300">
              <ShieldAlert size={18} />
              <h2 className="font-extrabold text-sm uppercase tracking-wide">Active Incident Reports</h2>
            </div>
            
            <div className="space-y-4">
              {incidents.map((inc) => (
                <div key={inc.id} className="bg-black/20 p-3.5 rounded-xl border border-red-500/10 space-y-3 text-xs">
                  <div>
                    <span className="font-black text-red-400 uppercase text-[10px] tracking-wider bg-red-400/10 px-2 py-0.5 rounded">
                      {inc.incident_type.replace('_', ' ')}
                    </span>
                    <p className="text-white/80 mt-2 font-medium">{inc.description}</p>
                    <p className="text-white/40 text-[9px] mt-1 font-bold">Reported by: {inc.users?.name ?? 'Hub Staff'}</p>
                  </div>

                  {isSupervisor ? (
                    <form action={resolveIncidentAction} className="space-y-2.5 pt-2 border-t border-white/5">
                      <input type="hidden" name="incidentId" value={inc.id} />
                      <textarea
                        required
                        name="note"
                        rows={2}
                        placeholder="Type resolution / override reasons..."
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
                      />
                      <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 h-8">
                        ✓ Resolve & Unlock Booking
                      </Button>
                    </form>
                  ) : (
                    <div className="text-white/40 italic font-bold pt-1 border-t border-white/5">
                      * Only supervisors can authorize override release.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bags Checklist */}
        <div className="bg-white/10 rounded-2xl p-4">
          <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Package size={15} className="text-brand-accent" />
            Checklist: Retrieve bags from allocated slot
          </h2>
          <div className="space-y-2">
            {booking.booking_bags.map((bag) => (
              <div key={bag.id} className="flex items-center justify-between text-sm py-2.5 border-b border-white/5 last:border-0">
                <div className="flex flex-col">
                  <span className="text-white/80 font-bold">{BAG_LABELS[bag.bag_type]}</span>
                  {bag.seal_status === 'sealed' ? (
                    <span className="text-[10px] text-brand-accent font-mono font-bold mt-0.5">
                      🔒 Seal Serial: {bag.seal_number || 'Missing'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/40 font-bold italic mt-0.5">
                      Unsealable (No Seal Applied)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Late Fee calculations */}
        {isOverdue && fee > 0 && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-300 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-300 font-semibold text-sm">Late pickup fee applies</p>
                <p className="text-red-200/70 text-xs mt-0.5">
                  Overdue session requires cash payment or supervisor waiver.
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-between items-center text-sm">
              <span className="text-white/60">Base fee</span>
              <span>LKR {booking.total_price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-red-300">Overdue fee</span>
              <span className="text-red-300 font-bold">+ LKR {fee.toLocaleString()}</span>
            </div>
            <div className="border-t border-red-400/20 mt-2 pt-2 flex justify-between items-center font-bold">
              <span>Total to collect</span>
              <span>LKR {(booking.total_price + fee).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Paid / Waiver clear message */}
        {!isOverdue && (
          <div className="bg-white/10 rounded-2xl p-4 flex justify-between items-center">
            <span className="text-white/60 text-sm">Total paid</span>
            <span className="font-bold text-green-400">LKR {booking.total_price.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Handover action CTAs */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-ocean-900 border-t border-white/10 px-4 py-4 pb-safe space-y-2">
        <p className="text-white/40 text-xs text-center mb-1 leading-normal max-w-md mx-auto">
          Confirm that Reusable Tag codes and zipper Seal numbers match this screen perfectly before cutting seals.
        </p>

        {booking.status === 'exception_hold' ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center text-xs font-bold text-red-300 mx-4">
            ⚠️ Release locked. Incidents must be resolved by a Supervisor to unlock.
          </div>
        ) : (booking.status === 'overstayed' || booking.status === 'late_fee_pending') ? (
          <div className="space-y-2 px-4">
            <div className="bg-red-500/10 border border-red-400/20 rounded-xl px-4 py-2 text-center">
              <p className="text-red-300 text-xs font-bold">Collect LKR {fee.toLocaleString()} Cash or wait for online payment.</p>
            </div>
            
            {isSupervisor ? (
              <form action={waiveAndCompletePickupAction.bind(null, booking.id)}>
                <Button type="submit" fullWidth size="lg" className="bg-amber-600 hover:bg-amber-500 text-white">
                  ⚠️ Authorize Waiver (Supervisor Override)
                </Button>
              </form>
            ) : (
              <div className="text-center text-white/40 text-xs italic bg-white/5 py-3 rounded-xl">
                * Supervisor approval required to waive late fees
              </div>
            )}
          </div>
        ) : (
          <form action={completePickupAction.bind(null, booking.id)} className="px-4">
            <Button type="submit" fullWidth size="lg">
              ✓ Confirm Handover Complete & Release Tags
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
