-- Splits the old single "where are you coming from" answer into two
-- concepts: `pickup` (what school the attendee identifies as coming from —
-- required, unchanged) and the new `pickup_point` (which bus pickup point
-- they'll actually use for mobilization — optional, since not everyone
-- needs a bus, and excludes LASU Ojo as an option since that's the venue
-- itself).
alter table public.registrations
  add column if not exists pickup_point text not null default '';

-- Old 15-arg overload is replaced by a 16-arg one below (CREATE OR REPLACE
-- can't change a function's argument-type identity), so drop it explicitly
-- rather than leaving a dangling unused overload behind.
drop function if exists public.register_attendee(
  text, text, text, text, text, text, text, text, text, text, text,
  text[], text, boolean, text, text
);

create or replace function public.register_attendee(
  p_full_name text,
  p_email text,
  p_whatsapp text,
  p_pickup text,
  p_pickup_other text,
  p_is_student text,
  p_department text,
  p_laptop text,
  p_gender text,
  p_role text,
  p_role_other text,
  p_interests text[],
  p_interests_other text,
  p_consent boolean,
  p_source text,
  p_ticket_code text,
  p_pickup_point text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings record;
  v_total int;
begin
  select registration_open, registration_deadline, capacity
    into v_settings
    from public.settings
    where id = 1;

  if v_settings is null or v_settings.registration_open is false then
    return jsonb_build_object('status', 'closed');
  end if;

  if v_settings.registration_deadline is not null
     and now() > v_settings.registration_deadline then
    return jsonb_build_object('status', 'closed');
  end if;

  if v_settings.capacity is not null then
    select total into v_total from public.stats where id = 1;
    if coalesce(v_total, 0) >= v_settings.capacity then
      return jsonb_build_object('status', 'full');
    end if;
  end if;

  begin
    insert into public.registrations (
      full_name, email, whatsapp, pickup, pickup_other, is_student,
      department, laptop, gender, role, role_other, interests,
      interests_other, consent, source, ticket_code, pickup_point
    ) values (
      p_full_name, p_email, p_whatsapp, p_pickup, p_pickup_other, p_is_student,
      p_department, p_laptop, p_gender, p_role, p_role_other, p_interests,
      p_interests_other, p_consent, p_source, p_ticket_code, p_pickup_point
    );
  exception
    when unique_violation then
      return jsonb_build_object('status', 'already_registered');
  end;

  -- Stats stay keyed on `pickup` (school), not the new optional
  -- `pickup_point` — unchanged from before this migration.
  insert into public.stats (id, total, checked_in, by_pickup)
    values (1, 1, 0, jsonb_build_object(p_pickup, 1))
  on conflict (id) do update
    set total = public.stats.total + 1,
        by_pickup = jsonb_set(
          public.stats.by_pickup,
          array[p_pickup],
          to_jsonb(coalesce((public.stats.by_pickup ->> p_pickup)::int, 0) + 1)
        );

  return jsonb_build_object('status', 'ok', 'ticket_code', p_ticket_code);
end;
$$;

revoke all on function public.register_attendee(
  text, text, text, text, text, text, text, text, text, text, text,
  text[], text, boolean, text, text, text
) from public;
