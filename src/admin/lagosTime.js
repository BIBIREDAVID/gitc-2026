// Africa/Lagos is UTC+1 year-round (no DST), so this is plain fixed-offset
// arithmetic — deliberately not relying on the browser's own timezone, so a
// datetime-local value always means "this clock time in Lagos" no matter
// where the admin happens to be.
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

// "2026-03-05T18:00" (Lagos wall-clock) -> Date (UTC instant)
export function lagosInputToDate(value) {
  if (!value) return null;
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - LAGOS_OFFSET_MS;
  return new Date(utcMs);
}

// Date (UTC instant) -> "2026-03-05T18:00" (Lagos wall-clock) for a
// datetime-local input's value.
export function dateToLagosInputValue(date) {
  if (!date) return '';
  const lagos = new Date(date.getTime() + LAGOS_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, '0');
  return `${lagos.getUTCFullYear()}-${pad(lagos.getUTCMonth() + 1)}-${pad(lagos.getUTCDate())}T${pad(lagos.getUTCHours())}:${pad(lagos.getUTCMinutes())}`;
}

export function formatLagos(dateOrIso) {
  if (!dateOrIso) return null;
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (Number.isNaN(date.getTime())) return null;
  const lagos = new Date(date.getTime() + LAGOS_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, '0');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const hours24 = lagos.getUTCHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const ampm = hours24 < 12 ? 'AM' : 'PM';
  return `${months[lagos.getUTCMonth()]} ${lagos.getUTCDate()}, ${lagos.getUTCFullYear()}, ${hours12}:${pad(lagos.getUTCMinutes())} ${ampm} WAT`;
}
