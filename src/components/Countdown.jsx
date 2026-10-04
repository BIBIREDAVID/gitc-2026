import { useEffect, useState } from 'react';

function getParts(targetMs) {
  const diff = Math.max(0, targetMs - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export default function Countdown({ dateTime }) {
  const targetMs = new Date(dateTime).getTime();
  const [parts, setParts] = useState(() => getParts(targetMs));

  useEffect(() => {
    const id = setInterval(() => setParts(getParts(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const units = [
    { label: 'Days', value: parts.days },
    { label: 'Hrs', value: parts.hours },
    { label: 'Min', value: parts.minutes },
    { label: 'Sec', value: parts.seconds },
  ];

  return (
    <div className="countdown" role="timer" aria-label="Countdown to event">
      {units.map((u) => (
        <div className="countdown-unit" key={u.label}>
          <span className="countdown-value">{String(u.value).padStart(2, '0')}</span>
          <span className="countdown-label mono-label">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
