import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { STORAGE_KEYS } from '../../utils/constants';

/**
 * Protege rutas: requiere sesión iniciada (token válido).
 * Si no hay token en store ni en localStorage (tras dar tiempo a rehidratar), redirige a /login.
 * Todas las pantallas de la app (salvo login, forgot-password, reset-password) están bajo esta ruta en el router.
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-texto-secundario)' }}>
        Cargando…
      </div>
    );
  }

  const hasStoredToken =
    typeof window !== 'undefined' && Boolean(localStorage.getItem(STORAGE_KEYS.TOKEN));
  const isAuthenticated = Boolean(token) || hasStoredToken;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
