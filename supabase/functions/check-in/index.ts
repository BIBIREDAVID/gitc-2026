// Replaces functions/src/checkIn.js's `checkIn`. Requires staff or admin.
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/auth.ts';

const MAX_CODE_LEN = 500;

// Accepts either a bare ticket code or a scanned URL ending in /ticket/<code>.
function normalizeCode(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string' || raw.length > MAX_CODE_LEN) return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/\/ticket\/([A-Za-z0-9_-]+)\/?$/);
  return match ? match[1] : trimmed;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = serviceClient();
  const user = await requireUser(req, supabase);
  if (!user || (!user.isStaff && !user.isAdmin)) {
    return errorResponse('permission_denied', 403);
  }

  let payload: { code?: unknown };
  try {
    payload = await req.json();
  } catch {
    return errorResponse('invalid');
  }
  const code = normalizeCode(payload.code);
  if (!code) return errorResponse('invalid');

  const { data, error } = await supabase.rpc('check_in', {
    p_ticket_code: code,
    p_registration_id: null,
    p_actor: user.id,
  });

  if (error) {
    console.error('[check-in] rpc error', error);
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
