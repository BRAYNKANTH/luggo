-- Security hardening (Oct 2026 review). Safe to re-run.
-- Apply before deploying the matching app code (rate limiter + profile phone changes).
begin;

-- ── 1. booking_bags: customers may read their bags, never write them ──────
-- Bags are created by create_booking_with_payment / staff actions (service role).
drop policy if exists "booking_bags: via own booking" on public.booking_bags;
drop policy if exists "booking_bags: owner read" on public.booking_bags;
create policy "booking_bags: owner read" on public.booking_bags
  for select using (
    exists (select 1 from public.bookings b
            where b.id = booking_id and b.user_id = auth.uid())
  );

-- ── 2. seal_proofs: customers may only stamp their confirmation ───────────
revoke update on public.seal_proofs from authenticated;
grant update (confirmed_by_user_at) on public.seal_proofs to authenticated;

-- ── 3. users.phone: only changeable after SMS verification (service role) ─
revoke update on public.users from authenticated;
grant update (name, nic_passport) on public.users to authenticated;

-- One account per phone number, whatever format it was stored in.
-- If this fails, find duplicates with:
--   select right(regexp_replace(phone, '\D', '', 'g'), 9) k, array_agg(id)
--   from public.users where phone is not null group by 1 having count(*) > 1;
create unique index if not exists users_phone_unique
  on public.users ((right(regexp_replace(phone, '\D', '', 'g'), 9)))
  where phone is not null and phone <> '';

-- ── 4. Audit log: only the service role may write entries ────────────────
revoke all on function public.write_audit_log(uuid, public.user_role, text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.write_audit_log(uuid, public.user_role, text, text, uuid, jsonb)
  to service_role;

-- ── 5. Shared rate limiter (in-memory limits don't survive serverless) ───
create table if not exists public.rate_limits (
  key        text primary key,
  hits       timestamptz[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.rate_limits enable row level security;  -- no policies: service role only

create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_ms integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_now    timestamptz := clock_timestamp();
  v_window interval    := make_interval(secs => p_window_ms / 1000.0);
  v_hits   timestamptz[];
begin
  insert into public.rate_limits (key) values (p_key) on conflict (key) do nothing;
  select array(select h from unnest(r.hits) h where h > v_now - v_window order by h)
    into v_hits from public.rate_limits r where r.key = p_key for update;

  if coalesce(array_length(v_hits, 1), 0) >= p_limit then
    update public.rate_limits set hits = v_hits, updated_at = v_now where key = p_key;
    return jsonb_build_object('allowed', false, 'retry_after_ms',
      greatest(1000, ceil(extract(epoch from (v_hits[1] + v_window - v_now)) * 1000)::integer));
  end if;

  update public.rate_limits set hits = array_append(v_hits, v_now), updated_at = v_now where key = p_key;
  -- Opportunistic cleanup of idle keys.
  if random() < 0.01 then
    delete from public.rate_limits where updated_at < v_now - interval '1 day';
  end if;
  return jsonb_build_object('allowed', true, 'retry_after_ms', 0);
end;
$$;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

commit;
