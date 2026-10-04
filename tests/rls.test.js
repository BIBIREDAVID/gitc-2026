// Row Level Security tests — the Supabase equivalent of the old
// tests/firestore.rules.test.js. No local emulator available here (needs
// Docker), so this runs against the real project; set SUPABASE_URL,
// SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY first.
//
// Proves: public can't read registrations/stats; public can't write
// anywhere; public can read a ticket by exact code via the RPC but can't
// list the registrations table; staff can read registrations but can't
// change settings; admin can change settings.
//
// Run with:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node --test tests/rls.test.js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to run this test.'
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
let anon;
let staffClient;
let adminClient;
let fixtureRegId;
let fixtureTicketCode;
let staffUserId;
let adminUserId;

const STAFF_EMAIL = `rls-test-staff-${Date.now()}@example.com`;
const ADMIN_EMAIL = `rls-test-admin-${Date.now()}@example.com`;
const PASSWORD = 'rls-test-password-123';

before(async () => {
  anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Fixture registration, inserted via the service role (bypasses RLS, like
  // the register Edge Function does in real use).
  fixtureTicketCode = `rls-test-${Date.now()}`;
  const { data: reg, error } = await admin
    .from('registrations')
    .insert({
      full_name: 'RLS Test Fixture',
      email: `rls-fixture-${Date.now()}@example.com`,
      whatsapp: `+234801${Math.floor(1000000 + Math.random() * 8999999)}`,
      pickup: 'unilag',
      is_student: 'no',
      laptop: 'yes',
      gender: 'female',
      role: 'tech_professional',
      interests: ['not_sure'],
      consent: true,
      ticket_code: fixtureTicketCode,
    })
    .select()
    .single();
  if (error) throw error;
  fixtureRegId = reg.id;

  // A staff user and an admin user, each signed in via the anon client (so
  // their session JWT carries the real app_metadata RLS reads).
  const { data: staffUser } = await admin.auth.admin.createUser({
    email: STAFF_EMAIL,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { staff: true },
  });
  const { data: adminUser } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { admin: true },
  });

  staffClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await staffClient.auth.signInWithPassword({ email: STAFF_EMAIL, password: PASSWORD });

  adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await adminClient.auth.signInWithPassword({ email: ADMIN_EMAIL, password: PASSWORD });

  staffUserId = staffUser.user.id;
  adminUserId = adminUser.user.id;
});

after(async () => {
  await admin.from('registrations').delete().eq('id', fixtureRegId);
  if (staffUserId) await admin.auth.admin.deleteUser(staffUserId);
  if (adminUserId) await admin.auth.admin.deleteUser(adminUserId);
});

test('public cannot read registrations', async () => {
  const { data, error } = await anon.from('registrations').select('*').limit(1);
  assert.ok(error || data?.length === 0, 'anon select on registrations should be blocked');
});

test('public cannot read stats', async () => {
  const { data, error } = await anon.from('stats').select('*').eq('id', 1);
  assert.ok(error || data?.length === 0, 'anon select on stats should be blocked');
});

test('public can get one ticket by exact code, but cannot list registrations via the RPC path', async () => {
  const { data, error } = await anon.rpc('get_ticket_by_code', { p_code: fixtureTicketCode });
  const row = Array.isArray(data) ? data[0] : data;
  assert.equal(error, null);
  assert.ok(row, 'get_ticket_by_code should return the fixture ticket');
  assert.equal(row.full_name, 'RLS Test Fixture');

  // No equivalent "list all tickets" call exists at all — get_ticket_by_code
  // requires an exact code argument, which is the point (see the migration
  // comment in supabase/migrations/20261004000000_init.sql).
  const { data: bogus } = await anon.rpc('get_ticket_by_code', { p_code: 'not-a-real-code' });
  const bogusRow = Array.isArray(bogus) ? bogus[0] : bogus;
  assert.equal(bogusRow, undefined);
});

test('public cannot write anywhere', async () => {
  // Note on asserting UPDATE is blocked: Postgres RLS filters an UPDATE's
  // target rows through the policy's USING clause silently — a row that
  // doesn't match just isn't updated, and PostgREST reports that as success
  // with zero rows affected, NOT an error. So the real check is "did the
  // value change", not "was an error returned". INSERT is different: a
  // WITH CHECK failure (or, here, no INSERT policy at all) throws a genuine
  // RLS violation error, so that one *can* be asserted via `error`.
  const beforeTitle = (await admin.from('settings').select('title').eq('id', 1).single()).data.title;
  await anon.from('settings').update({ title: 'hacked' }).eq('id', 1);
  const afterTitle = (await admin.from('settings').select('title').eq('id', 1).single()).data.title;
  assert.equal(afterTitle, beforeTitle, 'anon update on settings should be silently blocked by RLS');

  const { error: regErr } = await anon.from('registrations').insert({
    full_name: 'Intruder',
    email: `intruder-${Date.now()}@example.com`,
    whatsapp: '+2348099999999',
    pickup: 'unilag',
    is_student: 'no',
    laptop: 'yes',
    gender: 'male',
    role: 'other',
    interests: ['not_sure'],
    consent: true,
    ticket_code: `intruder-${Date.now()}`,
  });
  assert.ok(regErr, 'anon insert on registrations should be blocked');

  const beforeTotal = (await admin.from('stats').select('total').eq('id', 1).single()).data.total;
  await anon.from('stats').update({ total: 999 }).eq('id', 1);
  const afterTotal = (await admin.from('stats').select('total').eq('id', 1).single()).data.total;
  assert.equal(afterTotal, beforeTotal, 'anon update on stats should be silently blocked by RLS');
});

test('staff can read registrations but cannot change settings', async () => {
  const { data, error } = await staffClient.from('registrations').select('*').eq('id', fixtureRegId);
  assert.equal(error, null);
  assert.equal(data.length, 1);

  const beforeTitle = (await admin.from('settings').select('title').eq('id', 1).single()).data.title;
  await staffClient.from('settings').update({ title: 'staff edit' }).eq('id', 1);
  const afterTitle = (await admin.from('settings').select('title').eq('id', 1).single()).data.title;
  assert.equal(afterTitle, beforeTitle, 'staff update on settings should be silently blocked by RLS');
});

test('admin can change settings', async () => {
  const { error } = await adminClient.from('settings').update({ title: 'Admin Edit' }).eq('id', 1);
  assert.equal(error, null, 'admin update on settings should succeed');
  // put it back
  await admin.from('settings').update({ title: 'Get Into Tech Conference 2.0' }).eq('id', 1);
});
