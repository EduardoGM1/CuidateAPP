/**
 * Fallback mientras cargan chunks lazy de React Router (producción).
 */
export default function PageLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        color: 'var(--color-texto-secundario, #4a5568)',
        fontSize: '0.95rem',
      }}
    >
      Cargando…
    </div>
  );
}
