-- ============================================================
-- Luggo Staff Fixes Migration
-- Run this in Supabase → SQL Editor
-- ============================================================

-- ── 1. sticker_assignments table (safe create) ───────────────
CREATE TABLE IF NOT EXISTS sticker_assignments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_bag_id       uuid NOT NULL REFERENCES booking_bags(id) ON DELETE CASCADE,
  sticker_number       text NOT NULL,
  assigned_by_staff_id uuid NOT NULL REFERENCES auth.users(id),
  assigned_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sticker_assignments_bag ON sticker_assignments(booking_bag_id);

-- ── 2. seal_proofs table (safe create) ───────────────────────
CREATE TABLE IF NOT EXISTS seal_proofs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  photo_url             text NOT NULL,
  uploaded_by_staff_id  uuid NOT NULL REFERENCES auth.users(id),
  uploaded_at           timestamptz NOT NULL DEFAULT now(),
  confirmed_by_user_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_seal_proofs_booking ON seal_proofs(booking_id);

-- ── 3. calculate_late_fee RPC ────────────────────────────────
-- Returns the late fee amount (LKR) for a booking.
-- Rates: small=200, regular=300, large=400 per hour (ceiling).
-- Returns 0 if not overdue or no bags.

DROP FUNCTION IF EXISTS calculate_late_fee(uuid);

CREATE OR REPLACE FUNCTION calculate_late_fee(p_booking_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
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

  IF v_now <= v_end_time THEN
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

GRANT EXECUTE ON FUNCTION calculate_late_fee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_late_fee(uuid) TO service_role;

-- ── 4. seal-proofs Storage bucket ────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('seal-proofs', 'seal-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Drop policies first so we can safely recreate them
DROP POLICY IF EXISTS "Staff can upload seal proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view seal proofs for their bookings" ON storage.objects;

CREATE POLICY "Staff can upload seal proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'seal-proofs'
  AND EXISTS (
    SELECT 1 FROM hub_staff
    WHERE user_id = auth.uid()
    AND active = true
  )
);

CREATE POLICY "Users can view seal proofs for their bookings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'seal-proofs'
);

-- ── 5. hub_staff RLS policies ─────────────────────────────────
DROP POLICY IF EXISTS "Staff can read own row" ON hub_staff;

CREATE POLICY "Staff can read own row"
ON hub_staff FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ── 6. payment_type enum — ensure extension exists ───────────
ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'extension';
