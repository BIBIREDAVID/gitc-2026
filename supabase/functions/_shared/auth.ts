import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export interface StaffUser {
  id: string;
  isAdmin: boolean;
  isStaff: boolean;
}

// Verifies the caller's JWT (from the Authorization header) and reads their
// app_metadata — the Supabase equivalent of Firebase custom claims, settable
// only via the Admin API (scripts/setRole.js), never by the user themselves.
export async function requireUser(
  req: Request,
  supabase: SupabaseClient
): Promise<StaffUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const meta = (user.app_metadata || {}) as Record<string, unknown>;
  return { id: user.id, isAdmin: meta.admin === true, isStaff: meta.staff === true };
}

export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}
