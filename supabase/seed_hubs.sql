-- ============================================================
-- Luggo — Hub Setup & Seed
-- Run this in your Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- Step 1: Add missing columns if they don't exist
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Step 2: Insert 10 sample hubs
INSERT INTO hubs (name, alias, location, address, capacity, open_time, close_time, active, image_url, latitude, longitude)
VALUES

  (
    'Colombo Fort Station Hub',
    'FORT',
    'Colombo Fort',
    'Colombo Fort Railway Station, Station Rd, Colombo 01',
    40,
    '05:00', '23:00',
    true,
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80',
    6.9344, 79.8428
  ),

  (
    'BIA Airport Hub',
    'BIA',
    'Katunayake',
    'Bandaranaike International Airport, Katunayake 11450',
    60,
    '00:00', '23:59',
    true,
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80',
    7.1803, 79.8841
  ),

  (
    'One Galle Face Hub',
    'OGF',
    'Colombo 03',
    'One Galle Face Mall, Galle Rd, Colombo 03',
    35,
    '09:00', '22:00',
    true,
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80',
    6.9102, 79.8477
  ),

  (
    'Kandy City Centre Hub',
    'KANDY',
    'Kandy',
    'Kandy City Centre Mall, Dalada Veediya, Kandy 20000',
    30,
    '08:30', '21:30',
    true,
    'https://images.unsplash.com/photo-1569384370146-66a8f9734e1e?w=800&q=80',
    7.2906, 80.6337
  ),

  (
    'Galle Fort Hub',
    'GAL',
    'Galle',
    'Near Clock Tower, Church St, Galle Fort, Galle 80000',
    20,
    '07:00', '22:00',
    true,
    'https://images.unsplash.com/photo-1588598198321-9735fd5f2aad?w=800&q=80',
    6.0267, 80.2170
  ),

  (
    'Mount Lavinia Beach Hub',
    'MLV',
    'Mount Lavinia',
    'Hotel Rd, Mount Lavinia, Colombo 10',
    25,
    '07:00', '21:00',
    true,
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    6.8390, 79.8644
  ),

  (
    'Negombo Beach Hub',
    'NEG',
    'Negombo',
    'Lewis Place, Negombo 11500',
    20,
    '07:00', '21:00',
    true,
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    7.2094, 79.8358
  ),

  (
    'Ella Highlands Hub',
    'ELLA',
    'Ella',
    'Main Street, Ella, Badulla District 90090',
    15,
    '06:00', '20:00',
    true,
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    6.8760, 81.0463
  ),

  (
    'Colombo City Centre Hub',
    'CCC',
    'Colombo 02',
    'Colombo City Centre, Sir Chittampalam A Gardiner Mawatha, Colombo 02',
    45,
    '09:00', '22:00',
    true,
    'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80',
    6.9251, 79.8579
  ),

  (
    'Trincomalee Harbour Hub',
    'TRINCO',
    'Trincomalee',
    'Inner Harbour Rd, Trincomalee 31000',
    18,
    '06:30', '20:00',
    true,
    'https://images.unsplash.com/photo-1472745942893-4b9f730c7668?w=800&q=80',
    8.5874, 81.2152
  )

ON CONFLICT DO NOTHING;

-- Verify
SELECT id, name, alias, active, image_url IS NOT NULL AS has_image FROM hubs ORDER BY name;
