import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/**
 * Protege rutas solo para Admin. Si el usuario no es Admin, redirige a la raíz.
 * Debe usarse dentro de ProtectedRoute (ya autenticado).
 */
export default function AdminRoute({ children }) {
  const location = useLocation();
  const isAdminFn = useAuthStore((s) => s.isAdmin);
  const isAdmin = typeof isAdminFn === 'function' ? isAdminFn() : false;

  if (!isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
