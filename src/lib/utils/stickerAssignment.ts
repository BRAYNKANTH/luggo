import { createServiceClient } from '@/lib/supabase/service'

/**
 * Auto-assigns sticker numbers to all bags in a booking at confirmation time.
 * Finds the highest sticker number currently in use at the hub and increments.
 * Safe to call multiple times — skips bags that already have a sticker number.
 */
export async function autoAssignStickers(bookingId: string): Promise<void> {
  const svc = createServiceClient()

  // Get booking bags + hub alias
  const { data: booking } = await (svc
    .from('bookings' as never)
    .select('hub_id, booking_bags(id, sticker_number), hubs(alias)')
    .eq('id', bookingId)
    .single()) as {
    data: {
      hub_id: string
      hubs: { alias: string } | null
      booking_bags: { id: string; sticker_number: string | null }[]
    } | null
  }

  if (!booking || !booking.booking_bags.length) return

  const hubAlias   = booking.hubs?.alias ?? ''
  const unassigned = booking.booking_bags.filter((b) => !b.sticker_number)
  if (unassigned.length === 0) return // already assigned, nothing to do

  // Find the highest sticker number currently in use at this hub
  const { data: lastBag } = await (svc
    .from('booking_bags' as never)
    .select('sticker_number')
    .eq('hub_alias', hubAlias)
    .not('sticker_number', 'is', null)
    .order('sticker_number', { ascending: false })
    .limit(1)) as { data: { sticker_number: string }[] | null }

  const lastNum = lastBag?.[0]?.sticker_number
    ? parseInt(lastBag[0].sticker_number, 10)
    : 0

  // Assign sequential sticker numbers
  for (let i = 0; i < unassigned.length; i++) {
    const stickerNum = String(lastNum + i + 1).padStart(3, '0')
    await svc
      .from('booking_bags' as never)
      .update({ sticker_number: stickerNum, hub_alias: hubAlias })
      .eq('id', unassigned[i].id)
  }

  console.log(
    `[Stickers] Auto-assigned ${unassigned.length} sticker(s) for booking ${bookingId} at hub ${hubAlias}`,
    `(starting from ${String(lastNum + 1).padStart(3, '0')})`
  )
}
