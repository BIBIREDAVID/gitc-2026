function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ResultOverlay({ result }) {
  if (!result) return null;

  if (result.status === 'checked_in') {
    return (
      <div className="checkin-overlay checkin-overlay-green" role="status">
        <div className="checkin-overlay-icon" aria-hidden="true">
          ✓
        </div>
        <div className="checkin-overlay-name">{result.fullName}</div>
        <div className="checkin-overlay-message">Checked in</div>
      </div>
    );
  }

  if (result.status === 'already_checked_in') {
    return (
      <div className="checkin-overlay checkin-overlay-amber" role="status">
        <div className="checkin-overlay-icon" aria-hidden="true">
          !
        </div>
        <div className="checkin-overlay-name">{result.fullName}</div>
        <div className="checkin-overlay-message">
          Already checked in at {formatTime(result.checkedInAt)}
        </div>
      </div>
    );
  }

  return (
    <div className="checkin-overlay checkin-overlay-red" role="status">
      <div className="checkin-overlay-icon" aria-hidden="true">
        ✕
      </div>
      <div className="checkin-overlay-message">
        {result.status === 'error' ? 'Something went wrong' : 'Ticket not found'}
      </div>
    </div>
  );
}
