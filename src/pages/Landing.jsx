import { Link } from 'react-router-dom';
import { useEventSettings } from '../lib/useEventSettings';
import Countdown from '../components/Countdown';
import BusPickup from '../components/BusPickup';
import Footer from '../components/Footer';
import './Landing.css';

function formatDate(dateTime) {
  const d = new Date(dateTime);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateTime) {
  const d = new Date(dateTime);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function Landing() {
  const { settings } = useEventSettings();
  const { title, dateTime, registrationOpen } = settings;

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-glow glow-gradient-bg" aria-hidden="true" />
        <div className="hero-flyer-wrap">
          <picture>
            <source srcSet="/flyer.webp" type="image/webp" />
            <img
              src="/flyer.jpg"
              alt="GITC 2026 event flyer"
              className="hero-flyer"
              width={1080}
              height={1080}
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </div>

        <p className="mono-label hero-label">GETTING INTO TECH CONFERENCE</p>
        <h1 className="hero-title">{title}</h1>

        {dateTime ? (
          <>
            <p className="hero-date">
              {formatDate(dateTime)} &middot; {formatTime(dateTime)}
            </p>
            <Countdown dateTime={dateTime} />
          </>
        ) : (
          <p className="hero-date hero-date-tba">Date and time to be announced</p>
        )}

        {registrationOpen ? (
          <Link to="/register" className="btn-primary hero-cta">
            Register
          </Link>
        ) : (
          <span className="btn-primary hero-cta" aria-disabled="true">
            Registration is closed
          </span>
        )}
      </section>

      <BusPickup />
      <Footer />
    </div>
  );
}
