/**
 * Servicio de Tareas Programadas
 * 
 * Gestiona notificaciones push automatizadas para:
 * - Recordatorios de medicamentos (en horario programado)
 * - Recordatorios de citas (24h y 5h antes)
 * 
 * Usa node-cron para ejecutar tareas periódicamente
 */

import cron from 'node-cron';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import logger from '../utils/logger.js';
import pushNotificationService from './pushNotificationService.js';
import { Cita, Paciente, PlanMedicacion, PlanDetalle, Medicamento, Doctor } from '../models/associations.js';

class ScheduledTasksService {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
    // Cache de notificaciones enviadas para evitar duplicados (últimas 24 horas)
    this.sentNotificationsCache = new Map();
    this.cacheCleanupInterval = null;
  }

  /**
   * Iniciar todas las tareas programadas
   */
  start() {
    if (this.isRunning) {
      logger.warn('⚠️ Las tareas programadas ya están en ejecución');
      return;
    }

    logger.info('🚀 Iniciando servicio de tareas programadas...');

    // Limpiar cache cada hora
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 60 * 60 * 1000); // Cada hora

    // Tarea 1: Verificar medicamentos cada 5 minutos
    // Ejecuta cada 5 minutos para detectar medicamentos que deben tomarse
    const medicationTask = cron.schedule('*/5 * * * *', async () => {
      await this.checkMedicationReminders();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    // Tarea 2: Verificar citas cada hora (para recordatorios de 24h)
    // Ejecuta cada hora para detectar citas que están a 24h
    const appointment24hTask = cron.schedule('0 * * * *', async () => {
      await this.checkAppointmentReminders24h();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    // Tarea 3: Verificar citas cada 15 minutos (para recordatorios de 5h)
    // Ejecuta cada 15 minutos para detectar citas que están a 5h
    const appointment5hTask = cron.schedule('*/15 * * * *', async () => {
      await this.checkAppointmentReminders5h();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    // Tarea 4: Verificar citas cada 10 minutos (para recordatorios de 2h)
    // Ejecuta cada 10 minutos para detectar citas que están a 2h
    const appointment2hTask = cron.schedule('*/10 * * * *', async () => {
      await this.checkAppointmentReminders2h();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    // Tarea 5: Verificar citas cada 5 minutos (para recordatorios de 1h)
    // Ejecuta cada 5 minutos para detectar citas que están a 1h
    const appointment1hTask = cron.schedule('*/5 * * * *', async () => {
      await this.checkAppointmentReminders1h();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    // Tarea 6: Verificar citas cada minuto (para recordatorios de 30min)
    // Ejecuta cada minuto para detectar citas que están a 30 minutos
    const appointment30minTask = cron.schedule('* * * * *', async () => {
      await this.checkAppointmentReminders30min();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    // Iniciar todas las tareas
    medicationTask.start();
    appointment24hTask.start();
    appointment5hTask.start();
    appointment2hTask.start();
    appointment1hTask.start();
    appointment30minTask.start();

    this.tasks.push(medicationTask, appointment24hTask, appointment5hTask, appointment2hTask, appointment1hTask, appointment30minTask);
    this.isRunning = true;

    logger.info('✅ Tareas programadas iniciadas correctamente');
    logger.info('   📋 Verificación de medicamentos: cada 5 minutos');
    logger.info('   📅 Verificación de citas (24h): cada hora');
    logger.info('   ⏰ Verificación de citas (5h): cada 15 minutos');
    logger.info('   ⏰ Verificación de citas (2h): cada 10 minutos');
    logger.info('   ⏰ Verificación de citas (1h): cada 5 minutos');
    logger.info('   ⏰ Verificación de citas (30min): cada minuto');
  }

  /**
   * Detener todas las tareas programadas
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('⚠️ Las tareas programadas no están en ejecución');
      return;
    }

    logger.info('🛑 Deteniendo servicio de tareas programadas...');

    this.tasks.forEach(task => {
      task.stop();
    });

    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }

    this.tasks = [];
    this.isRunning = false;

    logger.info('✅ Tareas programadas detenidas correctamente');
  }

  /**
   * Verificar y enviar recordatorios de medicamentos
   */
  async checkMedicationReminders() {
    try {
      const ahora = new Date();
      const horaActual = ahora.getHours();
      const minutoActual = ahora.getMinutes();
      const horaMinutoActual = `${horaActual.toString().padStart(2, '0')}:${minutoActual.toString().padStart(2, '0')}`;

      // Rango de tiempo: ±2 minutos para permitir variación
      const minutoInicio = minutoActual - 2;
      const minutoFin = minutoActual + 2;

      // Verificación silenciosa (solo log si hay resultados)

      // Obtener planes de medicación activos
      const planesActivos = await PlanMedicacion.findAll({
        where: {
          activo: true,
          [Op.or]: [
            { fecha_fin: null },
            { fecha_fin: { [Op.gte]: new Date() } }
          ],
          fecha_inicio: { [Op.lte]: new Date() }
        },
        include: [
          {
            model: Paciente,
            attributes: ['id_paciente', 'id_usuario', 'nombre', 'apellido_paterno'],
            required: true
          },
          {
            model: PlanDetalle,
            required: true,
            include: [
              {
                model: Medicamento,
                attributes: ['id_medicamento', 'nombre_medicamento'],
                required: true
              }
            ]
          }
        ]
      });

      if (planesActivos.length === 0) {
        return;
      }

      let notificacionesEnviadas = 0;

      for (const plan of planesActivos) {
        const paciente = plan.Paciente;
        
        if (!paciente?.id_usuario) {
          continue; // Paciente sin usuario, no se puede enviar notificación
        }

        // Sequelize usa el nombre del modelo en plural para hasMany
        const detalles = plan.PlanDetalles || plan.PlanDetalle || [];
        for (const detalle of detalles) {
          // Obtener horarios: usar nuevo campo horarios o fallback a horario
          let horariosArray = [];
          if (detalle.horarios && Array.isArray(detalle.horarios) && detalle.horarios.length > 0) {
            // Usar nuevo campo horarios (array)
            horariosArray = detalle.horarios.filter(h => h && typeof h === 'string' && h.trim());
          } else if (detalle.horario) {
            // Fallback: usar campo horario único (compatibilidad hacia atrás)
            horariosArray = [detalle.horario];
          }

          if (horariosArray.length === 0) {
            continue; // Sin horarios definidos
          }

          // Procesar cada horario del array
          for (const horarioStr of horariosArray) {
            if (!horarioStr || typeof horarioStr !== 'string') {
              continue;
            }

            // Parsear horario (formato: "HH:MM" o "HH:MM:SS")
            const [horaStr, minutoStr] = horarioStr.split(':');
            const horaMedicamento = parseInt(horaStr) || 0;
            const minutoMedicamento = parseInt(minutoStr) || 0;

            // Verificar si el horario está dentro del rango actual (±2 minutos)
            if (horaMedicamento === horaActual && 
                minutoMedicamento >= minutoInicio && 
                minutoMedicamento <= minutoFin) {
              
              // Crear clave única para evitar duplicados (incluye horario específico)
              const cacheKey = `med_${paciente.id_paciente}_${detalle.id_detalle}_${horaMedicamento}_${minutoMedicamento}`;
              
              if (this.sentNotificationsCache.has(cacheKey)) {
                continue; // Evitar duplicados
              }

              const medicamento = detalle.Medicamento;
              const nombreMedicamento = medicamento?.nombre_medicamento || 'Medicamento';
              const dosis = detalle.dosis || 'según indicación';
              const frecuencia = detalle.frecuencia || '';

              // Enviar notificación push
              try {
                const resultado = await pushNotificationService.sendMedicationReminder(
                  paciente.id_usuario,
                  {
                    id: detalle.id_detalle,
                    name: nombreMedicamento,
                    dosage: dosis,
                    instructions: `${frecuencia ? `Frecuencia: ${frecuencia}. ` : ''}${detalle.observaciones || ''}`.trim(),
                    horario: horarioStr // Incluir horario específico en los datos
                  }
                );

                if (resultado.success) {
                  // Marcar como enviada en cache (válida por 1 hora)
                  this.sentNotificationsCache.set(cacheKey, {
                    timestamp: ahora.getTime(),
                    expiresAt: ahora.getTime() + (60 * 60 * 1000) // 1 hora
                  });

                  notificacionesEnviadas++;
                  logger.info(`✅ Notificación de medicamento enviada: ${nombreMedicamento} (${horarioStr}) a ${paciente.nombre} ${paciente.apellido_paterno} (${resultado.devices || 0} dispositivo(s))`);
                } else {
                  logger.warn(`⚠️ No se pudo enviar notificación de medicamento`, {
                    pacienteId: paciente.id_paciente,
                    medicamento: nombreMedicamento,
                    horario: horarioStr,
                    motivo: resultado.message
                  });
                }
              } catch (error) {
                logger.error(`❌ Error enviando notificación de medicamento:`, {
                  pacienteId: paciente.id_paciente,
                  medicamento: nombreMedicamento,
                  horario: horarioStr,
                  error: error.message
                });
              }
            }
          }
        }
      }

      if (notificacionesEnviadas > 0) {
        logger.info(`📊 Resumen: ${notificacionesEnviadas} notificación(es) de medicamento enviada(s)`);
      }
    } catch (error) {
      logger.error('❌ Error en checkMedicationReminders:', error);
    }
  }

  /**
   * Verificar y enviar recordatorios de citas (24 horas antes)
   */
  async checkAppointmentReminders24h() {
    try {
      const ahora = new Date();
      const en24Horas = new Date(ahora.getTime() + (24 * 60 * 60 * 1000));
      
      // Rango: 23.5 a 24.5 horas (ventana de 1 hora)
      const inicioRango = new Date(ahora.getTime() + (23.5 * 60 * 60 * 1000));
      const finRango = new Date(ahora.getTime() + (24.5 * 60 * 60 * 1000));

      // Verificación silenciosa (solo log si hay resultados)

      // Obtener citas que están en el rango de 24 horas
      const citas = await Cita.findAll({
        where: {
          estado: { [Op.in]: ['pendiente', 'reprogramada'] },
          fecha_cita: {
            [Op.between]: [inicioRango, finRango]
          }
        },
        include: [
          {
            model: Paciente,
            attributes: ['id_paciente', 'id_usuario', 'nombre', 'apellido_paterno'],
            required: true
          },
          {
            model: Doctor,
            attributes: ['id_doctor', 'nombre', 'apellido_paterno'],
            required: false
          }
        ]
      });

      if (citas.length === 0) {
        return;
      }

      let notificacionesEnviadas = 0;

      for (const cita of citas) {
        const paciente = cita.Paciente;
        
        if (!paciente?.id_usuario) {
          continue;
        }

        // Crear clave única para evitar duplicados
        const cacheKey = `cita_24h_${cita.id_cita}`;
        
        if (this.sentNotificationsCache.has(cacheKey)) {
          continue; // Evitar duplicados
        }

        const doctorNombre = cita.Doctor ? 
          `Dr. ${cita.Doctor.nombre} ${cita.Doctor.apellido_paterno}` : 
          'tu médico';
        const motivo = cita.motivo || 'Consulta médica';

        // Formatear fecha de la cita
        const fechaCita = new Date(cita.fecha_cita);
        const fechaFormateada = fechaCita.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Enviar notificación push
        try {
          const resultado = await pushNotificationService.sendAppointmentReminder(
            paciente.id_usuario,
            {
              id: cita.id_cita,
              doctor_name: doctorNombre,
              time: fechaFormateada,
              location: motivo,
              fecha_cita: cita.fecha_cita,
              motivo: motivo,
              urgent: false, // Recordatorio normal (24h)
              tiempo_restante: '24 horas'
            }
          );

          if (resultado.success) {
            // Marcar como enviada en cache (válida por 2 horas)
            this.sentNotificationsCache.set(cacheKey, {
              timestamp: ahora.getTime(),
              expiresAt: ahora.getTime() + (2 * 60 * 60 * 1000) // 2 horas
            });

            notificacionesEnviadas++;
            logger.info(`✅ Notificación de cita (24h) enviada: Cita #${cita.id_cita} a ${paciente.nombre} ${paciente.apellido_paterno} (${resultado.devices || 0} dispositivo(s))`);
          } else {
            logger.warn(`⚠️ No se pudo enviar notificación de cita (24h)`, {
              citaId: cita.id_cita,
              pacienteId: paciente.id_paciente,
              motivo: resultado.message
            });
          }
        } catch (error) {
          logger.error(`❌ Error enviando notificación de cita (24h):`, {
            citaId: cita.id_cita,
            pacienteId: paciente.id_paciente,
            error: error.message
          });
        }
      }

      if (notificacionesEnviadas > 0) {
        logger.info(`📊 Resumen: ${notificacionesEnviadas} notificación(es) de cita (24h) enviada(s)`);
      }
    } catch (error) {
      logger.error('❌ Error en checkAppointmentReminders24h:', error);
    }
  }

  /**
   * Verificar y enviar recordatorios de citas (5 horas antes)
   */
  async checkAppointmentReminders5h() {
    try {
      const ahora = new Date();
      
      // Rango: 4.5 a 5.5 horas (ventana de 1 hora)
      const inicioRango = new Date(ahora.getTime() + (4.5 * 60 * 60 * 1000));
      const finRango = new Date(ahora.getTime() + (5.5 * 60 * 60 * 1000));

      // Verificación silenciosa (solo log si hay resultados)

      // Obtener citas que están en el rango de 5 horas
      // IMPORTANTE: Para citas reprogramadas, usar fecha_reprogramada en lugar de fecha_cita
      const citas = await Cita.findAll({
        where: {
          estado: { [Op.in]: ['pendiente', 'reprogramada'] },
          [Op.or]: [
            // Citas normales (pendientes) usan fecha_cita
            {
              estado: 'pendiente',
              fecha_cita: {
                [Op.between]: [inicioRango, finRango]
              }
            },
            // Citas reprogramadas usan fecha_reprogramada
            {
              estado: 'reprogramada',
              fecha_reprogramada: {
                [Op.between]: [inicioRango, finRango]
              }
            }
          ]
        },
        include: [
          {
            model: Paciente,
            attributes: ['id_paciente', 'id_usuario', 'nombre', 'apellido_paterno'],
            required: true
          },
          {
            model: Doctor,
            attributes: ['id_doctor', 'nombre', 'apellido_paterno'],
            required: false
          }
        ]
      });

      if (citas.length === 0) {
        return;
      }

      let notificacionesEnviadas = 0;

      for (const cita of citas) {
        const paciente = cita.Paciente;
        
        if (!paciente?.id_usuario) {
          continue;
        }

        // Crear clave única para evitar duplicados
        const cacheKey = `cita_5h_${cita.id_cita}`;
        
        if (this.sentNotificationsCache.has(cacheKey)) {
          continue; // Evitar duplicados
        }

        const doctorNombre = cita.Doctor ? 
          `Dr. ${cita.Doctor.nombre} ${cita.Doctor.apellido_paterno}` : 
          'tu médico';
        const motivo = cita.motivo || 'Consulta médica';

        // Formatear fecha de la cita
        // Usar fecha_reprogramada si existe y el estado es 'reprogramada', sino usar fecha_cita
        const fechaParaRecordatorio = (cita.estado === 'reprogramada' && cita.fecha_reprogramada) 
          ? new Date(cita.fecha_reprogramada) 
          : new Date(cita.fecha_cita);
        const fechaFormateada = fechaParaRecordatorio.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Enviar notificación push
        try {
          const resultado = await pushNotificationService.sendAppointmentReminder(
            paciente.id_usuario,
            {
              id: cita.id_cita,
              doctor_name: doctorNombre,
              time: fechaFormateada,
              location: motivo,
              fecha_cita: fechaParaRecordatorio.toISOString(),
              motivo: motivo,
              urgent: true, // Marcar como urgente
              tiempo_restante: '5 horas'
            }
          );

          if (resultado.success) {
            // Marcar como enviada en cache (válida por 1 hora)
            this.sentNotificationsCache.set(cacheKey, {
              timestamp: ahora.getTime(),
              expiresAt: ahora.getTime() + (60 * 60 * 1000) // 1 hora
            });

            notificacionesEnviadas++;
            logger.info(`✅ Notificación de cita (5h) enviada: Cita #${cita.id_cita} a ${paciente.nombre} ${paciente.apellido_paterno} (${resultado.devices || 0} dispositivo(s))`);
          } else {
            logger.warn(`⚠️ No se pudo enviar notificación de cita (5h)`, {
              citaId: cita.id_cita,
              pacienteId: paciente.id_paciente,
              motivo: resultado.message
            });
          }
        } catch (error) {
          logger.error(`❌ Error enviando notificación de cita (5h):`, {
            citaId: cita.id_cita,
            pacienteId: paciente.id_paciente,
            error: error.message
          });
        }
      }

      if (notificacionesEnviadas > 0) {
        logger.info(`📊 Resumen: ${notificacionesEnviadas} notificación(es) de cita (5h) enviada(s)`);
      }
    } catch (error) {
      logger.error('❌ Error en checkAppointmentReminders5h:', error);
    }
  }

  /**
   * Verificar y enviar recordatorios de citas (2 horas antes)
   */
  async checkAppointmentReminders2h() {
    try {
      const ahora = new Date();
      
      // Rango: 1.5 a 2.5 horas (ventana de 1 hora)
      const inicioRango = new Date(ahora.getTime() + (1.5 * 60 * 60 * 1000));
      const finRango = new Date(ahora.getTime() + (2.5 * 60 * 60 * 1000));

      // Obtener citas que están en el rango de 2 horas
      // IMPORTANTE: Para citas reprogramadas, usar fecha_reprogramada en lugar de fecha_cita
      const citas = await Cita.findAll({
        where: {
          estado: { [Op.in]: ['pendiente', 'reprogramada'] },
          [Op.or]: [
            // Citas normales (pendientes) usan fecha_cita
            {
              estado: 'pendiente',
              fecha_cita: {
                [Op.between]: [inicioRango, finRango]
              }
            },
            // Citas reprogramadas usan fecha_reprogramada
            {
              estado: 'reprogramada',
              fecha_reprogramada: {
                [Op.between]: [inicioRango, finRango]
              }
            }
          ]
        },
        include: [
          {
            model: Paciente,
            attributes: ['id_paciente', 'id_usuario', 'nombre', 'apellido_paterno'],
            required: true
          },
          {
            model: Doctor,
            attributes: ['id_doctor', 'nombre', 'apellido_paterno'],
            required: false
          }
        ]
      });

      if (citas.length === 0) {
        return;
      }

      let notificacionesEnviadas = 0;

      for (const cita of citas) {
        const paciente = cita.Paciente;
        
        if (!paciente?.id_usuario) {
          continue;
        }

        // Crear clave única para evitar duplicados
        const cacheKey = `cita_2h_${cita.id_cita}`;
        
        if (this.sentNotificationsCache.has(cacheKey)) {
          continue; // Evitar duplicados
        }

        const doctorNombre = cita.Doctor ? 
          `Dr. ${cita.Doctor.nombre} ${cita.Doctor.apellido_paterno}` : 
          'tu médico';
        const motivo = cita.motivo || 'Consulta médica';

        // Formatear fecha de la cita
        // Usar fecha_reprogramada si existe y el estado es 'reprogramada', sino usar fecha_cita
        const fechaParaRecordatorio = (cita.estado === 'reprogramada' && cita.fecha_reprogramada) 
          ? new Date(cita.fecha_reprogramada) 
          : new Date(cita.fecha_cita);
        const fechaFormateada = fechaParaRecordatorio.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Enviar notificación push
        try {
          const resultado = await pushNotificationService.sendAppointmentReminder(
            paciente.id_usuario,
            {
              id: cita.id_cita,
              doctor_name: doctorNombre,
              time: fechaFormateada,
              location: motivo,
              fecha_cita: fechaParaRecordatorio.toISOString(),
              motivo: motivo,
              urgent: true, // Marcar como urgente
              tiempo_restante: '2 horas'
            }
          );

          if (resultado.success) {
            // Marcar como enviada en cache (válida por 1 hora)
            this.sentNotificationsCache.set(cacheKey, {
              timestamp: ahora.getTime(),
              expiresAt: ahora.getTime() + (60 * 60 * 1000) // 1 hora
            });

            notificacionesEnviadas++;
            logger.info(`✅ Notificación de cita (2h) enviada: Cita #${cita.id_cita} a ${paciente.nombre} ${paciente.apellido_paterno} (${resultado.devices || 0} dispositivo(s))`);
          } else {
            logger.warn(`⚠️ No se pudo enviar notificación de cita (2h)`, {
              citaId: cita.id_cita,
              pacienteId: paciente.id_paciente,
              motivo: resultado.message
            });
          }
        } catch (error) {
          logger.error(`❌ Error enviando notificación de cita (2h):`, {
            citaId: cita.id_cita,
            pacienteId: paciente.id_paciente,
            error: error.message
          });
        }
      }

      if (notificacionesEnviadas > 0) {
        logger.info(`📊 Resumen: ${notificacionesEnviadas} notificación(es) de cita (2h) enviada(s)`);
      }
    } catch (error) {
      logger.error('❌ Error en checkAppointmentReminders2h:', error);
    }
  }

  /**
   * Verificar y enviar recordatorios de citas (1 hora antes)
   */
  async checkAppointmentReminders1h() {
    try {
      const ahora = new Date();
      
      // Rango: 0.5 a 1.5 horas (ventana de 1 hora)
      const inicioRango = new Date(ahora.getTime() + (0.5 * 60 * 60 * 1000));
      const finRango = new Date(ahora.getTime() + (1.5 * 60 * 60 * 1000));

      // Obtener citas que están en el rango de 1 hora
      // IMPORTANTE: Para citas reprogramadas, usar fecha_reprogramada en lugar de fecha_cita
      const citas = await Cita.findAll({
        where: {
          estado: { [Op.in]: ['pendiente', 'reprogramada'] },
          [Op.or]: [
            // Citas normales (pendientes) usan fecha_cita
            {
              estado: 'pendiente',
              fecha_cita: {
                [Op.between]: [inicioRango, finRango]
              }
            },
            // Citas reprogramadas usan fecha_reprogramada
            {
              estado: 'reprogramada',
              fecha_reprogramada: {
                [Op.between]: [inicioRango, finRango]
              }
            }
          ]
        },
        include: [
          {
            model: Paciente,
            attributes: ['id_paciente', 'id_usuario', 'nombre', 'apellido_paterno'],
            required: true
          },
          {
            model: Doctor,
            attributes: ['id_doctor', 'nombre', 'apellido_paterno'],
            required: false
          }
        ]
      });

      if (citas.length === 0) {
        return;
      }

      let notificacionesEnviadas = 0;

      for (const cita of citas) {
        const paciente = cita.Paciente;
        
        if (!paciente?.id_usuario) {
          continue;
        }

        // Crear clave única para evitar duplicados
        const cacheKey = `cita_1h_${cita.id_cita}`;
        
        if (this.sentNotificationsCache.has(cacheKey)) {
          continue; // Evitar duplicados
        }

        const doctorNombre = cita.Doctor ? 
          `Dr. ${cita.Doctor.nombre} ${cita.Doctor.apellido_paterno}` : 
          'tu médico';
        const motivo = cita.motivo || 'Consulta médica';

        // Formatear fecha de la cita
        // Usar fecha_reprogramada si existe y el estado es 'reprogramada', sino usar fecha_cita
        const fechaParaRecordatorio = (cita.estado === 'reprogramada' && cita.fecha_reprogramada) 
          ? new Date(cita.fecha_reprogramada) 
          : new Date(cita.fecha_cita);
        const fechaFormateada = fechaParaRecordatorio.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Enviar notificación push
        try {
          const resultado = await pushNotificationService.sendAppointmentReminder(
            paciente.id_usuario,
            {
              id: cita.id_cita,
              doctor_name: doctorNombre,
              time: fechaFormateada,
              location: motivo,
              fecha_cita: fechaParaRecordatorio.toISOString(),
              motivo: motivo,
              urgent: true, // Marcar como urgente
              tiempo_restante: '1 hora'
            }
          );

          if (resultado.success) {
            // Marcar como enviada en cache (válida por 30 minutos)
            this.sentNotificationsCache.set(cacheKey, {
              timestamp: ahora.getTime(),
              expiresAt: ahora.getTime() + (30 * 60 * 1000) // 30 minutos
            });

            notificacionesEnviadas++;
            logger.info(`✅ Notificación de cita (1h) enviada: Cita #${cita.id_cita} a ${paciente.nombre} ${paciente.apellido_paterno} (${resultado.devices || 0} dispositivo(s))`);
          } else {
            logger.warn(`⚠️ No se pudo enviar notificación de cita (1h)`, {
              citaId: cita.id_cita,
              pacienteId: paciente.id_paciente,
              motivo: resultado.message
            });
          }
        } catch (error) {
          logger.error(`❌ Error enviando notificación de cita (1h):`, {
            citaId: cita.id_cita,
            pacienteId: paciente.id_paciente,
            error: error.message
          });
        }
      }

      if (notificacionesEnviadas > 0) {
        logger.info(`📊 Resumen: ${notificacionesEnviadas} notificación(es) de cita (1h) enviada(s)`);
      }
    } catch (error) {
      logger.error('❌ Error en checkAppointmentReminders1h:', error);
    }
  }

  /**
   * Verificar y enviar recordatorios de citas (30 minutos antes)
   */
  async checkAppointmentReminders30min() {
    try {
      const ahora = new Date();
      
      // Rango: 20 a 40 minutos (ventana de 20 minutos)
      const inicioRango = new Date(ahora.getTime() + (20 * 60 * 1000));
      const finRango = new Date(ahora.getTime() + (40 * 60 * 1000));

      // Obtener citas que están en el rango de 30 minutos
      // IMPORTANTE: Para citas reprogramadas, usar fecha_reprogramada en lugar de fecha_cita
      const citas = await Cita.findAll({
        where: {
          estado: { [Op.in]: ['pendiente', 'reprogramada'] },
          [Op.or]: [
            // Citas normales (pendientes) usan fecha_cita
            {
              estado: 'pendiente',
              fecha_cita: {
                [Op.between]: [inicioRango, finRango]
              }
            },
            // Citas reprogramadas usan fecha_reprogramada
            {
              estado: 'reprogramada',
              fecha_reprogramada: {
                [Op.between]: [inicioRango, finRango]
              }
            }
          ]
        },
        include: [
          {
            model: Paciente,
            attributes: ['id_paciente', 'id_usuario', 'nombre', 'apellido_paterno'],
            required: true
          },
          {
            model: Doctor,
            attributes: ['id_doctor', 'nombre', 'apellido_paterno'],
            required: false
          }
        ]
      });

      if (citas.length === 0) {
        return;
      }

      let notificacionesEnviadas = 0;

      for (const cita of citas) {
        const paciente = cita.Paciente;
        
        if (!paciente?.id_usuario) {
          continue;
        }

        // Crear clave única para evitar duplicados
        const cacheKey = `cita_30min_${cita.id_cita}`;
        
        if (this.sentNotificationsCache.has(cacheKey)) {
          continue; // Evitar duplicados
        }

        const doctorNombre = cita.Doctor ? 
          `Dr. ${cita.Doctor.nombre} ${cita.Doctor.apellido_paterno}` : 
          'tu médico';
        const motivo = cita.motivo || 'Consulta médica';

        // Formatear fecha de la cita
        // Usar fecha_reprogramada si existe y el estado es 'reprogramada', sino usar fecha_cita
        const fechaParaRecordatorio = (cita.estado === 'reprogramada' && cita.fecha_reprogramada) 
          ? new Date(cita.fecha_reprogramada) 
          : new Date(cita.fecha_cita);
        const fechaFormateada = fechaParaRecordatorio.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Enviar notificación push
        try {
          const resultado = await pushNotificationService.sendAppointmentReminder(
            paciente.id_usuario,
            {
              id: cita.id_cita,
              doctor_name: doctorNombre,
              time: fechaFormateada,
              location: motivo,
              fecha_cita: fechaParaRecordatorio.toISOString(),
              motivo: motivo,
              urgent: true, // Marcar como urgente
              tiempo_restante: '30 minutos'
            }
          );

          if (resultado.success) {
            // Marcar como enviada en cache (válida por 15 minutos)
            this.sentNotificationsCache.set(cacheKey, {
              timestamp: ahora.getTime(),
              expiresAt: ahora.getTime() + (15 * 60 * 1000) // 15 minutos
            });

            notificacionesEnviadas++;
            logger.info(`✅ Notificación de cita (30min) enviada: Cita #${cita.id_cita} a ${paciente.nombre} ${paciente.apellido_paterno} (${resultado.devices || 0} dispositivo(s))`);
          } else {
            logger.warn(`⚠️ No se pudo enviar notificación de cita (30min)`, {
              citaId: cita.id_cita,
              pacienteId: paciente.id_paciente,
              motivo: resultado.message
            });
          }
        } catch (error) {
          logger.error(`❌ Error enviando notificación de cita (30min):`, {
            citaId: cita.id_cita,
            pacienteId: paciente.id_paciente,
            error: error.message
          });
        }
      }

      if (notificacionesEnviadas > 0) {
        logger.info(`📊 Resumen: ${notificacionesEnviadas} notificación(es) de cita (30min) enviada(s)`);
      }
    } catch (error) {
      logger.error('❌ Error en checkAppointmentReminders30min:', error);
    }
  }

  /**
   * Limpiar cache de notificaciones expiradas
   */
  cleanupCache() {
    const ahora = Date.now();
    let eliminadas = 0;

    for (const [key, value] of this.sentNotificationsCache.entries()) {
      if (value.expiresAt < ahora) {
        this.sentNotificationsCache.delete(key);
        eliminadas++;
      }
    }

    // Limpieza silenciosa del cache
  }

  /**
   * Obtener estadísticas de las tareas programadas
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      tasksCount: this.tasks.length,
      cacheSize: this.sentNotificationsCache.size
    };
  }
}

// Singleton
const scheduledTasksService = new ScheduledTasksService();

export default scheduledTasksService;

