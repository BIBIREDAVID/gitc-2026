-- Atomic registration: settings check (open/deadline/capacity), insert
-- (relying on the UNIQUE constraints on email/whatsapp for dedupe instead of
-- Firestore's separate uniques/ docs + manual transaction), then stats
-- increment — all in one function body, which Postgres already runs as a
-- single transaction. The Edge Function (supabase/functions/register) does
-- field validation/normalisation in TypeScript first and only calls this
-- with already-clean data; this function is the atomic "commit" step.
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
  p_ticket_code text
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
      interests_other, consent, source, ticket_code
    ) values (
      p_full_name, p_email, p_whatsapp, p_pickup, p_pickup_other, p_is_student,
      p_department, p_laptop, p_gender, p_role, p_role_other, p_interests,
      p_interests_other, p_consent, p_source, p_ticket_code
    );
  exception
    when unique_violation then
      return jsonb_build_object('status', 'already_registered');
  end;

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
  text[], text, boolean, text, text
) from public;
-- Only the service role (used exclusively by the register Edge Function)
-- may call this — never anon/authenticated directly.
