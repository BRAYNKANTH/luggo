-- ============================================================
-- Migration: Support Early Drop-Off Policy (Safe & Idempotent)
-- 
-- Run this in Supabase → SQL Editor to add the required fields
-- ============================================================

-- ── 1. Add enum values safely using DO blocks ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'payment_type' AND e.enumlabel = 'early_checkin'
  ) THEN
    ALTER TYPE public.payment_type ADD VALUE 'early_checkin';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'booking_status' AND e.enumlabel = 'early_checkin_pending_payment'
  ) THEN
    ALTER TYPE public.booking_status ADD VALUE 'early_checkin_pending_payment';
  END IF;
END
$$;

-- ── 2. Alter bookings table ──
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS original_start_time timestamptz,
  ADD COLUMN IF NOT EXISTS original_end_time timestamptz,
  ADD COLUMN IF NOT EXISTS current_start_time timestamptz,
  ADD COLUMN IF NOT EXISTS current_end_time timestamptz,
  ADD COLUMN IF NOT EXISTS actual_check_in_time timestamptz,
  ADD COLUMN IF NOT EXISTS early_checkin_minutes integer,
  ADD COLUMN IF NOT EXISTS early_checkin_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS early_checkin_extra_hours integer,
  ADD COLUMN IF NOT EXISTS early_checkin_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS early_checkin_payment_status text,
  ADD COLUMN IF NOT EXISTS early_checkin_payment_id uuid,
  ADD COLUMN IF NOT EXISTS early_checkin_handled_by_staff_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS early_checkin_handled_at timestamptz;

-- ── 3. Alter payments table ──
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS collected_by_staff_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ── 4. Backfill existing bookings ──
UPDATE public.bookings
SET
  original_start_time = COALESCE(original_start_time, start_time),
  original_end_time = COALESCE(original_end_time, end_time),
  current_start_time = COALESCE(current_start_time, start_time),
  current_end_time = COALESCE(current_end_time, end_time)
WHERE original_start_time IS NULL OR original_end_time IS NULL;

-- ── 5. Create helper indexes for query optimization ──
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON public.payments(type);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_early_checkin_payment_id ON public.bookings(early_checkin_payment_id);
