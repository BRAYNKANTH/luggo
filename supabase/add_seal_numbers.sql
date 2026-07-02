-- ============================================================
-- Add seal_number column to booking_bags table
-- Run this in Supabase → SQL Editor
-- ============================================================

ALTER TABLE public.booking_bags ADD COLUMN IF NOT EXISTS seal_number text;
