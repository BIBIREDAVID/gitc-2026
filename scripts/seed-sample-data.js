// Seeds sample registrations directly into Supabase (service role, bypasses
// RLS) for testing the admin portal's Registrations/Stats/Export tabs and
// the check-in app, without manually registering through the form.
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Matches supabase/functions/_shared/ticketCode.ts's 7-char human-friendly
// scheme, kept in sync by hand since this script doesn't import Edge
// Function code.
const TICKET_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function ticketCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  let code = '';
  for (const b of bytes) code += TICKET_ALPHABET[b % TICKET_ALPHABET.length];
  return code;
}

const sample = [
  { fullName: 'Bola Adeyemi', email: 'bola.a@example.com', whatsapp: '+2348011110001', pickup: 'unilag', isStudent: 'yes', department: 'Computer Science', laptop: 'yes', gender: 'female', role: 'undergraduate', interests: ['ai', 'software_dev'], source: 'whatsapp', checkedIn: true, daysAgo: 3 },
  { fullName: 'Chinedu Okafor', email: 'chinedu.o@example.com', whatsapp: '+2348011110002', pickup: 'medilag', isStudent: 'no', department: '', laptop: 'yes', gender: 'male', role: 'tech_professional', interests: ['cloud_devops'], source: 'twitter', checkedIn: false, daysAgo: 3 },
  { fullName: 'Fatima Bello', email: 'fatima.b@example.com', whatsapp: '+2348011110003', pickup: 'yabatech', isStudent: 'yes', department: 'Mass Comm', laptop: 'no', gender: 'female', role: 'undergraduate', interests: ['digital_marketing', 'uiux'], source: 'whatsapp', checkedIn: false, daysAgo: 2 },
  { fullName: 'Tunde Bakare', email: 'tunde.b@example.com', whatsapp: '+2348011110004', pickup: 'lasucom', isStudent: 'no', department: '', laptop: 'yes', gender: 'male', role: 'entrepreneur', interests: ['product_management'], source: '', checkedIn: true, daysAgo: 1 },
  { fullName: 'Ngozi Eze', email: 'ngozi.e@example.com', whatsapp: '+2348011110005', pickup: 'unilag', isStudent: 'yes', department: 'Electrical Eng', laptop: 'no', gender: 'female', role: 'undergraduate', interests: ['not_sure'], source: 'instagram', checkedIn: false, daysAgo: 1 },
  { fullName: 'Segun Adamu', email: 'segun.a@example.com', whatsapp: '+2348011110006', pickup: 'medilag', isStudent: 'no', department: '', laptop: 'yes', gender: 'male', role: 'tech_professional', interests: ['cybersecurity', 'ai'], source: 'whatsapp', checkedIn: false, daysAgo: 0 },
];

async function run() {
  const byPickup = {};
  const rows = sample.map((r) => {
    byPickup[r.pickup] = (byPickup[r.pickup] || 0) + 1;
    return {
      full_name: r.fullName,
      email: r.email,
      whatsapp: r.whatsapp,
      pickup: r.pickup,
      pickup_other: '',
      is_student: r.isStudent,
      department: r.department,
      laptop: r.laptop,
      gender: r.gender,
      role: r.role,
      role_other: '',
      interests: r.interests,
      interests_other: '',
      consent: true,
      source: r.source || null,
      created_at: new Date(Date.now() - r.daysAgo * 86400000).toISOString(),
      checked_in: r.checkedIn,
      ticket_code: ticketCode(),
    };
  });

  const { error: insertError } = await supabase.from('registrations').insert(rows);
  if (insertError) throw insertError;

  const checkedInCount = sample.filter((r) => r.checkedIn).length;
  const { data: current } = await supabase.from('stats').select('*').eq('id', 1).maybeSingle();
  const mergedByPickup = { ...(current?.by_pickup || {}) };
  for (const [k, v] of Object.entries(byPickup)) {
    mergedByPickup[k] = (mergedByPickup[k] || 0) + v;
  }

  const { error: statsError } = await supabase
    .from('stats')
    .update({
      total: (current?.total || 0) + sample.length,
      checked_in: (current?.checked_in || 0) + checkedInCount,
      by_pickup: mergedByPickup,
    })
    .eq('id', 1);
  if (statsError) throw statsError;

  console.log(`[seed-sample-data] seeded ${sample.length} registrations`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
