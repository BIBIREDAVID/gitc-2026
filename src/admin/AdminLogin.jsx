import { useState } from 'react';
import './admin.css';

export default function AdminLogin({ status, error, onLogin }) {
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
    <div className="admin-login-page">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <p className="mono-label">GITC 2026 Admin</p>
        <h1>Sign in</h1>

        {status === 'denied' && (
          <p className="admin-error" role="alert">
            This account does not have admin access.
          </p>
        )}
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}

        <div className="field">
          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
