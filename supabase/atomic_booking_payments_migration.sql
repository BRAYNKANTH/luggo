-- Apply after the existing production/security/pricing migrations, before deploying this code.
begin;

-- Service-only creation keeps the booking, bags, and payment in one transaction.
create or replace function public.create_booking_with_payment(p_booking jsonb, p_bags jsonb, p_pay_at_hub boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
  v_capacity integer;
  v_occupied integer;
  v_count integer := jsonb_array_length(p_bags);
begin
  select capacity into v_capacity from public.hubs
    where id = (p_booking->>'hub_id')::uuid and active = true for update;
  if not found then raise exception 'Hub not found or inactive' using errcode = 'P0002'; end if;
  select count(*) into v_occupied from public.booking_bags bb join public.bookings b on b.id = bb.booking_id
    where b.hub_id = (p_booking->>'hub_id')::uuid
      and b.status not in ('cancelled', 'expired', 'completed')
      and b.start_time < (p_booking->>'end_time')::timestamptz
      and b.end_time > (p_booking->>'start_time')::timestamptz;
  if v_count < 1 or v_count > 10 then raise exception 'Invalid bag count'; end if;
  if v_occupied + v_count > v_capacity then raise exception 'Hub capacity exceeded' using errcode = 'P0001'; end if;
  insert into public.bookings (user_id, hub_id, status, start_time, end_time, total_price, qr_code,
    terms_accepted, terms_version, privacy_version, terms_accepted_at)
  values ((p_booking->>'user_id')::uuid, (p_booking->>'hub_id')::uuid,
    case when p_pay_at_hub then 'confirmed'::public.booking_status else 'pending_payment'::public.booking_status end,
    (p_booking->>'start_time')::timestamptz, (p_booking->>'end_time')::timestamptz,
    (p_booking->>'total_price')::integer, p_booking->>'qr_code',
    (p_booking->>'terms_accepted')::boolean, p_booking->>'terms_version', p_booking->>'privacy_version', now())
    returning * into v_booking;
  insert into public.booking_bags (booking_id, bag_type)
    select v_booking.id, (bag->>'bag_type')::public.bag_type from jsonb_array_elements(p_bags) bag;
  insert into public.payments (booking_id, amount, status, type, gateway_ref)
    values (v_booking.id, v_booking.total_price, 'pending', 'booking', case when p_pay_at_hub then 'PAY_AT_HUB' else null end);
  return jsonb_build_object('id', v_booking.id, 'qr_code', v_booking.qr_code);
end;
$$;
revoke all on function public.create_booking_with_payment(jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.create_booking_with_payment(jsonb, jsonb, boolean) to service_role;

-- Lock payment and booking together. A retry observes the committed result;
-- a failed booking update rolls back the payment update as well.
create or replace function public.apply_payhere_payment(
  p_payment_id uuid, p_amount numeric, p_gateway_ref text,
  p_extension_hours integer default null, p_extension_end timestamptz default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_payment public.payments;
  v_booking public.bookings;
  v_changed boolean := false;
  v_end timestamptz;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found or v_payment.amount <> p_amount then return jsonb_build_object('processed', false); end if;
  if v_payment.status <> 'pending' then return jsonb_build_object('processed', false); end if;
  select * into v_booking from public.bookings where id = v_payment.booking_id for update;
  if not found then raise exception 'Booking not found'; end if;

  if v_payment.type = 'booking' and v_booking.status = 'pending_payment' then
    update public.bookings set status = 'confirmed' where id = v_booking.id;
    v_changed := true;
  elsif v_payment.type = 'late_fee' and v_booking.status in ('active_storage', 'overstayed') then
    -- Record the paid amount before recalculating the remaining balance.
    update public.payments set status = 'paid', gateway_ref = p_gateway_ref where id = v_payment.id;
    if public.calculate_late_fee(v_booking.id) <= 0 then
      update public.bookings set status = 'pickup_requested' where id = v_booking.id;
      v_changed := true;
    end if;
  elsif v_payment.type = 'early_checkin' and v_booking.status = 'early_checkin_pending_payment' then
    update public.bookings set status = 'arrived', early_checkin_payment_status = 'paid' where id = v_booking.id;
    v_changed := true;
  elsif v_payment.type = 'extension' then
    if p_extension_hours is null or p_extension_hours < 1 or p_extension_hours > 168 then
      raise exception 'Invalid extension duration';
    end if;
    if v_booking.status in ('confirmed', 'arrived', 'sealing_in_progress', 'sealed_waiting_user_confirmation', 'active_storage', 'overstayed') then
      -- The new checkout format carries the end time quoted when payment was created.
      -- Older in-flight checkouts use payment creation time to approximate their original quote.
      v_end := coalesce(p_extension_end, greatest(v_booking.end_time, v_payment.created_at) + make_interval(hours => p_extension_hours));
      if v_end > v_booking.end_time then
        update public.bookings set end_time = v_end, reminder_sent_at = null,
          status = case when status = 'overstayed' and v_end > now() then 'active_storage'::public.booking_status else status end
          where id = v_booking.id;
        v_changed := true;
      end if;
    end if;
  end if;
  update public.payments set status = 'paid', gateway_ref = p_gateway_ref where id = v_payment.id;
  return jsonb_build_object('processed', true, 'changed', v_changed, 'booking_id', v_booking.id, 'type', v_payment.type);
end;
$$;
revoke all on function public.apply_payhere_payment(uuid, numeric, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_payhere_payment(uuid, numeric, text, integer, timestamptz) to service_role;
commit;
