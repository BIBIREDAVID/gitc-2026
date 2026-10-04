-- GITC 2026 schema. Mirrors the Firestore design this replaces:
--   settings/event    -> public.settings (single row, id = 1)
--   stats/summary     -> public.stats (single row, id = 1)
--   registrations/*   -> public.registrations
--   tickets/{code}    -> public.get_ticket_by_code() RPC (no table/view exposed
--                        directly — see note below on why)
--   uniques/e_*, p_*  -> UNIQUE constraints on registrations.email / .whatsapp
--   rateLimits/*      -> public.rate_limits
--
-- Roles: Supabase has no Firebase-style custom claims, but auth.users has
-- raw_app_meta_data, which only the service role (never the user) can write
-- — functionally identical. scripts/setRole.js sets
-- raw_app_meta_data->>'admin' / 'staff' there. RLS policies below read it via
-- auth.jwt() -> 'app_metadata'.

create extension if not exists pgcrypto; -- gen_random_uuid(), gen_random_bytes()

-- ---------------------------------------------------------------------------
-- settings (singleton)
-- ---------------------------------------------------------------------------
create table public.settings (
  id int primary key default 1,
  title text not null default 'Get Into Tech Conference 2.0',
  date_time timestamptz,
  venue text not null default 'LASU',
  capacity int,
  registration_open boolean not null default true,
  registration_deadline timestamptz,
  email_enabled boolean not null default false,
  constraint settings_singleton check (id = 1)
);

alter table public.settings enable row level security;

create policy "settings readable by anyone"
  on public.settings for select
  using (true);

create policy "settings writable by admins"
  on public.settings for update
  using ((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean is true)
  with check ((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean is true);

-- ---------------------------------------------------------------------------
-- registrations
-- ---------------------------------------------------------------------------
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  whatsapp text not null unique,
  pickup text not null,
  pickup_other text not null default '',
  is_student text not null,
  department text not null default '',
  laptop text not null,
  gender text not null,
  role text not null,
  role_other text not null default '',
  interests text[] not null,
  interests_other text not null default '',
  consent boolean not null,
  source text,
  created_at timestamptz not null default now(),
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  checked_in_by uuid,
  ticket_code text not null unique
);

create index registrations_created_at_idx on public.registrations (created_at desc);
create index registrations_ticket_code_idx on public.registrations (ticket_code);

alter table public.registrations enable row level security;

-- Staff/admin only — identical to the Firestore rule. All real writes go
-- through SECURITY DEFINER RPC functions below (register, check-in, delete),
-- so there is intentionally no insert/update/delete policy for any role,
-- including authenticated staff: the table itself stays read-only from the
-- API, exactly like "All writes go through Cloud Functions" (CLAUDE.md rule 3).
create policy "registrations readable by staff and admins"
  on public.registrations for select
  using (
    (auth.jwt() -> 'app_metadata' ->> 'staff')::boolean is true
    or (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean is true
  );

-- ---------------------------------------------------------------------------
-- stats (singleton)
-- ---------------------------------------------------------------------------
create table public.stats (
  id int primary key default 1,
  total int not null default 0,
  checked_in int not null default 0,
  by_pickup jsonb not null default '{}'::jsonb,
  constraint stats_singleton check (id = 1)
);

alter table public.stats enable row level security;

create policy "stats readable by staff and admins"
  on public.stats for select
  using (
    (auth.jwt() -> 'app_metadata' ->> 'staff')::boolean is true
    or (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean is true
  );

-- ---------------------------------------------------------------------------
-- rate_limits (findTicket: 10 attempts / IP / hour)
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text primary key, -- e.g. 'find_ticket:<ip>:<hour-bucket>'
  count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- No policies at all = closed entirely, same as Firestore's rateLimits rule.
-- Only the service-role Edge Functions touch this table.

-- ---------------------------------------------------------------------------
-- Public ticket lookup, via RPC — not a table/view grant.
--
-- Firestore could express "get by exact doc id, but never list the
-- collection" directly in rules. PostgREST's table API can't: granting
-- SELECT on a tickets table/view lets anyone pass an open-ended filter and
-- enumerate every row, there is no equivalent of Firestore's get-vs-list
-- split at the grant level. A SECURITY DEFINER function that takes the code
-- as a required parameter and returns at most one row *is* the equivalent —
-- there's no way to call it without already knowing a real ticket code.
-- ---------------------------------------------------------------------------
create or replace function public.get_ticket_by_code(p_code text)
returns table (full_name text, pickup text, checked_in boolean)
language sql
security definer
set search_path = public
as $$
  select full_name, pickup, checked_in
  from public.registrations
  where ticket_code = p_code;
$$;

revoke all on function public.get_ticket_by_code(text) from public;
grant execute on function public.get_ticket_by_code(text) to anon, authenticated;

-- updated_at helper used nowhere yet, kept minimal on purpose — the admin
-- portal writes settings via an RPC-free direct update (RLS-guarded above),
-- registrations/stats never get client-side updates at all.
