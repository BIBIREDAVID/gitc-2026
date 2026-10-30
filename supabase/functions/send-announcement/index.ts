// Admin-only. Backs the admin portal's Email tab: sends a custom
// announcement (admin-written subject + message) to a chosen set of
// registrations — the tab picks recipients by school and sends their IDs
// here in small batches, so one request never runs long enough to time out.
//
// Same Gmail SMTP account and same settings.email_enabled master switch as
// the ticket emails (see _shared/sendTicketEmail.ts) — rule 4, TBA-safe.
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/auth.ts';
import { gmailConfig, escapeHtml } from '../_shared/sendTicketEmail.ts';

const MAX_BATCH = 25;
const MAX_SUBJECT = 150;
const MAX_MESSAGE = 5000;

function buildHtml(opts: { fullName: string; subject: string; message: string; siteUrl: string }) {
  const name = escapeHtml(opts.fullName);
  const subject = escapeHtml(opts.subject);
  // Escape first, then turn the admin's line breaks into real ones.
  const body = escapeHtml(opts.message)
    .split(/\n{2,}/)
    .map((para) => `<p style="color: #b6a8d9; line-height: 1.5">${para.replace(/\n/g, '<br />')}</p>`)
    .join('');
  const link = opts.siteUrl
    ? `<p style="color: #b6a8d9; text-align: center; font-size: 12px"><a href="${opts.siteUrl}" style="color: #3ad6e0">${escapeHtml(opts.siteUrl.replace(/^https?:\/\//, ''))}</a></p>`
    : '';
  return `
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; padding: 14px 8px; background-color: #0a0a16;">
  <table role="presentation" width="100%" align="center" bgcolor="#0a0a16" style="background-color: #0a0a16; max-width: 600px; margin: auto; border-collapse: collapse">
    <tr>
      <td bgcolor="#14132a" style="background-color: #14132a; border-top: 4px solid #3ad6e0; padding: 20px">
        <span style="color: #b6a8d9; font-size: 12px; text-transform: uppercase; letter-spacing: 1px">GITC 2026</span><br />
        <span style="font-size: 18px; color: #f5f3ff"><strong>${subject}</strong></span>
      </td>
    </tr>
    <tr>
      <td bgcolor="#14132a" style="background-color: #14132a; padding: 0 20px 28px">
        <p style="color: #f5f3ff">Hi ${name},</p>
        ${body}
        ${link}
      </td>
    </tr>
  </table>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = serviceClient();
  const user = await requireUser(req, supabase);
  if (!user || !user.isAdmin) {
    return errorResponse('permission_denied', 403);
  }

  let payload: { subject?: unknown; message?: unknown; registrationIds?: unknown };
  try {
    payload = await req.json();
  } catch {
    return errorResponse('invalid');
  }

  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  const ids: string[] = Array.isArray(payload.registrationIds)
    ? (payload.registrationIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];

  if (!subject || subject.length > MAX_SUBJECT) return errorResponse('invalid');
  if (!message || message.length > MAX_MESSAGE) return errorResponse('invalid');
  if (ids.length === 0) return errorResponse('invalid');
  if (ids.length > MAX_BATCH) return errorResponse('too_many');

  const { data: registrations, error } = await supabase
    .from('registrations')
    .select('id, email, full_name')
    .in('id', ids);

  if (error) {
    console.error('[send-announcement] lookup error', error);
    return errorResponse('invalid', 500);
  }

  const total = registrations?.length ?? 0;

  const { data: settings } = await supabase
    .from('settings')
    .select('email_enabled')
    .eq('id', 1)
    .maybeSingle();
  const config = gmailConfig();
  if (!settings?.email_enabled || !config) {
    return jsonResponse({ ok: true, total, sent: 0, skipped: total, failed: 0 });
  }

  const siteUrl = Deno.env.get('SITE_URL') ?? '';
  // One SMTP connection for the whole batch, rather than one per email.
  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: config.address, password: config.appPassword },
    },
  });

  let sent = 0;
  let failed = 0;
  try {
    for (const reg of registrations ?? []) {
      try {
        await client.send({
          from: `GITC 2026 <${config.address}>`,
          to: reg.email,
          subject,
          content: `Hi ${reg.full_name},\n\n${message}${siteUrl ? `\n\n${siteUrl}` : ''}`,
          html: buildHtml({ fullName: reg.full_name, subject, message, siteUrl }),
        });
        sent++;
      } catch (err) {
        console.error('[send-announcement] send failed', reg.id, err);
        failed++;
      }
    }
  } finally {
    await client.close();
  }

  return jsonResponse({ ok: true, total, sent, skipped: 0, failed });
});
