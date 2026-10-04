// Ported from functions/src/validation.js (the Firebase Cloud Functions
// version). Deliberately mirrors src/lib/validation.js on the client — the
// client validates for UX, this is the actual source of truth. Keep all
// three in sync by hand; there's no shared package between the Edge
// Functions, /functions (if it still exists), and /src.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PICKUP_IDS = ['unilag', 'medilag', 'yabatech', 'lasucom', 'lasu_ojo', 'other'];
// Bus pickup points for mobilization — a stricter subset of PICKUP_IDS:
// optional, and excludes both 'lasu_ojo' (that's the venue, no bus needed
// from there) and 'other' (it's a fixed list of actual bus routes).
const PICKUP_POINT_IDS = ['unilag', 'medilag', 'yabatech', 'lasucom'];
const YES_NO_IDS = ['yes', 'no'];
const GENDER_IDS = ['male', 'female', 'prefer_not_to_say'];
const ROLE_IDS = [
  'undergraduate',
  'graduate',
  'nysc',
  'secondary',
  'tech_professional',
  'entrepreneur',
  'other',
];
const INTEREST_IDS = [
  'software_dev',
  'ai',
  'data_science',
  'cybersecurity',
  'uiux',
  'product_management',
  'robotics',
  'video_editing',
  'cloud_devops',
  'digital_marketing',
  'career_development',
  'not_sure',
  'other',
];
const NOT_SURE_INTEREST_ID = 'not_sure';
const OTHER_OPTION_ID = 'other';

const MAX_NAME_LEN = 100;
const MAX_FREE_TEXT_LEN = 200;
const MAX_RAW_CONTACT_LEN = 100;
const MAX_INTERESTS = INTEREST_IDS.length;

export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string' || value.length > MAX_RAW_CONTACT_LEN) return '';
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

// Accepts 080..., +23480..., 23480... and normalises to +234XXXXXXXXXX.
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > MAX_RAW_CONTACT_LEN) return null;
  const digits = raw.replace(/[^\d+]/g, '');

  let national: string;
  if (digits.startsWith('+234')) {
    national = digits.slice(4);
  } else if (digits.startsWith('234')) {
    national = digits.slice(3);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else {
    national = digits;
  }

  if (!/^\d{10}$/.test(national)) return null;
  return `+234${national}`;
}

function nonEmptyString(value: unknown, maxLen = MAX_FREE_TEXT_LEN): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLen;
}

export interface RegistrationPayload {
  fullName?: unknown;
  email?: unknown;
  whatsapp?: unknown;
  pickup?: unknown;
  pickupOther?: unknown;
  pickupPoint?: unknown;
  isStudent?: unknown;
  department?: unknown;
  laptop?: unknown;
  gender?: unknown;
  role?: unknown;
  roleOther?: unknown;
  interests?: unknown;
  interestsOther?: unknown;
  consent?: unknown;
  src?: unknown;
  website?: unknown;
}

export interface ValidatedRegistration {
  fullName: string;
  email: string;
  whatsapp: string;
  pickup: string;
  pickupOther: string;
  pickupPoint: string;
  isStudent: string;
  department: string;
  laptop: string;
  gender: string;
  role: string;
  roleOther: string;
  interests: string[];
  interestsOther: string;
  consent: true;
  src: string;
}

export function validateAndNormalize(
  payload: RegistrationPayload
): { ok: true; data: ValidatedRegistration } | { ok: false } {
  if (!payload || typeof payload !== 'object') return { ok: false };

  if (typeof payload.fullName !== 'string' || payload.fullName.length > MAX_NAME_LEN) {
    return { ok: false };
  }
  const fullName = payload.fullName.trim();
  if (fullName.length < 2) return { ok: false };

  const email = normalizeEmail(payload.email);
  if (!isValidEmail(email)) return { ok: false };

  const whatsapp = normalizePhone(payload.whatsapp);
  if (!whatsapp) return { ok: false };

  const pickup = payload.pickup as string;
  if (!PICKUP_IDS.includes(pickup)) return { ok: false };
  let pickupOther = '';
  if (pickup === OTHER_OPTION_ID) {
    if (!nonEmptyString(payload.pickupOther)) return { ok: false };
    pickupOther = (payload.pickupOther as string).trim();
  }

  // Optional — empty string means "not using a pickup point".
  const pickupPoint = typeof payload.pickupPoint === 'string' ? payload.pickupPoint : '';
  if (pickupPoint !== '' && !PICKUP_POINT_IDS.includes(pickupPoint)) return { ok: false };

  const isStudent = payload.isStudent as string;
  if (!YES_NO_IDS.includes(isStudent)) return { ok: false };
  let department = '';
  if (isStudent === 'yes') {
    if (!nonEmptyString(payload.department)) return { ok: false };
    department = (payload.department as string).trim();
  }

  const laptop = payload.laptop as string;
  if (!YES_NO_IDS.includes(laptop)) return { ok: false };

  const gender = payload.gender as string;
  if (!GENDER_IDS.includes(gender)) return { ok: false };

  const role = payload.role as string;
  if (!ROLE_IDS.includes(role)) return { ok: false };
  let roleOther = '';
  if (role === OTHER_OPTION_ID) {
    if (!nonEmptyString(payload.roleOther)) return { ok: false };
    roleOther = (payload.roleOther as string).trim();
  }

  const rawInterests = Array.isArray(payload.interests) ? (payload.interests as unknown[]) : null;
  if (!rawInterests || rawInterests.length === 0 || rawInterests.length > MAX_INTERESTS) {
    return { ok: false };
  }
  if (!rawInterests.every((id) => typeof id === 'string' && INTEREST_IDS.includes(id))) {
    return { ok: false };
  }
  const interests = [...new Set(rawInterests as string[])];
  if (interests.includes(NOT_SURE_INTEREST_ID) && interests.length > 1) return { ok: false };
  let interestsOther = '';
  if (interests.includes(OTHER_OPTION_ID)) {
    if (!nonEmptyString(payload.interestsOther)) return { ok: false };
    interestsOther = (payload.interestsOther as string).trim();
  }

  if (payload.consent !== true) return { ok: false };

  const src =
    typeof payload.src === 'string' ? payload.src.trim().slice(0, 200) : '';

  return {
    ok: true,
    data: {
      fullName,
      email,
      whatsapp,
      pickup,
      pickupOther,
      pickupPoint,
      isStudent,
      department,
      laptop,
      gender,
      role,
      roleOther,
      interests,
      interestsOther,
      consent: true,
      src,
    },
  };
}
