import { useState } from 'react';
import { useAdminAuth } from './useAdminAuth';
import { useRegistrations } from './useRegistrations';
import { DEFAULT_FILTERS } from './filterRegistrations';
import PageLoading from '../components/PageLoading';
import AdminLogin from './AdminLogin';
import SettingsTab from './tabs/SettingsTab';
import RegistrationsTab from './tabs/RegistrationsTab';
import StatsTab from './tabs/StatsTab';
import ExportTab from './tabs/ExportTab';
import './admin.css';

const TABS = [
  { id: 'settings', label: 'Settings' },
  { id: 'registrations', label: 'Registrations' },
  { id: 'stats', label: 'Stats' },
  { id: 'export', label: 'Export' },
];

export default function AdminApp() {
  const { status, error, login, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('settings');
  const { registrations, loading, error: registrationsError } = useRegistrations(
    status === 'authed'
  );
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  if (status === 'checking') {
    return <PageLoading />;
  }

  if (status !== 'authed') {
    return <AdminLogin status={status} error={error} onLogin={login} />;
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <h1>GITC 2026 Admin</h1>
        <button type="button" className="admin-signout" onClick={logout}>
          Sign out
        </button>
      </header>

      {registrationsError && (
        <p className="admin-error" role="alert" style={{ padding: '0.75rem 1.25rem', margin: 0 }}>
          {registrationsError}
        </p>
      )}

      <nav className="admin-tabs-desktop" aria-label="Admin sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="admin-tab-btn"
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* A div, not <main> — App.jsx already wraps every route in one
          <main> landmark; a second nested one would be invalid HTML. */}
      <div className="admin-content">
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'registrations' && (
          <RegistrationsTab
            registrations={registrations}
            loading={loading}
            filters={filters}
            setFilters={setFilters}
          />
        )}
        {activeTab === 'stats' && <StatsTab registrations={registrations} loading={loading} />}
        {activeTab === 'export' && (
          <ExportTab
            registrations={registrations}
            loading={loading}
            filters={filters}
            setFilters={setFilters}
          />
        )}
      </div>

      <nav className="admin-tabnav-mobile" aria-label="Admin sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="admin-tab-btn"
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
