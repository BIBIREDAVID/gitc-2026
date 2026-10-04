// Creates (or updates) a user and grants it admin/staff app_metadata, in one
// step — a convenience for test accounts. For a real person who already has
// an account, use scripts/setRole.js instead (it doesn't need/accept a
// password).
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-admin.js
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-admin.js staff@gitc2026.test staffpass123 staff
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const [, , emailArg, passwordArg, roleArg] = process.argv;
const email = emailArg || 'admin@gitc2026.test';
const password = passwordArg || 'adminpass123';
const role = roleArg === 'staff' ? 'staff' : 'admin';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  let userId;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { [role]: true },
  });

  if (createError) {
    if (!createError.message?.includes('already been registered')) throw createError;
    // Already exists — find it and just update the role.
    let page = 1;
    let user;
    while (!user) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (user || data.users.length < 1000) break;
      page += 1;
    }
    if (!user) throw new Error(`User exists per createUser() but couldn't be found again: ${email}`);
    userId = user.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password,
      app_metadata: { ...user.app_metadata, [role]: true },
    });
    if (updateError) throw updateError;
  } else {
    userId = created.user.id;
  }

  console.log(`[seed-admin] ${email} / ${password} now has "${role}": true`);
  console.log('[seed-admin] sign in with this at /admin or /checkin.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
