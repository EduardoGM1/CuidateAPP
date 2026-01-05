/**
 * Servicio: ReminderService
 * 
 * Lógica centralizada para calcular recordatorios de:
 * - Medicamentos (horarios próximos)
 * - Citas (24h y 5h antes)
 * - Signos vitales (pendientes)
 * 
 * Evita duplicación de código y centraliza la lógica de cálculo.
 */

import Logger from './logger';

class ReminderService {
  /**
   * Calcular próximos medicamentos a tomar
   * @param {Array} medicamentos - Lista de medicamentos
   * @param {Date} now - Fecha/hora actual (opcional, por defecto new Date())
   * @returns {Object} - { proximo: medicamento, tiempoRestante: minutos }
   */
  getProximoMedicamento(medicamentos, now = new Date()) {
    if (!medicamentos || medicamentos.length === 0) {
      return null;
    }

    const ahora = now.getTime();
    const hoy = new Date(now);
    hoy.setHours(0, 0, 0, 0);

    let proximoMedicamento = null;
    let menorTiempo = Infinity;

    medicamentos.forEach((med) => {
      // Solo considerar medicamentos no tomados
      if (med.tomado) return;

      const horario = med.horario || '08:00';
      const [horaStr, minutoStr] = horario.split(':');
      const hora = parseInt(horaStr) || 8;
      const minuto = parseInt(minutoStr) || 0;

      // Crear fecha del horario de hoy
      const fechaHorario = new Date(hoy);
      fechaHorario.setHours(hora, minuto, 0, 0);

      // Si el horario ya pasó hoy, considerar el de mañana
      if (fechaHorario.getTime() < ahora) {
        fechaHorario.setDate(fechaHorario.getDate() + 1);
      }

      const tiempoRestante = (fechaHorario.getTime() - ahora) / (1000 * 60); // minutos

      // Si es dentro de las próximas 24 horas y es el más próximo
      if (tiempoRestante < 24 * 60 && tiempoRestante < menorTiempo) {
        menorTiempo = tiempoRestante;
        proximoMedicamento = {
          ...med,
          fechaHorario,
          tiempoRestante,
        };
      }
    });

    return proximoMedicamento ? {
      medicamento: proximoMedicamento,
      tiempoRestante: Math.round(menorTiempo),
    } : null;
  }

  /**
   * Calcular citas próximas con recordatorios
   * @param {Array} citas - Lista de citas
   * @param {Date} now - Fecha/hora actual
   * @returns {Object} - { citas24h: [], citas5h: [], proximaCita: {} }
   */
  getCitasProximas(citas, now = new Date()) {
    if (!citas || citas.length === 0) {
      return {
        citas24h: [],
        citas5h: [],
        proximaCita: null,
        totalProximas: 0,
      };
    }

    const ahora = now.getTime();
    const citas24h = [];
    const citas5h = [];
    let proximaCita = null;
    let menorTiempo = Infinity;

    citas.forEach((cita) => {
      if (!cita.fecha_cita) return;

      const fechaCita = new Date(cita.fecha_cita);
      const tiempoRestante = (fechaCita.getTime() - ahora) / (1000 * 60); // minutos

      // Solo considerar citas futuras
      if (tiempoRestante < 0) return;

      // Cita dentro de 24 horas (1440 minutos)
      if (tiempoRestante <= 24 * 60 && tiempoRestante > 5 * 60) {
        citas24h.push({
          ...cita,
          tiempoRestante: Math.round(tiempoRestante),
        });
      }

      // Cita dentro de 5 horas (300 minutos)
      if (tiempoRestante <= 5 * 60) {
        citas5h.push({
          ...cita,
          tiempoRestante: Math.round(tiempoRestante),
        });
      }

      // Cita más próxima
      if (tiempoRestante < menorTiempo) {
        menorTiempo = tiempoRestante;
        proximaCita = {
          ...cita,
          tiempoRestante: Math.round(tiempoRestante),
        };
      }
    });

    // Ordenar por tiempo restante
    citas24h.sort((a, b) => a.tiempoRestante - b.tiempoRestante);
    citas5h.sort((a, b) => a.tiempoRestante - b.tiempoRestante);

    return {
      citas24h,
      citas5h,
      proximaCita,
      totalProximas: citas24h.length + citas5h.length,
    };
  }

  /**
   * Calcular progreso de medicamentos del día
   * @param {Array} medicamentos - Lista de medicamentos
   * @param {Date} now - Fecha/hora actual
   * @returns {Object} - { tomados: number, total: number, porcentaje: number }
   */
  getProgresoMedicamentosDia(medicamentos, now = new Date()) {
    if (!medicamentos || medicamentos.length === 0) {
      return {
        tomados: 0,
        total: 0,
        porcentaje: 0,
      };
    }

    const hoy = new Date(now);
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    // Filtrar medicamentos del día (horarios que ya pasaron)
    const medicamentosDelDia = medicamentos.filter((med) => {
      const horario = med.horario || '08:00';
      const [horaStr, minutoStr] = horario.split(':');
      const hora = parseInt(horaStr) || 8;
      const minuto = parseInt(minutoStr) || 0;

      const fechaHorario = new Date(hoy);
      fechaHorario.setHours(hora, minuto, 0, 0);

      // Solo contar horarios que ya pasaron
      return fechaHorario.getTime() < now.getTime();
    });

    const tomados = medicamentosDelDia.filter((med) => med.tomado).length;
    const total = medicamentosDelDia.length;

    return {
      tomados,
      total,
      porcentaje: total > 0 ? Math.round((tomados / total) * 100) : 0,
    };
  }

  /**
   * Verificar si necesita recordatorio de signos vitales
   * @param {Date} ultimaRegistracion - Fecha de último registro
   * @param {number} diasSinRegistrar - Días sin registrar (default: 7)
   * @param {Date} now - Fecha/hora actual
   * @returns {boolean} - true si necesita recordatorio
   */
  necesitaRecordatorioSignosVitales(ultimaRegistracion, diasSinRegistrar = 7, now = new Date()) {
    if (!ultimaRegistracion) {
      return true; // Nunca registrado
    }

    const ultimaFecha = new Date(ultimaRegistracion);
    const diffDias = (now.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24);

    return diffDias >= diasSinRegistrar;
  }

  /**
   * Formatear tiempo restante para mostrar
   * @param {number} minutos - Minutos restantes
   * @returns {string} - Texto formateado
   */
  formatTimeRemaining(minutos) {
    if (!minutos || minutos < 0) return 'Ahora';

    if (minutos < 60) {
      return `${Math.round(minutos)} min`;
    }

    const hours = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);

    if (mins === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${mins}m`;
  }
}

// Singleton
const reminderService = new ReminderService();

export default reminderService;



