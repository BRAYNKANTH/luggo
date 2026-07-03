-- ============================================================
-- Add slot_number to bookings table
-- Run this in Supabase → SQL Editor
-- ============================================================

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS slot_number integer;

CREATE INDEX IF NOT EXISTS idx_bookings_slot 
ON public.bookings(hub_id, slot_number) 
WHERE slot_number IS NOT NULL AND status IN (
  'arrived',
  'identity_verified',
  'sealing_in_progress',
  'sealed_waiting_user_confirmation',
  'active_storage',
  'pickup_requested',
  'overstayed',
  'late_fee_pending'
);

-- Slot-based bookings do not use reusable bag tags (bag_tag_id) anymore.
-- Drop check constraint that requires bag_tag_id when status = 'stored'.
ALTER TABLE public.booking_bags DROP CONSTRAINT IF EXISTS check_stored_bag_has_tag;

