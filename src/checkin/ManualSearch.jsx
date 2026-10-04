import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PICKUP_POINTS } from '../config/formOptions';

function pickupLabel(id) {
  return PICKUP_POINTS.find((p) => p.id === id)?.label || id;
}

function fromRow(row) {
  return { id: row.id, fullName: row.full_name, whatsapp: row.whatsapp, pickup: row.pickup, checkedIn: row.checked_in };
}

export default function ManualSearch({ onCheckIn, busy, checkingInId }) {
  const [registrations, setRegistrations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoaded(true);
      return;
    }
    supabase
      .from('registrations')
      .select('id, full_name, whatsapp, pickup, checked_in')
      .then(({ data, error }) => {
        if (error) console.error('[ManualSearch] failed to load registrations', error);
        setRegistrations((data || []).map(fromRow));
        setLoaded(true);
      });
  }, []);

  const query = search.trim().toLowerCase();
  const results = query
    ? registrations.filter((r) => {
        const haystack = `${r.fullName || ''} ${r.whatsapp || ''}`.toLowerCase();
        return haystack.includes(query);
      })
    : [];

  function handleLocalCheckIn(reg) {
    onCheckIn(reg).then((ok) => {
      if (ok) {
        setRegistrations((regs) =>
          regs.map((r) => (r.id === reg.id ? { ...r, checkedIn: true } : r))
        );
      }
    });
  }

  return (
    <div className="checkin-manual">
      <h2>Manual search</h2>
      <input
        type="search"
        placeholder="Search by name or WhatsApp number"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search registrations by name or WhatsApp number"
      />

      {!loaded && <p className="checkin-empty">Loading registrations…</p>}
      {loaded && query && results.length === 0 && (
        <p className="checkin-empty">No matches.</p>
      )}

      <div className="checkin-results">
        {results.slice(0, 25).map((r) => (
          <div className="checkin-result-row" key={r.id}>
            <div className="checkin-result-info">
              <div className="checkin-result-name">{r.fullName}</div>
              <div className="checkin-result-meta">
                {r.whatsapp} · {pickupLabel(r.pickup)}
              </div>
            </div>
            {r.checkedIn ? (
              <span className="checkin-result-badge">Checked in</span>
            ) : (
              <button
                type="button"
                className="checkin-result-btn"
                disabled={busy}
                onClick={() => handleLocalCheckIn(r)}
              >
                {checkingInId === r.id ? '…' : 'Check in'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
