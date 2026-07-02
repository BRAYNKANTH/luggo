-- ============================================================
-- Luggo Reusable Bag Tags & MVP Operational Flow Migration
-- Run this in Supabase -> SQL Editor
-- ============================================================

-- ── 1. Create bag tag status enum ────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bag_tag_status') THEN
    CREATE TYPE public.bag_tag_status AS ENUM ('available', 'assigned', 'in_storage', 'released', 'lost', 'damaged', 'retired');
  END IF;
END
$$;

-- ── 2. Create bag_tags table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bag_tags (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_code            text NOT NULL UNIQUE,
  qr_code_value       text NOT NULL UNIQUE,
  hub_id              uuid NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  status              bag_tag_status NOT NULL DEFAULT 'available',
  current_booking_id  uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bag_tags_tag_code ON public.bag_tags(tag_code);
CREATE INDEX IF NOT EXISTS idx_bag_tags_qr_code ON public.bag_tags(qr_code_value);
CREATE INDEX IF NOT EXISTS idx_bag_tags_hub ON public.bag_tags(hub_id);
CREATE INDEX IF NOT EXISTS idx_bag_tags_status ON public.bag_tags(status);

-- ── 3. Create incident_reports table ──────────────────────────
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                 uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  bag_id                     uuid REFERENCES public.booking_bags(id) ON DELETE SET NULL,
  incident_type              text NOT NULL,
  description                text NOT NULL,
  status                     text NOT NULL DEFAULT 'open',
  reported_by_staff_id       uuid NOT NULL REFERENCES public.users(id),
  resolved_by_supervisor_id  uuid REFERENCES public.users(id),
  resolution_note            text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  resolved_at                timestamptz
);

CREATE INDEX IF NOT EXISTS idx_incident_reports_booking ON public.incident_reports(booking_id);

-- Check Constraints for Incident Reports
ALTER TABLE public.incident_reports DROP CONSTRAINT IF EXISTS check_incident_reports_status;
ALTER TABLE public.incident_reports ADD CONSTRAINT check_incident_reports_status 
  CHECK (status IN ('open', 'resolved'));

ALTER TABLE public.incident_reports DROP CONSTRAINT IF EXISTS check_incident_reports_type;
ALTER TABLE public.incident_reports ADD CONSTRAINT check_incident_reports_type 
  CHECK (incident_type IN (
    'seal_missing',
    'seal_mismatch',
    'seal_broken',
    'bag_not_found',
    'damage_reported',
    'wrong_bag_retrieved',
    'payment_dispute',
    'customer_dispute',
    'manual_release'
  ));

-- ── 4. Alter booking_bags table ───────────────────────────────
ALTER TABLE public.booking_bags 
  ADD COLUMN IF NOT EXISTS seal_number text,
  ADD COLUMN IF NOT EXISTS bag_tag_id uuid REFERENCES public.bag_tags(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seal_status text DEFAULT 'sealed',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'registered';

-- Check Constraints on Bag Status and Seal Status
ALTER TABLE public.booking_bags DROP CONSTRAINT IF EXISTS check_booking_bags_status;
ALTER TABLE public.booking_bags ADD CONSTRAINT check_booking_bags_status 
  CHECK (status IN ('registered', 'stored', 'released', 'exception_hold'));

ALTER TABLE public.booking_bags DROP CONSTRAINT IF EXISTS check_seal_status;
ALTER TABLE public.booking_bags ADD CONSTRAINT check_seal_status 
  CHECK (seal_status IN ('sealed', 'seal_not_applicable'));

-- Check Constraint: Stored bag must have bag_tag_id
ALTER TABLE public.booking_bags DROP CONSTRAINT IF EXISTS check_stored_bag_has_tag;
ALTER TABLE public.booking_bags ADD CONSTRAINT check_stored_bag_has_tag 
  CHECK (
    (status = 'stored' AND bag_tag_id IS NOT NULL) OR 
    (status <> 'stored')
  );

-- Check Constraint: Stored sealed bag must have seal_number
ALTER TABLE public.booking_bags DROP CONSTRAINT IF EXISTS check_stored_sealed_bag_has_seal;
ALTER TABLE public.booking_bags ADD CONSTRAINT check_stored_sealed_bag_has_seal 
  CHECK (
    (status = 'stored' AND seal_status = 'sealed' AND seal_number IS NOT NULL) OR 
    (status <> 'stored' OR seal_status = 'seal_not_applicable')
  );

-- ── 5. Duplicate Protection Indexes ───────────────────────────
-- Active bag tag cannot be assigned to multiple active bags (not status='released')
DROP INDEX IF EXISTS idx_booking_bags_tag_active;
CREATE UNIQUE INDEX idx_booking_bags_tag_active 
  ON public.booking_bags (bag_tag_id) 
  WHERE (status <> 'released' AND bag_tag_id IS NOT NULL);

-- Active seal number cannot be assigned to multiple active bags (not status='released')
DROP INDEX IF EXISTS idx_booking_bags_seal_active;
CREATE UNIQUE INDEX idx_booking_bags_seal_active 
  ON public.booking_bags (seal_number) 
  WHERE (status <> 'released' AND seal_number IS NOT NULL);

-- ── 6. Walk-in fields in bookings ─────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS walk_in_name text,
  ADD COLUMN IF NOT EXISTS walk_in_phone text,
  ADD COLUMN IF NOT EXISTS walk_in_nic_passport_ref text;

-- ── 7. update_updated_at function & trigger ──────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_update_bag_tags_updated_at ON public.bag_tags;
CREATE TRIGGER trg_update_bag_tags_updated_at
  BEFORE UPDATE ON public.bag_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ── 8. Add values to booking_status enum ─────────────────────
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'identity_verified';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'late_fee_pending';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'ready_for_release';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'exception_hold';

-- ── 9. Enable RLS and Configure Policies ──────────────────────
ALTER TABLE public.bag_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- bag_tags policies
DROP POLICY IF EXISTS "bag_tags: admins full access" ON public.bag_tags;
CREATE POLICY "bag_tags: admins full access" ON public.bag_tags
  FOR ALL TO authenticated 
  USING ((select role from public.users where id = auth.uid()) in ('support_admin', 'ops_admin', 'master_admin'))
  WITH CHECK ((select role from public.users where id = auth.uid()) in ('support_admin', 'ops_admin', 'master_admin'));

DROP POLICY IF EXISTS "bag_tags: staff hub access" ON public.bag_tags;
CREATE POLICY "bag_tags: staff hub access" ON public.bag_tags
  FOR ALL TO authenticated 
  USING (
    exists (
      select 1 from public.hub_staff
      where user_id = auth.uid()
        and hub_id = public.bag_tags.hub_id
        and active = true
    )
  )
  WITH CHECK (
    exists (
      select 1 from public.hub_staff
      where user_id = auth.uid()
        and hub_id = public.bag_tags.hub_id
        and active = true
    )
  );

-- incident_reports policies
DROP POLICY IF EXISTS "incident_reports: admins full access" ON public.incident_reports;
CREATE POLICY "incident_reports: admins full access" ON public.incident_reports
  FOR ALL TO authenticated 
  USING ((select role from public.users where id = auth.uid()) in ('support_admin', 'ops_admin', 'master_admin'))
  WITH CHECK ((select role from public.users where id = auth.uid()) in ('support_admin', 'ops_admin', 'master_admin'));

DROP POLICY IF EXISTS "incident_reports: staff select" ON public.incident_reports;
CREATE POLICY "incident_reports: staff select" ON public.incident_reports
  FOR SELECT TO authenticated 
  USING (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and public.is_staff_at_hub(b.hub_id)
    )
  );

DROP POLICY IF EXISTS "incident_reports: staff insert" ON public.incident_reports;
CREATE POLICY "incident_reports: staff insert" ON public.incident_reports
  FOR INSERT TO authenticated 
  WITH CHECK (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and public.is_staff_at_hub(b.hub_id)
    )
    and reported_by_staff_id = auth.uid()
  );
