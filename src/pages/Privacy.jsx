import { Link } from 'react-router-dom';
import './Simple.css';

export default function Privacy() {
  return (
    <div className="simple-page">
      <div className="simple-card">
        <p className="mono-label">Privacy</p>
        <h1>How we use your details</h1>
        <p>
          GITC collects your name, email, WhatsApp number and the other answers you give on the
          registration form only to organise GITC 2026 — to issue your ticket, check you in at
          the door, arrange free bus transport, and send you updates about the event.
        </p>
        <p>
          We don't sell your details or share them with anyone outside the organising team.
          Public pages (like leaderboards or attendee counts) never show your email or phone
          number.
        </p>
        <p>
          If you want your details removed after the event, message the organisers on the
          contact channel shared in your confirmation.
        </p>
        <Link to="/register" className="simple-back">
          ← Back to registration
        </Link>
      </div>
    </div>
  );
}
