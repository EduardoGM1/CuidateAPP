import { Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useCurrentDoctorId } from '../../hooks/useCurrentDoctorId';
import { parsePositiveInt } from '../../utils/params';
import EditarDoctor from '../../pages/doctores/EditarDoctor';

/**
 * Permite acceder a Editar doctor si:
 * - El usuario es Admin, o
 * - El usuario está editando su propio perfil (id === su id_doctor).
 */
export default function EditarDoctorRoute() {
  const { id } = useParams();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const { idDoctor } = useCurrentDoctorId();
  const parsedId = parsePositiveInt(id, 0);

  if (isAdmin()) return <EditarDoctor />;
  if (parsedId > 0 && idDoctor != null && parsedId === idDoctor) return <EditarDoctor />;

  return <Navigate to="/" replace />;
}
