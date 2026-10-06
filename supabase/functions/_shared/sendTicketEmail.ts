// Shared by send-ticket-email (webhook-triggered, on registration insert)
// and resend-ticket-email (admin-triggered, from the Registrations tab) —
// both need the exact same "build and send one ticket email" logic.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// Africa/Lagos is UTC+1 year-round (no DST) — same fixed-offset approach as
// src/admin/lagosTime.js, ported here since Edge Functions don't share code
// with the front end.
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatLagos(isoString: string | null): string {
  if (!isoString) return 'Date & time to be announced';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Date & time to be announced';
  const lagos = new Date(date.getTime() + LAGOS_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hours24 = lagos.getUTCHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const ampm = hours24 < 12 ? 'AM' : 'PM';
  return `${WEEKDAYS[lagos.getUTCDay()]}, ${MONTHS[lagos.getUTCMonth()]} ${lagos.getUTCDate()}, ${lagos.getUTCFullYear()} · ${hours12}:${pad(lagos.getUTCMinutes())} ${ampm} WAT`;
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
// without touching caller logic. Uses EmailJS's plain REST API
// (https://api.emailjs.com/api/v1.0/email/send) rather than their JS SDK,
// which is browser-only and doesn't run in a Deno Edge Function.
async function sendTicketEmailViaProvider(opts: {
  to: string;
  fullName: string;
  ticketCode: string;
  eventDateTime: string | null;
  eventVenue: string;
}): Promise<boolean> {
  const config = emailJsConfig();
  if (!config) return false;

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
        event_date_time: formatLagos(opts.eventDateTime),
        event_venue: opts.eventVenue,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[email] EmailJS send failed (${res.status}): ${body}`);
    return false;
  }
  return true;
}

export interface TicketEmailRecord {
  email: string;
  full_name: string;
  ticket_code: string;
}

// Checks settings.email_enabled + EmailJS config (rule 4 — TBA-safe while
// email stays off), then sends. Returns a status so callers (the bulk
// resend endpoint especially) can report what actually happened per row.
export async function sendTicketEmailIfEnabled(
  supabase: SupabaseClient,
  record: TicketEmailRecord
): Promise<'sent' | 'skipped' | 'failed'> {
  const { data: settings } = await supabase
    .from('settings')
    .select('email_enabled, date_time, venue')
    .eq('id', 1)
    .maybeSingle();

  if (!settings?.email_enabled || !emailJsConfig()) {
    return 'skipped';
  }

  const ok = await sendTicketEmailViaProvider({
    to: record.email,
    fullName: record.full_name,
    ticketCode: record.ticket_code,
    eventDateTime: settings.date_time,
    eventVenue: settings.venue || 'LASU, Makojuola Hall',
  });

  return ok ? 'sent' : 'failed';
}
