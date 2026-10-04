import { useState } from 'react';
import './checkin.css';

export default function CheckInLogin({ status, error, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await onLogin(email, password);
    setSubmitting(false);
  }

  return (
    <div className="checkin-login-page">
      <form className="checkin-login-card" onSubmit={handleSubmit}>
        <p className="mono-label">GITC 2026 Check-in</p>
        <h1>Staff sign in</h1>

        {status === 'denied' && (
          <p className="checkin-error" role="alert">
            This account does not have staff access.
          </p>
        )}
        {error && (
          <p className="checkin-error" role="alert">
            {error}
          </p>
        )}

        <div className="field">
          <label htmlFor="checkin-email">Email</label>
          <input
            id="checkin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="checkin-password">Password</label>
          <input
            id="checkin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary checkin-big-btn" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
