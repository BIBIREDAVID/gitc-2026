import { useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStaffAuth } from './useStaffAuth';
import PageLoading from '../components/PageLoading';
import CheckInLogin from './CheckInLogin';
import Scanner from './Scanner';
import ManualSearch from './ManualSearch';
import ResultOverlay from './ResultOverlay';
import './checkin.css';

const OVERLAY_MS = 2500;

function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  useEffect(() => {
    function on() {
      setOnline(true);
    }
    function off() {
      setOnline(false);
    }
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function CheckInApp() {
  const { status, error, login, logout } = useStaffAuth();
  const online = useOnlineStatus();
  const [stats, setStats] = useState({ total: 0, checkedIn: 0 });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [manualCheckingInId, setManualCheckingInId] = useState(null);
  const overlayTimer = useRef(null);

  useEffect(() => {
    if (status !== 'authed' || !isSupabaseConfigured) return undefined;

    function applyRow(row) {
      setStats({ total: row?.total || 0, checkedIn: row?.checked_in || 0 });
    }

    supabase
      .from('stats')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => applyRow(data));

    const channel = supabase
      .channel('checkin-stats-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stats', filter: 'id=eq.1' },
        (payload) => applyRow(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [status]);

  useEffect(() => () => clearTimeout(overlayTimer.current), []);

  function showResult(payload) {
    if (navigator.vibrate) navigator.vibrate(150);
    setResult(payload);
    clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => {
      setResult(null);
      setBusy(false);
    }, OVERLAY_MS);
  }

  async function handleScan(code) {
    if (busy || !online || !isSupabaseConfigured) return;
    setBusy(true);
    const { data, error: fnError } = await supabase.functions.invoke('check-in', {
      body: { code },
    });
    if (fnError) {
      const errCode = await errorCode(fnError);
      showResult(errCode === 'not_found' ? { status: 'not_found' } : { status: 'error' });
      return;
    }
    showResult({
      status: data.status,
      fullName: data.fullName,
      pickup: data.pickup,
      checkedInAt: data.checkedInAt,
    });
  }

  async function handleManualCheckIn(reg) {
    if (busy || !online || !isSupabaseConfigured) return false;
    setBusy(true);
    setManualCheckingInId(reg.id);
    const { data, error: fnError } = await supabase.functions.invoke('check-in-manual', {
      body: { registrationId: reg.id },
    });
    setManualCheckingInId(null);
    if (fnError) {
      const errCode = await errorCode(fnError);
      showResult(errCode === 'not_found' ? { status: 'not_found' } : { status: 'error' });
      return false;
    }
    showResult({
      status: data.status,
      fullName: data.fullName,
      pickup: data.pickup,
      checkedInAt: data.checkedInAt,
    });
    return data.status === 'checked_in';
  }

  if (status === 'checking') {
    return <PageLoading />;
  }

  if (status !== 'authed') {
    return <CheckInLogin status={status} error={error} onLogin={login} />;
  }

  return (
    <div className="checkin-shell">
      {!online && (
        <div className="checkin-offline-banner" role="alert">
          You're offline — check-ins won't be saved.
        </div>
      )}

      <header className="checkin-topbar">
        <div className="checkin-counter">
          <div className="checkin-counter-value">
            {stats.checkedIn} / {stats.total}
          </div>
          <div className="checkin-counter-label">Checked in</div>
        </div>
        <button type="button" className="checkin-signout" onClick={logout}>
          Sign out
        </button>
      </header>

      <div className="checkin-content">
        <Scanner onDecode={handleScan} paused={busy} />
        <ManualSearch
          onCheckIn={handleManualCheckIn}
          busy={busy}
          checkingInId={manualCheckingInId}
        />
      </div>

      <ResultOverlay result={result} />
    </div>
  );
}

async function errorCode(fnError) {
  try {
    const body = await fnError.context?.json();
    return body?.error?.code;
  } catch {
    return null;
  }
}
