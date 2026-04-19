import { useState, useCallback, useEffect } from 'react';
import { getPacientes } from '../api/pacientes';
import { getDoctores } from '../api/doctores';
import { getCitas } from '../api/citas';
import { PAGE_SIZE_MAX } from '../utils/constants';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'];
const RANGOS_EDAD = [
  { rango: '0-18', min: 0, max: 18 },
  { rango: '19-35', min: 19, max: 35 },
  { rango: '36-50', min: 36, max: 50 },
  { rango: '51-65', min: 51, max: 65 },
  { rango: '65+', min: 66, max: 150 },
];

/** id_doctor asociado al paciente en listados (plano API / Sequelize). */
function pacientePrimaryDoctorId(p) {
  if (p == null) return null;
  if (p.id_doctor != null) return Number(p.id_doctor);
  if (p.doctor_id != null) return Number(p.doctor_id);
  const d0 = Array.isArray(p.Doctors)
    ? p.Doctors[0]
    : Array.isArray(p.Doctores)
      ? p.Doctores[0]
      : null;
  return d0?.id_doctor != null ? Number(d0.id_doctor) : null;
}

function calcularEdad(fechaNac) {
  if (!fechaNac) return null;
  const d = new Date(String(fechaNac).slice(0, 10));
  if (Number.isNaN(d.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - d.getFullYear();
  const m = hoy.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < d.getDate())) edad--;
  return edad >= 0 ? edad : null;
}

/**
 * Carga pacientes, doctores y citas y calcula estadísticas para el análisis detallado (Admin y Doctor).
 * Solo ejecuta la carga cuando enabled es true (p. ej. después de que el resumen esté cargado) para evitar 3+1 requests simultáneos y timeouts.
 * @param {{ enabled?: boolean }} [options]
 * @returns {{
 *   pacientesPorDoctor: Array<{ nombre: string, total: number }>,
 *   citasPorDiaSemana: Array<{ dia: string, citas: number }>,
 *   distribucionEdad: Array<{ name: string, value: number }>,
 *   distribucionGenero: Array<{ name: string, value: number }>,
 *   loading: boolean,
 *   error: string | null,
 *   refresh: function
 * }}
 */
export function useReportesDetalle(options = {}) {
  const { enabled = true } = options;
  const [datos, setDatos] = useState({
    pacientesPorDoctor: [],
    citasPorDiaSemana: [],
    distribucionEdad: [],
    distribucionGenero: [],
  });
  const [loading, setLoading] = useState(!!enabled);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hace6Meses = new Date();
      hace6Meses.setMonth(hace6Meses.getMonth() - 6);
      const fechaDesde = hace6Meses.toISOString().slice(0, 10);

      const [resPacientes, resDoctores, resCitas] = await Promise.all([
        getPacientes({ limit: PAGE_SIZE_MAX, estado: 'activos' }),
        getDoctores({ limit: PAGE_SIZE_MAX }),
        getCitas({ limit: PAGE_SIZE_MAX, fecha_desde: fechaDesde }),
      ]);

      const pacientes = resPacientes?.pacientes ?? (Array.isArray(resPacientes) ? resPacientes : []);
      const doctores = resDoctores?.doctores ?? (Array.isArray(resDoctores) ? resDoctores : []);
      const citas = resCitas?.citas ?? (Array.isArray(resCitas) ? resCitas : []);

      const doctorById = {};
      (doctores || []).forEach((d) => {
        const id = d.id_doctor ?? d.id;
        if (id != null) doctorById[id] = d.nombre ?? d.nombre_completo ?? `Doctor ${id}`;
      });

      // Pacientes por doctor
      const countPorDoctor = {};
      (pacientes || []).forEach((p) => {
        const id = pacientePrimaryDoctorId(p);
        if (id != null) {
          countPorDoctor[id] = (countPorDoctor[id] || 0) + 1;
        }
      });
      const pacientesPorDoctor = Object.entries(countPorDoctor)
        .map(([id, total]) => ({
          nombre: doctorById[Number(id)] ?? `Doctor ${id}`,
          total,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Citas por día de la semana
      const countPorDia = Array(7).fill(0);
      (citas || []).forEach((c) => {
        const fecha = c.fecha_cita ?? c.fecha;
        if (fecha) {
          const d = new Date(String(fecha).slice(0, 10));
          if (!Number.isNaN(d.getTime())) countPorDia[d.getDay()]++;
        }
      });
      const citasPorDiaSemana = DIAS_SEMANA.map((dia, i) => ({
        dia,
        citas: countPorDia[i],
      }));

      // Distribución por edad
      const countEdad = RANGOS_EDAD.map(() => 0);
      (pacientes || []).forEach((p) => {
        const edad = p.edad != null ? Number(p.edad) : calcularEdad(p.fecha_nacimiento ?? p.fecha_nac);
        if (edad == null) return;
        const idx = RANGOS_EDAD.findIndex((r) => edad >= r.min && edad <= r.max);
        if (idx >= 0) countEdad[idx]++;
      });
      const distribucionEdad = RANGOS_EDAD.map((r, i) => ({
        name: r.rango,
        value: countEdad[i],
      })).filter((d) => d.value > 0);

      // Distribución por género
      const countGenero = {};
      (pacientes || []).forEach((p) => {
        const g = (p.genero ?? p.sexo ?? 'Sin especificar').trim() || 'Sin especificar';
        countGenero[g] = (countGenero[g] || 0) + 1;
      });
      const distribucionGenero = Object.entries(countGenero).map(([name, value]) => ({
        name,
        value,
      }));

      setDatos({
        pacientesPorDoctor,
        citasPorDiaSemana,
        distribucionEdad,
        distribucionGenero,
      });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar datos detallados');
      setDatos({
        pacientesPorDoctor: [],
        citasPorDiaSemana: [],
        distribucionEdad: [],
        distribucionGenero: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    refresh();
  }, [enabled, refresh]);

  return {
    ...datos,
    loading,
    error,
    refresh,
  };
}
