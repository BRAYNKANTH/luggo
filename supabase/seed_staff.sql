-- ============================================================
-- Luggo — Test Staff Credentials Seed
-- Run this in Supabase → SQL Editor
-- Creates 2 test staff accounts (one per hub) with known passwords.
-- ============================================================

-- Ensure unique constraint exists on hub_staff(user_id, hub_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hub_staff_user_hub_unique'
  ) THEN
    ALTER TABLE hub_staff ADD CONSTRAINT hub_staff_user_hub_unique UNIQUE (user_id, hub_id);
  END IF;
END $$;

DO $$
DECLARE
  v_user1_id uuid;
  v_user2_id uuid;
  v_hub1_id  uuid;
  v_hub2_id  uuid;
BEGIN

  -- ── Get hub IDs ───────────────────────────────────────────
  SELECT id INTO v_hub1_id FROM hubs WHERE alias = 'FORT' LIMIT 1;
  SELECT id INTO v_hub2_id FROM hubs WHERE alias = 'BIA'  LIMIT 1;

  -- Fall back to first two active hubs if aliases differ
  IF v_hub1_id IS NULL THEN
    SELECT id INTO v_hub1_id FROM hubs WHERE active = true ORDER BY name LIMIT 1;
  END IF;
  IF v_hub2_id IS NULL THEN
    SELECT id INTO v_hub2_id FROM hubs WHERE active = true ORDER BY name LIMIT 1 OFFSET 1;
  END IF;

  -- ── Staff 1: staff@luggo.lk / Staff1234! ─────────────────
  -- Check if auth user already exists
  SELECT id INTO v_user1_id FROM auth.users WHERE email = 'staff@luggo.lk';

  IF v_user1_id IS NULL THEN
    v_user1_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user1_id,
      'authenticated',
      'authenticated',
      'staff@luggo.lk',
      crypt('Staff1234!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Kamal Perera"}',
      false, '', ''
    );
  END IF;

  -- Upsert public.users row
  INSERT INTO users (id, name, email, phone, role)
  VALUES (v_user1_id, 'Kamal Perera', 'staff@luggo.lk', '+94771000001', 'hub_staff')
  ON CONFLICT (id) DO UPDATE SET role = 'hub_staff', name = 'Kamal Perera';

  -- Upsert hub_staff row
  INSERT INTO hub_staff (user_id, hub_id, active)
  VALUES (v_user1_id, v_hub1_id, true)
  ON CONFLICT (user_id, hub_id) DO UPDATE SET active = true;

  -- ── Staff 2: staff2@luggo.lk / Staff1234! ────────────────
  SELECT id INTO v_user2_id FROM auth.users WHERE email = 'staff2@luggo.lk';

  IF v_user2_id IS NULL THEN
    v_user2_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user2_id,
      'authenticated',
      'authenticated',
      'staff2@luggo.lk',
      crypt('Staff1234!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Nimal Fernando"}',
      false, '', ''
    );
  END IF;

  INSERT INTO users (id, name, email, phone, role)
  VALUES (v_user2_id, 'Nimal Fernando', 'staff2@luggo.lk', '+94771000002', 'hub_staff')
  ON CONFLICT (id) DO UPDATE SET role = 'hub_staff', name = 'Nimal Fernando';

  INSERT INTO hub_staff (user_id, hub_id, active)
  VALUES (v_user2_id, v_hub2_id, true)
  ON CONFLICT (user_id, hub_id) DO UPDATE SET active = true;

  RAISE NOTICE 'Staff seeded successfully.';
  RAISE NOTICE 'Staff 1: staff@luggo.lk  → hub %', v_hub1_id;
  RAISE NOTICE 'Staff 2: staff2@luggo.lk → hub %', v_hub2_id;

END $$;
