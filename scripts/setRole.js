// Grants an admin or staff claim to a Supabase Auth user, by email — sets
// app_metadata (readable in RLS via auth.jwt(), writable only via the Admin
// API, never by the user themselves — the Supabase equivalent of Firebase
// custom claims).
//
// Credentials come ONLY from SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY —
// this script never contains or accepts a key directly. See README.md.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/setRole.js someone@example.com admin
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/setRole.js someone@example.com staff
import { createClient } from '@supabase/supabase-js';

const [, , email, role] = process.argv;

if (!email || !['admin', 'staff'].includes(role)) {
  console.error('Usage: node scripts/setRole.js <email> <admin|staff>');
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // No getUserByEmail in supabase-js — page through listUsers() instead.
  // Fine for a small guest list; would need a dedicated lookup at scale.
  let user;
  let page = 1;
  while (!user) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user || data.users.length < 1000) break;
    page += 1;
  }

  if (!user) {
    console.error(
      `[setRole] No user found for ${email}. Create them first (Supabase dashboard -> Authentication -> Add user, or have them sign in once).`
    );
    process.exit(1);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, [role]: true },
  });
  if (updateError) throw updateError;

  console.log(`[setRole] ${email} now has "${role}": true`);
  console.log('[setRole] they must sign out and back in (or wait for their token to refresh) to see it.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
