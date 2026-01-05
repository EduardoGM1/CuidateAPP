import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import {
  Usuario,
  Paciente,
  Doctor,
  Cita,
  AuthCredential
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';

/**
 * Script para:
 * 1. Eliminar todas las citas de hoy
 * 2. Añadir 3 citas para mañana a las 12:00 AM (medianoche de hoy)
 * 
 * Credenciales:
 * - Paciente: PIN 2020
 * - Doctor: Email Doctor@clinica.com
 */

(async () => {
  const transaction = await sequelize.transaction();
  
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // ============================================
    // PASO 1: BUSCAR PACIENTE Y DOCTOR
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔍 BUSCANDO USUARIOS');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Buscar paciente con PIN 2020
    logger.info('1️⃣ Buscando paciente con PIN 2020...');
    const pin2020 = '2020';
    
    const allPinCredentials = await AuthCredential.findAll({
      where: {
        auth_method: 'pin',
        user_type: 'Paciente'
      },
      transaction
    });

    let pacienteEncontrado = null;
    for (const cred of allPinCredentials) {
      try {
        const isValid = await bcrypt.compare(pin2020, cred.credential_value);
        if (isValid) {
          pacienteEncontrado = await Paciente.findOne({
            where: { id_paciente: cred.user_id },
            attributes: ['id_paciente', 'nombre', 'apellido_paterno'],
            transaction
          });
          if (pacienteEncontrado) break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!pacienteEncontrado) {
      logger.error('❌ ERROR: No se encontró paciente con PIN 2020');
      await transaction.rollback();
      await sequelize.close();
      process.exit(1);
    }

    logger.info(`✅ Paciente encontrado: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`, {
      id_paciente: pacienteEncontrado.id_paciente
    });

    // Buscar doctor con email Doctor@clinica.com
    logger.info('\n2️⃣ Buscando doctor con email Doctor@clinica.com...');
    const usuarioDoctor = await Usuario.findOne({
      where: { 
        email: 'Doctor@clinica.com',
        rol: 'Doctor'
      },
      include: [{
        model: Doctor,
        required: true
      }],
      transaction
    });

    if (!usuarioDoctor || !usuarioDoctor.Doctor) {
      logger.error('❌ ERROR: No se encontró doctor con email Doctor@clinica.com');
      await transaction.rollback();
      await sequelize.close();
      process.exit(1);
    }

    const doctorEncontrado = usuarioDoctor.Doctor;
    logger.info(`✅ Doctor encontrado: ${doctorEncontrado.nombre} ${doctorEncontrado.apellido_paterno}`, {
      id_doctor: doctorEncontrado.id_doctor
    });

    // ============================================
    // PASO 2: ELIMINAR CITAS DE HOY
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('🗑️  ELIMINANDO CITAS DE HOY');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    // Calcular timezone para la consulta
    const timezoneOffset = ahora.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
    const offsetMinutes = Math.abs(timezoneOffset) % 60;
    const offsetSign = timezoneOffset <= 0 ? '+' : '-';
    const timezoneStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

    const formatLocalDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const hoyStr = formatLocalDate(hoy);

    // Buscar citas de hoy del doctor
    const citasHoy = await Cita.findAll({
      where: {
        id_doctor: doctorEncontrado.id_doctor,
        [Op.and]: [
          sequelize.where(
            sequelize.fn('DATE',
              sequelize.fn('CONVERT_TZ',
                sequelize.col('fecha_cita'),
                '+00:00',
                timezoneStr
              )
            ),
            hoyStr
          )
        ]
      },
      transaction
    });

    logger.info(`📋 Citas de hoy encontradas: ${citasHoy.length}`);

    if (citasHoy.length > 0) {
      const idsCitas = citasHoy.map(c => c.id_cita);
      await Cita.destroy({
        where: {
          id_cita: {
            [Op.in]: idsCitas
          }
        },
        transaction
      });
      logger.info(`✅ ${citasHoy.length} citas de hoy eliminadas`);
      citasHoy.forEach(c => {
        logger.info(`   - Cita ID ${c.id_cita} eliminada (${new Date(c.fecha_cita).toLocaleString('es-MX')})`);
      });
    } else {
      logger.info('ℹ️  No hay citas de hoy para eliminar');
    }

    // ============================================
    // PASO 3: CREAR 3 CITAS PARA MAÑANA A LAS 12:00 AM
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('📅 CREANDO 3 CITAS PARA MAÑANA A LAS 12:00 AM');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Mañana a las 12:00 AM (medianoche de hoy)
    const fechaManana = new Date(hoy);
    fechaManana.setDate(fechaManana.getDate() + 1);
    fechaManana.setHours(0, 0, 0, 0); // 12:00 AM

    const motivosCitas = [
      'Consulta de control matutina',
      'Revisión de signos vitales',
      'Seguimiento de tratamiento'
    ];

    const citasCreadas = [];
    for (let i = 0; i < 3; i++) {
      // Crear cada cita con 1 minuto de diferencia para evitar duplicados exactos
      const fechaCita = new Date(fechaManana);
      fechaCita.setMinutes(i); // 00:00, 00:01, 00:02

      const cita = await Cita.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctorEncontrado.id_doctor,
        fecha_cita: fechaCita,
        motivo: motivosCitas[i],
        estado: 'pendiente',
        asistencia: null,
        es_primera_consulta: false,
        observaciones: `Cita de prueba ${i + 1} - Mañana a las 12:00 AM`,
        fecha_creacion: new Date()
      }, { transaction });

      citasCreadas.push(cita);
      logger.info(`   ✅ Cita ${i + 1} creada (ID: ${cita.id_cita})`);
      logger.info(`      - Fecha: ${fechaCita.toLocaleString('es-MX')}`);
      logger.info(`      - Motivo: ${motivosCitas[i]}\n`);
    }

    logger.info(`\n✅ ${citasCreadas.length} citas creadas exitosamente\n`);

    // ============================================
    // PASO 4: RESUMEN FINAL
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('✅ PROCESO COMPLETADO EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📋 RESUMEN:', { service: 'api-clinica' });
    logger.info(`   👤 Paciente: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`, {
      id: pacienteEncontrado.id_paciente,
      service: 'api-clinica'
    });
    logger.info(`   👨‍⚕️ Doctor: ${doctorEncontrado.nombre} ${doctorEncontrado.apellido_paterno}`, {
      id: doctorEncontrado.id_doctor,
      service: 'api-clinica'
    });
    logger.info(`   🗑️  Citas eliminadas (hoy): ${citasHoy.length}`, { service: 'api-clinica' });
    logger.info(`   📅 Citas creadas (mañana 12:00 AM): ${citasCreadas.length}`, { service: 'api-clinica' });
    logger.info('\n✅ Script finalizado correctamente', { service: 'api-clinica' });

    await transaction.commit();
  } catch (error) {
    logger.error('❌ Error en el script:', error, { service: 'api-clinica', stack: error.stack });
    try {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
    } catch (rollbackError) {
      logger.error('Error haciendo rollback:', rollbackError);
    }
    await sequelize.close();
    process.exit(1);
  }
})();



