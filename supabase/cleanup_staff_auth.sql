-- Clean up broken auth user records left by the failed SQL seed
-- Run this FIRST, then hit /api/debug/seed-staff again

DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('staff@luggo.lk', 'staff2@luggo.lk')
);

DELETE FROM auth.sessions
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('staff@luggo.lk', 'staff2@luggo.lk')
);






DELETE FROM public.hub_staff
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('staff@luggo.lk', 'staff2@luggo.lk')
);

DELETE FROM public.users
WHERE email IN ('staff@luggo.lk', 'staff2@luggo.lk');

DELETE FROM auth.users
WHERE email IN ('staff@luggo.lk', 'staff2@luggo.lk');
