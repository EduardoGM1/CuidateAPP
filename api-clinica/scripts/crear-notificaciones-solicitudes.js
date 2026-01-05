import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import {
  SolicitudReprogramacion,
  Cita,
  Paciente,
  Doctor,
  NotificacionDoctor
} from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * Script para crear notificaciones de doctor para solicitudes de reprogramación existentes
 * que no tienen notificaciones asociadas
 */

// Función auxiliar para formatear fecha
const formatearFechaNotificacion = (fecha) => {
  if (!fecha) return 'fecha no disponible';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Función auxiliar para obtener título y mensaje
const obtenerTituloMensajeNotificacionDoctor = (data) => {
  const fechaCitaFormateada = data.fecha_cita_original 
    ? formatearFechaNotificacion(data.fecha_cita_original)
    : 'fecha no disponible';
  const titulo = '📅 Solicitud de Reprogramación';
  const mensaje = `${data.paciente_nombre || 'Un paciente'} solicitó reprogramar su cita del ${fechaCitaFormateada}`;
  return { titulo, mensaje };
};

(async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // 1. Buscar todas las solicitudes de reprogramación pendientes sin notificación
    logger.info('1️⃣ Buscando solicitudes de reprogramación pendientes...');
    
    const solicitudes = await SolicitudReprogramacion.findAll({
      where: {
        estado: 'pendiente'
      },
      include: [
        {
          model: Cita,
          as: 'Cita',
          attributes: ['id_cita', 'fecha_cita', 'motivo', 'id_doctor'],
          include: [{
            model: Doctor,
            attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno']
          }]
        },
        {
          model: Paciente,
          attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno']
        }
      ],
      order: [['fecha_creacion', 'DESC']]
    });

    logger.info(`   ✅ Se encontraron ${solicitudes.length} solicitudes pendientes\n`);

    if (solicitudes.length === 0) {
      logger.info('   ℹ️  No hay solicitudes pendientes para procesar\n');
      process.exit(0);
    }

    // 2. Para cada solicitud, verificar si ya tiene notificación y crear si no existe
    logger.info('2️⃣ Verificando y creando notificaciones...\n');
    
    let notificacionesCreadas = 0;
    let notificacionesExistentes = 0;
    let errores = 0;

    for (const solicitud of solicitudes) {
      try {
        const cita = solicitud.Cita;
        const paciente = solicitud.Paciente;

        if (!cita || !cita.id_doctor) {
          logger.warn(`   ⚠️  Solicitud #${solicitud.id_solicitud} no tiene cita o doctor asignado, omitiendo...`);
          continue;
        }

        // Verificar si ya existe una notificación para esta solicitud
        const notificacionExistente = await NotificacionDoctor.findOne({
          where: {
            id_doctor: cita.id_doctor,
            id_cita: solicitud.id_cita,
            tipo: 'solicitud_reprogramacion',
            estado: { [sequelize.Sequelize.Op.in]: ['enviada', 'leida'] }
          }
        });

        if (notificacionExistente) {
          logger.info(`   ℹ️  Solicitud #${solicitud.id_solicitud} ya tiene notificación (ID: ${notificacionExistente.id_notificacion})`);
          notificacionesExistentes++;
          continue;
        }

        // Preparar datos para la notificación
        const pacienteNombre = paciente 
          ? `${paciente.nombre || ''} ${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''}`.trim()
          : 'Paciente desconocido';

        const solicitudData = {
          id_solicitud: solicitud.id_solicitud,
          id_cita: solicitud.id_cita,
          id_paciente: solicitud.id_paciente,
          paciente_nombre: pacienteNombre,
          fecha_cita_original: cita.fecha_cita,
          motivo: solicitud.motivo,
          fecha_solicitada: solicitud.fecha_solicitada
        };

        const { titulo, mensaje } = obtenerTituloMensajeNotificacionDoctor(solicitudData);

        // Crear la notificación usando raw query para evitar problemas con ENUM
        // Primero verificar que el ENUM incluya 'solicitud_reprogramacion'
        const [enumValues] = await sequelize.query(`
          SELECT COLUMN_TYPE 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'notificaciones_doctor' 
          AND COLUMN_NAME = 'tipo'
        `);
        
        const enumStr = enumValues[0]?.COLUMN_TYPE || '';
        const tieneTipo = enumStr.includes('solicitud_reprogramacion');
        
        if (!tieneTipo) {
          logger.warn(`   ⚠️  El ENUM de 'tipo' no incluye 'solicitud_reprogramacion'. Actualizando ENUM...`);
          try {
            await sequelize.query(`
              ALTER TABLE notificaciones_doctor 
              MODIFY COLUMN tipo ENUM(
                'cita_actualizada',
                'cita_reprogramada',
                'cita_cancelada',
                'nuevo_mensaje',
                'alerta_signos_vitales',
                'paciente_registro_signos',
                'solicitud_reprogramacion'
              ) NOT NULL
            `);
            logger.info(`   ✅ ENUM actualizado correctamente`);
          } catch (alterError) {
            logger.error(`   ❌ Error actualizando ENUM: ${alterError.message}`);
            throw alterError;
          }
        }

        // Crear la notificación
        const notificacion = await NotificacionDoctor.create({
          id_doctor: cita.id_doctor,
          id_paciente: solicitud.id_paciente,
          id_cita: solicitud.id_cita,
          tipo: 'solicitud_reprogramacion',
          titulo,
          mensaje,
          datos_adicionales: solicitudData,
          estado: 'enviada',
          fecha_envio: solicitud.fecha_creacion || new Date()
        });

        notificacionesCreadas++;
        logger.info(`   ✅ Notificación creada para solicitud #${solicitud.id_solicitud}`);
        logger.info(`      - Doctor: ${cita.Doctor ? `${cita.Doctor.nombre} ${cita.Doctor.apellido_paterno}` : 'ID ' + cita.id_doctor}`);
        logger.info(`      - Paciente: ${pacienteNombre}`);
        logger.info(`      - Cita: #${solicitud.id_cita}`);
        logger.info(`      - Notificación ID: ${notificacion.id_notificacion}\n`);

      } catch (error) {
        errores++;
        logger.error(`   ❌ Error procesando solicitud #${solicitud.id_solicitud}:`, {
          error: error.message
        });
      }
    }

    // 3. Resumen final
    logger.info('\n✅ ========================================');
    logger.info('✅ PROCESO COMPLETADO');
    logger.info('✅ ========================================\n');
    logger.info('📋 RESUMEN:\n');
    logger.info(`   📝 Solicitudes procesadas: ${solicitudes.length}`);
    logger.info(`   ✅ Notificaciones creadas: ${notificacionesCreadas}`);
    logger.info(`   ℹ️  Notificaciones ya existentes: ${notificacionesExistentes}`);
    logger.info(`   ❌ Errores: ${errores}\n`);

    if (notificacionesCreadas > 0) {
      logger.info('✅ Las notificaciones ahora deberían aparecer en el dashboard del doctor\n');
    }

    process.exit(0);
  } catch (error) {
    logger.error('\n❌ ERROR:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();

