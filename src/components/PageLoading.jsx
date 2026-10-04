export default function PageLoading() {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <p className="mono-label" role="status" aria-live="polite">
        Loading…
      </p>
    </div>
  );
}
