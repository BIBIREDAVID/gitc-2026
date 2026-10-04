export default function BarList({ title, data }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="admin-card">
      <h3 style={{ marginBottom: '0.9rem', fontSize: '1rem' }}>{title}</h3>
      {data.length === 0 && <p className="admin-export-summary">No data yet.</p>}
      {data.map((d) => (
        <div className="admin-bar-row" key={d.label}>
          <span className="admin-bar-label" title={d.label}>
            {d.label}
          </span>
          <span className="admin-bar-track">
            <span
              className="admin-bar-fill"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </span>
          <span className="admin-bar-value">{d.count}</span>
        </div>
      ))}
    </div>
  );
}
