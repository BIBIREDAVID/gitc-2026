// Replaces functions/src/findTicket.js. Rate-limited 10 attempts/IP/hour via
// public.rate_limits (upsert + count check, done here since it's simpler as
// two round trips than a single SQL statement and this function already has
// to make a DB call either way).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { normalizeEmail, normalizePhone } from '../_shared/validation.ts';

const RATE_LIMIT_PER_HOUR = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';
  const hourBucket = Math.floor(Date.now() / 3_600_000);
  const key = `find_ticket:${ip}:${hourBucket}`;

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('key', key)
    .maybeSingle();

  const count = existing?.count ?? 0;
  if (count >= RATE_LIMIT_PER_HOUR) {
    return errorResponse('rate_limited', 429);
  }

  await supabase
    .from('rate_limits')
    .upsert({ key, count: count + 1, updated_at: new Date().toISOString() });

  let payload: { email?: unknown; whatsapp?: unknown };
  try {
    payload = await req.json();
  } catch {
    return errorResponse('not_found');
  }

  const email = normalizeEmail(payload.email);
  const whatsapp = normalizePhone(payload.whatsapp);
  if (!email || !whatsapp) return errorResponse('not_found');

  const { data: reg } = await supabase
    .from('registrations')
    .select('ticket_code')
    .eq('email', email)
    .eq('whatsapp', whatsapp)
    .maybeSingle();

  if (!reg) return errorResponse('not_found');

  return jsonResponse({ ticketCode: reg.ticket_code });
});
