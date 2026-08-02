-- =============================================================
-- LUGGO — Complete Supabase Schema
-- Run this in the Supabase SQL editor (project > SQL editor)
-- =============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================
-- ENUMS
-- =============================================================

create type user_role as enum (
  'customer',
  'hub_staff',
  'support_admin',
  'ops_admin',
  'master_admin'
);

create type bag_type as enum ('small', 'regular', 'large');

create type booking_status as enum (
  'draft',
  'pending_payment',
  'confirmed',
  'early_checkin_pending_payment',
  'arrived',
  'identity_verified',
  'sealing_in_progress',
  'sealed_waiting_user_confirmation',
  'active_storage',
  'pickup_requested',
  'completed',
  'cancelled',
  'expired',
  'overstayed',
  'late_fee_pending',
  'ready_for_release',
  'disputed',
  'exception_hold'
);

create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create type payment_type as enum ('booking', 'late_fee', 'extension', 'early_checkin');

create type refund_status as enum ('pending', 'approved', 'rejected', 'processed');

create type complaint_status as enum ('open', 'in_review', 'resolved', 'closed');

create type notification_type as enum (
  'booking_confirmed',
  'seal_ready',
  'pickup_reminder',
  'late_fee',
  'complaint_update',
  'general'
);

-- =============================================================
-- USERS
-- Extends Supabase auth.users — id matches auth.users.id
-- =============================================================

create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  email        text not null unique,
  phone        text,
  nic_passport text,
  role         user_role not null default 'customer',
  created_at   timestamptz not null default now()
);

comment on table public.users is 'Application user profiles, linked to Supabase auth';

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'customer'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- HUBS
-- =============================================================

create table public.hubs (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  alias      text not null unique,             -- e.g. AUC, CMB, GAL
  location   text not null,                   -- city or area
  address    text not null,
  capacity   integer not null default 50,
  open_time  time not null default '06:00',
  close_time time not null default '22:00',
  active     boolean not null default true,
  image_url  text,
  latitude   numeric(10,7),
  longitude  numeric(10,7),
  created_at timestamptz not null default now(),

  constraint alias_format check (alias ~ '^[A-Z]{2,6}$')
);

comment on column public.hubs.alias is 'Short uppercase code used as sticker prefix (e.g. AUC)';

-- =============================================================
-- HUB BAG RATES
-- Per-hub, per-bag-type pricing. Every hub should have exactly 3 rows
-- (one per bag_type). Managed from /admin/pricing. Mirrors the shape of
-- BagRates in src/lib/utils/pricing.ts.
-- =============================================================

create table public.hub_bag_rates (
  hub_id      uuid not null references public.hubs(id) on delete cascade,
  bag_type    bag_type not null,
  hourly_rate numeric not null,
  daily_cap   numeric not null,
  updated_at  timestamptz not null default now(),

  primary key (hub_id, bag_type),
  constraint hourly_rate_positive check (hourly_rate > 0),
  constraint daily_cap_positive check (daily_cap > 0)
);

create or replace function public.touch_hub_bag_rates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_hub_bag_rates_updated_at
  before update on public.hub_bag_rates
  for each row
  execute function public.touch_hub_bag_rates_updated_at();

-- =============================================================
-- HUB STAFF
-- =============================================================

create table public.hub_staff (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  hub_id     uuid not null references public.hubs(id) on delete cascade,
  active     boolean not null default true,
  created_at timestamptz not null default now(),

  unique(user_id, hub_id)
);

-- =============================================================
-- BOOKINGS
-- =============================================================

create table public.bookings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete restrict,
  hub_id      uuid not null references public.hubs(id) on delete restrict,
  status      booking_status not null default 'draft',
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  total_price integer not null default 0,      -- LKR in whole rupees
  qr_code     text not null unique default encode(gen_random_bytes(16), 'hex'),
  slot_number integer,
  created_at  timestamptz not null default now(),

  constraint end_after_start check (end_time > start_time),
  constraint price_non_negative check (total_price >= 0)
);

create index idx_bookings_user_id   on public.bookings(user_id);
create index idx_bookings_hub_id    on public.bookings(hub_id);
create index idx_bookings_status    on public.bookings(status);
create index idx_bookings_qr_code   on public.bookings(qr_code);
create index idx_bookings_end_time  on public.bookings(end_time);

-- =============================================================
-- BOOKING BAGS
-- =============================================================

create table public.booking_bags (
  id             uuid primary key default uuid_generate_v4(),
  booking_id     uuid not null references public.bookings(id) on delete cascade,
  bag_type       bag_type not null,
  sticker_number text,                         -- set at check-in, e.g. "001"
  hub_alias      text,                         -- copied from hub at check-in
  created_at     timestamptz not null default now(),

  -- Full sticker label = hub_alias || '-' || sticker_number (e.g. AUC-001)
  constraint sticker_unique_per_hub unique (hub_alias, sticker_number)
    deferrable initially deferred
);

create index idx_booking_bags_booking_id on public.booking_bags(booking_id);

-- =============================================================
-- STICKER BATCHES
-- Tracks which sticker number ranges belong to which hub
-- =============================================================

create table public.sticker_batches (
  id          uuid primary key default uuid_generate_v4(),
  hub_id      uuid not null references public.hubs(id) on delete cascade,
  prefix      text not null,                   -- matches hub alias
  from_number integer not null,
  to_number   integer not null,
  created_at  timestamptz not null default now(),

  constraint range_valid check (to_number >= from_number),
  constraint range_positive check (from_number > 0)
);

create index idx_sticker_batches_hub_id on public.sticker_batches(hub_id);

-- =============================================================
-- STICKER ASSIGNMENTS
-- Audit trail of every sticker physically assigned to a bag
-- =============================================================

create table public.sticker_assignments (
  id                  uuid primary key default uuid_generate_v4(),
  booking_bag_id      uuid not null references public.booking_bags(id) on delete cascade,
  sticker_number      text not null,
  assigned_by_staff_id uuid not null references public.users(id),
  assigned_at         timestamptz not null default now(),

  unique(sticker_number)   -- global uniqueness — a sticker can only be active once
);

comment on table public.sticker_assignments is
  'Immutable record of sticker-to-bag assignments. Reuse requires supervisor override (new row).';

-- =============================================================
-- SEAL PROOFS
-- Photo evidence of sealed bags uploaded by staff
-- =============================================================

create table public.seal_proofs (
  id                    uuid primary key default uuid_generate_v4(),
  booking_id            uuid not null references public.bookings(id) on delete cascade,
  photo_url             text not null,
  uploaded_by_staff_id  uuid not null references public.users(id),
  uploaded_at           timestamptz not null default now(),
  confirmed_by_user_at  timestamptz,           -- null until customer taps confirm

  unique(booking_id)   -- one seal proof per booking
);

-- =============================================================
-- PAYMENTS
-- =============================================================

create table public.payments (
  id          uuid primary key default uuid_generate_v4(),
  booking_id  uuid not null references public.bookings(id) on delete restrict,
  amount      integer not null,                -- LKR in whole rupees
  status      payment_status not null default 'pending',
  gateway_ref text,                            -- PayHere order_id / reference
  type        payment_type not null default 'booking',
  created_at  timestamptz not null default now(),

  constraint amount_positive check (amount > 0)
);

create index idx_payments_booking_id  on public.payments(booking_id);
create index idx_payments_gateway_ref on public.payments(gateway_ref);

-- Prevent two concurrently-registered bags at the same hub from being
-- assigned the same physical storage slot (see allocateSlotForBooking).
create unique index idx_bookings_slot_unique on public.bookings(hub_id, slot_number)
  where slot_number is not null and status in (
    'arrived', 'identity_verified', 'sealing_in_progress',
    'sealed_waiting_user_confirmation', 'active_storage',
    'pickup_requested', 'overstayed', 'late_fee_pending'
  );

-- Real PayHere transaction refs are numeric — enforce uniqueness on those only,
-- so a retried/duplicated IPN can't double-record the same gateway transaction.
-- (Sentinel refs like 'PAY_AT_HUB' / 'CASH_PAYMENT_BYPASS' are intentionally
-- reused across many rows and stay unconstrained.)
create unique index idx_payments_gateway_ref_unique on public.payments(gateway_ref)
  where gateway_ref ~ '^[0-9]+$';

-- =============================================================
-- REFUNDS
-- =============================================================

create table public.refunds (
  id         uuid primary key default uuid_generate_v4(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  amount     integer not null,
  reason     text not null,
  status     refund_status not null default 'pending',
  created_at timestamptz not null default now(),

  constraint refund_amount_positive check (amount > 0)
);

-- =============================================================
-- NOTIFICATIONS
-- =============================================================

create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       notification_type not null,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_read    on public.notifications(user_id, read);

-- =============================================================
-- COMPLAINTS
-- =============================================================

create table public.complaints (
  id          uuid primary key default uuid_generate_v4(),
  booking_id  uuid not null references public.bookings(id) on delete restrict,
  user_id     uuid not null references public.users(id) on delete restrict,
  description text not null,
  status      complaint_status not null default 'open',
  created_at  timestamptz not null default now()
);

create index idx_complaints_booking_id on public.complaints(booking_id);
create index idx_complaints_status     on public.complaints(status);

-- =============================================================
-- NEARBY PLACES
-- Points of interest shown on hub detail page
-- =============================================================

create table public.nearby_places (
  id           uuid primary key default uuid_generate_v4(),
  hub_id       uuid not null references public.hubs(id) on delete cascade,
  name         text not null,
  category     text not null,                  -- e.g. 'restaurant', 'atm', 'hotel'
  description  text,
  distance_km  numeric(4,2) not null,
  map_url      text,
  created_at   timestamptz not null default now()
);

create index idx_nearby_places_hub_id on public.nearby_places(hub_id);

-- =============================================================
-- AUDIT LOGS
-- Immutable log of all sensitive actions
-- =============================================================

create table public.audit_logs (
  id         uuid primary key default uuid_generate_v4(),
  actor_id   uuid not null references public.users(id),
  actor_role user_role not null,
  action     text not null,                    -- e.g. 'sticker_assigned', 'nic_corrected'
  entity     text not null,                    -- table name, e.g. 'bookings'
  entity_id  uuid not null,
  metadata   jsonb,                            -- extra context (old/new values etc.)
  created_at timestamptz not null default now()
);

create index idx_audit_logs_actor_id  on public.audit_logs(actor_id);
create index idx_audit_logs_entity    on public.audit_logs(entity, entity_id);
create index idx_audit_logs_created   on public.audit_logs(created_at desc);

-- Prevent updates or deletes on audit_logs
create or replace function public.prevent_audit_log_modification()
returns trigger language plpgsql as $$
begin
  raise exception 'Audit logs are immutable';
end;
$$;

create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function public.prevent_audit_log_modification();

-- =============================================================
-- HELPER: write audit log from any context
-- =============================================================

create or replace function public.write_audit_log(
  p_actor_id   uuid,
  p_actor_role user_role,
  p_action     text,
  p_entity     text,
  p_entity_id  uuid,
  p_metadata   jsonb default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, actor_role, action, entity, entity_id, metadata)
  values (p_actor_id, p_actor_role, p_action, p_entity, p_entity_id, p_metadata);
end;
$$;

-- =============================================================
-- HELPER: calculate late fee for a booking
-- Returns LKR amount owed (0 if not late)
-- =============================================================

-- Mirrors src/lib/utils/pricing.ts calculateBagPriceForHours — keep in sync.
-- p_hub_id selects that hub's row in hub_bag_rates; if null or the hub has no
-- row for this bag_type, falls back to the global defaults below (must match
-- DEFAULT_BAG_RATES in pricing.ts).
create or replace function public.calculate_bag_price_for_hours(p_bag_type public.bag_type, p_hours numeric, p_hub_id uuid default null)
returns numeric
language plpgsql
stable
as $$
declare
  v_days            integer;
  v_remaining_hours numeric;
  v_hourly_rate     numeric;
  v_daily_cap       numeric;
  v_remaining_cost  numeric;
begin
  if p_hours <= 0 then
    return 0;
  end if;

  v_days := floor(p_hours / 24);
  v_remaining_hours := p_hours - (v_days * 24);

  if p_hub_id is not null then
    select hourly_rate, daily_cap into v_hourly_rate, v_daily_cap
    from public.hub_bag_rates
    where hub_id = p_hub_id and bag_type = p_bag_type;
  end if;

  if v_hourly_rate is null then
    v_hourly_rate := case p_bag_type
      when 'small'   then 80
      when 'regular' then 120
      when 'large'   then 150
      else 80
    end;
  end if;

  if v_daily_cap is null then
    v_daily_cap := case p_bag_type
      when 'small'   then 600
      when 'regular' then 700
      when 'large'   then 800
      else 600
    end;
  end if;

  v_remaining_cost := least(v_remaining_hours * v_hourly_rate, v_daily_cap);
  return (v_days * v_daily_cap) + v_remaining_cost;
end;
$$;

-- Mirrors src/lib/utils/pricing.ts calculateLateFee — keep in sync.
create or replace function public.calculate_late_fee(p_booking_id uuid)
returns numeric
language plpgsql
security definer set search_path = public
as $$
declare
  v_start_time      timestamptz;
  v_end_time        timestamptz;
  v_hub_id          uuid;
  v_now             timestamptz := now();
  v_orig_hours      numeric;
  v_actual_hours    numeric;
  v_orig_price      numeric := 0;
  v_actual_price    numeric := 0;
  v_bag             record;
  v_paid            numeric := 0;
begin
  -- If waived by supervisor or settled in cash, no online fee is owed.
  if exists (
    select 1 from public.payments
    where booking_id = p_booking_id
      and type = 'late_fee'
      and status = 'paid'
      and (gateway_ref like 'WAIVED_BY_SUPERVISOR_%' or gateway_ref = 'CASH_PAYMENT_BYPASS')
  ) then
    return 0;
  end if;

  select start_time, end_time, hub_id into v_start_time, v_end_time, v_hub_id
  from public.bookings
  where id = p_booking_id;

  if v_start_time is null or v_end_time is null then
    return 0;
  end if;

  -- 15-minute grace period
  if v_now <= v_end_time + interval '15 minutes' then
    return 0;
  end if;

  v_orig_hours := ceil(extract(epoch from (v_end_time - v_start_time)) / 3600);
  v_actual_hours := v_orig_hours + (ceil(extract(epoch from (v_now - v_end_time)) / 1800) * 0.5);

  for v_bag in
    select bag_type from public.booking_bags where booking_id = p_booking_id
  loop
    v_orig_price := v_orig_price + public.calculate_bag_price_for_hours(v_bag.bag_type, v_orig_hours, v_hub_id);
    v_actual_price := v_actual_price + public.calculate_bag_price_for_hours(v_bag.bag_type, v_actual_hours, v_hub_id);
  end loop;

  -- Subtract already-paid late fees
  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where booking_id = p_booking_id
    and type = 'late_fee'
    and status = 'paid';

  return greatest(0, v_actual_price - v_orig_price - v_paid);
end;
$$;

grant execute on function public.calculate_bag_price_for_hours(public.bag_type, numeric, uuid) to authenticated, service_role;
grant execute on function public.calculate_late_fee(uuid) to authenticated, service_role;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

alter table public.users            enable row level security;
alter table public.hubs             enable row level security;
alter table public.hub_bag_rates    enable row level security;
alter table public.hub_staff        enable row level security;
alter table public.bookings         enable row level security;
alter table public.booking_bags     enable row level security;
alter table public.sticker_batches  enable row level security;
alter table public.sticker_assignments enable row level security;
alter table public.seal_proofs      enable row level security;
alter table public.payments         enable row level security;
alter table public.refunds          enable row level security;
alter table public.notifications    enable row level security;
alter table public.complaints       enable row level security;
alter table public.nearby_places    enable row level security;
alter table public.audit_logs       enable row level security;

-- ---- Helper: get current user role ----
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- ---- Helper: is current user admin? ----
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select role in ('support_admin', 'ops_admin', 'master_admin')
  from public.users where id = auth.uid();
$$;

-- ---- Helper: is current user staff at hub? ----
create or replace function public.is_staff_at_hub(p_hub_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.hub_staff
    where user_id = auth.uid()
      and hub_id = p_hub_id
      and active = true
  );
$$;

-- ----------------------------
-- users RLS
-- ----------------------------
-- Split (rather than "for all") so a compromised/forged client request can only
-- ever read or update its own row — never another user's, and via the column
-- grant below, never the `role` column (prevents client-side privilege escalation).
create policy "users: select own row" on public.users
  for select using (id = auth.uid());

create policy "users: update own row" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.users from authenticated;
grant update (name, phone, nic_passport) on public.users to authenticated;

create policy "users: admins see all" on public.users
  for select using (public.is_admin());

create policy "users: staff see own hub customers" on public.users
  for select using (
    exists (
      select 1 from public.hub_staff hs
      where hs.user_id = auth.uid() and hs.active = true
    )
  );

-- ----------------------------
-- hubs RLS
-- ----------------------------
create policy "hubs: public read active" on public.hubs
  for select using (active = true);

create policy "hubs: admins full access" on public.hubs
  for all using (public.is_admin());

-- ----------------------------
-- hub_bag_rates RLS
-- Rates must be publicly readable (shown while browsing hubs before login);
-- only admins can change them.
-- ----------------------------
create policy "hub_bag_rates: public read" on public.hub_bag_rates
  for select using (
    exists (select 1 from public.hubs h where h.id = hub_id and h.active = true)
  );

create policy "hub_bag_rates: admins full access" on public.hub_bag_rates
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------
-- hub_staff RLS
-- ----------------------------
create policy "hub_staff: own record" on public.hub_staff
  for select using (user_id = auth.uid());

create policy "hub_staff: admins full access" on public.hub_staff
  for all using (public.is_admin());

-- ----------------------------
-- bookings RLS
-- ----------------------------
-- Split (rather than "for all") plus a column grant below: customers may only
-- read/create their own bookings and flip `status` to a self-service value —
-- never rewrite total_price, end_time, hub_id, qr_code, etc. directly.
create policy "bookings: select own bookings" on public.bookings
  for select using (user_id = auth.uid());

create policy "bookings: insert own bookings" on public.bookings
  for insert with check (user_id = auth.uid());

create policy "bookings: update own bookings" on public.bookings
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and status in ('cancelled', 'active_storage', 'disputed', 'pickup_requested')
  );

revoke update on public.bookings from authenticated;
grant update (status) on public.bookings to authenticated;

create policy "bookings: staff see hub bookings" on public.bookings
  for select using (public.is_staff_at_hub(hub_id));

create policy "bookings: staff update status" on public.bookings
  for update using (public.is_staff_at_hub(hub_id));

create policy "bookings: admins full access" on public.bookings
  for all using (public.is_admin());

-- ----------------------------
-- booking_bags RLS
-- ----------------------------
create policy "booking_bags: via own booking" on public.booking_bags
  for all using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = auth.uid()
    )
  );

create policy "booking_bags: staff at hub" on public.booking_bags
  for all using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and public.is_staff_at_hub(b.hub_id)
    )
  );

create policy "booking_bags: admins full access" on public.booking_bags
  for all using (public.is_admin());

-- ----------------------------
-- sticker_batches RLS
-- ----------------------------
create policy "sticker_batches: staff see own hub" on public.sticker_batches
  for select using (public.is_staff_at_hub(hub_id));

create policy "sticker_batches: ops admin full" on public.sticker_batches
  for all using (
    (select role from public.users where id = auth.uid())
    in ('ops_admin', 'master_admin')
  );

-- ----------------------------
-- sticker_assignments RLS
-- ----------------------------
create policy "sticker_assignments: staff insert" on public.sticker_assignments
  for insert with check (
    assigned_by_staff_id = auth.uid()
    and exists (
      select 1 from public.booking_bags bb
      join public.bookings b on b.id = bb.booking_id
      where bb.id = booking_bag_id and public.is_staff_at_hub(b.hub_id)
    )
  );

create policy "sticker_assignments: staff & user select" on public.sticker_assignments
  for select using (
    assigned_by_staff_id = auth.uid()
    or exists (
      select 1 from public.booking_bags bb
      join public.bookings b on b.id = bb.booking_id
      where bb.id = booking_bag_id and b.user_id = auth.uid()
    )
    or public.is_admin()
  );

-- ----------------------------
-- seal_proofs RLS
-- ----------------------------
create policy "seal_proofs: staff insert" on public.seal_proofs
  for insert with check (
    uploaded_by_staff_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and public.is_staff_at_hub(b.hub_id)
    )
  );

create policy "seal_proofs: owner or staff select" on public.seal_proofs
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.user_id = auth.uid() or public.is_staff_at_hub(b.hub_id))
    )
    or public.is_admin()
  );

create policy "seal_proofs: owner confirm" on public.seal_proofs
  for update using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = auth.uid()
    )
  );

-- ----------------------------
-- payments RLS
-- ----------------------------
create policy "payments: own booking" on public.payments
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = auth.uid()
    )
  );

create policy "payments: admins full" on public.payments
  for all using (public.is_admin());

-- ----------------------------
-- refunds RLS
-- ----------------------------
create policy "refunds: own payment" on public.refunds
  for select using (
    exists (
      select 1 from public.payments p
      join public.bookings b on b.id = p.booking_id
      where p.id = payment_id and b.user_id = auth.uid()
    )
  );

create policy "refunds: admins full" on public.refunds
  for all using (public.is_admin());

-- ----------------------------
-- notifications RLS
-- ----------------------------
create policy "notifications: own" on public.notifications
  for all using (user_id = auth.uid());

-- ----------------------------
-- complaints RLS
-- ----------------------------
-- Customers can file and view their own complaints, but only staff/admins may
-- change status (e.g. resolving/closing) — see "complaints: admins full" below.
create policy "complaints: select own" on public.complaints
  for select using (user_id = auth.uid());

create policy "complaints: insert own" on public.complaints
  for insert with check (user_id = auth.uid());

create policy "complaints: admins full" on public.complaints
  for all using (public.is_admin());

-- ----------------------------
-- nearby_places RLS
-- ----------------------------
create policy "nearby_places: public read" on public.nearby_places
  for select using (true);

create policy "nearby_places: ops admin manage" on public.nearby_places
  for all using (
    (select role from public.users where id = auth.uid())
    in ('ops_admin', 'master_admin')
  );

-- ----------------------------
-- audit_logs RLS
-- ----------------------------
create policy "audit_logs: admins read" on public.audit_logs
  for select using (public.is_admin());

create policy "audit_logs: service only" on public.audit_logs
  for insert with check (false);

-- =============================================================
-- REALTIME
-- Enable realtime for tables that need live updates
-- =============================================================

alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.seal_proofs;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.payments;

-- =============================================================
-- STORAGE BUCKETS
-- Run after enabling Storage in your Supabase project
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('seal-proofs',   'seal-proofs',   false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('hub-photos',    'hub-photos',    true,  5242880,  array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Seal proofs: only authenticated staff can upload; only owner/staff/admin can view
create policy "seal-proofs: staff upload" on storage.objects
  for insert with check (
    bucket_id = 'seal-proofs' 
    and auth.role() = 'authenticated'
    and (public.current_user_role() in ('hub_staff', 'support_admin', 'ops_admin', 'master_admin'))
  );

create policy "seal-proofs: access control" on storage.objects
  for select using (
    bucket_id = 'seal-proofs' 
    and auth.role() = 'authenticated'
    and (
      -- Is admin
      public.is_admin()
      -- Is the customer who owns the booking
      or exists (
        select 1 from public.bookings b
        where b.id = (storage.foldername(name))[1]::uuid
          and b.user_id = auth.uid()
      )
      -- Is staff at the hub where booking is stored
      or exists (
        select 1 from public.bookings b
        where b.id = (storage.foldername(name))[1]::uuid
          and public.is_staff_at_hub(b.hub_id)
      )
    )
  );

-- Hub photos: public read, admin write
create policy "hub-photos: public read" on storage.objects
  for select using (bucket_id = 'hub-photos');

create policy "hub-photos: admin write" on storage.objects
  for insert with check (
    bucket_id = 'hub-photos' and public.is_admin()
  );

-- =============================================================
-- SEED DATA (sample hubs — remove in production)
-- =============================================================

insert into public.hubs (name, alias, location, address, capacity, open_time, close_time, active, image_url, latitude, longitude)
values
  ('Luggo Colombo Fort',     'CMB', 'Colombo',    'No. 12, Sir Baron Jayatillake Mawatha, Colombo 01', 60, '06:00', '22:00', true, '/images/hubs/cmb.png', 6.9344, 79.8451),
  ('Luggo Kandy City',       'KDY', 'Kandy',      '25 Dalada Veediya, Kandy 20000',                    40, '07:00', '21:00', true, '/images/hubs/kdy.png', 7.2906, 80.6337),
  ('Luggo Galle Fort',       'GAL', 'Galle',      'Fort Gate, Galle 80000',                            30, '07:00', '21:00', true, '/images/hubs/gal.png', 6.0267, 80.2170),
  ('Luggo BIA Airport',      'BIA', 'Katunayake', 'Arrivals Hall, Bandaranaike International Airport', 80, '00:00', '23:59', true, '/images/hubs/bia.png', 7.1804, 79.8837),
  ('Luggo Negombo Beach',    'NGO', 'Negombo',    '5 Lewis Place, Negombo 11500',                      25, '07:00', '20:00', true, '/images/hubs/ngo.png', 7.2211, 79.8407)
on conflict (alias) do nothing;

-- Seed every hub with the default bag rates so hub_bag_rates is never empty
-- for an existing hub (admin/pricing edits these afterwards).
insert into public.hub_bag_rates (hub_id, bag_type, hourly_rate, daily_cap)
select h.id, r.bag_type, r.hourly_rate, r.daily_cap
from public.hubs h
cross join (
  values ('small'::public.bag_type, 80, 600),
         ('regular'::public.bag_type, 120, 700),
         ('large'::public.bag_type, 150, 800)
) as r(bag_type, hourly_rate, daily_cap)
on conflict (hub_id, bag_type) do nothing;
