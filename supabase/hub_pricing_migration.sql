-- ============================================================
-- Luggo Per-Hub Pricing Migration
-- Run this in Supabase -> SQL Editor
-- ============================================================
-- Adds hub_bag_rates so each hub can have its own hourly rate + daily cap
-- per bag type, managed from /admin/pricing. Existing hubs are seeded with
-- the current global defaults (80/120/150 per hour, 600/700/800 daily cap)
-- so nothing changes in price until an admin edits a hub's rates.
-- ============================================================

-- ── 1. Table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hub_bag_rates (
  hub_id      uuid NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  bag_type    bag_type NOT NULL,
  hourly_rate numeric NOT NULL,
  daily_cap   numeric NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (hub_id, bag_type)
);

ALTER TABLE public.hub_bag_rates DROP CONSTRAINT IF EXISTS hourly_rate_positive;
ALTER TABLE public.hub_bag_rates ADD CONSTRAINT hourly_rate_positive CHECK (hourly_rate > 0);

ALTER TABLE public.hub_bag_rates DROP CONSTRAINT IF EXISTS daily_cap_positive;
ALTER TABLE public.hub_bag_rates ADD CONSTRAINT daily_cap_positive CHECK (daily_cap > 0);

CREATE OR REPLACE FUNCTION public.touch_hub_bag_rates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hub_bag_rates_updated_at ON public.hub_bag_rates;
CREATE TRIGGER trg_hub_bag_rates_updated_at
  BEFORE UPDATE ON public.hub_bag_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_hub_bag_rates_updated_at();

-- ── 2. Seed every existing hub with the current default rates ─────────────
INSERT INTO public.hub_bag_rates (hub_id, bag_type, hourly_rate, daily_cap)
SELECT h.id, r.bag_type, r.hourly_rate, r.daily_cap
FROM public.hubs h
CROSS JOIN (
  VALUES ('small'::bag_type, 80, 600),
         ('regular'::bag_type, 120, 700),
         ('large'::bag_type, 150, 800)
) AS r(bag_type, hourly_rate, daily_cap)
ON CONFLICT (hub_id, bag_type) DO NOTHING;

-- ── 3. RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.hub_bag_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_bag_rates: public read" ON public.hub_bag_rates;
CREATE POLICY "hub_bag_rates: public read" ON public.hub_bag_rates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.hubs h WHERE h.id = hub_id AND h.active = true)
  );

DROP POLICY IF EXISTS "hub_bag_rates: admins full access" ON public.hub_bag_rates;
CREATE POLICY "hub_bag_rates: admins full access" ON public.hub_bag_rates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 4. Make calculate_bag_price_for_hours hub-aware ────────────────────────
DROP FUNCTION IF EXISTS public.calculate_bag_price_for_hours(public.bag_type, numeric);

CREATE OR REPLACE FUNCTION public.calculate_bag_price_for_hours(p_bag_type public.bag_type, p_hours numeric, p_hub_id uuid DEFAULT NULL)
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

  IF p_hub_id IS NOT NULL THEN
    SELECT hourly_rate, daily_cap INTO v_hourly_rate, v_daily_cap
    FROM public.hub_bag_rates
    WHERE hub_id = p_hub_id AND bag_type = p_bag_type;
  END IF;

  IF v_hourly_rate IS NULL THEN
    v_hourly_rate := CASE p_bag_type
      WHEN 'small'   THEN 80
      WHEN 'regular' THEN 120
      WHEN 'large'   THEN 150
      ELSE 80
    END;
  END IF;

  IF v_daily_cap IS NULL THEN
    v_daily_cap := CASE p_bag_type
      WHEN 'small'   THEN 600
      WHEN 'regular' THEN 700
      WHEN 'large'   THEN 800
      ELSE 600
    END;
  END IF;

  v_remaining_cost := LEAST(v_remaining_hours * v_hourly_rate, v_daily_cap);
  RETURN (v_days * v_daily_cap) + v_remaining_cost;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_bag_price_for_hours(public.bag_type, numeric, uuid) TO authenticated, service_role;

-- ── 5. Make calculate_late_fee pass the booking's hub through ─────────────
DROP FUNCTION IF EXISTS public.calculate_late_fee(uuid);

CREATE OR REPLACE FUNCTION public.calculate_late_fee(p_booking_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time      timestamptz;
  v_end_time        timestamptz;
  v_hub_id          uuid;
  v_now             timestamptz := now();
  v_orig_hours      numeric;
  v_actual_hours    numeric;
  v_orig_price      numeric := 0;
  v_actual_price    numeric := 0;
  v_bag             record;
  v_paid            numeric := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE booking_id = p_booking_id
      AND type = 'late_fee'
      AND status = 'paid'
      AND (gateway_ref LIKE 'WAIVED_BY_SUPERVISOR_%' OR gateway_ref = 'CASH_PAYMENT_BYPASS')
  ) THEN
    RETURN 0;
  END IF;

  SELECT start_time, end_time, hub_id INTO v_start_time, v_end_time, v_hub_id
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_start_time IS NULL OR v_end_time IS NULL THEN
    RETURN 0;
  END IF;

  IF v_now <= v_end_time + INTERVAL '15 minutes' THEN
    RETURN 0;
  END IF;

  v_orig_hours := CEIL(EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600);
  v_actual_hours := v_orig_hours + (CEIL(EXTRACT(EPOCH FROM (v_now - v_end_time)) / 1800) * 0.5);

  FOR v_bag IN
    SELECT bag_type FROM public.booking_bags WHERE booking_id = p_booking_id
  LOOP
    v_orig_price := v_orig_price + public.calculate_bag_price_for_hours(v_bag.bag_type, v_orig_hours, v_hub_id);
    v_actual_price := v_actual_price + public.calculate_bag_price_for_hours(v_bag.bag_type, v_actual_hours, v_hub_id);
  END LOOP;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.payments
  WHERE booking_id = p_booking_id
    AND type = 'late_fee'
    AND status = 'paid';

  RETURN GREATEST(0, v_actual_price - v_orig_price - v_paid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_late_fee(uuid) TO authenticated, service_role;
