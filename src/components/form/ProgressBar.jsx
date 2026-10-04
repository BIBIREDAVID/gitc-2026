export default function ProgressBar({ step, total, labels }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Registration progress"
      aria-valuenow={step + 1}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>
      <p className="mono-label progress-label">
        Step {step + 1} of {total}
        {labels?.[step] ? ` — ${labels[step]}` : ''}
      </p>
    </div>
  );
}
