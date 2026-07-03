-- ============================================================
-- Fixes Patch:
-- 1. Drop check_stored_bag_has_tag check constraint
-- 2. Add 15-minute grace period to calculate_late_fee SQL function
-- 
-- Run this in Supabase → SQL Editor
-- ============================================================

-- ── 1. Drop obsolete check constraint ──
ALTER TABLE public.booking_bags DROP CONSTRAINT IF EXISTS check_stored_bag_has_tag;

-- ── 2. Update calculate_late_fee RPC ──
CREATE OR REPLACE FUNCTION public.calculate_late_fee(p_booking_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_end_time   timestamptz;
  v_now        timestamptz := now();
  v_hours      integer;
  v_fee        numeric := 0;
  v_bag        record;
BEGIN
  SELECT end_time INTO v_end_time
  FROM bookings
  WHERE id = p_booking_id;

  IF v_end_time IS NULL THEN
    RETURN 0;
  END IF;

  -- 15-minute grace period buffer (900 seconds)
  IF v_now <= v_end_time + INTERVAL '15 minutes' THEN
    RETURN 0;
  END IF;

  v_hours := CEIL(EXTRACT(EPOCH FROM (v_now - v_end_time)) / 3600);

  FOR v_bag IN
    SELECT bag_type FROM booking_bags WHERE booking_id = p_booking_id
  LOOP
    v_fee := v_fee + (
      CASE v_bag.bag_type
        WHEN 'small'   THEN 200
        WHEN 'regular' THEN 300
        WHEN 'large'   THEN 400
        ELSE 200
      END
    ) * v_hours;
  END LOOP;

  RETURN v_fee;
END;
$$;
