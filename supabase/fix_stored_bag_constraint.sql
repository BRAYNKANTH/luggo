-- ============================================================
-- Fix: Drop check_stored_bag_has_tag check constraint
-- 
-- Reason: Slot-based bookings do not use reusable bag tags (bag_tag_id) anymore.
-- Inserting bags with status = 'stored' but no bag_tag_id violates this check constraint.
-- ============================================================

ALTER TABLE public.booking_bags DROP CONSTRAINT IF EXISTS check_stored_bag_has_tag;
