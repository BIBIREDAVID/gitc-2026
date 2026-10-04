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
// No-ops unless settings.email_enabled is true and all EMAILJS_* secrets
// exist — same TBA-safe behaviour as the Firebase version (rule 4).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

interface WebhookPayload {
  record?: {
    email: string;
    full_name: string;
    ticket_code: string;
  };
}

function emailJsConfig() {
  const serviceId = Deno.env.get('EMAILJS_SERVICE_ID');
  const templateId = Deno.env.get('EMAILJS_TEMPLATE_ID');
  const publicKey = Deno.env.get('EMAILJS_PUBLIC_KEY');
  const privateKey = Deno.env.get('EMAILJS_PRIVATE_KEY');
  if (!serviceId || !templateId || !publicKey || !privateKey) return null;
  return { serviceId, templateId, publicKey, privateKey };
}

// The actual provider call, isolated here so it can be swapped later
// without touching the trigger logic below. Uses EmailJS's plain REST API
// (https://api.emailjs.com/api/v1.0/email/send) rather than their JS SDK,
// which is browser-only and doesn't run in a Deno Edge Function.
async function sendTicketEmailViaProvider(opts: {
  to: string;
  fullName: string;
  ticketCode: string;
}) {
  const config = emailJsConfig();
  if (!config) return;

  const siteUrl = Deno.env.get('SITE_URL') ?? '';
  const ticketUrl = siteUrl ? `${siteUrl}/ticket/${opts.ticketCode}` : `/ticket/${opts.ticketCode}`;

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: config.serviceId,
      template_id: config.templateId,
      user_id: config.publicKey,
      // Required for server-side (non-browser-origin) calls — EmailJS
      // rejects API calls without it unless "allow non-browser requests"
      // is turned on for the account, which is itself a weaker safeguard.
      accessToken: config.privateKey,
      template_params: {
        to_email: opts.to,
        to_name: opts.fullName,
        ticket_code: opts.ticketCode,
        ticket_url: ticketUrl,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[email] EmailJS send failed (${res.status}): ${body}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const payload: WebhookPayload = await req.json().catch(() => ({}));
  const record = payload.record;
  if (!record) return jsonResponse({ ok: true });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: settings } = await supabase
    .from('settings')
    .select('email_enabled')
    .eq('id', 1)
    .maybeSingle();

  if (!settings?.email_enabled || !emailJsConfig()) {
    return jsonResponse({ ok: true, skipped: true });
  }

  await sendTicketEmailViaProvider({
    to: record.email,
    fullName: record.full_name,
    ticketCode: record.ticket_code,
  });

  return jsonResponse({ ok: true });
});
