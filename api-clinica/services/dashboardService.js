import DashboardRepository from '../repositories/dashboardRepository.js';
import logger from '../utils/logger.js';

export class DashboardService {
  constructor() {
    this.dashboardRepository = new DashboardRepository();
  }

  // =====================================================
  // SERVICIOS PARA ADMINISTRADOR
  // =====================================================

  async getAdminSummary() {
    try {
      logger.info('Obteniendo resumen del dashboard administrativo');

      // Ejecutar todas las consultas en paralelo para mejor rendimiento
      const [
        totalPacientes,
        totalDoctores,
        citasHoy,
        chartData,
        alertas,
        citasPorEstado,
        doctoresActivos,
        pacientesNuevos,
        tasaAsistencia
      ] = await Promise.all([
        this.dashboardRepository.getTotalPacientes(),
        this.dashboardRepository.getTotalDoctores(),
        this.dashboardRepository.getCitasHoy(),
        this.dashboardRepository.getCitasUltimos7Dias(),
        this.dashboardRepository.getAlertasAdmin(),
        this.dashboardRepository.getCitasPorEstado(),
        this.dashboardRepository.getDoctoresMasActivos(5),
        this.dashboardRepository.getPacientesNuevosUltimos7Dias(),
        this.dashboardRepository.getTasaAsistencia()
      ]);

      const summary = {
        metrics: {
          totalPacientes,
          totalDoctores,
          citasHoy,
          tasaAsistencia
        },
        chartData: {
          citasUltimos7Dias: chartData,
          pacientesNuevos: pacientesNuevos
        },
        charts: {
          citasPorEstado,
          doctoresActivos
        },
        alertas,
        timestamp: new Date().toISOString()
      };

      logger.info('Resumen administrativo obtenido exitosamente', { 
        totalPacientes, 
        totalDoctores, 
        citasHoy: citasHoy.total,
        tasaAsistencia: tasaAsistencia.tasa_asistencia
      });

      return summary;
    } catch (error) {
      logger.error('Error obteniendo resumen administrativo', error);
      throw error;
    }
  }

  async getAdminMetrics() {
    try {
      logger.info('Obteniendo métricas administrativas');

      const [totalPacientes, totalDoctores, citasHoy] = await Promise.all([
        this.dashboardRepository.getTotalPacientes(),
        this.dashboardRepository.getTotalDoctores(),
        this.dashboardRepository.getCitasHoy()
      ]);

      return {
        totalPacientes,
        totalDoctores,
        citasHoy,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error obteniendo métricas administrativas', error);
      throw error;
    }
  }

  async getAdminCharts(type = 'citas') {
    try {
      logger.info(`Obteniendo gráfico administrativo: ${type}`);

      let chartData;
      switch (type) {
        case 'citas':
          chartData = await this.dashboardRepository.getCitasUltimos7Dias();
          break;
        default:
          throw new Error(`Tipo de gráfico no soportado: ${type}`);
      }

      return {
        type,
        data: chartData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error obteniendo gráfico ${type}`, error);
      throw error;
    }
  }

  async getAdminAlerts() {
    try {
      logger.info('Obteniendo alertas administrativas');

      const alertas = await this.dashboardRepository.getAlertasAdmin();

      return {
        alertas,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error obteniendo alertas administrativas', error);
      throw error;
    }
  }

  async getAdminAnalytics() {
    try {
      logger.info('Obteniendo análisis administrativos');

      const metricasAvanzadas = await this.dashboardRepository.getMetricasAvanzadas();

      return {
        ...metricasAvanzadas,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error obteniendo análisis administrativos', error);
      throw error;
    }
  }

  // =====================================================
  // SERVICIOS PARA DOCTOR
  // =====================================================

  async getDoctorSummary(doctorId, estado = null, periodo = null, rangoMeses = null) {
    try {
      // logger.info(`Obteniendo resumen del dashboard del doctor: ${doctorId}, Estado: ${estado || 'todos'}, Periodo: ${periodo || 'ninguno'}`);

      // Si hay periodo, obtener comorbilidades por periodo, sino obtener las más frecuentes
      const comorbilidadesPromise = periodo
        ? this.dashboardRepository.getComorbilidadesPorPeriodo(doctorId, periodo, estado, rangoMeses)
        : this.dashboardRepository.getComorbilidadesMasFrecuentesDoctor(doctorId, estado);

      // Ejecutar consultas en paralelo
      const [
        citasHoy,
        pacientes,
        mensajesPendientes,
        proximasCitas,
        citasUltimos7Dias,
        signosVitalesCriticos,
        comorbilidadesData
      ] = await Promise.all([
        this.dashboardRepository.getCitasDoctorHoy(doctorId),
        this.dashboardRepository.getPacientesDoctor(doctorId),
        this.dashboardRepository.getMensajesPendientesDoctor(doctorId),
        this.dashboardRepository.getProximasCitasDoctor(doctorId),
        this.dashboardRepository.getCitasDoctorUltimos7Dias(doctorId),
        this.dashboardRepository.getSignosVitalesCriticosDoctor(doctorId),
        comorbilidadesPromise
      ]);

      // Log crítico: Verificar citas de hoy
      logger.info(`Resumen del doctor obtenido - DoctorId: ${doctorId}, CitasHoy: ${citasHoy.length}`);

      const summary = {
        metrics: {
          citasHoy: citasHoy.length,
          pacientesAsignados: pacientes.length,
          mensajesPendientes: mensajesPendientes.length,
          proximasCitas: proximasCitas.length
        },
        citasHoy: citasHoy.map(cita => {
          const fechaISO = cita.fecha_cita 
            ? (cita.fecha_cita instanceof Date ? cita.fecha_cita.toISOString() : new Date(cita.fecha_cita).toISOString())
            : null;
          
          return {
            id: cita.id_cita,
            paciente: `${cita.Paciente?.nombre || ''} ${cita.Paciente?.apellido_paterno || ''}`.trim() || 'Paciente desconocido',
            hora: fechaISO,
            motivo: cita.motivo || 'Sin motivo',
            asistencia: cita.asistencia,
            estado: cita.estado || 'pendiente',
            telefono: cita.Paciente?.numero_celular || null
          };
        }),
        pacientes: pacientes.map(paciente => ({
          id: paciente.id_paciente,
          nombre: `${paciente.nombre} ${paciente.apellido_paterno}`,
          ultimaConsulta: paciente.Citas?.[0]?.fecha_cita || null,
          motivoUltimaConsulta: paciente.Citas?.[0]?.motivo || null
        })),
        mensajesPendientes: mensajesPendientes.map(mensaje => ({
          id: mensaje.id_mensaje,
          paciente: `${mensaje.Paciente.nombre} ${mensaje.Paciente.apellido_paterno}`,
          mensaje: mensaje.mensaje_texto,
          fecha: mensaje.fecha_envio
        })),
        proximasCitas: proximasCitas.map(cita => ({
          id: cita.id_cita,
          paciente: `${cita.Paciente.nombre} ${cita.Paciente.apellido_paterno}`,
          fecha: cita.fecha_cita,
          motivo: cita.motivo,
          estado: cita.estado,
          telefono: cita.Paciente.numero_celular
        })),
        chartData: {
          citasUltimos7Dias: citasUltimos7Dias,
          comorbilidadesMasFrecuentes: periodo ? null : comorbilidadesData,
          comorbilidadesPorPeriodo: periodo ? comorbilidadesData : null,
          periodo: periodo || null
        },
        alertas: {
          signosVitalesCriticos: signosVitalesCriticos.map(sv => ({
            id_paciente: sv.id_paciente,
            paciente: `${sv.nombre} ${sv.apellido_paterno}`,
            tipo_alerta: sv.tipo_alerta,
            glucosa: sv.glucosa_mg_dl,
            presion_sistolica: sv.presion_sistolica,
            presion_diastolica: sv.presion_diastolica,
            fecha_medicion: sv.fecha_medicion
          }))
        },
        timestamp: new Date().toISOString()
      };

      logger.info('Resumen del doctor obtenido exitosamente', { 
        doctorId, 
        citasHoy: citasHoy.length,
        pacientes: pacientes.length 
      });

      return summary;
    } catch (error) {
      logger.error(`Error obteniendo resumen del doctor ${doctorId}`, error);
      throw error;
    }
  }

  async getDoctorPatients(doctorId) {
    try {
      logger.info(`Obteniendo pacientes del doctor: ${doctorId}`);

      const pacientes = await this.dashboardRepository.getPacientesDoctor(doctorId);

      return {
        pacientes: pacientes.map(paciente => ({
          id: paciente.id_paciente,
          nombre: `${paciente.nombre} ${paciente.apellido_paterno}`,
          edad: this.calcularEdad(paciente.fecha_nacimiento),
          ultimaConsulta: paciente.Citas?.[0]?.fecha_cita || null,
          motivoUltimaConsulta: paciente.Citas?.[0]?.motivo || null,
          asistenciaUltimaConsulta: paciente.Citas?.[0]?.asistencia || null
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error obteniendo pacientes del doctor ${doctorId}`, error);
      throw error;
    }
  }

  async getDoctorAppointments(doctorId, fecha = null) {
    try {
      logger.info(`Obteniendo citas del doctor: ${doctorId}`);

      let citas;
      if (fecha) {
        // Implementar consulta por fecha específica
        citas = await this.dashboardRepository.getCitasDoctorHoy(doctorId);
      } else {
        citas = await this.dashboardRepository.getProximasCitasDoctor(doctorId);
      }

      return {
        citas: citas.map(cita => ({
          id: cita.id_cita,
          paciente: `${cita.Paciente.nombre} ${cita.Paciente.apellido_paterno}`,
          fecha: cita.fecha_cita,
          motivo: cita.motivo,
          asistencia: cita.asistencia,
          telefono: cita.Paciente.numero_celular
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error obteniendo citas del doctor ${doctorId}`, error);
      throw error;
    }
  }

  async getPatientVitalSigns(doctorId, pacienteId) {
    try {
      logger.info(`Obteniendo signos vitales del paciente ${pacienteId} para doctor ${doctorId}`);

      const signosVitales = await this.dashboardRepository.getSignosVitalesPaciente(pacienteId, doctorId);

      return {
        signosVitales: signosVitales.map(signo => ({
          id: signo.id_signo,
          fecha: signo.fecha_medicion,
          peso: signo.peso_kg,
          talla: signo.talla_m,
          imc: signo.imc,
          presionSistolica: signo.presion_sistolica,
          presionDiastolica: signo.presion_diastolica,
          glucosa: signo.glucosa_mg_dl,
          colesterol: signo.colesterol_mg_dl,
          observaciones: signo.observaciones
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error obteniendo signos vitales del paciente ${pacienteId}`, error);
      throw error;
    }
  }

  async getDoctorMessages(doctorId) {
    try {
      logger.info(`Obteniendo mensajes del doctor: ${doctorId}`);

      const mensajes = await this.dashboardRepository.getMensajesPendientesDoctor(doctorId);

      return {
        mensajes: mensajes.map(mensaje => ({
          id: mensaje.id_mensaje,
          paciente: `${mensaje.Paciente.nombre} ${mensaje.Paciente.apellido_paterno}`,
          mensaje: mensaje.mensaje_texto,
          fecha: mensaje.fecha_envio,
          leido: mensaje.leido,
          remitente: mensaje.remitente
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error obteniendo mensajes del doctor ${doctorId}`, error);
      throw error;
    }
  }

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  calcularEdad(fechaNacimiento) {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  }

  validarAccesoDoctor(doctorId, pacienteId) {
    // Validación adicional de seguridad
    if (!doctorId || !pacienteId) {
      throw new Error('ID de doctor o paciente requerido');
    }
  }

  async getDoctorDashboard(doctorId) {
    try {
      logger.info(`Obteniendo dashboard completo del doctor: ${doctorId}`);

      // Ejecutar todas las consultas en paralelo para mejor rendimiento
      const [
        doctor,
        pacientesAsignados,
        citasHoy,
        citasRecientes
      ] = await Promise.all([
        this.dashboardRepository.getDoctorById(doctorId),
        this.dashboardRepository.getPacientesDoctor(doctorId),
        this.dashboardRepository.getCitasDoctorHoy(doctorId),
        this.dashboardRepository.getCitasRecientesDoctor(doctorId)
      ]);

      if (!doctor) {
        throw new Error('Doctor no encontrado');
      }
      console.log(doctor);
      const dashboardData = {
        doctor: {
          id: doctor.id_doctor,
          nombre: doctor.nombre,
          apellido: doctor.apellido_paterno,
          apellido_paterno: doctor.apellido_paterno,
          apellido_materno: doctor.apellido_materno,
          telefono: doctor.telefono,
          email: doctor.Usuario?.email || 'No disponible',
          especialidad: doctor.grado_estudio || 'No especificada',
          institucion_hospitalaria: doctor.institucion_hospitalaria,
          grado_estudio: doctor.grado_estudio,
          anos_servicio: doctor.anos_servicio,
          modulo: doctor.Modulo?.nombre_modulo || 'No asignado',
          id_modulo: doctor.id_modulo,
          activo: doctor.activo
        },
        pacientesAsignados: pacientesAsignados.map(p => ({
          id: p.id_paciente,
          nombre: p.nombre,
          apellido: p.apellido_paterno,
          edad: this.calcularEdad(p.fecha_nacimiento),
          telefono: p.numero_celular,
          comorbilidades: p.Comorbilidades?.map(c => c.nombre) || []
        })),
        citasHoy: citasHoy.map(c => ({
          id: c.id_cita,
          fecha_cita: c.fecha_cita,
          motivo: c.motivo,
          asistencia: c.asistencia,
          paciente: {
            nombre: c.Paciente.nombre,
            apellido: c.Paciente.apellido_paterno
          }
        })),
        citasRecientes: citasRecientes.map(c => ({
          id: c.id_cita,
          fecha_cita: c.fecha_cita,
          motivo: c.motivo,
          asistencia: c.asistencia,
          paciente: {
            nombre: c.Paciente.nombre,
            apellido: c.Paciente.apellido_paterno
          }
        })),
        timestamp: new Date().toISOString()
      };

      logger.info('Dashboard del doctor obtenido exitosamente', { 
        doctorId, 
        pacientes: pacientesAsignados.length,
        citasHoy: citasHoy.length,
        citasRecientes: citasRecientes.length
      });

      return dashboardData;
    } catch (error) {
      logger.error(`Error obteniendo dashboard del doctor ${doctorId}`, error);
      throw error;
    }
  }
}

export default DashboardService;
