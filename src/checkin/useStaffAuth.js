import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// status: 'checking' | 'signed-out' | 'denied' | 'authed'
// Same shape as src/admin/useAdminAuth.js, but allows staff OR admin claims.
export function useStaffAuth() {
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('signed-out');
      return undefined;
    }

    async function evaluate(session) {
      if (!session?.user) {
        setUser(null);
        setStatus('signed-out');
        return;
      }
      const meta = session.user.app_metadata || {};
      if (meta.staff === true || meta.admin === true) {
        setUser(session.user);
        setStatus('authed');
      } else {
        await supabase.auth.signOut();
        setUser(null);
        setStatus('denied');
      }
    }

    supabase.auth.getSession().then(({ data }) => evaluate(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    if (!isSupabaseConfigured) {
      setError('Check-in login is not configured.');
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(loginErrorMessage(signInError));
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { status, user, error, login, logout };
}

function loginErrorMessage(err) {
  if (err?.message?.toLowerCase().includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (err?.status === 429) return 'Too many attempts. Please try again later.';
  return 'Something went wrong signing in. Please try again.';
}
