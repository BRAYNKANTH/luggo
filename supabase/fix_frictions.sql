-- ============================================================
-- Migration: Luggo App Frictions and Errors Fixes
-- Run this in Supabase -> SQL Editor
-- ============================================================

-- 1. Add reminder_sent_at column to public.bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- 2. Update calculate_late_fee RPC
DROP FUNCTION IF EXISTS public.calculate_late_fee(uuid);

CREATE OR REPLACE FUNCTION public.calculate_late_fee(p_booking_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time      timestamptz;
  v_end_time        timestamptz;
  v_now             timestamptz := now();
  v_orig_hours      numeric;
  v_actual_hours    numeric;
  v_orig_price      numeric := 0;
  v_actual_price    numeric := 0;
  v_bag             record;
  v_paid            numeric := 0;
BEGIN
  -- If waived by supervisor, return 0
  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE booking_id = p_booking_id
      AND type = 'late_fee'
      AND status = 'paid'
      AND (gateway_ref LIKE 'WAIVED_BY_SUPERVISOR_%' OR gateway_ref = 'CASH_PAYMENT_BYPASS')
  ) THEN
    RETURN 0;
  END IF;

  SELECT start_time, end_time INTO v_start_time, v_end_time
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_start_time IS NULL OR v_end_time IS NULL THEN
    RETURN 0;
  END IF;

  -- 15-minute grace period buffer (900 seconds)
  IF v_now <= v_end_time + INTERVAL '15 minutes' THEN
    RETURN 0;
  END IF;

  v_orig_hours := CEIL(EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600);
  v_actual_hours := v_orig_hours + (CEIL(EXTRACT(EPOCH FROM (v_now - v_end_time)) / 1800) * 0.5);

  FOR v_bag IN
    SELECT bag_type FROM public.booking_bags WHERE booking_id = p_booking_id
  LOOP
    v_orig_price := v_orig_price + public.calculate_bag_price_for_hours(v_bag.bag_type, v_orig_hours);
    v_actual_price := v_actual_price + public.calculate_bag_price_for_hours(v_bag.bag_type, v_actual_hours);
  END LOOP;

  -- Subtract already paid late fees
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.payments
  WHERE booking_id = p_booking_id
    AND type = 'late_fee'
    AND status = 'paid';

  RETURN GREATEST(0, v_actual_price - v_orig_price - v_paid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_late_fee(uuid) TO authenticated, service_role;
