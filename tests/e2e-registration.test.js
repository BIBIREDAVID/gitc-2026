// A basic end-to-end test of the registration flow: calls the real
// `register` Edge Function exactly as the browser does, then verifies the
// resulting database state via the service role (the anon/public client
// correctly can't read `registrations` directly — admin/staff only) and via
// the same public get_ticket_by_code() RPC the ticket page uses.
//
// There's no local Supabase emulator available in this environment (the CLI
// needs Docker, which isn't installed here), so unlike the old Firebase
// version this runs against the REAL project — set SUPABASE_URL,
// SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY before running. It only
// ever inserts/deletes its own test rows (unique emails per run), but it is
// not sandboxed the way the Firebase emulator tests were.
//
// Run with:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:e2e
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

let anon;
let admin;
const createdEmails = [];

before(() => {
  anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
});

after(async () => {
  // Best-effort cleanup of whatever this run created.
  if (createdEmails.length) {
    await admin.from('registrations').delete().in('email', createdEmails);
  }
});

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

function validPayload(overrides = {}) {
  const email = uniqueEmail();
  createdEmails.push(email);
  return {
    fullName: 'E2E Test Attendee',
    email,
    whatsapp: `0803${Math.floor(1000000 + Math.random() * 8999999)}`,
    pickup: 'unilag',
    pickupOther: '',
    isStudent: 'no',
    department: '',
    laptop: 'yes',
    gender: 'female',
    role: 'tech_professional',
    roleOther: '',
    interests: ['not_sure'],
    interestsOther: '',
    consent: true,
    src: 'e2e-test',
    website: '', // honeypot, empty = real user
    ...overrides,
  };
}

async function callRegister(payload) {
  return anon.functions.invoke('register', { body: payload });
}

async function errorCode(err) {
  try {
    const body = await err.context?.json();
    return body?.error?.code;
  } catch {
    return null;
  }
}

test('full registration flow: register -> database -> ticket read-back', async () => {
  const payload = validPayload();
  const { data, error } = await callRegister(payload);
  assert.equal(error, null, `register() should succeed: ${error && (await errorCode(error))}`);

  const ticketCode = data.ticketCode;
  assert.ok(ticketCode, 'register() should return a ticketCode');
  assert.ok(ticketCode.length >= 20, 'ticketCode should be at least 20 chars');

  // The registration landed in the database with the right (non-public)
  // data. Verified via the service role — the anon client can't read this
  // table directly (staff/admin only).
  const { data: reg } = await admin
    .from('registrations')
    .select('*')
    .eq('ticket_code', ticketCode)
    .maybeSingle();
  assert.ok(reg, 'exactly one registration should exist for this ticket');
  assert.equal(reg.full_name, payload.fullName);
  assert.equal(reg.email, payload.email);
  assert.equal(reg.whatsapp, `+234${payload.whatsapp.slice(1)}`);
  assert.equal(reg.checked_in, false);

  // The ticket page's exact read path: the public get_ticket_by_code() RPC.
  const { data: rows } = await anon.rpc('get_ticket_by_code', { p_code: ticketCode });
  const ticket = Array.isArray(rows) ? rows[0] : rows;
  assert.ok(ticket, 'ticket should be publicly readable by code');
  assert.equal(ticket.full_name, payload.fullName);
  assert.equal(ticket.pickup, payload.pickup);
  assert.equal(ticket.checked_in, false);
  // Rule 7: public documents must never contain email or phone.
  assert.equal(ticket.email, undefined);
  assert.equal(ticket.whatsapp, undefined);
});

test('duplicate email is rejected with already_registered', async () => {
  const payload = validPayload();
  await callRegister(payload);

  const { error } = await callRegister(validPayload({ email: payload.email }));
  assert.ok(error, 'second call with the same email should fail');
  assert.equal(await errorCode(error), 'already_registered');
});

test('honeypot submission reports success but writes nothing', async () => {
  const payload = validPayload({ website: 'http://spam.example.com' });
  const { data, error } = await callRegister(payload);
  assert.equal(error, null);
  assert.ok(data.ticketCode, 'a fake ticketCode is still returned, to not tip off the bot');

  const { data: reg } = await admin
    .from('registrations')
    .select('id')
    .eq('email', payload.email)
    .maybeSingle();
  assert.equal(reg, null, 'no registration should have been written');
});

test('malformed payload is rejected as invalid', async () => {
  const { error } = await callRegister(validPayload({ email: 'not-an-email' }));
  assert.ok(error, 'malformed email should fail');
  assert.equal(await errorCode(error), 'invalid');
});
