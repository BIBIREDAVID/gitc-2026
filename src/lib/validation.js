const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the caps in supabase/functions/_shared/validation.ts — the server
// is the source of truth, but the client needs to know the same numbers so
// it can reject (with a helpful message) before submitting, instead of
// letting the server bounce a too-long value back as a generic "invalid".
export const MAX_NAME_LEN = 100;
export const MAX_FREE_TEXT_LEN = 200;

export function validateFullName(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Enter your full name.';
  if (trimmed.length < 2) return 'Name must be at least 2 characters.';
  if (trimmed.length > MAX_NAME_LEN) return `Name must be ${MAX_NAME_LEN} characters or fewer.`;
  return null;
}

export function normalizeEmail(value) {
  return (value || '').trim().toLowerCase();
}

export function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!email) return 'Enter your email address.';
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return null;
}

// Accepts 080..., +23480..., 23480... and normalises to +234XXXXXXXXXX.
// Returns { value, error }, value is null when invalid.
export function normalizePhone(raw) {
  const digits = (raw || '').replace(/[^\d+]/g, '');

  let national; // the 10 digits that follow the leading 0 / country code
  if (digits.startsWith('+234')) {
    national = digits.slice(4);
  } else if (digits.startsWith('234')) {
    national = digits.slice(3);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else {
    national = digits;
  }

  if (!/^\d{10}$/.test(national)) {
    return { value: null, error: 'Enter a valid WhatsApp number, e.g. 0803 123 4567.' };
  }

  return { value: `+234${national}`, error: null };
}

export function validateRequiredChoice(value, message) {
  if (!value) return message || 'Please make a selection.';
  return null;
}

export function validateRequiredText(value, message) {
  const trimmed = (value || '').trim();
  if (!trimmed) return message || 'This field is required.';
  if (trimmed.length > MAX_FREE_TEXT_LEN) {
    return `Please keep this to ${MAX_FREE_TEXT_LEN} characters or fewer.`;
  }
  return null;
}

export function validateInterests(interests) {
  if (!interests || interests.length === 0) return 'Choose at least one area of interest.';
  return null;
}
