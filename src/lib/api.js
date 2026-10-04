import { supabase, isSupabaseConfigured } from './supabase';

// Error codes the backend can reject with. Register.jsx and FindTicket.jsx
// already know how to render each one.
export const REGISTRATION_ERROR_CODES = ['already_registered', 'closed', 'full', 'invalid'];

export class RegistrationError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'RegistrationError';
    this.code = code;
  }
}

async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // supabase-js surfaces a non-2xx response as a FunctionsHttpError with
    // the parsed body on `.context` in recent versions, but the most
    // reliable way to get our own { error: { code } } shape back is to
    // re-read the response the error wraps.
    let code = 'unknown';
    try {
      const body = await error.context?.json();
      code = body?.error?.code || code;
    } catch {
      // ignore — fall through with 'unknown'
    }
    throw new RegistrationError(code, error.message);
  }
  return data;
}

// Calls the `register` Edge Function (service role, transactional via the
// register_attendee() SQL function — see supabase/migrations). Visitors
// never write to the database directly (CLAUDE.md rule 3).
export async function submitRegistration(payload) {
  if (!isSupabaseConfigured) {
    throw new RegistrationError('invalid', 'Registration service is not configured.');
  }
  return invoke('register', payload); // { ticketCode }
}

// Calls the `find-ticket` Edge Function.
export async function findTicket({ email, whatsapp }) {
  if (!isSupabaseConfigured) {
    throw new RegistrationError('not_found', 'Ticket lookup is not configured.');
  }
  return invoke('find-ticket', { email, whatsapp }); // { ticketCode }
}
