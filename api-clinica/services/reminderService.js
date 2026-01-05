/**
 * Servicio de Recordatorios Programados
 * 
 * Gestiona recordatorios automáticos de citas y medicamentos
 * usando cron jobs para ejecutar tareas programadas.
 */

import cron from 'node-cron';
import { Op } from 'sequelize';
import { Cita, Paciente, Doctor, PlanMedicacion, PlanDetalle, Medicamento, Usuario, DoctorPaciente, NotificacionDoctor } from '../models/associations.js';
import pushNotificationService from './pushNotificationService.js';
import auditoriaService from './auditoriaService.js';
import logger from '../utils/logger.js';

class ReminderService {
  constructor() {
    this.jobs = [];
    this.initialized = false;
  }

  /**
   * Inicializar todos los cron jobs
   */
  inicializarCronJobs() {
    if (this.initialized) {
      logger.warn('Cron jobs ya inicializados');
      return;
    }

    try {
      // Cron job 1: Recordatorio de citas 1 día antes (9:00 AM diariamente)
      cron.schedule('0 9 * * *', async () => {
        await this.verificarCitasManana();
      });

      logger.info('✅ Cron job inicializado: Recordatorios de citas (1 día antes) - 9:00 AM');

      // Cron job 2: Recordatorio de citas 3 horas antes (ejecutar cada hora)
      cron.schedule('0 * * * *', async () => {
        await this.verificarCitasProximas();
      });

      logger.info('✅ Cron job inicializado: Recordatorios de citas (3 horas antes) - Cada hora');

      // Cron job 3: Recordatorio de medicamentos 
      // ALTERNATIVA PARA HUAWEI: Verificar cada minuto para mayor confiabilidad
      // Esto permite que el servidor envíe notificaciones push en tiempo real
      // Las notificaciones push funcionan mejor en Huawei que las locales programadas
      const isDev = process.env.NODE_ENV !== 'production';
      const medicamentosCron = isDev ? '* * * * *' : '* * * * *'; // Cada minuto en ambos modos para Huawei
      
      cron.schedule(medicamentosCron, async () => {
        await this.verificarMedicamentosAhora();
      });

      logger.info(`✅ Cron job inicializado: Recordatorios de medicamentos - Cada minuto (optimizado para Huawei)`);

      // Cron job 4: Actualizar citas pasadas automáticamente (1:00 AM diariamente)
      cron.schedule('0 1 * * *', async () => {
        await this.actualizarCitasPasadas();
      });

      logger.info('✅ Cron job inicializado: Actualización automática de citas pasadas - 1:00 AM');

      this.initialized = true;
      logger.info('✅ ReminderService inicializado correctamente');
    } catch (error) {
      logger.error('Error inicializando cron jobs:', error);
    }
  }

  /**
   * Verificar citas de mañana y enviar recordatorios
   */
  async verificarCitasManana() {
    try {
      const ahora = new Date();
      const manana = new Date(ahora);
      manana.setDate(manana.getDate() + 1);
      manana.setHours(0, 0, 0, 0);

      const finManana = new Date(manana);
      finManana.setHours(23, 59, 59, 999);

      // Buscar citas mañana
      const citas = await Cita.findAll({
        where: {
          fecha_cita: {
            [Op.between]: [manana, finManana],
          },
          asistencia: {
            [Op.or]: [null, 0, false], // Citas pendientes
          },
        },
        include: [
          {
            model: Paciente,
            include: [
              {
                model: Usuario,
                attributes: ['id_usuario'],
              },
            ],
          },
          {
            model: Doctor,
            attributes: ['nombre', 'apellido_paterno'],
          },
        ],
      });

      logger.info(`Recordatorios de citas mañana: ${citas.length} citas encontradas`);

      for (const cita of citas) {
        await this.enviarRecordatorioCita(cita, '1 día');
      }

      logger.success(`Recordatorios de citas enviados: ${citas.length}`);
    } catch (error) {
      logger.error('Error verificando citas de mañana:', error);
    }
  }

  /**
   * Verificar citas en próximas 3 horas
   */
  async verificarCitasProximas() {
    try {
      const ahora = new Date();
      const en3Horas = new Date(ahora);
      en3Horas.setHours(en3Horas.getHours() + 3);

      // Buscar citas en las próximas 3 horas
      const citas = await Cita.findAll({
        where: {
          fecha_cita: {
            [Op.between]: [ahora, en3Horas],
          },
          asistencia: {
            [Op.or]: [null, 0, false], // Citas pendientes
          },
        },
        include: [
          {
            model: Paciente,
            include: [
              {
                model: Usuario,
                attributes: ['id_usuario'],
              },
            ],
          },
          {
            model: Doctor,
            attributes: ['nombre', 'apellido_paterno'],
          },
        ],
      });

      if (citas.length > 0) {
        logger.info(`Recordatorios de citas próximas: ${citas.length} citas encontradas`);

        for (const cita of citas) {
          const diferencia = new Date(cita.fecha_cita) - ahora;
          const horas = Math.floor(diferencia / (1000 * 60 * 60));

          if (horas >= 2 && horas <= 3) {
            // Solo enviar si está entre 2-3 horas antes (evitar duplicados)
            await this.enviarRecordatorioCita(cita, '3 horas');
          }
        }
      }
    } catch (error) {
      logger.error('Error verificando citas próximas:', error);
    }
  }

  /**
   * Verificar medicamentos que deben tomarse ahora
   */
  async verificarMedicamentosAhora() {
    try {
      const ahora = new Date();
      const horaActual = ahora.getHours();
      const minutoActual = ahora.getMinutes();

      // Buscar planes de medicación activos
      const planes = await PlanMedicacion.findAll({
        where: {
          activo: true,
        },
        include: [
          {
            model: Paciente,
            include: [
              {
                model: Usuario,
                attributes: ['id_usuario'],
              },
            ],
          },
          {
            model: PlanDetalle,
            required: true,
            include: [
              {
                model: Medicamento,
                attributes: ['id_medicamento', 'nombre_medicamento'], // ✅ Corregido: nombre -> nombre_medicamento
              },
            ],
          },
          {
            model: Doctor,
            attributes: ['nombre', 'apellido_paterno'],
          },
        ],
      });

      for (const plan of planes) {
        for (const detalle of plan.PlanDetalles || []) {
          if (!detalle.horario) continue;

          const [horas, minutos] = detalle.horario.split(':').map(Number);
          const horaMedicamento = horas || 0;
          const minutoMedicamento = minutos || 0;

          // Verificar si es hora de tomar el medicamento
          // ALTERNATIVA PARA HUAWEI: El servidor verifica cada minuto y envía push notifications
          // Esto funciona mejor que las notificaciones locales programadas en Huawei
          const isDev = process.env.NODE_ENV !== 'production';
          const minutosAntes = isDev ? 0.5 : 30; // 0.5 minutos = 30 segundos en modo desarrollo
          
          // Calcular ventana de recordatorio (30 min antes o 30 seg en dev)
          const minutoRecordatorio = minutoMedicamento - minutosAntes;
          const horaRecordatorio =
            minutoRecordatorio < 0 ? horaMedicamento - 1 : horaMedicamento;
          const minutoRecordatorioAjustado = minutoRecordatorio < 0 ? 60 + minutoRecordatorio : minutoRecordatorio;

          // Ventana de recordatorio (30 min antes o 30 seg en dev)
          const enVentanaRecordatorio = horaActual === horaRecordatorio &&
            minutoActual >= minutoRecordatorioAjustado &&
            minutoActual < minutoMedicamento;

          // Horario exacto (en el minuto exacto del medicamento)
          const enHorarioExacto = horaActual === horaMedicamento &&
            minutoActual === minutoMedicamento;

          // Enviar notificación push desde el servidor (funciona mejor en Huawei)
          if (enVentanaRecordatorio || enHorarioExacto) {
            await this.enviarRecordatorioMedicamento(plan, detalle);
          }
        }
      }
    } catch (error) {
      logger.error('Error verificando medicamentos:', error);
    }
  }

  /**
   * Enviar recordatorio de cita
   */
  async enviarRecordatorioCita(cita, tiempo) {
    try {
      if (!cita.Paciente?.Usuario?.id_usuario) {
        logger.warn('Paciente sin usuario para recordatorio de cita', { citaId: cita.id_cita });
        return;
      }

      const fechaCita = new Date(cita.fecha_cita);
      const fechaFormateada = fechaCita.toLocaleString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      const doctorNombre = cita.Doctor
        ? `${cita.Doctor.nombre} ${cita.Doctor.apellido_paterno}`
        : 'Tu doctor';

      const mensaje = `📅 Recordatorio: Tienes una cita ${tiempo === '1 día' ? 'mañana' : 'en 3 horas'}.\n\nFecha: ${fechaFormateada}\nDoctor: ${doctorNombre}${cita.motivo ? `\nMotivo: ${cita.motivo}` : ''}\n\n¡No olvides asistir!`;

      await pushNotificationService.sendPushNotification(cita.Paciente.Usuario.id_usuario, {
        title: '📅 Recordatorio de Cita',
        message: mensaje,
        type: 'recordatorio_cita',
        data: {
          citaId: cita.id_cita,
          fechaCita: cita.fecha_cita,
          doctorNombre,
          tiempo,
        },
      });

      logger.debug('Recordatorio de cita enviado', {
        citaId: cita.id_cita,
        pacienteId: cita.id_paciente,
        tiempo,
      });
    } catch (error) {
      logger.error('Error enviando recordatorio de cita:', error);
    }
  }

  /**
   * Enviar recordatorio de medicamento
   */
  async enviarRecordatorioMedicamento(plan, detalle) {
    try {
      if (!plan.Paciente?.Usuario?.id_usuario) {
        logger.warn('Paciente sin usuario para recordatorio de medicamento', {
          planId: plan.id_plan_medicacion,
        });
        return;
      }

      const medicamento = detalle.Medicamento || {};
      const nombreMedicamento = medicamento.nombre_medicamento || medicamento.nombre || 'Medicamento';
      const dosis = detalle.dosis || '1 tableta';
      const horario = detalle.horario || '08:00';

      // Mensaje actualizado según requerimientos del usuario
      const mensaje = `TOMA EL MEDICAMENTO: ${nombreMedicamento}`;

      await pushNotificationService.sendPushNotification(plan.Paciente.Usuario.id_usuario, {
        title: 'Recordatorio de medicamento',
        message: mensaje,
        type: 'recordatorio_medicamento',
        data: {
          planId: plan.id_plan,
          detalleId: detalle.id_detalle,
          medicamentoNombre: nombreMedicamento,
          dosis,
          horario,
        },
      });

      logger.debug('Recordatorio de medicamento enviado', {
        planId: plan.id_plan_medicacion,
        pacienteId: plan.id_paciente,
        medicamento: nombreMedicamento,
        horario,
      });
    } catch (error) {
      logger.error('Error enviando recordatorio de medicamento:', error);
    }
  }

  /**
   * Actualizar citas pasadas automáticamente a "no_asistida"
   * Ejecutado diariamente a la 1:00 AM
   */
  async actualizarCitasPasadas() {
    try {
      logger.info('🔄 Iniciando actualización automática de citas pasadas...');

      const ahora = new Date();
      const hoy = new Date(ahora);
      hoy.setHours(0, 0, 0, 0);

      // Ventana de gracia: 4 horas (no marcar como no_asistida si la cita fue hace menos de 4 horas)
      const ventanaGracia = new Date(ahora);
      ventanaGracia.setHours(ventanaGracia.getHours() - 4);

      // Buscar citas pasadas que estén en estado 'pendiente'
      const citasPasadas = await Cita.findAll({
        where: {
          fecha_cita: {
            [Op.lt]: ventanaGracia // Citas pasadas con más de 4 horas de diferencia
          },
          estado: 'pendiente' // Solo actualizar las que están pendientes
        },
        include: [
          {
            model: Doctor,
            include: [
              {
                model: Usuario,
                attributes: ['id_usuario'],
                required: false
              }
            ],
            required: false
          },
          {
            model: Paciente,
            attributes: ['id_paciente', 'nombre', 'apellido_paterno'],
            required: false
          }
        ]
      });

      if (citasPasadas.length === 0) {
        logger.info('✅ No hay citas pasadas para actualizar');
        return;
      }

      logger.info(`📋 Encontradas ${citasPasadas.length} citas pasadas para actualizar`);

      // Agrupar citas por doctor para notificaciones consolidadas
      const citasPorDoctor = {};
      const citasActualizadas = [];

      for (const cita of citasPasadas) {
        const estadoAnterior = cita.estado || 'pendiente';
        
        // Actualizar estado
        await cita.update({
          estado: 'no_asistida',
          asistencia: false // Mantener compatibilidad
        });

        citasActualizadas.push({
          id_cita: cita.id_cita,
          fecha_cita: cita.fecha_cita,
          estado_anterior: estadoAnterior
        });

        // Agrupar por doctor para notificaciones
        if (cita.id_doctor) {
          if (!citasPorDoctor[cita.id_doctor]) {
            citasPorDoctor[cita.id_doctor] = {
              doctor: cita.Doctor,
              citas: []
            };
          }
          citasPorDoctor[cita.id_doctor].citas.push({
            id_cita: cita.id_cita,
            paciente: cita.Paciente ? `${cita.Paciente.nombre} ${cita.Paciente.apellido_paterno}` : 'Paciente desconocido',
            fecha_cita: cita.fecha_cita
          });
        }
      }

      // Registrar en auditoría
      await auditoriaService.registrarActualizacionCitasAutomatica(
        citasPasadas.length,
        citasActualizadas
      );

      // Notificar a cada doctor con resumen consolidado
      for (const [doctorId, datos] of Object.entries(citasPorDoctor)) {
        const doctor = datos.doctor;
        const citas = datos.citas;

        if (doctor?.Usuario?.id_usuario) {
          const totalCitas = citas.length;
          const mensajeCitas = citas
            .slice(0, 5) // Mostrar máximo 5 en el mensaje
            .map(c => `• ${c.paciente} - ${new Date(c.fecha_cita).toLocaleDateString('es-MX')}`)
            .join('\n');

          const mensajeCompleto = totalCitas > 5
            ? `${mensajeCitas}\n\n... y ${totalCitas - 5} cita(s) más`
            : mensajeCitas;

          // Enviar notificación push
          await pushNotificationService.sendPushNotification(
            doctor.Usuario.id_usuario,
            {
              title: '📋 Citas Actualizadas Automáticamente',
              message: `${totalCitas} ${totalCitas === 1 ? 'cita fue marcada' : 'citas fueron marcadas'} como 'no asistida' por fecha pasada:\n\n${mensajeCompleto}`,
              type: 'citas_actualizadas',
              data: {
                totalCitas,
                citas: citas.map(c => ({
                  id_cita: c.id_cita,
                  paciente: c.paciente,
                  fecha_cita: c.fecha_cita
                })),
                fechaActualizacion: new Date().toISOString()
              }
            }
          );

          // Nota: La notificación ya se guarda automáticamente en pushNotificationService.guardarNotificacionDoctor()
        }
      }

      logger.info('✅ Actualización de citas pasadas completada', {
        totalCitas: citasPasadas.length,
        doctoresNotificados: Object.keys(citasPorDoctor).length
      });
    } catch (error) {
      logger.error('Error actualizando citas pasadas:', error);
    }
  }

  /**
   * Detener todos los cron jobs
   */
  detenerCronJobs() {
    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
    this.initialized = false;
    logger.info('Cron jobs detenidos');
  }
}

// Singleton
const reminderService = new ReminderService();

export default reminderService;

