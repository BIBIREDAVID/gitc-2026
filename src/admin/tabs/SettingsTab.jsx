import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DEFAULT_EVENT_SETTINGS } from '../../lib/useEventSettings';
import { lagosInputToDate, dateToLagosInputValue, formatLagos } from '../lagosTime';
import Toggle from '../components/Toggle';

const initialForm = {
  title: DEFAULT_EVENT_SETTINGS.title,
  dateTimeInput: '',
  venue: DEFAULT_EVENT_SETTINGS.venue,
  capacity: '',
  registrationOpen: true,
  deadlineInput: '',
  emailEnabled: false,
};

export default function SettingsTab() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    function applyRow(data) {
      setForm({
        title: data?.title || DEFAULT_EVENT_SETTINGS.title,
        dateTimeInput: dateToLagosInputValue(data?.date_time ? new Date(data.date_time) : null),
        venue: data?.venue || DEFAULT_EVENT_SETTINGS.venue,
        capacity: data?.capacity == null ? '' : String(data.capacity),
        registrationOpen: data?.registration_open !== false,
        deadlineInput: dateToLagosInputValue(
          data?.registration_deadline ? new Date(data.registration_deadline) : null
        ),
        emailEnabled: Boolean(data?.email_enabled),
      });
      setLoading(false);
    }

    supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => applyRow(data));

    const channel = supabase
      .channel('settings-tab-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.1' },
        (payload) => applyRow(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setSaveState('idle');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveState('saving');

    const dateTime = lagosInputToDate(form.dateTimeInput);
    const registrationDeadline = lagosInputToDate(form.deadlineInput);
    const capacity = form.capacity.trim() === '' ? null : Number(form.capacity);

    const { error } = await supabase
      .from('settings')
      .update({
        title: form.title.trim() || DEFAULT_EVENT_SETTINGS.title,
        date_time: dateTime ? dateTime.toISOString() : null,
        venue: form.venue.trim() || DEFAULT_EVENT_SETTINGS.venue,
        capacity: Number.isNaN(capacity) ? null : capacity,
        registration_open: form.registrationOpen,
        registration_deadline: registrationDeadline ? registrationDeadline.toISOString() : null,
        email_enabled: form.emailEnabled,
      })
      .eq('id', 1);

    if (error) {
      console.error('[SettingsTab] save failed', error);
      setSaveState('error');
    } else {
      setSaveState('saved');
    }
  }

  if (loading) return <p className="mono-label">Loading settings…</p>;

  const previewDateTime = lagosInputToDate(form.dateTimeInput);
  const previewLine = previewDateTime
    ? `Visitors will see: "${formatLagos(previewDateTime)}" with a live countdown.`
    : 'Visitors will see: "Date and time to be announced" — no countdown shown.';
  const previewCapacity =
    form.capacity.trim() === ''
      ? 'Registration is unlimited.'
      : `Registration closes automatically once ${form.capacity} people have registered.`;
  const previewOpen = form.registrationOpen
    ? 'The Register button is active.'
    : 'Visitors will see "Registration is closed" instead of the Register button.';

  return (
    <section className="admin-section">
      <h2>Event settings</h2>
      <form className="admin-card" onSubmit={handleSave}>
        <div className="field">
          <label htmlFor="settings-title">Title</label>
          <input
            id="settings-title"
            type="text"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="settings-datetime">Date and time (Africa/Lagos)</label>
          <input
            id="settings-datetime"
            type="datetime-local"
            value={form.dateTimeInput}
            onChange={(e) => setField('dateTimeInput', e.target.value)}
          />
          {form.dateTimeInput && (
            <button
              type="button"
              className="admin-clear-btn"
              onClick={() => setField('dateTimeInput', '')}
            >
              Clear (set to TBA)
            </button>
          )}
        </div>

        <div className="field">
          <label htmlFor="settings-venue">Venue</label>
          <input
            id="settings-venue"
            type="text"
            value={form.venue}
            onChange={(e) => setField('venue', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="settings-capacity">Capacity (blank = unlimited)</label>
          <input
            id="settings-capacity"
            type="number"
            min="0"
            value={form.capacity}
            onChange={(e) => setField('capacity', e.target.value)}
          />
        </div>

        <Toggle
          id="settings-open"
          label="Registration open"
          checked={form.registrationOpen}
          onChange={(v) => setField('registrationOpen', v)}
        />

        <div className="field" style={{ marginTop: '1rem' }}>
          <label htmlFor="settings-deadline">Registration deadline (optional, Africa/Lagos)</label>
          <input
            id="settings-deadline"
            type="datetime-local"
            value={form.deadlineInput}
            onChange={(e) => setField('deadlineInput', e.target.value)}
          />
          {form.deadlineInput && (
            <button
              type="button"
              className="admin-clear-btn"
              onClick={() => setField('deadlineInput', '')}
            >
              Clear
            </button>
          )}
        </div>

        <Toggle
          id="settings-email"
          label="Email sending enabled"
          checked={form.emailEnabled}
          onChange={(v) => setField('emailEnabled', v)}
        />

        <div className="admin-preview-line">
          {previewLine}
          <br />
          {previewCapacity}
          <br />
          {previewOpen}
        </div>

        <div className="admin-save-row">
          <button type="submit" className="btn-primary" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving…' : 'Save settings'}
          </button>
          {saveState === 'saved' && <span className="admin-save-status">Saved.</span>}
          {saveState === 'error' && (
            <span className="admin-save-status admin-error">Failed to save. Try again.</span>
          )}
        </div>
      </form>
    </section>
  );
}
