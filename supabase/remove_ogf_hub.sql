-- ============================================================
-- Luggo — Remove the One Galle Face (OGF) hub
-- Run in the Supabase SQL Editor (safe to run multiple times).
-- bookings.hub_id is ON DELETE RESTRICT, so a hub that already has
-- bookings is deactivated (hidden everywhere) instead of deleted.
-- ============================================================

DELETE FROM hubs h
WHERE h.alias = 'OGF'
  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.hub_id = h.id);

UPDATE hubs
SET active = false
WHERE alias = 'OGF';
