export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, busy }) {
  return (
    <div className="admin-dialog-overlay" role="presentation" onClick={onCancel}>
      <div
        className="admin-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title">{title}</h3>
        <p>{message}</p>
        <div className="admin-dialog-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="admin-delete-btn" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : confirmLabel || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
