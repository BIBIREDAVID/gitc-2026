import { useState } from 'react';

export default function Footer() {
  const [zenithLogoFailed, setZenithLogoFailed] = useState(false);
  const [tumbsLogoFailed, setTumbsLogoFailed] = useState(false);

  return (
    <footer className="site-footer">
      <p className="mono-label">In partnership with Zenith Bank &amp; Tumbs</p>
      <div className="partner-logos">
        {!zenithLogoFailed && (
          <img
            src="/zenith-logo.png"
            alt="Zenith Bank logo"
            className="zenith-logo"
            loading="lazy"
            decoding="async"
            onError={() => setZenithLogoFailed(true)}
          />
        )}
        {!tumbsLogoFailed && (
          <img
            src="/tumbs-logo.webp"
            alt="Tumbs logo"
            className="tumbs-logo"
            loading="lazy"
            decoding="async"
            onError={() => setTumbsLogoFailed(true)}
          />
        )}
      </div>
    </footer>
  );
}
