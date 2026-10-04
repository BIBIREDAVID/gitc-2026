import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useEventSettings } from '../lib/useEventSettings';
import { PICKUP_POINTS } from '../config/formOptions';
import { buildGoogleCalendarUrl, buildIcsContent, downloadIcs } from '../lib/calendar';
import './Ticket.css';

function pickupLabel(id) {
  return PICKUP_POINTS.find((p) => p.id === id)?.label || id;
}

export default function Ticket() {
  const { code } = useParams();
  const { settings } = useEventSettings();
  const [state, setState] = useState('loading'); // loading | found | not_found | error
  const [ticket, setTicket] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef(null);

  function load() {
    let cancelled = false;

    (async () => {
      if (!isSupabaseConfigured) {
        setState('error');
        return;
      }
      setState('loading');
      try {
        const { data, error } = await supabase.rpc('get_ticket_by_code', { p_code: code });
        if (cancelled) return;
        if (error) {
          // A genuine "not found" just means the RPC returned zero rows
          // (see below) — an actual thrown error here means the request
          // itself failed (offline, Supabase down), which gets a different,
          // less misleading message than "bad link".
          console.error('[Ticket] failed to load ticket', error);
          setState('error');
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) {
          setState('not_found');
          return;
        }
        setTicket({ fullName: row.full_name, pickup: row.pickup, checkedIn: row.checked_in });
        setState('found');
      } catch (err) {
        console.error('[Ticket] failed to load ticket', err);
        if (!cancelled) setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }

  useEffect(load, [code]);

  useEffect(() => {
    if (state !== 'found') return;
    QRCode.toDataURL(code, { margin: 1, width: 480, color: { dark: '#0a0118', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch((err) => console.error('[Ticket] failed to generate QR code', err));
  }, [state, code]);

  async function handleSaveImage() {
    if (!qrDataUrl || !ticket) return;
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      const width = 640;
      const height = 920;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#120726');
      bgGradient.addColorStop(1, '#0a0118');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#00e5ff';
      ctx.font = '600 22px monospace';
      ctx.fillText('GITC 2026 TICKET', width / 2, 80);

      ctx.fillStyle = '#f5f3ff';
      ctx.font = '700 36px sans-serif';
      wrapText(ctx, ticket.fullName, width / 2, 140, width - 120, 42);

      ctx.fillStyle = '#b6a8d9';
      ctx.font = '400 20px sans-serif';
      ctx.fillText(`Pickup: ${pickupLabel(ticket.pickup)}`, width / 2, 220);

      const qrImg = await loadImage(qrDataUrl);
      const qrSize = 420;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((width - qrSize) / 2 - 10, 260 - 10, qrSize + 20, qrSize + 20);
      ctx.drawImage(qrImg, (width - qrSize) / 2, 260, qrSize, qrSize);

      ctx.fillStyle = '#b6a8d9';
      ctx.font = '400 18px monospace';
      ctx.fillText(code, width / 2, 260 + qrSize + 50);

      ctx.fillStyle = '#ff2fe0';
      ctx.font = '600 16px monospace';
      ctx.fillText('GET INTO TECH CONFERENCE 2.0 — LASU', width / 2, height - 40);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gitc-2026-ticket-${code}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } finally {
      setSaving(false);
    }
  }

  if (state === 'loading') {
    return (
      <div className="ticket-page">
        <p className="mono-label">Loading your ticket…</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="ticket-page">
        <div className="ticket-card ticket-not-found">
          <p className="mono-label">Connection problem</p>
          <h1>We couldn't load your ticket</h1>
          <p>Check your connection and try again — your ticket is still safe.</p>
          <div className="ticket-actions">
            <button type="button" className="btn-primary" onClick={load}>
              Try again
            </button>
            <Link to="/" className="ticket-back">
              ← Back to the homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'not_found') {
    return (
      <div className="ticket-page">
        <div className="ticket-card ticket-not-found">
          <p className="mono-label">Not found</p>
          <h1>We couldn't find that ticket</h1>
          <p>
            The link might be mistyped, or the ticket may no longer exist. If you already
            registered, try finding your ticket by email and WhatsApp number instead.
          </p>
          <div className="ticket-actions">
            <Link to="/find-ticket" className="btn-primary">
              Find my ticket
            </Link>
            <Link to="/" className="ticket-back">
              ← Back to the homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const whatsappMessage = `I'm going to GITC 2026 — Get Into Tech Conference 2.0 at LASU! Register free: ${siteUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  const showCalendar = Boolean(settings.dateTime);
  const calendarEvent = showCalendar
    ? {
        title: settings.title || 'Get Into Tech Conference 2.0',
        description: 'GITC 2026 — Get Into Tech Conference 2.0, in partnership with Zenith Bank.',
        location: settings.venue || 'LASU',
        dateTime: settings.dateTime,
        uid: code,
      }
    : null;

  return (
    <div className="ticket-page">
      <div className="ticket-card" ref={cardRef}>
        <p className="mono-label">You're registered</p>
        <h1 className="ticket-title">See you at GITC 2026</h1>

        <div className="ticket-qr-wrap">
          {qrDataUrl && <img src={qrDataUrl} alt={`QR code for ticket ${code}`} className="ticket-qr" />}
        </div>

        <div className="ticket-details">
          <p className="ticket-name">{ticket.fullName}</p>
          <p className="ticket-pickup">Pickup: {pickupLabel(ticket.pickup)}</p>
          <p className="ticket-code mono-label">{code}</p>
        </div>

        <div className="ticket-actions">
          <button type="button" className="btn-primary" onClick={handleSaveImage} disabled={saving}>
            {saving ? 'Saving…' : 'Save ticket as image'}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary ticket-whatsapp"
          >
            Share on WhatsApp
          </a>

          {showCalendar && (
            <div className="ticket-calendar">
              <a
                href={buildGoogleCalendarUrl(calendarEvent)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Add to Google Calendar
              </a>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  downloadIcs(buildIcsContent(calendarEvent), `gitc-2026-${code}.ics`)
                }
              >
                Download .ics
              </button>
            </div>
          )}
        </div>

        <Link to="/" className="ticket-back">
          ← Back to the homepage
        </Link>
      </div>
    </div>
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = (text || '').split(' ');
  let line = '';
  let lineY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, lineY);
}
