import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

function fromRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    whatsapp: row.whatsapp,
    pickup: row.pickup,
    pickupOther: row.pickup_other,
    pickupPoint: row.pickup_point,
    isStudent: row.is_student,
    department: row.department,
    laptop: row.laptop,
    gender: row.gender,
    role: row.role,
    roleOther: row.role_other,
    interests: row.interests || [],
    interestsOther: row.interests_other,
    consent: row.consent,
    source: row.source,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    checkedIn: row.checked_in,
    checkedInAt: row.checked_in_at,
    ticketCode: row.ticket_code,
  };
}

// Real-time list of all registrations, newest first. Filtering/search/sort
// within the admin UI happens client-side over this array — the dataset for
// a single-event conference is small enough that this is simpler and faster
// than composite queries for every filter combination.
//
// `enabled` should be false until the caller is actually signed in as
// staff/admin — AdminApp/CheckInApp mount (and call this hook) before login
// finishes, and RLS correctly returns zero rows for that still-anonymous
// moment. Without gating on `enabled` (and re-running once it flips true),
// this hook's one-shot effect captures that empty result and never
// refetches, even after a real session exists.
export function useRegistrations(enabled = true) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }
    if (!enabled) {
      return undefined; // still waiting on auth — keep `loading: true`
    }

    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (fetchError) {
        console.error('[useRegistrations]', fetchError);
        setLoading(false);
        setError('Could not load live data. Check your connection — the list below may be out of date.');
        return;
      }
      setRegistrations(data.map(fromRow));
      setLoading(false);
      setError(null);
    }

    load();

    const channel = supabase
      .channel('registrations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        () => load() // small dataset — just refetch on any change
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return { registrations, loading, error };
}
