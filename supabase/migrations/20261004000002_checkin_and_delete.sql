-- Door check-in, by ticket code or registration id. Mirrors
-- functions/src/checkIn.js's performCheckIn(): look up, if already checked
-- in return that fact (with the time), otherwise mark it and bump
-- stats.checked_in — all atomic, same reasoning as register_attendee above.
create or replace function public.check_in(
  p_ticket_code text default null,
  p_registration_id uuid default null,
  p_actor uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg record;
begin
  if p_ticket_code is not null then
    select * into v_reg from public.registrations where ticket_code = p_ticket_code;
  elsif p_registration_id is not null then
    select * into v_reg from public.registrations where id = p_registration_id;
  else
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_reg is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_reg.checked_in then
    return jsonb_build_object(
      'status', 'already_checked_in',
      'full_name', v_reg.full_name,
      'pickup', v_reg.pickup,
      'checked_in_at', v_reg.checked_in_at
    );
  end if;

  update public.registrations
    set checked_in = true, checked_in_at = now(), checked_in_by = p_actor
    where id = v_reg.id;

  update public.stats set checked_in = checked_in + 1 where id = 1;

  return jsonb_build_object(
    'status', 'checked_in',
    'full_name', v_reg.full_name,
    'pickup', v_reg.pickup
  );
end;
$$;

revoke all on function public.check_in(text, uuid, uuid) from public;
-- Service role only, called from the check-in Edge Function after it
-- verifies the caller's JWT has staff or admin app_metadata.

-- ---------------------------------------------------------------------------
-- Admin delete: removes the registration and decrements stats. No separate
-- ticket/uniques docs to clean up — those were only ever Firestore's way of
-- faking what UNIQUE constraints and the get_ticket_by_code() RPC do
-- natively here.
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_registration(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg record;
begin
  select * into v_reg from public.registrations where id = p_registration_id;
  if v_reg is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  delete from public.registrations where id = p_registration_id;

  update public.stats
    set total = greatest(0, total - 1),
        checked_in = case when v_reg.checked_in then greatest(0, checked_in - 1) else checked_in end,
        by_pickup = jsonb_set(
          by_pickup,
          array[v_reg.pickup],
          to_jsonb(greatest(0, coalesce((by_pickup ->> v_reg.pickup)::int, 0) - 1))
        )
    where id = 1;

  return jsonb_build_object('status', 'ok');
end;
$$;

revoke all on function public.admin_delete_registration(uuid) from public;
-- Service role only — the Edge Function checks the caller is admin first.
