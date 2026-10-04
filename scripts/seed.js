// Creates the settings (id=1) and stats (id=1) rows with their defaults —
// but only if they don't already exist, so this is safe to re-run (e.g.
// after a redeploy) without clobbering real event settings or live stats.
//
// Credentials: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the service
// role key bypasses RLS, like the Firebase Admin SDK did — never expose it
// client-side). See README.md.
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seedIfMissing(table, row, label) {
  const { data: existing } = await supabase.from(table).select('id').eq('id', 1).maybeSingle();
  if (existing) {
    console.log(`[seed] ${label} already exists — left untouched.`);
    return;
  }
  const { error } = await supabase.from(table).insert(row);
  if (error) throw error;
  console.log(`[seed] created ${label}.`);
}

async function run() {
  await seedIfMissing(
    'settings',
    {
      id: 1,
      title: 'Get Into Tech Conference 2.0',
      date_time: null,
      venue: 'LASU',
      capacity: null,
      registration_open: true,
      email_enabled: false,
    },
    'settings'
  );
  await seedIfMissing(
    'stats',
    { id: 1, total: 0, checked_in: 0, by_pickup: {} },
    'stats'
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
