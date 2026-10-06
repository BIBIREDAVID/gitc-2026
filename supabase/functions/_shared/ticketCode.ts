// Short, human-typeable code for door check-in: 7 characters from a
// 32-symbol alphabet with 0/O/1/I/L removed (visually ambiguous on a
// printed ticket or read aloud). 256 is evenly divisible by 32, so
// `byte % 32` has no modulo bias. 32^7 ≈ 3.4×10^10 possible codes — far
// more than this single event will ever register, so a collision is
// practically impossible; register_attendee()'s existing unique_violation
// handling covers the vanishing chance of one anyway (same path as an
// email/whatsapp collision — see supabase/migrations/20261004000001_register_function.sql).
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LENGTH = 7;

export function generateTicketCode(): string {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return code;
}
