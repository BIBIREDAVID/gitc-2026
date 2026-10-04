// Calendar links for the ticket page. Only used once settings/event.dateTime
// is actually set — see CLAUDE.md rule 4 (TBA-safe).

const DEFAULT_DURATION_HOURS = 6; // no end time is collected, so assume a one-day event

function toGoogleDateString(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildGoogleCalendarUrl({ title, description, location, dateTime }) {
  const start = new Date(dateTime);
  const end = new Date(start.getTime() + DEFAULT_DURATION_HOURS * 3_600_000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toGoogleDateString(start)}/${toGoogleDateString(end)}`,
    details: description,
    location: location || '',
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(text) {
  return String(text || '').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
}

export function buildIcsContent({ title, description, location, dateTime, uid }) {
  const start = new Date(dateTime);
  const end = new Date(start.getTime() + DEFAULT_DURATION_HOURS * 3_600_000);
  const stamp = toGoogleDateString(new Date());

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GITC 2026//Registration//EN',
    'BEGIN:VEVENT',
    `UID:${uid}@gitc2026`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toGoogleDateString(start)}`,
    `DTEND:${toGoogleDateString(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location || '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(icsContent, filename) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
