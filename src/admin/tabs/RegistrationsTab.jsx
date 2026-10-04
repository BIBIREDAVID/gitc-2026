import { useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { applyFilters } from '../filterRegistrations';
import {
  schoolLabel,
  pickupPointLabel,
  genderLabel,
  roleLabel,
  interestsLabel,
  yesNoLabel,
  formatDateTime,
} from '../registrationLabels';
import FiltersToolbar from '../components/FiltersToolbar';
import ConfirmDialog from '../components/ConfirmDialog';

const PAGE_SIZE = 20;

export default function RegistrationsTab({ registrations, loading, filters, setFilters }) {
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const filtered = useMemo(() => applyFilters(registrations, filters), [registrations, filters]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  function handleFiltersChange(next) {
    setFilters(next);
    setPage(1);
  }

  function toggleSort() {
    setFilters((f) => ({ ...f, sortDir: f.sortDir === 'desc' ? 'asc' : 'desc' }));
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.functions.invoke('admin-delete-registration', {
      body: { registrationId: pendingDelete.id },
    });
    if (error) {
      console.error('[RegistrationsTab] delete failed', error);
      setDeleteError('Failed to delete. Please try again.');
    } else {
      setPendingDelete(null);
    }
    setDeleting(false);
  }

  if (loading) return <p className="mono-label">Loading registrations…</p>;

  return (
    <section className="admin-section">
      <h2>Registrations</h2>

      <FiltersToolbar filters={filters} onChange={handleFiltersChange} />

      <p className="admin-count">
        {filtered.length} of {registrations.length} registrations
      </p>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>WhatsApp</th>
              <th>School</th>
              <th>Pickup point</th>
              <th>Student</th>
              <th>Department</th>
              <th>Laptop</th>
              <th>Gender</th>
              <th>Role</th>
              <th>Interests</th>
              <th>Source</th>
              <th onClick={toggleSort}>Registered at {filters.sortDir === 'desc' ? '↓' : '↑'}</th>
              <th>Checked in</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id}>
                <td>{r.fullName}</td>
                <td>{r.email}</td>
                <td>{r.whatsapp}</td>
                <td>{schoolLabel(r.pickup)}</td>
                <td>{pickupPointLabel(r.pickupPoint)}</td>
                <td>{yesNoLabel(r.isStudent)}</td>
                <td>{r.department || '—'}</td>
                <td>{yesNoLabel(r.laptop)}</td>
                <td>{genderLabel(r.gender)}</td>
                <td>{roleLabel(r.role)}</td>
                <td>{interestsLabel(r.interests)}</td>
                <td>{r.source || '—'}</td>
                <td>{formatDateTime(r.createdAt)}</td>
                <td>
                  <span className={`admin-badge ${r.checkedIn ? 'admin-badge-yes' : ''}`}>
                    {r.checkedIn ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="admin-delete-btn"
                    onClick={() => setPendingDelete(r)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-reg-cards">
        {pageRows.map((r) => (
          <div className="admin-reg-card" key={r.id}>
            <div className="admin-reg-card-name">{r.fullName}</div>
            <div className="admin-reg-card-row">
              <span>{r.email}</span>
              <span>{r.whatsapp}</span>
            </div>
            <div className="admin-reg-card-row">
              <span>{schoolLabel(r.pickup)}</span>
              <span className={`admin-badge ${r.checkedIn ? 'admin-badge-yes' : ''}`}>
                {r.checkedIn ? 'Checked in' : 'Not checked in'}
              </span>
            </div>
            <div className="admin-reg-card-row">
              <span>Pickup point: {pickupPointLabel(r.pickupPoint)}</span>
            </div>
            <div className="admin-reg-card-row">
              <span>Student: {yesNoLabel(r.isStudent)}</span>
              <span>Laptop: {yesNoLabel(r.laptop)}</span>
            </div>
            <div className="admin-reg-card-row">
              <span>{genderLabel(r.gender)}</span>
              <span>{roleLabel(r.role)}</span>
            </div>
            <div className="admin-reg-card-row">
              <span>{interestsLabel(r.interests)}</span>
            </div>
            <div className="admin-reg-card-row">
              <span>{formatDateTime(r.createdAt)}</span>
              <button
                type="button"
                className="admin-delete-btn"
                onClick={() => setPendingDelete(r)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-pagination">
        <button type="button" onClick={() => setPage((p) => p - 1)} disabled={pageSafe <= 1}>
          ←
        </button>
        <span className="mono-label">
          Page {pageSafe} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={pageSafe >= totalPages}
        >
          →
        </button>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete registration?"
          message={`This permanently deletes ${pendingDelete.fullName}'s registration, ticket, and dedupe records. This can't be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => {
            setPendingDelete(null);
            setDeleteError(null);
          }}
          busy={deleting}
        />
      )}
      {deleteError && (
        <p className="admin-error" role="alert">
          {deleteError}
        </p>
      )}
    </section>
  );
}
