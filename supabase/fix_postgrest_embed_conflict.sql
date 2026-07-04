-- =========================================================================
-- Migration: Fix PostgREST Embedding Conflict (Safe & Idempotent)
-- 
-- Run this in Supabase → SQL Editor to resolve the PGRST201 error
-- where queries joining 'users' on 'bookings' fail due to multiple relationships.
-- =========================================================================

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_early_checkin_handled_by_staff_id_fkey,
  DROP CONSTRAINT IF EXISTS bookings_pickup_override_supervisor_id_fkey;
