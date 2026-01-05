import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import {
  Usuario,
  Paciente,
  Doctor,
  SignoVital,
  Diagnostico,
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
  AuthCredential,
  Cita
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

/**
 * Script para agregar signos vitales y datos médicos de prueba
 * al paciente con PIN 2020 para verificar la evolución en el historial
 * 
 * Credenciales:
 * - Paciente: PIN 2020
 * - Doctor: Email Doctor@clinica.com, Password Doctor123!
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
            attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno'],
            transaction
          });
          if (pacienteEncontrado) break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!pacienteEncontrado) {
      logger.error('❌ Paciente con PIN 2020 no encontrado');
      await transaction.rollback();
      process.exit(1);
    }

    logger.info(`✅ Paciente encontrado: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`, {
      id_paciente: pacienteEncontrado.id_paciente
    });

    // Buscar doctor
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
      process.exit(1);
    }

    const doctorEncontrado = usuarioDoctor.Doctor;
    logger.info(`✅ Doctor encontrado: ${doctorEncontrado.nombre} ${doctorEncontrado.apellido_paterno}`, {
      id_doctor: doctorEncontrado.id_doctor,
      email: usuarioDoctor.email
    });

    // ============================================
    // PASO 2: ELIMINAR DATOS EXISTENTES (OPCIONAL)
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('🗑️  LIMPIANDO DATOS EXISTENTES DEL PACIENTE');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Eliminar signos vitales existentes
    const signosExistentes = await SignoVital.count({
      where: { id_paciente: pacienteEncontrado.id_paciente },
      transaction
    });
    if (signosExistentes > 0) {
      await SignoVital.destroy({
        where: { id_paciente: pacienteEncontrado.id_paciente },
        transaction
      });
      logger.info(`✅ ${signosExistentes} signos vitales eliminados`);
    }

    // Eliminar diagnósticos existentes
    // Obtener todas las citas del paciente
    const citasPaciente = await Cita.findAll({
      where: { id_paciente: pacienteEncontrado.id_paciente },
      attributes: ['id_cita'],
      raw: true,
      transaction
    });
    const citasIds = citasPaciente.map(c => c.id_cita);
    
    let whereDiagnosticos = {};
    if (citasIds.length > 0) {
      whereDiagnosticos = {
        [Op.or]: [
          { id_cita: { [Op.in]: citasIds } },
          { id_cita: null }
        ]
      };
    } else {
      whereDiagnosticos = { id_cita: null };
    }
    
    const diagnosticosExistentes = await Diagnostico.count({
      where: whereDiagnosticos,
      transaction
    });
    if (diagnosticosExistentes > 0) {
      await Diagnostico.destroy({
        where: whereDiagnosticos,
        transaction
      });
      logger.info(`✅ ${diagnosticosExistentes} diagnósticos eliminados`);
    }

    // Eliminar planes de medicación existentes
    const planesExistentes = await PlanMedicacion.count({
      where: { id_paciente: pacienteEncontrado.id_paciente },
      transaction
    });
    if (planesExistentes > 0) {
      // Eliminar detalles primero
      const planes = await PlanMedicacion.findAll({
        where: { id_paciente: pacienteEncontrado.id_paciente },
        attributes: ['id_plan'],
        transaction
      });
      for (const plan of planes) {
        await PlanDetalle.destroy({
          where: { id_plan: plan.id_plan },
          transaction
        });
      }
      await PlanMedicacion.destroy({
        where: { id_paciente: pacienteEncontrado.id_paciente },
        transaction
      });
      logger.info(`✅ ${planesExistentes} planes de medicación eliminados`);
    }

    // ============================================
    // PASO 3: CREAR SIGNOS VITALES (EVOLUCIÓN)
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('📊 CREANDO SIGNOS VITALES (EVOLUCIÓN TEMPORAL)');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const hoy = new Date();
    const signosVitalesData = [
      // Hace 3 meses - Valores iniciales
      {
        fecha_medicion: new Date(hoy.getFullYear(), hoy.getMonth() - 3, 15, 10, 0),
        peso_kg: 75.5,
        talla_m: 1.70,
        imc: 26.1,
        medida_cintura_cm: 92.0,
        presion_sistolica: 140,
        presion_diastolica: 90,
        glucosa_mg_dl: 110,
        colesterol_mg_dl: 220,
        trigliceridos_mg_dl: 180,
        registrado_por: 'doctor',
        observaciones: 'Primera medición - Valores ligeramente elevados'
      },
      // Hace 2 meses - Mejora
      {
        fecha_medicion: new Date(hoy.getFullYear(), hoy.getMonth() - 2, 10, 14, 30),
        peso_kg: 73.2,
        talla_m: 1.70,
        imc: 25.3,
        medida_cintura_cm: 89.5,
        presion_sistolica: 135,
        presion_diastolica: 85,
        glucosa_mg_dl: 105,
        colesterol_mg_dl: 210,
        trigliceridos_mg_dl: 165,
        registrado_por: 'doctor',
        observaciones: 'Mejora en peso y presión arterial'
      },
      // Hace 1 mes - Continúa mejorando
      {
        fecha_medicion: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 5, 11, 0),
        peso_kg: 71.8,
        talla_m: 1.70,
        imc: 24.8,
        medida_cintura_cm: 87.0,
        presion_sistolica: 130,
        presion_diastolica: 82,
        glucosa_mg_dl: 98,
        colesterol_mg_dl: 195,
        trigliceridos_mg_dl: 150,
        registrado_por: 'paciente',
        observaciones: 'Registro del paciente - Valores mejorando'
      },
      // Hace 2 semanas - Buen progreso
      {
        fecha_medicion: new Date(hoy.getTime() - 14 * 24 * 60 * 60 * 1000),
        peso_kg: 70.5,
        talla_m: 1.70,
        imc: 24.4,
        medida_cintura_cm: 85.5,
        presion_sistolica: 128,
        presion_diastolica: 80,
        glucosa_mg_dl: 95,
        colesterol_mg_dl: 185,
        trigliceridos_mg_dl: 140,
        registrado_por: 'doctor',
        observaciones: 'Excelente progreso - Valores dentro de rangos normales'
      },
      // Hace 1 semana - Valores óptimos
      {
        fecha_medicion: new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000),
        peso_kg: 70.0,
        talla_m: 1.70,
        imc: 24.2,
        medida_cintura_cm: 84.0,
        presion_sistolica: 125,
        presion_diastolica: 78,
        glucosa_mg_dl: 92,
        colesterol_mg_dl: 180,
        trigliceridos_mg_dl: 135,
        registrado_por: 'paciente',
        observaciones: 'Valores óptimos - Mantener hábitos saludables'
      },
      // Hoy - Control final
      {
        fecha_medicion: new Date(hoy.getTime() - 1 * 24 * 60 * 60 * 1000),
        peso_kg: 69.8,
        talla_m: 1.70,
        imc: 24.1,
        medida_cintura_cm: 83.5,
        presion_sistolica: 122,
        presion_diastolica: 76,
        glucosa_mg_dl: 90,
        colesterol_mg_dl: 175,
        trigliceridos_mg_dl: 130,
        registrado_por: 'doctor',
        observaciones: 'Control final - Evolución muy positiva'
      }
    ];

    const signosCreados = [];
    for (const signoData of signosVitalesData) {
      const signo = await SignoVital.create({
        id_paciente: pacienteEncontrado.id_paciente,
        ...signoData
      }, { transaction });
      signosCreados.push(signo);
      logger.info(`✅ Signo vital creado: ${signoData.fecha_medicion.toLocaleDateString()} - Peso: ${signoData.peso_kg}kg, Presión: ${signoData.presion_sistolica}/${signoData.presion_diastolica}`);
    }

    logger.info(`\n✅ ${signosCreados.length} signos vitales creados con evolución temporal`);

    // ============================================
    // PASO 4: CREAR DIAGNÓSTICOS
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('🩺 CREANDO DIAGNÓSTICOS');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Buscar una cita del paciente para asociar diagnósticos
    const citaPaciente = await Cita.findOne({
      where: { id_paciente: pacienteEncontrado.id_paciente },
      order: [['fecha_cita', 'DESC']],
      transaction
    });

    const diagnosticosData = [
      {
        id_cita: citaPaciente?.id_cita || null,
        descripcion: 'Hipertensión arterial leve - Control con dieta y ejercicio',
        fecha_registro: new Date(hoy.getFullYear(), hoy.getMonth() - 3, 15)
      },
      {
        id_cita: citaPaciente?.id_cita || null,
        descripcion: 'Sobrepeso grado I - Mejora significativa con tratamiento',
        fecha_registro: new Date(hoy.getFullYear(), hoy.getMonth() - 2, 10)
      },
      {
        id_cita: citaPaciente?.id_cita || null,
        descripcion: 'Hiperglucemia leve - Valores mejorando con cambios en estilo de vida',
        fecha_registro: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 5)
      }
    ];

    const diagnosticosCreados = [];
    for (const diagnosticoData of diagnosticosData) {
      const diagnostico = await Diagnostico.create(diagnosticoData, { transaction });
      diagnosticosCreados.push(diagnostico);
      logger.info(`✅ Diagnóstico creado: ${diagnosticoData.descripcion.substring(0, 50)}...`);
    }

    logger.info(`\n✅ ${diagnosticosCreados.length} diagnósticos creados`);

    // ============================================
    // PASO 5: CREAR PLANES DE MEDICACIÓN
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('💊 CREANDO PLANES DE MEDICACIÓN');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Buscar medicamentos existentes o crear uno de ejemplo
    let medicamento = await Medicamento.findOne({
      where: { nombre_medicamento: 'Metformina' },
      transaction
    });

    if (!medicamento) {
      // Crear medicamento de ejemplo
      medicamento = await Medicamento.create({
        nombre_medicamento: 'Metformina',
        descripcion: 'Medicamento para control de glucosa',
        activo: true
      }, { transaction });
      logger.info('✅ Medicamento "Metformina" creado');
    }

    const planesMedicacionData = [
      {
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctorEncontrado.id_doctor,
        id_cita: citaPaciente?.id_cita || null,
        fecha_inicio: new Date(hoy.getFullYear(), hoy.getMonth() - 3, 15),
        fecha_fin: new Date(hoy.getFullYear(), hoy.getMonth() + 3, 15),
        activo: true,
        observaciones: 'Plan de medicación para control de glucosa',
        detalles: [
          {
            id_medicamento: medicamento.id_medicamento,
            dosis: '500mg',
            frecuencia: '2 veces al día',
            horarios: ['08:00', '20:00'],
            via_administracion: 'Oral',
            observaciones: 'Tomar con alimentos'
          }
        ]
      }
    ];

    const planesCreados = [];
    for (const planData of planesMedicacionData) {
      const { detalles, ...planInfo } = planData;
      const plan = await PlanMedicacion.create(planInfo, { transaction });
      
      // Crear detalles del plan
      for (const detalleData of detalles) {
        await PlanDetalle.create({
          id_plan: plan.id_plan,
          ...detalleData
        }, { transaction });
      }
      
      planesCreados.push(plan);
      logger.info(`✅ Plan de medicación creado: ${plan.observaciones}`);
    }

    logger.info(`\n✅ ${planesCreados.length} planes de medicación creados`);

    // ============================================
    // COMMIT TRANSACCIÓN
    // ============================================
    await transaction.commit();
    
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ DATOS DE PRUEBA CREADOS EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════\n');
    logger.info('📋 RESUMEN:');
    logger.info(`   👤 Paciente: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`, {
      id: pacienteEncontrado.id_paciente
    });
    logger.info(`   👨‍⚕️ Doctor: ${doctorEncontrado.nombre} ${doctorEncontrado.apellido_paterno}`, {
      id: doctorEncontrado.id_doctor
    });
    logger.info(`   📊 Signos vitales: ${signosCreados.length} registros`);
    logger.info(`   🩺 Diagnósticos: ${diagnosticosCreados.length} registros`);
    logger.info(`   💊 Planes de medicación: ${planesCreados.length} registros`);
    logger.info('\n✅ Script finalizado correctamente');
    
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error en el script:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();

