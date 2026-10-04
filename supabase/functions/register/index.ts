// Replaces functions/src/register.js. Deno Edge Function — no auth
// required (same as the Firebase callable: any visitor can call this).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { validateAndNormalize, type RegistrationPayload } from '../_shared/validation.ts';
import { generateTicketCode } from '../_shared/ticketCode.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let payload: RegistrationPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse('invalid');
  }

  // Honeypot: real users never fill this in. Pretend success without
  // writing anything, so a bot has no signal that it was caught.
  if (payload.website) {
    return jsonResponse({ ticketCode: generateTicketCode() });
  }

  const result = validateAndNormalize(payload);
  if (!result.ok) {
    return errorResponse('invalid');
  }
  const data = result.data;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const ticketCode = generateTicketCode();

  const { data: rpcData, error } = await supabase.rpc('register_attendee', {
    p_full_name: data.fullName,
    p_email: data.email,
    p_whatsapp: data.whatsapp,
    p_pickup: data.pickup,
    p_pickup_other: data.pickupOther,
    p_is_student: data.isStudent,
    p_department: data.department,
    p_laptop: data.laptop,
    p_gender: data.gender,
    p_role: data.role,
    p_role_other: data.roleOther,
    p_interests: data.interests,
    p_interests_other: data.interestsOther,
    p_consent: data.consent,
    p_source: data.src || null,
    p_ticket_code: ticketCode,
  });

  if (error) {
    console.error('[register] rpc error', error);
    return errorResponse('invalid', 500);
  }

  const status = rpcData?.status;
  if (status === 'closed') return errorResponse('closed');
  if (status === 'full') return errorResponse('full');
  if (status === 'already_registered') return errorResponse('already_registered');

  return jsonResponse({ ticketCode: rpcData.ticket_code });
});
