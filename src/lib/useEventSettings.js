import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export const DEFAULT_EVENT_SETTINGS = {
  title: 'Get Into Tech Conference 2.0',
  dateTime: null,
  venue: 'LASU, Makojuola Hall',
  capacity: null,
  registrationOpen: true,
  registrationDeadline: null,
  emailEnabled: false,
};

function fromRow(row) {
  if (!row) return {};
  return {
    title: row.title,
    dateTime: row.date_time,
    venue: row.venue,
    capacity: row.capacity,
    registrationOpen: row.registration_open,
    registrationDeadline: row.registration_deadline,
    emailEnabled: row.email_enabled,
  };
}

// Reads settings (id=1) in real time via Supabase Realtime, merged over the
// defaults above so the page always has something to render — before the
// row exists, while fields are still TBA, or if Supabase isn't configured.
export function useEventSettings() {
  const [settings, setSettings] = useState(DEFAULT_EVENT_SETTINGS);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSettings(DEFAULT_EVENT_SETTINGS);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('[useEventSettings]', error);
        setSettings({ ...DEFAULT_EVENT_SETTINGS, ...fromRow(data) });
        setLoading(false);
      });

    const channel = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.1' },
        (payload) => {
          setSettings({ ...DEFAULT_EVENT_SETTINGS, ...fromRow(payload.new) });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading };
}
