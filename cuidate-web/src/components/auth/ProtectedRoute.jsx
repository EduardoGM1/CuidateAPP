import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/**
 * Protege rutas: requiere autenticación. Si no hay token (tras dar tiempo a rehidratar), redirige a login.
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-texto-secundario)' }}>
        Cargando…
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
