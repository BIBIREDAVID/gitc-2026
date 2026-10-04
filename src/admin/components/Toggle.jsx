export default function Toggle({ id, label, checked, onChange }) {
  return (
    <div className="admin-toggle-row">
      <label htmlFor={id}>{label}</label>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        className="admin-toggle"
        onClick={() => onChange(!checked)}
      >
        <span className="admin-toggle-knob" />
      </button>
    </div>
  );
}
