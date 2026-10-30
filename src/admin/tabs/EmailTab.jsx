import { useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SCHOOL_OPTIONS } from '../../config/formOptions';
import ConfirmDialog from '../components/ConfirmDialog';

// Matches send-announcement's server-side caps.
const BATCH_SIZE = 25;
const MAX_SUBJECT = 150;
const MAX_MESSAGE = 5000;

function resultMessage({ total, sent, skipped, failed }) {
  if (skipped === total) return 'Email sending is currently off — nothing was sent.';
  let msg = `Sent ${sent} of ${total}.`;
  if (failed) msg += ` ${failed} failed.`;
  if (skipped) msg += ` ${skipped} skipped (email off).`;
  return msg;
}

export default function EmailTab({ registrations, loading }) {
  const [schools, setSchools] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total } while sending
  const [status, setStatus] = useState(null);

  const countBySchool = useMemo(() => {
    const counts = {};
    for (const r of registrations) counts[r.pickup] = (counts[r.pickup] || 0) + 1;
    return counts;
  }, [registrations]);

  const recipients = useMemo(
    () => registrations.filter((r) => schools.includes(r.pickup)),
    [registrations, schools]
  );

  const sending = progress !== null;
  const canSend = recipients.length > 0 && subject.trim() && message.trim() && !sending;

  function toggleSchool(id) {
    setSchools((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function handleSend() {
    setConfirming(false);
    setStatus(null);
    const ids = recipients.map((r) => r.id);
    const totals = { total: 0, sent: 0, skipped: 0, failed: 0 };
    setProgress({ done: 0, total: ids.length });

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase.functions.invoke('send-announcement', {
        body: { subject, message, registrationIds: batch },
      });
      if (error) {
        console.error('[EmailTab] batch failed', error);
        totals.total += batch.length;
        totals.failed += batch.length;
      } else {
        totals.total += data.total;
        totals.sent += data.sent;
        totals.skipped += data.skipped;
        totals.failed += data.failed;
        // Email is switched off — every later batch would be skipped too.
        if (data.skipped === data.total) break;
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, ids.length), total: ids.length });
    }

    setProgress(null);
    setStatus(resultMessage(totals));
  }

  if (loading) return <p className="mono-label">Loading registrations…</p>;

  const schoolNames = SCHOOL_OPTIONS.filter((s) => schools.includes(s.id))
    .map((s) => s.label)
    .join(', ');

  return (
    <section className="admin-section">
      <h2>Email</h2>

      <div className="admin-card">
        <fieldset className="admin-fieldset">
          <legend>Send to registrants from</legend>
          <div className="admin-school-list">
            {SCHOOL_OPTIONS.map((s) => (
              <label key={s.id} className="admin-school-option">
                <input
                  type="checkbox"
                  checked={schools.includes(s.id)}
                  onChange={() => toggleSchool(s.id)}
                  disabled={sending}
                />
                <span>{s.label}</span>
                <span className="admin-school-count">{countBySchool[s.id] || 0}</span>
              </label>
            ))}
          </div>
          <div className="admin-school-actions">
            <button
              type="button"
              className="admin-clear-btn"
              onClick={() => setSchools(SCHOOL_OPTIONS.map((s) => s.id))}
              disabled={sending}
            >
              Select all
            </button>
            <button
              type="button"
              className="admin-clear-btn"
              onClick={() => setSchools([])}
              disabled={sending}
            >
              Clear
            </button>
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="email-subject">Subject</label>
          <input
            id="email-subject"
            type="text"
            value={subject}
            maxLength={MAX_SUBJECT}
            onChange={(e) => setSubject(e.target.value)}
            disabled={sending}
          />
        </div>

        <div className="field" style={{ marginTop: '1rem' }}>
          <label htmlFor="email-message">Message</label>
          <textarea
            id="email-message"
            rows={8}
            value={message}
            maxLength={MAX_MESSAGE}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
          />
          <span className="admin-save-status">
            Each email starts with “Hi &lt;their name&gt;,”. {message.length}/{MAX_MESSAGE}
          </span>
        </div>

        <div className="admin-save-row">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setConfirming(true)}
            disabled={!canSend}
          >
            {sending
              ? `Sending ${progress.done} of ${progress.total}…`
              : `Send to ${recipients.length} ${recipients.length === 1 ? 'person' : 'people'}`}
          </button>
          {status && <span className="admin-save-status">{status}</span>}
        </div>
        <p className="admin-save-status" style={{ marginTop: '0.75rem' }}>
          Gmail allows roughly 500 emails a day from this account, ticket emails included.
        </p>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Send this email?"
          message={`“${subject.trim()}” will go to ${recipients.length} ${recipients.length === 1 ? 'person' : 'people'} from ${schoolNames}. This can't be undone.`}
          confirmLabel="Send"
          destructive={false}
          onConfirm={handleSend}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  );
}
