import { Link } from 'react-router-dom';
import './Simple.css';

export default function NotFound() {
  return (
    <div className="simple-page">
      <div className="simple-card">
        <p className="mono-label">404</p>
        <h1>Page not found</h1>
        <p>The link you followed might be broken, or the page may have moved.</p>
        <Link to="/" className="simple-back">
          ← Back to the homepage
        </Link>
      </div>
    </div>
  );
}
