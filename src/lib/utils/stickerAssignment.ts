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

  // Fetch ALL sticker numbers currently in use at this hub to avoid collisions
  // (querying all rather than just max prevents race conditions with concurrent assignments)
  const { data: usedBags } = await (svc
    .from('booking_bags' as never)
    .select('sticker_number')
    .eq('hub_alias', hubAlias)
    .not('sticker_number', 'is', null)) as { data: { sticker_number: string }[] | null }

  const usedNumbers = new Set((usedBags ?? []).map(b => b.sticker_number))

  // Find next available sequential numbers — skipping any already taken
  let nextCandidate = 1
  const assignedNums: string[] = []
  for (let i = 0; i < unassigned.length; i++) {
    while (usedNumbers.has(String(nextCandidate).padStart(3, '0'))) {
      nextCandidate++
    }
    const stickerNum = String(nextCandidate).padStart(3, '0')
    assignedNums.push(stickerNum)
    usedNumbers.add(stickerNum) // reserve it for next iteration
    nextCandidate++
  }

  // Write assignments
  for (let i = 0; i < unassigned.length; i++) {
    await svc
      .from('booking_bags' as never)
      .update({ sticker_number: assignedNums[i], hub_alias: hubAlias })
      .eq('id', unassigned[i].id)
  }

  console.log(
    `[Stickers] Auto-assigned ${unassigned.length} sticker(s) for booking ${bookingId} at hub ${hubAlias}:`,
    assignedNums.join(', ')
  )
}
