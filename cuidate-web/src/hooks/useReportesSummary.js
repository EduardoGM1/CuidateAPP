import { useState, useCallback, useEffect } from 'react';
import { getAdminSummary, getDoctorSummary } from '../api/dashboard';

/**
 * Carga el resumen del dashboard (métricas, chartData, charts) para usarlo en Reportes.
 * @param {{ isAdmin: boolean }} options
 * @returns {{ summary: object | null, loading: boolean, error: string | null, refresh: function }}
 */
export function useReportesSummary({ isAdmin }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isAdmin ? await getAdminSummary() : await getDoctorSummary();
      setSummary(data ?? null);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar el resumen');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}
