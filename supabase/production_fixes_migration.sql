-- ============================================================
-- Migration: Production Readiness Hardening Fixes
-- Run this in Supabase → SQL Editor
-- ============================================================

-- ── 1. Alter bookings table with Terms and Pickup verification ──
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS privacy_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_otp text,
  ADD COLUMN IF NOT EXISTS pickup_otp_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_otp_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_override_supervisor_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS pickup_override_reason text,
  ADD COLUMN IF NOT EXISTS pickup_override_at timestamptz;

-- ── 2. Create booking_bag_evidence table ──
CREATE TABLE IF NOT EXISTS public.booking_bag_evidence (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  bag_id                uuid REFERENCES public.booking_bags(id) ON DELETE SET NULL,
  evidence_type         text NOT NULL CHECK (evidence_type IN ('full_bag_photo', 'seal_photo', 'damage_photo', 'tag_photo', 'pickup_photo', 'incident_photo')),
  file_url              text NOT NULL,
  seal_number           text,
  uploaded_by_staff_id  uuid NOT NULL REFERENCES public.users(id),
  uploaded_at           timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_bag_evidence_booking ON public.booking_bag_evidence(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_bag_evidence_bag ON public.booking_bag_evidence(bag_id);

-- Enable RLS
ALTER TABLE public.booking_bag_evidence ENABLE ROW LEVEL SECURITY;

-- ── 3. booking_bag_evidence RLS Policies ──
DROP POLICY IF EXISTS "booking_bag_evidence: admins full access" ON public.booking_bag_evidence;
CREATE POLICY "booking_bag_evidence: admins full access" ON public.booking_bag_evidence
  FOR ALL TO authenticated
  USING ((select role from public.users where id = auth.uid()) in ('support_admin', 'ops_admin', 'master_admin'))
  WITH CHECK ((select role from public.users where id = auth.uid()) in ('support_admin', 'ops_admin', 'master_admin'));

DROP POLICY IF EXISTS "booking_bag_evidence: staff select" ON public.booking_bag_evidence;
CREATE POLICY "booking_bag_evidence: staff select" ON public.booking_bag_evidence
  FOR SELECT TO authenticated
  USING (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and public.is_staff_at_hub(b.hub_id)
    )
  );

DROP POLICY IF EXISTS "booking_bag_evidence: staff insert" ON public.booking_bag_evidence;
CREATE POLICY "booking_bag_evidence: staff insert" ON public.booking_bag_evidence
  FOR INSERT TO authenticated
  WITH CHECK (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and public.is_staff_at_hub(b.hub_id)
    )
    and uploaded_by_staff_id = auth.uid()
  );

DROP POLICY IF EXISTS "booking_bag_evidence: owners select" ON public.booking_bag_evidence;
CREATE POLICY "booking_bag_evidence: owners select" ON public.booking_bag_evidence
  FOR SELECT TO authenticated
  USING (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.user_id = auth.uid()
    )
  );

-- ── 4. Harden customer profiles select policy for staff ──
DROP POLICY IF EXISTS "users: staff see own hub customers" ON public.users;
CREATE POLICY "users: staff see own hub customers" ON public.users
  FOR SELECT TO authenticated
  USING (
    exists (
      select 1 from public.hub_staff hs
      join public.bookings b on b.hub_id = hs.hub_id
      where hs.user_id = auth.uid()
        and hs.active = true
        and b.user_id = public.users.id
    )
  );

-- ── 5. Add staff SELECT policy for payments ──
DROP POLICY IF EXISTS "payments: staff see own hub payments" ON public.payments;
CREATE POLICY "payments: staff see own hub payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and public.is_staff_at_hub(b.hub_id)
    )
  );

-- ── 6. Migrate existing seal_proofs records to booking_bag_evidence ──
INSERT INTO public.booking_bag_evidence (booking_id, evidence_type, file_url, uploaded_by_staff_id, uploaded_at)
SELECT booking_id, 'seal_photo', photo_url, uploaded_by_staff_id, uploaded_at
FROM public.seal_proofs
ON CONFLICT DO NOTHING;
