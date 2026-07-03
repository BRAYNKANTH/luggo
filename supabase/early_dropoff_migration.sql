-- ============================================================
-- Migration: Support Early Drop-Off Policy
-- 
-- Run this in Supabase → SQL Editor to add the required fields
-- ============================================================

-- ── 1. Add early_checkin value to payment_type enum ──
-- Note: In Postgres, ALTER TYPE ADD VALUE cannot run inside a transaction block.
-- If this fails, run it separately first.
ALTER TYPE public.payment_type ADD VALUE IF NOT EXISTS 'early_checkin';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'early_checkin_pending_payment';

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
