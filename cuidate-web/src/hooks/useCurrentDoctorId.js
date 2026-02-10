import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getDoctores } from '../api/doctores';

/**
 * Devuelve el id_doctor del usuario actual (solo aplica para rol Doctor o Admin que actúe como doctor).
 * Usa user.id_doctor si está en el store; si no, obtiene la lista de doctores (para Doctor devuelve solo el propio).
 * @returns {{ idDoctor: number | null, loading: boolean, error: string | null }}
 */
export function useCurrentDoctorId() {
  const user = useAuthStore((s) => s.user);
  const isDoctor = useAuthStore((s) => s.isDoctor);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [idDoctor, setIdDoctor] = useState(() => user?.id_doctor ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resolve = useCallback(async () => {
    if (user?.id_doctor) {
      setIdDoctor(user.id_doctor);
      return;
    }
    if (!isDoctor() && !isAdmin()) {
      setIdDoctor(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await getDoctores({ limit: 1 });
      const first = Array.isArray(list) ? list[0] : null;
      const id = first?.id_doctor ?? first?.id ?? null;
      setIdDoctor(id);
    } catch (err) {
      setError(err?.message || 'Error al obtener doctor');
      setIdDoctor(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id_doctor, isDoctor, isAdmin]);

  useEffect(() => {
    if (user?.id_doctor) {
      setIdDoctor(user.id_doctor);
      setError(null);
      return;
    }
    if (isDoctor() || isAdmin()) resolve();
    else setIdDoctor(null);
  }, [user?.id_doctor, isDoctor, isAdmin, resolve]);

  return { idDoctor, loading, error };
}
