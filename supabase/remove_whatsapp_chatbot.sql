-- =============================================================
-- LUGGO — Remove WhatsApp Chatbot Feature
-- Run this in the Supabase SQL editor to clean up the
-- whatsapp_sessions table introduced by whatsapp_chatbot_migration.sql
-- (that migration file has been removed from the repo).
-- =============================================================

drop table if exists public.whatsapp_sessions;
