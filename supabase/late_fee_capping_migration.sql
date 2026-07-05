-- ============================================================
-- Migration: Late Fee Capping and Capped Pricing Fix
-- Run this in Supabase → SQL Editor
-- ============================================================

-- ── 1. Create or replace the bag pricing function ──
CREATE OR REPLACE FUNCTION public.calculate_bag_price_for_hours(p_bag_type public.bag_type, p_hours numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_days            integer;
  v_remaining_hours numeric;
  v_hourly_rate     numeric;
  v_daily_cap       numeric;
  v_remaining_cost  numeric;
BEGIN
  IF p_hours <= 0 THEN
    RETURN 0;
  END IF;

  v_days := FLOOR(p_hours / 24);
  v_remaining_hours := p_hours - (v_days * 24);

  v_hourly_rate := CASE p_bag_type
    WHEN 'small'   THEN 80
    WHEN 'regular' THEN 120
    WHEN 'large'   THEN 150
    ELSE 80
  END;

  v_daily_cap := CASE p_bag_type
    WHEN 'small'   THEN 600
    WHEN 'regular' THEN 700
    WHEN 'large'   THEN 800
    ELSE 600
  END;

  v_remaining_cost := LEAST(v_remaining_hours * v_hourly_rate, v_daily_cap);
  RETURN (v_days * v_daily_cap) + v_remaining_cost;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_bag_price_for_hours(public.bag_type, numeric) TO authenticated, service_role;


-- ── 2. Update calculate_late_fee RPC ──
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
BEGIN
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

  RETURN GREATEST(0, v_actual_price - v_orig_price);
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_late_fee(uuid) TO authenticated, service_role;
