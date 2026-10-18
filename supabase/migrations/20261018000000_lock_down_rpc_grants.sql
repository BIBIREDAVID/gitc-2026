-- Closes a real permission hole: register_attendee, check_in, and
-- admin_delete_registration were only ever `revoke all ... from public`,
-- which revokes the PUBLIC pseudo-role grant but NOT the separate explicit
-- EXECUTE grants Supabase makes to `anon`/`authenticated` by default on every
-- new function in the public schema. The result: anon/authenticated could
-- call these "service-role only" functions directly with the anon key,
-- bypassing the Edge Functions' honeypot, rate limiting, auth checks, and
-- (for register_attendee) field validation entirely.
--
-- get_ticket_by_code already did this correctly (explicit revoke, then an
-- explicit grant back to anon/authenticated for the one function meant to be
-- public) — this migration applies the same explicit-revoke pattern to the
-- three functions that were never meant to be callable by anon/authenticated
-- at all.
revoke execute on function public.register_attendee(
  text, text, text, text, text, text, text, text, text, text, text,
  text[], text, boolean, text, text, text
) from anon, authenticated;

revoke execute on function public.check_in(text, uuid, uuid) from anon, authenticated;

revoke execute on function public.admin_delete_registration(uuid) from anon, authenticated;
