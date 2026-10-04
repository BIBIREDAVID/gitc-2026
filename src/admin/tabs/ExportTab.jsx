import { useMemo } from 'react';
import { applyFilters } from '../filterRegistrations';
import { REGISTRATION_COLUMNS } from '../registrationColumns';
import { toCsv, downloadCsv } from '../../lib/csv';
import FiltersToolbar from '../components/FiltersToolbar';

export default function ExportTab({ registrations, loading, filters, setFilters }) {
  const filtered = useMemo(() => applyFilters(registrations, filters), [registrations, filters]);

  function handleExport() {
    const csv = toCsv(filtered, REGISTRATION_COLUMNS);
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `gitc-2026-registrations-${date}.csv`);
  }

  if (loading) return <p className="mono-label">Loading…</p>;

  return (
    <section className="admin-section">
      <h2>Export</h2>

      <FiltersToolbar filters={filters} onChange={setFilters} />

      <p className="admin-export-summary">
        This exports exactly the {filtered.length} registration{filtered.length === 1 ? '' : 's'}{' '}
        matching the filters above (same filters as the Registrations tab) as a CSV file.
      </p>

      <button type="button" className="btn-primary" onClick={handleExport} disabled={filtered.length === 0}>
        Download CSV ({filtered.length})
      </button>
    </section>
  );
}
