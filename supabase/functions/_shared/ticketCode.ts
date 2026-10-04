// 16 random bytes -> 22 base64url chars, well over the spec's 20-char
// minimum. Same scheme as the Firebase version (crypto.randomBytes there,
// crypto.getRandomValues here — Deno has no Node `Buffer`).
export function generateTicketCode(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
