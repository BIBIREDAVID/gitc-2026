import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { validateEmail } from '../lib/validation';
import { findTicket, RegistrationError } from '../lib/api';
import TextField from '../components/form/TextField';
import './Register.css';
import './Simple.css';

const ERROR_MESSAGES = {
  not_found: "We couldn't find a ticket matching that email and WhatsApp number.",
  rate_limited: 'Too many attempts. Please try again in a little while.',
};
const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export default function FindTicket() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    const nextErrors = {};
    const emailErr = validateEmail(email);
    if (emailErr) nextErrors.email = emailErr;
    if (!whatsapp.trim()) nextErrors.whatsapp = 'Enter the WhatsApp number you registered with.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { ticketCode } = await findTicket({ email, whatsapp });
      navigate(`/ticket/${ticketCode}`);
    } catch (err) {
      const code = err instanceof RegistrationError ? err.code : null;
      setSubmitError(ERROR_MESSAGES[code] || DEFAULT_ERROR_MESSAGE);
      setSubmitting(false);
    }
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <form className="register-form" onSubmit={handleSubmit} noValidate>
          <p className="mono-label">Already registered?</p>
          <h1 className="register-form-title">Find your ticket</h1>
          <p className="register-form-copy">
            Enter the email and WhatsApp number you registered with and we'll take you to your
            ticket.
          </p>

          <TextField
            id="email"
            label="Email address"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <TextField
            id="whatsapp"
            label="WhatsApp number"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            placeholder="0803 123 4567"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            error={errors.whatsapp}
          />

          {submitError && (
            <p className="register-error" role="alert">
              {submitError}
            </p>
          )}

          <div className="register-nav">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Searching…' : 'Find my ticket'}
            </button>
          </div>

          <Link to="/register" className="simple-back">
            ← Back to registration
          </Link>
        </form>
      </div>
    </div>
  );
}
