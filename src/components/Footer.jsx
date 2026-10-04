import { useState } from 'react';

export default function Footer() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <footer className="site-footer">
      <p className="mono-label">In partnership with Zenith Bank</p>
      {!logoFailed && (
        <img
          src="/zenith-logo.png"
          alt="Zenith Bank logo"
          className="zenith-logo"
          loading="lazy"
          decoding="async"
          onError={() => setLogoFailed(true)}
        />
      )}
    </footer>
  );
}
