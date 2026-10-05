// Replaces functions/src/sendTicketEmail.js + email.js. Invoked by a
// Database Webhook (Dashboard -> Database -> Webhooks) on INSERT to
// registrations — the Supabase equivalent of a Firestore onCreate trigger.
// That webhook is dashboard/SQL config, not something this file can set up
// by itself; see README.md. Deliberately NOT done as a SQL migration trigger:
// Supabase Database Webhooks need the caller's service-role key in a request
// header, and the dashboard stores that in Vault — a hand-written SQL
// trigger would have to embed it as a literal argument, i.e. a secret
// committed to the repo. Not worth it to save one manual setup step.
//
// The actual send (EmailJS call, date formatting, etc.) lives in
// _shared/sendTicketEmail.ts, shared with resend-ticket-email (the admin
// portal's Resend button) — this file is just the webhook adapter.
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/auth.ts';
import { sendTicketEmailIfEnabled } from '../_shared/sendTicketEmail.ts';

interface WebhookPayload {
  record?: {
    email: string;
    full_name: string;
    ticket_code: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const payload: WebhookPayload = await req.json().catch(() => ({}));
  const record = payload.record;
  if (!record) return jsonResponse({ ok: true });

  const supabase = serviceClient();
  const status = await sendTicketEmailIfEnabled(supabase, record);

  return jsonResponse({ ok: true, status });
});
