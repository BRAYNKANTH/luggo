-- LUGGO TEST ACCOUNTS SEED
-- ============================================================
-- Instructions: Run this in your Supabase SQL Editor.
-- 1. Master Admin (admin@luggo.lk / password123)
-- 2. Hub Staff (staff@luggo.lk / password123) -> Linked to BIA
-- ============================================================

DO $$
DECLARE
  admin_id UUID := uuid_generate_v4();
  staff_id UUID := uuid_generate_v4();
  bia_hub_id UUID;
BEGIN
  -- 1. Get BIA Hub ID (Make sure Hubs are seeded first!)
  SELECT id INTO bia_hub_id FROM public.hubs WHERE alias = 'BIA';

  -- 2. Create Admin in auth.users if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@luggo.lk') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES (
        admin_id,
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
        ''
    );
  END IF;

  -- 3. Create Staff in auth.users if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'staff@luggo.lk') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES (
        staff_id,
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
        ''
    );
  END IF;

  -- 4. Update Roles in public.users 
  -- (Trigger 'on_auth_user_created' sets them to 'customer' by default)
  UPDATE public.users SET role = 'master_admin' WHERE email = 'admin@luggo.lk';
  UPDATE public.users SET role = 'hub_staff' WHERE email = 'staff@luggo.lk';

  -- 5. Link Staff to BIA Hub
  IF bia_hub_id IS NOT NULL THEN
    INSERT INTO public.hub_staff (user_id, hub_id)
    SELECT id, bia_hub_id FROM public.users WHERE email = 'staff@luggo.lk'
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
