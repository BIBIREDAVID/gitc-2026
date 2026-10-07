// Shared by send-ticket-email (webhook-triggered, on registration insert)
// and resend-ticket-email (admin-triggered, from the Registrations tab) —
// both need the exact same "build and send one ticket email" logic.
//
// Sends over plain Gmail SMTP as the GITC Gmail account itself (an "App
// Password," not OAuth/a service account — a free Gmail account can't be
// impersonated via Google Cloud domain-wide delegation, that's Workspace
// only). denomailer is a pure-Deno SMTP client; Supabase Edge Functions run
// on a real Deno runtime (not a V8-isolate-only sandbox), so outbound TLS
// sockets work here the way they wouldn't on something like Cloudflare
// Workers.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

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

function gmailConfig() {
  const address = Deno.env.get('GMAIL_ADDRESS');
  const appPassword = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!address || !appPassword) return null;
  return { address, appPassword };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]!);
}

// Same dark-themed, table-bgcolor ("bulletproof") layout as the EmailJS
// template this replaced — see CLAUDE.md for why: Gmail/other clients'
// dark-mode auto-inversion respects a <td bgcolor> far more reliably than
// a CSS background-color, which is why every colored block is a table
// cell rather than a styled <div>.
function buildHtml(opts: {
  fullName: string;
  ticketCode: string;
  ticketUrl: string;
  eventDateTime: string;
  eventVenue: string;
  flyerUrl: string;
}): string {
  const name = escapeHtml(opts.fullName);
  const code = escapeHtml(opts.ticketCode);
  const venue = escapeHtml(opts.eventVenue);
  return `
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; padding: 14px 8px; background-color: #0a0a16;">
  <table role="presentation" width="100%" align="center" bgcolor="#0a0a16" style="background-color: #0a0a16; max-width: 600px; margin: auto; border-collapse: collapse">
    <tr><td><img style="width: 100%; display: block" src="${opts.flyerUrl}" alt="GITC 2026 — Get Into Tech Conference" /></td></tr>
    <tr>
      <td bgcolor="#14132a" style="background-color: #14132a; border-top: 4px solid #3ad6e0; padding: 20px">
        <span style="font-size: 18px; color: #f5f3ff"><strong>You're registered for GITC 2026!</strong></span>
      </td>
    </tr>
    <tr>
      <td bgcolor="#14132a" style="background-color: #14132a; padding: 0 20px 28px">
        <p style="color: #f5f3ff">Hi ${name},</p>
        <p style="color: #b6a8d9">You're all set for <strong style="color: #f5f3ff">GITC 2026 — Get Into Tech Conference 2.0</strong>.</p>

        <table role="presentation" width="100%" style="margin: 20px 0; border-collapse: collapse">
          <tr>
            <td bgcolor="#0a0a16" style="background-color: #0a0a16; border: 1px solid #fc03c0; border-radius: 8px 8px 0 0; padding: 14px 16px; border-bottom: none">
              <span style="color: #b6a8d9; font-size: 12px; text-transform: uppercase; letter-spacing: 1px">Date &amp; time</span><br />
              <span style="color: #fc03c0; font-size: 15px; font-weight: bold">${escapeHtml(opts.eventDateTime)}</span>
            </td>
          </tr>
          <tr>
            <td bgcolor="#0a0a16" style="background-color: #0a0a16; border: 1px solid #fc03c0; border-radius: 0 0 8px 8px; padding: 14px 16px; border-top: 1px solid rgba(252, 3, 192, 0.3)">
              <span style="color: #b6a8d9; font-size: 12px; text-transform: uppercase; letter-spacing: 1px">Venue</span><br />
              <span style="color: #fc03c0; font-size: 15px; font-weight: bold">${venue}</span>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" style="margin: 0 0 20px">
          <tr>
            <td bgcolor="#0a0a16" style="background-color: #0a0a16; border: 1px solid #3ad6e0; border-radius: 8px; padding: 14px 16px">
              <span style="color: #b6a8d9; font-size: 12px; text-transform: uppercase; letter-spacing: 1px">Ticket code</span><br />
              <span style="color: #3ad6e0; font-size: 16px; font-weight: bold; font-family: 'Courier New', monospace">${code}</span>
            </td>
          </tr>
        </table>

        <table role="presentation" align="center" style="margin: 20px auto">
          <tr>
            <td bgcolor="#fc03c0" style="background-color: #fc03c0; border-radius: 8px">
              <a href="${opts.ticketUrl}" style="display: inline-block; padding: 13px 32px; font-size: 15px; font-weight: bold; color: #0a0a16; text-decoration: none">View your ticket</a>
            </td>
          </tr>
        </table>

        <p style="color: #b6a8d9; text-align: center">See you there!</p>
      </td>
    </tr>
  </table>
</div>`;
}

// The actual send, isolated here so it can be swapped later without
// touching caller logic.
async function sendTicketEmailViaGmail(opts: {
  to: string;
  fullName: string;
  ticketCode: string;
  eventDateTime: string | null;
  eventVenue: string;
}): Promise<boolean> {
  const config = gmailConfig();
  if (!config) return false;

  const siteUrl = Deno.env.get('SITE_URL') ?? '';
  const ticketUrl = siteUrl ? `${siteUrl}/ticket/${opts.ticketCode}` : `/ticket/${opts.ticketCode}`;
  const flyerUrl = siteUrl ? `${siteUrl}/flyer.jpg` : '/flyer.jpg';
  const dateTime = formatLagos(opts.eventDateTime);

  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: config.address, password: config.appPassword },
    },
  });

  try {
    await client.send({
      from: `GITC 2026 <${config.address}>`,
      to: opts.to,
      subject: "You're registered for GITC 2026!",
      content: `Hi ${opts.fullName},\n\nYou're registered for GITC 2026 — Get Into Tech Conference 2.0.\n\nDate & time: ${dateTime}\nVenue: ${opts.eventVenue}\n\nYour ticket: ${ticketUrl}\nTicket code: ${opts.ticketCode}\n\nSee you there!`,
      html: buildHtml({
        fullName: opts.fullName,
        ticketCode: opts.ticketCode,
        ticketUrl,
        eventDateTime: dateTime,
        eventVenue: opts.eventVenue,
        flyerUrl,
      }),
    });
    return true;
  } catch (err) {
    console.error('[email] Gmail SMTP send failed', err);
    return false;
  } finally {
    await client.close();
  }
}

export interface TicketEmailRecord {
  email: string;
  full_name: string;
  ticket_code: string;
}

// Checks settings.email_enabled + Gmail config (rule 4 — TBA-safe while
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

  if (!settings?.email_enabled || !gmailConfig()) {
    return 'skipped';
  }

  const ok = await sendTicketEmailViaGmail({
    to: record.email,
    fullName: record.full_name,
    ticketCode: record.ticket_code,
    eventDateTime: settings.date_time,
    eventVenue: settings.venue || 'LASU, Makojuola Hall',
  });

  return ok ? 'sent' : 'failed';
}
