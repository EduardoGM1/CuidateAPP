/**
 * Script para crear signos vitales con valores fuera de rango
 * para generar alertas y notificaciones en el dashboard del doctor
 * 
 * Este script crea signos vitales con valores anormales que deberían
 * generar alertas automáticamente y crear notificaciones en la BD.
 * 
 * Uso: node scripts/crear-signos-vitales-alertas-prueba.js
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Paciente, Doctor, Usuario, SignoVital, DoctorPaciente, NotificacionDoctor, AuthCredential } from '../models/associations.js';
import logger from '../utils/logger.js';
import alertService from '../services/alertService.js';
import { crearNotificacionDoctor } from '../controllers/cita.js';
import bcrypt from 'bcryptjs';

(async () => {
  const transaction = await sequelize.transaction();

  try {
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('🚨 CREANDO SIGNOS VITALES CON VALORES FUERA DE RANGO');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // ============================================
    // PASO 1: BUSCAR PACIENTE Y DOCTOR
    // ============================================
    logger.info('🔍 Buscando paciente y doctor...\n');

    // Buscar paciente por PIN usando AuthCredential
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
            include: [
              {
                model: Usuario,
                attributes: ['id_usuario'],
                required: false
              }
            ],
            transaction
          });
          if (pacienteEncontrado) break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!pacienteEncontrado) {
      throw new Error('❌ Paciente con PIN 2020 no encontrado');
    }

    logger.info(`✅ Paciente encontrado: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`);
    logger.info(`   ID: ${pacienteEncontrado.id_paciente}\n`);

    // Buscar doctor por email
    const doctorEncontrado = await Usuario.findOne({
      where: { email: 'Doctor@clinica.com' },
      include: [
        {
          model: Doctor,
          attributes: ['id_doctor', 'nombre', 'apellido_paterno'],
          required: true
        }
      ],
      transaction
    });

    if (!doctorEncontrado || !doctorEncontrado.Doctor) {
      throw new Error('❌ Doctor con email Doctor@clinica.com no encontrado');
    }

    const doctor = doctorEncontrado.Doctor;
    logger.info(`✅ Doctor encontrado: ${doctor.nombre} ${doctor.apellido_paterno}`);
    logger.info(`   ID: ${doctor.id_doctor}\n`);

    // Verificar asignación doctor-paciente
    const asignacion = await DoctorPaciente.findOne({
      where: {
        id_doctor: doctor.id_doctor,
        id_paciente: pacienteEncontrado.id_paciente
      },
      transaction
    });

    if (!asignacion) {
      logger.info('⚠️  No existe asignación doctor-paciente, creándola...');
      await DoctorPaciente.create({
        id_doctor: doctor.id_doctor,
        id_paciente: pacienteEncontrado.id_paciente,
        fecha_asignacion: new Date()
      }, { transaction });
      logger.info('✅ Asignación creada\n');
    } else {
      logger.info('✅ Asignación doctor-paciente ya existe\n');
    }

    // ============================================
    // PASO 2: LIMPIAR NOTIFICACIONES EXISTENTES (OPCIONAL)
    // ============================================
    logger.info('🧹 Limpiando notificaciones de alertas existentes...\n');

    const notificacionesEliminadas = await NotificacionDoctor.destroy({
      where: {
        id_doctor: doctor.id_doctor,
        tipo: 'alerta_signos_vitales',
        id_paciente: pacienteEncontrado.id_paciente
      },
      transaction
    });

    logger.info(`✅ ${notificacionesEliminadas} notificaciones de alertas eliminadas\n`);

    // ============================================
    // PASO 3: CREAR SIGNOS VITALES CON VALORES ANORMALES
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📊 CREANDO SIGNOS VITALES CON VALORES FUERA DE RANGO');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Rangos normales de referencia:
    // - Glucosa: 70-100 mg/dL (normal), <70 o >200 (crítico)
    // - Presión sistólica: 90-120 mmHg (normal), <80 o >160 (crítico)
    // - Presión diastólica: 60-80 mmHg (normal), <50 o >100 (crítico)
    // - IMC: 18.5-24.9 (normal), <16 o >35 (crítico)

    const signosVitalesPrueba = [
      {
        descripcion: 'Glucosa muy alta (hiperglucemia crítica)',
        datos: {
          glucosa_mg_dl: 250, // Crítico: >200
          presion_sistolica: 120,
          presion_diastolica: 80,
          peso_kg: 70,
          talla_m: 1.70,
          fecha_medicion: new Date()
        }
      },
      {
        descripcion: 'Presión arterial muy alta (hipertensión crítica)',
        datos: {
          presion_sistolica: 180, // Crítico: >160
          presion_diastolica: 110, // Crítico: >100
          glucosa_mg_dl: 95,
          peso_kg: 75,
          talla_m: 1.75,
          fecha_medicion: new Date(Date.now() - 2 * 60 * 60 * 1000) // Hace 2 horas
        }
      },
      {
        descripcion: 'Glucosa moderadamente alta',
        datos: {
          glucosa_mg_dl: 150, // Moderado: >100 pero <200
          presion_sistolica: 130, // Moderado: >120 pero <160
          presion_diastolica: 85, // Moderado: >80 pero <100
          peso_kg: 80,
          talla_m: 1.80,
          fecha_medicion: new Date(Date.now() - 4 * 60 * 60 * 1000) // Hace 4 horas
        }
      },
      {
        descripcion: 'IMC muy alto (obesidad severa)',
        datos: {
          peso_kg: 120, // IMC = 120 / (1.70^2) = 41.5 (crítico: >35)
          talla_m: 1.70,
          presion_sistolica: 140,
          presion_diastolica: 90,
          glucosa_mg_dl: 110,
          fecha_medicion: new Date(Date.now() - 6 * 60 * 60 * 1000) // Hace 6 horas
        }
      },
      {
        descripcion: 'Glucosa muy baja (hipoglucemia crítica)',
        datos: {
          glucosa_mg_dl: 50, // Crítico: <70
          presion_sistolica: 100,
          presion_diastolica: 60,
          peso_kg: 65,
          talla_m: 1.65,
          fecha_medicion: new Date(Date.now() - 8 * 60 * 60 * 1000) // Hace 8 horas
        }
      }
    ];

    const signosCreados = [];
    const notificacionesCreadas = [];

    for (let i = 0; i < signosVitalesPrueba.length; i++) {
      const { descripcion, datos } = signosVitalesPrueba[i];

      logger.info(`📝 Creando signo vital ${i + 1}/${signosVitalesPrueba.length}: ${descripcion}`);

      // Calcular IMC si se proporcionan peso y talla
      let imc = null;
      if (datos.peso_kg && datos.talla_m && datos.talla_m > 0) {
        imc = parseFloat((datos.peso_kg / (datos.talla_m * datos.talla_m)).toFixed(2));
        datos.imc = imc;
      }

      // Crear signo vital
      const signoVital = await SignoVital.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_cita: null,
        peso_kg: datos.peso_kg || null,
        talla_m: datos.talla_m || null,
        imc: datos.imc || null,
        medida_cintura_cm: null,
        presion_sistolica: datos.presion_sistolica || null,
        presion_diastolica: datos.presion_diastolica || null,
        glucosa_mg_dl: datos.glucosa_mg_dl || null,
        colesterol_mg_dl: null,
        trigliceridos_mg_dl: null,
        registrado_por: 'doctor',
        observaciones: `Signo vital de prueba: ${descripcion}`,
        fecha_medicion: datos.fecha_medicion,
        fecha_creacion: new Date()
      }, { transaction });

      signosCreados.push(signoVital);

      logger.info(`   ✅ Signo vital creado (ID: ${signoVital.id_signo})`);
      logger.info(`      - Glucosa: ${datos.glucosa_mg_dl || 'N/A'} mg/dL`);
      logger.info(`      - Presión: ${datos.presion_sistolica || 'N/A'}/${datos.presion_diastolica || 'N/A'} mmHg`);
      logger.info(`      - IMC: ${imc || 'N/A'}`);
      logger.info(`      - Fecha: ${datos.fecha_medicion.toLocaleString('es-MX')}\n`);

      // Verificar alertas manualmente (sin usar alertService para evitar problemas de transacción)
      try {
        const resultadoAlertas = await alertService.verificarSignosVitales(
          signoVital.toJSON(),
          pacienteEncontrado.id_paciente
        );

        if (resultadoAlertas.tieneAlertas) {
          logger.info(`   🚨 ${resultadoAlertas.alertas.length} alerta(s) detectada(s)`);
          
          // Guardar alertas para crear notificaciones después del commit
          signosCreados[signosCreados.length - 1].alertas = resultadoAlertas.alertas;
        } else {
          logger.info(`   ℹ️  No se detectaron alertas para este signo vital\n`);
        }
      } catch (alertError) {
        logger.error(`   ⚠️  Error verificando alertas (no crítico):`, alertError.message);
      }
    }

    // Confirmar transacción
    await transaction.commit();

    // Crear notificaciones después del commit (fuera de la transacción)
    logger.info('\n🔔 Creando notificaciones en base de datos...\n');
    
    for (const signoVital of signosCreados) {
      if (signoVital.alertas && signoVital.alertas.length > 0) {
        for (const alerta of signoVital.alertas) {
          try {
            const notificacionData = {
              id_paciente: pacienteEncontrado.id_paciente,
              paciente_nombre: `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim(),
              id_signo: signoVital.id_signo,
              tipo: alerta.tipo,
              severidad: alerta.severidad,
              mensaje: alerta.mensaje,
              valor: alerta.valor,
              rangoNormal: alerta.rangoNormal,
              fecha_medicion: signoVital.fecha_medicion
            };

            const notificacion = await crearNotificacionDoctor(
              doctor.id_doctor,
              'alerta_signos_vitales',
              notificacionData
            );

            if (notificacion) {
              notificacionesCreadas.push(notificacion);
              logger.info(`   ✅ Notificación creada (ID: ${notificacion.id_notificacion})`);
              logger.info(`      - Tipo: ${alerta.tipo}`);
              logger.info(`      - Severidad: ${alerta.severidad}`);
              logger.info(`      - Mensaje: ${alerta.mensaje.substring(0, 60)}...\n`);
            }
          } catch (notifError) {
            logger.error(`   ⚠️  Error creando notificación (no crítico):`, notifError.message);
          }
        }
      }
    }

    // ============================================
    // RESUMEN FINAL
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ PROCESO COMPLETADO EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════\n');

    logger.info(`📊 RESUMEN:`);
    logger.info(`   - Signos vitales creados: ${signosCreados.length}`);
    logger.info(`   - Notificaciones creadas: ${notificacionesCreadas.length}\n`);

    logger.info(`📋 SIGNOS VITALES CREADOS:`);
    signosCreados.forEach((sv, index) => {
      logger.info(`   ${index + 1}. ID: ${sv.id_signo}`);
      logger.info(`      - Glucosa: ${sv.glucosa_mg_dl || 'N/A'} mg/dL`);
      logger.info(`      - Presión: ${sv.presion_sistolica || 'N/A'}/${sv.presion_diastolica || 'N/A'} mmHg`);
      logger.info(`      - IMC: ${sv.imc || 'N/A'}`);
      logger.info(`      - Fecha: ${sv.fecha_medicion.toLocaleString('es-MX')}\n`);
    });

    if (notificacionesCreadas.length > 0) {
      logger.info(`🔔 NOTIFICACIONES CREADAS:`);
      notificacionesCreadas.forEach((notif, index) => {
        logger.info(`   ${index + 1}. Notificación #${notif.id_notificacion}`);
        logger.info(`      - Título: ${notif.titulo}`);
        logger.info(`      - Estado: ${notif.estado}`);
        logger.info(`      - Fecha: ${notif.fecha_envio.toLocaleString('es-MX')}\n`);
      });

      logger.info(`\n✅ Las notificaciones aparecerán en el dashboard del doctor`);
      logger.info(`   (Doctor: ${doctor.nombre} ${doctor.apellido_paterno})`);
      logger.info(`   (Paciente: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno})\n`);
    } else {
      logger.warn(`\n⚠️  No se crearon notificaciones. Verifica que los valores`);
      logger.warn(`   estén realmente fuera de rango según alertService.\n`);
    }

    logger.info('═══════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    logger.error('\n❌ ERROR EN EL SCRIPT:', error);
    logger.error('Stack:', error.stack);
    process.exit(1);
  }
})();

