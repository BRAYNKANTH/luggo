-- LUGGO CLEAN RE-SEED (Run this if login fails)
-- ============================================================
-- ⚠️ WARNING: This will delete existing admin@luggo.lk and staff@luggo.lk
-- to ensure they are re-created with the correct password.
-- ============================================================

DO $$
DECLARE
  new_admin_id UUID := uuid_generate_v4();
  new_staff_id UUID := uuid_generate_v4();
  bia_hub_id UUID;
BEGIN
  -- 1. Remove any legacy test accounts to ensure a clean state
  DELETE FROM auth.users WHERE email IN ('admin@luggo.lk', 'staff@luggo.lk');
  
  -- 2. Get BIA Hub ID
  SELECT id INTO bia_hub_id FROM public.hubs WHERE alias = 'BIA';

  -- 3. Create Admin in auth.users
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    role, confirmation_token, email_change, email_change_token_new, recovery_token,
    instance_id -- Some Supabase versions require this
  )
  VALUES (
      new_admin_id,
      'admin@luggo.lk',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Master Admin"}',
      now(),
      now(),
      'authenticated',
      '',
      '',
      '',
      '',
      '00000000-0000-0000-0000-000000000000'
  );

  -- 4. Create Staff in auth.users
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    role, confirmation_token, email_change, email_change_token_new, recovery_token,
    instance_id
  )
  VALUES (
      new_staff_id,
      'staff@luggo.lk',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Hub Staff"}',
      now(),
      now(),
      'authenticated',
      '',
      '',
      '',
      '',
      '00000000-0000-0000-0000-000000000000'
  );

  -- 5. Force update roles in public.users 
  -- (Trigger should run, but we wait or manually patch)
  PERFORM pg_sleep(0.1); -- Tiny pause for trigger
  UPDATE public.users SET role = 'master_admin', name = 'Master Admin' WHERE email = 'admin@luggo.lk';
  UPDATE public.users SET role = 'hub_staff', name = 'Hub Staff' WHERE email = 'staff@luggo.lk';

  -- 6. Link Staff to BIA Hub
  IF bia_hub_id IS NOT NULL THEN
    INSERT INTO public.hub_staff (user_id, hub_id)
    SELECT id, bia_hub_id FROM public.users WHERE email = 'staff@luggo.lk'
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE '✅ Seeding complete. Users admin@luggo.lk and staff@luggo.lk re-created.';
END $$;
