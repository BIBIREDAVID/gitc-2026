// Replaces functions/src/checkIn.js's `checkInManual`. Requires staff or admin.
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = serviceClient();
  const user = await requireUser(req, supabase);
  if (!user || (!user.isStaff && !user.isAdmin)) {
    return errorResponse('permission_denied', 403);
  }

  let payload: { registrationId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return errorResponse('invalid');
  }
  const registrationId = payload.registrationId;
  if (!registrationId || typeof registrationId !== 'string') {
    return errorResponse('invalid');
  }

  const { data, error } = await supabase.rpc('check_in', {
    p_ticket_code: null,
    p_registration_id: registrationId,
    p_actor: user.id,
  });

  if (error) {
    console.error('[check-in-manual] rpc error', error);
    return errorResponse('invalid', 500);
  }

  if (data.status === 'not_found') return errorResponse('not_found', 404);

  return jsonResponse({
    status: data.status,
    fullName: data.full_name,
    pickup: data.pickup,
    checkedInAt: data.checked_in_at,
  });
});
