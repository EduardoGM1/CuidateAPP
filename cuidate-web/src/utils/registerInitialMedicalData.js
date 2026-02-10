import { createCita } from '../api/citas';
import { createSignosVitales, createDiagnostico, addPacienteComorbilidad } from '../api/pacienteMedicalData';
import { parsePositiveInt } from './params';

/**
 * Registra datos médicos iniciales para un paciente:
 * - Cita de primera consulta (opcional)
 * - Signos vitales vinculados (opcionales)
 * - Diagnóstico inicial (opcional)
 * - Comorbilidades iniciales (opcional)
 *
 * Todos los pasos son independientes: si algo falla, lanza error y debe ser
 * manejado por el caller (normalmente se loguea pero no se rompe el alta/edición).
 *
 * @param {Object} options
 * @param {number|string} options.pacienteId
 * @param {number|string} [options.doctorId]
 * @param {string} [options.fechaCita] - ISO o compatible con Date
 * @param {string} [options.motivo]
 * @param {string} [options.diagnosticoTexto]
 * @param {{ peso_kg?: string, talla_m?: string, presion_sistolica?: string, presion_diastolica?: string, glucosa_mg_dl?: string }} [options.signos]
 * @param {Array<number|string>} [options.comorbilidadIds]
 * @param {boolean} [options.tratamientoNoFarmaco]
 * @param {boolean} [options.tratamientoFarmaco]
 * @param {string|number} [options.anioDiagnostico]
 */
export async function registerInitialMedicalData(options) {
  const {
    pacienteId,
    doctorId,
    fechaCita,
    motivo,
    diagnosticoTexto,
    signos = {},
    comorbilidadIds = [],
    tratamientoNoFarmaco,
    tratamientoFarmaco,
    anioDiagnostico,
  } = options || {};

  const pid = parsePositiveInt(pacienteId, 0);
  if (pid === 0) return;

  let citaId = null;

  // 1) Crear cita inicial (si hay doctor y fecha)
  if (doctorId && fechaCita) {
    const did = parsePositiveInt(doctorId, 0);
    if (did > 0) {
      const cita = await createCita({
        id_paciente: pid,
        id_doctor: did,
        fecha_cita: fechaCita,
        motivo: motivo?.trim() || 'Primera consulta',
      });
      citaId = cita?.id_cita ?? cita?.id ?? null;
    }
  }

  // 2) Signos vitales básicos vinculados a la primera consulta (si hay datos)
  const signosPayload = {};
  if (signos.peso_kg?.trim()) signosPayload.peso_kg = parseFloat(signos.peso_kg);
  if (signos.talla_m?.trim()) signosPayload.talla_m = parseFloat(signos.talla_m);
  if (signos.presion_sistolica?.trim()) signosPayload.presion_sistolica = parseInt(signos.presion_sistolica, 10);
  if (signos.presion_diastolica?.trim()) signosPayload.presion_diastolica = parseInt(signos.presion_diastolica, 10);
  if (signos.glucosa_mg_dl?.trim()) signosPayload.glucosa_mg_dl = parseFloat(signos.glucosa_mg_dl);

  if (Object.keys(signosPayload).length > 0) {
    await createSignosVitales(pid, {
      ...signosPayload,
      ...(citaId ? { id_cita: citaId } : {}),
    });
  }

  // 3) Diagnóstico inicial opcional
  const dx = (diagnosticoTexto || '').trim();
  if (dx.length >= 10) {
    await createDiagnostico(pid, {
      descripcion: dx,
      ...(citaId ? { id_cita: citaId } : {}),
    });
  }

  // 4) Comorbilidades iniciales (enfermedades crónicas)
  if (Array.isArray(comorbilidadIds) && comorbilidadIds.length > 0) {
    const payloads = comorbilidadIds
      .map((cidRaw) => {
        const cid = parsePositiveInt(cidRaw, 0);
        if (cid === 0) return null;
        return {
          id_comorbilidad: cid,
          ano_diagnostico: anioDiagnostico || undefined,
          recibe_tratamiento_no_farmacologico: !!tratamientoNoFarmaco,
          recibe_tratamiento_farmacologico: !!tratamientoFarmaco,
          es_diagnostico_basal: true,
        };
      })
      .filter(Boolean);

    await Promise.all(
      payloads.map((body) =>
        addPacienteComorbilidad(pid, body)
      )
    );
  }
}

