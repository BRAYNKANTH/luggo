-- ============================================================
-- Luggo Security & Bugfix Migration
-- Run this in Supabase -> SQL Editor (after fix_frictions.sql)
-- ============================================================
-- Fixes:
--   1. CRITICAL: "users: own row" had no WITH CHECK, so any authenticated
--      customer could UPDATE their own role column directly via PostgREST
--      (privilege escalation to admin).
--   2. CRITICAL: "bookings: own bookings" had no WITH CHECK, so any
--      authenticated customer could UPDATE their own booking's total_price,
--      end_time, status, etc. directly via PostgREST, bypassing the
--      payment/check-in workflow entirely.
--   3. sticker_assignments / seal_proofs staff INSERT policies didn't check
--      the staff member belongs to the booking's hub.
--   4. "complaints: own" was FOR ALL, letting customers set their own
--      complaint status (e.g. to 'resolved') without staff review.
--   5. booking_bags.status / seal_status allowed NULL, which silently
--      bypasses check_stored_bag_has_tag / check_stored_sealed_bag_has_seal
--      (NULL satisfies a CHECK constraint).
--   6. payments.gateway_ref had no uniqueness constraint, so a retried
--      PayHere IPN could in principle double-record the same transaction.
--   7. bookings.slot_number had no uniqueness constraint, so two concurrent
--      walk-in registrations at the same hub could be assigned the same slot.
-- ============================================================

-- ── 1. users: remove blanket self-update, restrict to safe columns ────────
DROP POLICY IF EXISTS "users: own row" ON public.users;
DROP POLICY IF EXISTS "users: select own row" ON public.users;
DROP POLICY IF EXISTS "users: update own row" ON public.users;

CREATE POLICY "users: select own row" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users: update own row" ON public.users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (name, phone, nic_passport) ON public.users TO authenticated;

-- ── 2. bookings: remove blanket self-update, restrict to `status` only ────
DROP POLICY IF EXISTS "bookings: own bookings" ON public.bookings;
DROP POLICY IF EXISTS "bookings: select own bookings" ON public.bookings;
DROP POLICY IF EXISTS "bookings: insert own bookings" ON public.bookings;
DROP POLICY IF EXISTS "bookings: update own bookings" ON public.bookings;

CREATE POLICY "bookings: select own bookings" ON public.bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "bookings: insert own bookings" ON public.bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "bookings: update own bookings" ON public.bookings
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND status IN ('cancelled', 'active_storage', 'disputed', 'pickup_requested')
  );

REVOKE UPDATE ON public.bookings FROM authenticated;
GRANT UPDATE (status) ON public.bookings TO authenticated;

-- ── 3. sticker_assignments / seal_proofs: hub-scope staff inserts ─────────
DROP POLICY IF EXISTS "sticker_assignments: staff insert" ON public.sticker_assignments;
CREATE POLICY "sticker_assignments: staff insert" ON public.sticker_assignments
  FOR INSERT WITH CHECK (
    assigned_by_staff_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.booking_bags bb
      JOIN public.bookings b ON b.id = bb.booking_id
      WHERE bb.id = booking_bag_id AND public.is_staff_at_hub(b.hub_id)
    )
  );

DROP POLICY IF EXISTS "seal_proofs: staff insert" ON public.seal_proofs;
CREATE POLICY "seal_proofs: staff insert" ON public.seal_proofs
  FOR INSERT WITH CHECK (
    uploaded_by_staff_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.is_staff_at_hub(b.hub_id)
    )
  );

-- ── 4. complaints: customers may file/view, not change status ─────────────
DROP POLICY IF EXISTS "complaints: own" ON public.complaints;
DROP POLICY IF EXISTS "complaints: select own" ON public.complaints;
DROP POLICY IF EXISTS "complaints: insert own" ON public.complaints;

CREATE POLICY "complaints: select own" ON public.complaints
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "complaints: insert own" ON public.complaints
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── 5. booking_bags: close the NULL-bypasses-CHECK gap ────────────────────
UPDATE public.booking_bags SET status = 'registered' WHERE status IS NULL;
UPDATE public.booking_bags SET seal_status = 'sealed' WHERE seal_status IS NULL;
ALTER TABLE public.booking_bags ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.booking_bags ALTER COLUMN seal_status SET NOT NULL;

-- ── 6. payments: uniqueness on real (numeric) gateway refs only ───────────
DROP INDEX IF EXISTS idx_payments_gateway_ref_unique;
CREATE UNIQUE INDEX idx_payments_gateway_ref_unique ON public.payments(gateway_ref)
  WHERE gateway_ref ~ '^[0-9]+$';

-- ── 7. bookings: prevent two active bookings sharing the same hub slot ────
-- NOTE: if this fails with a uniqueness violation, some hub already has two
-- active bookings sharing a slot_number (a symptom of the race this fixes) —
-- reassign one of them manually before re-running this statement.
DROP INDEX IF EXISTS idx_bookings_slot_unique;
CREATE UNIQUE INDEX idx_bookings_slot_unique ON public.bookings(hub_id, slot_number)
  WHERE slot_number IS NOT NULL AND status IN (
    'arrived', 'identity_verified', 'sealing_in_progress',
    'sealed_waiting_user_confirmation', 'active_storage',
    'pickup_requested', 'overstayed', 'late_fee_pending'
  );
