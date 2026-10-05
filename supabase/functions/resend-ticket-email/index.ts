// Admin-only. Backs the Registrations tab's per-row "Resend" button and the
// "Resend all" button — same underlying send as the webhook-triggered
// send-ticket-email (see _shared/sendTicketEmail.ts), just triggered
// manually instead of on insert. Accepts either a single `registrationId`
// or a `registrationIds` array (bulk/"resend all") in one request.
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/auth.ts';
import { sendTicketEmailIfEnabled } from '../_shared/sendTicketEmail.ts';

// Keeps one bulk request from being used to hammer EmailJS (its free tier
// is 200 requests/day total) or running long enough to time out.
const MAX_BATCH = 500;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = serviceClient();
  const user = await requireUser(req, supabase);
  if (!user || !user.isAdmin) {
    return errorResponse('permission_denied', 403);
  }

  let payload: { registrationId?: unknown; registrationIds?: unknown };
  try {
    payload = await req.json();
  } catch {
    return errorResponse('invalid');
  }

  const ids: string[] = Array.isArray(payload.registrationIds)
    ? (payload.registrationIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : typeof payload.registrationId === 'string'
      ? [payload.registrationId]
      : [];

  if (ids.length === 0) return errorResponse('invalid');
  if (ids.length > MAX_BATCH) return errorResponse('too_many');

  const { data: registrations, error } = await supabase
    .from('registrations')
    .select('id, email, full_name, ticket_code')
    .in('id', ids);

  if (error) {
    console.error('[resend-ticket-email] lookup error', error);
    return errorResponse('invalid', 500);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const reg of registrations ?? []) {
    const status = await sendTicketEmailIfEnabled(supabase, {
      email: reg.email,
      full_name: reg.full_name,
      ticket_code: reg.ticket_code,
    });
    if (status === 'sent') sent++;
    else if (status === 'skipped') skipped++;
    else failed++;
  }

  return jsonResponse({
    ok: true,
    total: registrations?.length ?? 0,
    sent,
    skipped,
    failed,
  });
});
