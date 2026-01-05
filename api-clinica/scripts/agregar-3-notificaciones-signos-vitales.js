import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import {
  Usuario,
  Paciente,
  Doctor,
  NotificacionDoctor,
  SignoVital,
  AuthCredential
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import { crearNotificacionDoctor } from '../controllers/cita.js';

/**
 * Script para agregar 3 notificaciones de signos vitales fuera de rango
 * 
 * No elimina datos existentes, solo añade nuevos.
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
        attributes: ['id_doctor']
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
    logger.info(`✅ Doctor encontrado: ${usuarioDoctor.nombre} ${usuarioDoctor.apellido_paterno}`, {
      id_doctor: doctorEncontrado.id_doctor
    });

    // ============================================
    // PASO 2: CREAR 3 SIGNOS VITALES CON VALORES FUERA DE RANGO
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('📊 CREANDO 3 SIGNOS VITALES CON VALORES FUERA DE RANGO');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const pacienteNombre = `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim();
    const signosVitalesData = [
      {
        // Glucosa muy alta (crítica)
        glucosa_mg_dl: 280,
        peso_kg: 75,
        talla_m: 1.70,
        imc: 25.95,
        presion_sistolica: 150,
        presion_diastolica: 95,
        colesterol_mg_dl: 220,
        trigliceridos_mg_dl: 180,
        observaciones: 'Glucosa muy elevada - requiere atención inmediata',
        tipo: 'glucosa',
        severidad: 'critica',
        mensaje: 'Glucosa muy elevada: 280 mg/dL (Normal: 70-126 mg/dL)'
      },
      {
        // Presión arterial alta (moderada)
        glucosa_mg_dl: 110,
        peso_kg: 80,
        talla_m: 1.65,
        imc: 29.38,
        presion_sistolica: 160,
        presion_diastolica: 105,
        colesterol_mg_dl: 250,
        trigliceridos_mg_dl: 200,
        observaciones: 'Presión arterial elevada',
        tipo: 'presion',
        severidad: 'moderada',
        mensaje: 'Presión arterial elevada: 160/105 mmHg (Normal: 90-140/60-90 mmHg)'
      },
      {
        // IMC alto y colesterol alto (moderada)
        glucosa_mg_dl: 95,
        peso_kg: 95,
        talla_m: 1.60,
        imc: 37.11,
        presion_sistolica: 130,
        presion_diastolica: 85,
        colesterol_mg_dl: 280,
        trigliceridos_mg_dl: 250,
        observaciones: 'IMC y colesterol elevados',
        tipo: 'imc_colesterol',
        severidad: 'moderada',
        mensaje: 'IMC y colesterol elevados: IMC 37.11 kg/m² (Normal: 18.5-24.9), Colesterol 280 mg/dL (Normal: <200 mg/dL)'
      }
    ];

    const signosVitalesCreados = [];
    for (let i = 0; i < signosVitalesData.length; i++) {
      const signoData = signosVitalesData[i];
      const fechaMedicion = new Date();
      fechaMedicion.setMinutes(fechaMedicion.getMinutes() - (i * 30)); // Espaciar 30 minutos entre cada uno

      const signoVital = await SignoVital.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_cita: null,
        fecha_medicion: fechaMedicion,
        peso_kg: signoData.peso_kg,
        talla_m: signoData.talla_m,
        imc: signoData.imc,
        presion_sistolica: signoData.presion_sistolica,
        presion_diastolica: signoData.presion_diastolica,
        glucosa_mg_dl: signoData.glucosa_mg_dl,
        colesterol_mg_dl: signoData.colesterol_mg_dl,
        trigliceridos_mg_dl: signoData.trigliceridos_mg_dl,
        observaciones: signoData.observaciones,
        registrado_por: 'doctor',
        fecha_creacion: new Date()
      }, { transaction });

      signosVitalesCreados.push({
        signoVital,
        ...signoData
      });

      logger.info(`✅ Signo vital ${i + 1} creado (ID: ${signoVital.id_signo})`);
      logger.info(`   - Tipo: ${signoData.tipo}`);
      logger.info(`   - Severidad: ${signoData.severidad}`);
      logger.info(`   - Mensaje: ${signoData.mensaje}`);
      logger.info(`   - Fecha: ${fechaMedicion.toLocaleString('es-MX')}\n`);
    }

    // ============================================
    // PASO 3: CREAR NOTIFICACIONES
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔔 CREANDO NOTIFICACIONES DE ALERTA DE SIGNOS VITALES');
    logger.info('═══════════════════════════════════════════════════════════\n');

    for (let i = 0; i < signosVitalesCreados.length; i++) {
      const { signoVital, tipo, severidad, mensaje } = signosVitalesCreados[i];
      
      try {
        const alertaData = {
          id_signo_vital: signoVital.id_signo,
          id_paciente: pacienteEncontrado.id_paciente,
          paciente_nombre: pacienteNombre,
          tipo_signo: tipo,
          valor: tipo === 'glucosa' ? signoVital.glucosa_mg_dl :
                 tipo === 'presion' ? `${signoVital.presion_sistolica}/${signoVital.presion_diastolica}` :
                 tipo === 'imc_colesterol' ? `IMC: ${signoVital.imc}, Colesterol: ${signoVital.colesterol_mg_dl}` :
                 null,
          unidad: tipo === 'glucosa' ? 'mg/dL' :
                  tipo === 'presion' ? 'mmHg' :
                  tipo === 'imc_colesterol' ? 'kg/m², mg/dL' :
                  '',
          severidad: severidad,
          mensaje: mensaje,
          fecha_medicion: signoVital.fecha_medicion
        };

        // Usar la función crearNotificacionDoctor con la firma correcta: (doctorId, tipo, data)
        await crearNotificacionDoctor(
          doctorEncontrado.id_doctor,
          'alerta_signos_vitales',
          alertaData
        );

        logger.info(`✅ Notificación ${i + 1} creada exitosamente`);
        logger.info(`   - Tipo: Alerta Signos Vitales`);
        logger.info(`   - Severidad: ${severidad}`);
        logger.info(`   - Signo: ${tipo}`);
        logger.info(`   - Mensaje: ${mensaje}\n`);
      } catch (error) {
        logger.error(`❌ Error creando notificación ${i + 1}:`, error.message);
        // Intentar crear directamente si la función falla
        try {
          const alertaData = {
            id_signo_vital: signoVital.id_signo,
            id_paciente: pacienteEncontrado.id_paciente,
            paciente_nombre: pacienteNombre,
            tipo_signo: tipo,
            valor: tipo === 'glucosa' ? signoVital.glucosa_mg_dl :
                   tipo === 'presion' ? `${signoVital.presion_sistolica}/${signoVital.presion_diastolica}` :
                   tipo === 'imc_colesterol' ? `IMC: ${signoVital.imc}, Colesterol: ${signoVital.colesterol_mg_dl}` :
                   null,
            unidad: tipo === 'glucosa' ? 'mg/dL' :
                    tipo === 'presion' ? 'mmHg' :
                    tipo === 'imc_colesterol' ? 'kg/m², mg/dL' :
                    '',
            severidad: severidad,
            mensaje: mensaje,
            fecha_medicion: signoVital.fecha_medicion
          };

          const notificacion = await NotificacionDoctor.create({
            id_doctor: doctorEncontrado.id_doctor,
            id_paciente: pacienteEncontrado.id_paciente,
            id_cita: null,
            tipo: 'alerta_signos_vitales',
            titulo: `⚠️ Alerta de Signos Vitales: ${pacienteNombre}`,
            mensaje: mensaje,
            datos_adicionales: alertaData,
            estado: 'enviada',
            fecha_envio: new Date()
          }, { transaction });

          logger.info(`✅ Notificación ${i + 1} creada directamente (ID: ${notificacion.id_notificacion})`);
        } catch (directError) {
          logger.error(`❌ Error creando notificación directamente:`, directError.message);
        }
      }
    }

    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ PROCESO COMPLETADO EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📋 RESUMEN:', { service: 'api-clinica' });
    logger.info(`   👤 Paciente: ${pacienteNombre}`, { id: pacienteEncontrado.id_paciente, service: 'api-clinica' });
    logger.info(`   👨‍⚕️ Doctor: ${usuarioDoctor.nombre} ${usuarioDoctor.apellido_paterno}`, { id: doctorEncontrado.id_doctor, service: 'api-clinica' });
    logger.info(`   📊 Signos vitales creados: ${signosVitalesCreados.length}`, { service: 'api-clinica' });
    logger.info(`   🔔 Notificaciones creadas: ${signosVitalesCreados.length}`, { service: 'api-clinica' });
    logger.info('\n✅ Script finalizado correctamente', { service: 'api-clinica' });

    await transaction.commit();
    await sequelize.close();
  } catch (error) {
    logger.error('❌ ERROR GENERAL:', error);
    await transaction.rollback();
    await sequelize.close();
    process.exit(1);
  }
})();



