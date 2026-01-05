import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import {
  Usuario,
  Paciente,
  Doctor,
  MensajeChat
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

/**
 * Script para agregar mensajes de prueba con diferentes estados de lectura
 * para verificar que el badge se muestre correctamente
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
    // BUSCAR PACIENTE Y DOCTOR
    // ============================================
    logger.info('🔍 Buscando paciente con PIN 2020...');
    const AuthCredential = (await import('../models/AuthCredential.js')).default;
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
      process.exit(1);
    }

    logger.info('   ✅ Paciente encontrado:', {
      id_paciente: pacienteEncontrado.id_paciente,
      nombre: `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`
    });

    // Buscar doctor
    logger.info('\n🔍 Buscando doctor con email Doctor@clinica.com...');
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
      process.exit(1);
    }

    const doctor = usuarioDoctor.Doctor;
    logger.info('   ✅ Doctor encontrado:', {
      id_doctor: doctor.id_doctor,
      nombre: `${doctor.nombre} ${doctor.apellido_paterno}`
    });

    // ============================================
    // VERIFICAR MENSAJES EXISTENTES
    // ============================================
    logger.info('\n📊 Verificando mensajes existentes...');
    const mensajesExistentes = await MensajeChat.findAll({
      where: {
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctor.id_doctor
      },
      transaction
    });

    logger.info(`   Total mensajes existentes: ${mensajesExistentes.length}`);
    
    // Contar mensajes no leídos del paciente
    const mensajesNoLeidos = await MensajeChat.count({
      where: {
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctor.id_doctor,
        remitente: 'Paciente',
        leido: false
      },
      transaction
    });

    logger.info(`   Mensajes no leídos del paciente: ${mensajesNoLeidos}`);

    // ============================================
    // AGREGAR MENSAJES DE PRUEBA CON DIFERENTES ESTADOS
    // ============================================
    logger.info('\n💬 Agregando mensajes de prueba...\n');

    const ahora = new Date();
    const mensajesPrueba = [
      // Mensajes NO LEÍDOS del paciente (para mostrar badge)
      {
        remitente: 'Paciente',
        mensaje_texto: 'Doctor, tengo una pregunta urgente sobre mi tratamiento',
        fecha_envio: new Date(ahora.getTime() - (30 * 60 * 1000)), // Hace 30 min
        leido: false // NO LEÍDO - debería mostrar badge
      },
      {
        remitente: 'Paciente',
        mensaje_texto: '¿Puedo tomar el medicamento con el estómago vacío?',
        fecha_envio: new Date(ahora.getTime() - (25 * 60 * 1000)), // Hace 25 min
        leido: false // NO LEÍDO - debería mostrar badge
      },
      {
        remitente: 'Paciente',
        mensaje_texto: 'También quería saber sobre los efectos secundarios',
        fecha_envio: new Date(ahora.getTime() - (20 * 60 * 1000)), // Hace 20 min
        leido: false // NO LEÍDO - debería mostrar badge
      },
      // Mensaje LEÍDO del paciente (no debería contar en badge)
      {
        remitente: 'Paciente',
        mensaje_texto: 'Gracias por la información anterior',
        fecha_envio: new Date(ahora.getTime() - (15 * 60 * 1000)), // Hace 15 min
        leido: true // LEÍDO - no cuenta en badge
      },
      // Mensaje del doctor (no cuenta en badge)
      {
        remitente: 'Doctor',
        mensaje_texto: 'Claro, te explico sobre el medicamento',
        fecha_envio: new Date(ahora.getTime() - (10 * 60 * 1000)), // Hace 10 min
        leido: true
      },
      // Más mensajes NO LEÍDOS del paciente
      {
        remitente: 'Paciente',
        mensaje_texto: 'Perfecto, entendido. ¿Hay algo más que deba saber?',
        fecha_envio: new Date(ahora.getTime() - (5 * 60 * 1000)), // Hace 5 min
        leido: false // NO LEÍDO - debería mostrar badge
      }
    ];

    const mensajesCreados = [];
    for (const mensajeData of mensajesPrueba) {
      const mensaje = await MensajeChat.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctor.id_doctor,
        remitente: mensajeData.remitente,
        mensaje_texto: mensajeData.mensaje_texto,
        mensaje_audio_url: null,
        mensaje_audio_duracion: null,
        mensaje_audio_transcripcion: null,
        leido: mensajeData.leido,
        fecha_envio: mensajeData.fecha_envio
      }, { transaction });

      mensajesCreados.push(mensaje);
      const estado = mensajeData.leido ? 'LEÍDO' : 'NO LEÍDO';
      logger.info(`   ✅ Mensaje creado (ID: ${mensaje.id_mensaje}) - ${estado}`);
      logger.info(`      - De: ${mensajeData.remitente}`);
      logger.info(`      - Texto: ${mensajeData.mensaje_texto.substring(0, 50)}...`);
      logger.info(`      - Fecha: ${mensajeData.fecha_envio.toLocaleString('es-MX')}\n`);
    }

    // ============================================
    // VERIFICAR CONTADOR FINAL
    // ============================================
    logger.info('📊 Verificando contador final de mensajes no leídos...');
    const mensajesNoLeidosFinal = await MensajeChat.count({
      where: {
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctor.id_doctor,
        remitente: 'Paciente',
        leido: false
      },
      transaction
    });

    logger.info(`   ✅ Total mensajes no leídos del paciente: ${mensajesNoLeidosFinal}`);
    logger.info(`   📋 Desglose:`);
    logger.info(`      - Mensajes NO LEÍDOS del paciente: ${mensajesNoLeidosFinal}`);
    logger.info(`      - Estos mensajes deberían mostrar badge con número ${mensajesNoLeidosFinal}`);

    // ============================================
    // CONFIRMAR TRANSACCIÓN
    // ============================================
    await transaction.commit();

    // ============================================
    // RESUMEN FINAL
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ MENSAJES DE PRUEBA AGREGADOS EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════\n');

    logger.info('📋 RESUMEN:\n');
    logger.info(`👤 Paciente: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`);
    logger.info(`   ID: ${pacienteEncontrado.id_paciente}\n`);
    
    logger.info(`👨‍⚕️ Doctor: ${doctor.nombre} ${doctor.apellido_paterno}`);
    logger.info(`   ID: ${doctor.id_doctor}\n`);

    logger.info(`💬 Mensajes agregados: ${mensajesCreados.length}`);
    logger.info(`   - Mensajes NO LEÍDOS del paciente: ${mensajesNoLeidosFinal}`);
    logger.info(`   - Mensajes LEÍDOS del paciente: ${mensajesCreados.filter(m => m.remitente === 'Paciente' && m.leido).length}`);
    logger.info(`   - Mensajes del doctor: ${mensajesCreados.filter(m => m.remitente === 'Doctor').length}\n`);

    logger.info('🔔 BADGE ESPERADO:');
    logger.info(`   El badge debería mostrar el número: ${mensajesNoLeidosFinal}`);
    logger.info(`   (Solo cuenta mensajes del paciente con leido: false)\n`);

    logger.info('✅ Script finalizado correctamente\n');

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    logger.error('\n❌ ERROR:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();

