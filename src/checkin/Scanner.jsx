import { useEffect, useRef, useState } from 'react';

const CONTAINER_ID = 'checkin-qr-reader';
const DEBOUNCE_MS = 3000;

function extractTicketCode(text) {
  if (!text) return null;
  const trimmed = text.trim();
  const match = trimmed.match(/\/ticket\/([A-Za-z0-9_-]+)\/?$/);
  return match ? match[1] : trimmed;
}

export default function Scanner({ onDecode, paused }) {
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const lastRef = useRef({ code: null, time: 0 });
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;

  useEffect(() => {
    let cancelled = false;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const instance = new Html5Qrcode(CONTAINER_ID, { verbose: false });
      scannerRef.current = instance;

      instance
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            const code = extractTicketCode(decodedText);
            if (!code) return;
            const now = Date.now();
            if (lastRef.current.code === code && now - lastRef.current.time < DEBOUNCE_MS) {
              return;
            }
            lastRef.current = { code, time: now };
            onDecodeRef.current(code);
          },
          () => {
            // per-frame "no QR found" — not an error, ignore.
          }
        )
        .catch((err) => {
          if (!cancelled) setCameraError(err?.message || String(err));
        });
    });

    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {});
      }
    };
  }, []);

  return (
    <div className="checkin-scanner-wrap">
      <div id={CONTAINER_ID} className="checkin-scanner-view" />
      {cameraError && (
        <div className="checkin-camera-fallback">
          <p className="mono-label">Camera unavailable</p>
          <p>
            We couldn't access the camera ({cameraError}). Allow camera access in your browser
            settings and reload, or use manual search below instead.
          </p>
        </div>
      )}
      {paused && !cameraError && (
        <div className="checkin-camera-fallback" aria-hidden="true">
          <p className="mono-label">Showing result…</p>
        </div>
      )}
    </div>
  );
}
