import { useMemo } from 'react';
import { useEventSettings } from '../../lib/useEventSettings';
import {
  pickupLabel,
  genderLabel,
  roleLabel,
  interestLabel,
  yesNoLabel,
} from '../registrationLabels';
import BarList from '../components/BarList';

function countBy(registrations, getKeyOrKeys, labelFn) {
  const counts = new Map();
  for (const r of registrations) {
    const value = getKeyOrKeys(r);
    const keys = Array.isArray(value) ? value : [value];
    for (const key of keys) {
      if (key === undefined || key === null || key === '') continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ label: labelFn ? labelFn(key) : key, count }))
    .sort((a, b) => b.count - a.count);
}

function signUpsPerDay(registrations) {
  const counts = new Map();
  for (const r of registrations) {
    if (!r.createdAt) continue;
    const key = r.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-14) // last 14 days with activity
    .map(([label, count]) => ({ label, count }));
}

export default function StatsTab({ registrations, loading }) {
  const { settings } = useEventSettings();

  const stats = useMemo(() => {
    const total = registrations.length;
    const checkedIn = registrations.filter((r) => r.checkedIn).length;
    return {
      total,
      checkedIn,
      byPickup: countBy(registrations, (r) => r.pickup, pickupLabel),
      byLaptop: countBy(registrations, (r) => r.laptop, yesNoLabel),
      byStudent: countBy(registrations, (r) => r.isStudent, yesNoLabel),
      byRole: countBy(registrations, (r) => r.role, roleLabel),
      byInterest: countBy(registrations, (r) => r.interests, interestLabel),
      bySource: countBy(registrations, (r) => r.source || 'Direct / unknown'),
      perDay: signUpsPerDay(registrations),
    };
  }, [registrations]);

  if (loading) return <p className="mono-label">Loading stats…</p>;

  const spotsLeft = settings.capacity != null ? Math.max(0, settings.capacity - stats.total) : null;

  return (
    <section className="admin-section">
      <h2>Stats</h2>

      <div className="admin-stat-cards">
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.total}</div>
          <div className="admin-stat-label">Total registered</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.checkedIn}</div>
          <div className="admin-stat-label">Checked in</div>
        </div>
        {spotsLeft !== null && (
          <div className="admin-stat-card">
            <div className="admin-stat-value">{spotsLeft}</div>
            <div className="admin-stat-label">Spots left</div>
          </div>
        )}
      </div>

      <BarList title="By pickup point" data={stats.byPickup} />
      <BarList title="Has a laptop" data={stats.byLaptop} />
      <BarList title="Is a student" data={stats.byStudent} />
      <BarList title="By role" data={stats.byRole} />
      <BarList title="By interest" data={stats.byInterest} />
      <BarList title="Sign-ups per day" data={stats.perDay} />
      <BarList title="By source" data={stats.bySource} />
    </section>
  );
}
