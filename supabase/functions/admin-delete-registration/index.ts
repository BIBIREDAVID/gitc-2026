// Replaces functions/src/adminDeleteRegistration.js. Admin only.
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = serviceClient();
  const user = await requireUser(req, supabase);
  if (!user || !user.isAdmin) {
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

  const { data, error } = await supabase.rpc('admin_delete_registration', {
    p_registration_id: registrationId,
  });

  if (error) {
    console.error('[admin-delete-registration] rpc error', error);
    return errorResponse('invalid', 500);
  }
  if (data.status === 'not_found') return errorResponse('not_found', 404);

  return jsonResponse({ ok: true });
});
