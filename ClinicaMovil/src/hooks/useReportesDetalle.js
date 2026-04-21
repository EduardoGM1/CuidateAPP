import { useState, useCallback, useEffect } from 'react';
import { gestionService } from '../api/gestionService';
import { formatNombreCompleto } from '../utils/formatNombreCompleto';
import Logger from '../services/logger';

const REPORTES_FETCH_LIMIT = 500;

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'];
const RANGOS_EDAD = [
  { rango: '0-18', min: 0, max: 18 },
  { rango: '19-35', min: 19, max: 35 },
  { rango: '36-50', min: 36, max: 50 },
  { rango: '51-65', min: 51, max: 65 },
  { rango: '65+', min: 66, max: 150 },
];

function extractPacientesList(res) {
  if (!res || typeof res !== 'object') return [];
  const inner = res.data;
  if (inner?.pacientes && Array.isArray(inner.pacientes)) return inner.pacientes;
  if (res.pacientes && Array.isArray(res.pacientes)) return res.pacientes;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
}

function extractDoctoresList(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.doctores && Array.isArray(res.doctores)) return res.doctores;
  return [];
}

function extractCitasList(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.citas && Array.isArray(res.citas)) return res.citas;
  if (Array.isArray(res.data)) return res.data;
  return [];
}

function pacientePrimaryDoctorId(p) {
  if (p == null) return null;
  if (p.id_doctor != null) return Number(p.id_doctor);
  if (p.doctor_id != null) return Number(p.doctor_id);
  const d0 = Array.isArray(p.Doctores) ? p.Doctores[0] : Array.isArray(p.Doctors) ? p.Doctors[0] : null;
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
 * Carga pacientes, doctores y citas y calcula métricas del bloque "Análisis detallado" (paridad con web).
 * @param {{ enabled?: boolean }} options
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
        gestionService.getAllPacientes('activos', 'recent', 'todas', { limit: REPORTES_FETCH_LIMIT }),
        gestionService.getAllDoctores('activos', 'recent', { limit: REPORTES_FETCH_LIMIT }),
        gestionService.getAllCitas({ limit: REPORTES_FETCH_LIMIT, fecha_desde: fechaDesde }),
      ]);

      const pacientes = extractPacientesList(resPacientes);
      const doctores = extractDoctoresList(resDoctores);
      const citas = extractCitasList(resCitas);

      const doctorById = {};
      (doctores || []).forEach((d) => {
        const id = d.id_doctor ?? d.id;
        if (id != null) {
          doctorById[id] = formatNombreCompleto(d) || d.nombre || `Doctor ${id}`;
        }
      });

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

      const countEdad = RANGOS_EDAD.map(() => 0);
      (pacientes || []).forEach((p) => {
        const edad = p.edad != null ? Number(p.edad) : calcularEdad(p.fecha_nacimiento ?? p.fecha_nac);
        if (edad == null || Number.isNaN(edad)) return;
        const idx = RANGOS_EDAD.findIndex((r) => edad >= r.min && edad <= r.max);
        if (idx >= 0) countEdad[idx]++;
      });
      const distribucionEdad = RANGOS_EDAD.map((r, i) => ({
        name: r.rango,
        value: countEdad[i],
      })).filter((d) => d.value > 0);

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
      Logger.error('useReportesDetalle: error', err);
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
