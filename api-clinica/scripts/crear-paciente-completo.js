/**
 * Script para crear un paciente completo con todos sus datos
 * 
 * Incluye:
 * - Usuario
 * - Paciente (datos generales)
 * - Signos vitales (múltiples registros)
 * - Diagnósticos
 * - Vacunas (esquema de vacunación)
 * - Comorbilidades
 * - Citas (pasadas y futuras)
 * - Asignación a doctor
 * - Configuración de PIN para login
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  Usuario,
  Paciente,
  Doctor,
  Modulo,
  SignoVital,
  Diagnostico,
  Cita,
  Comorbilidad,
  Vacuna,
  EsquemaVacunacion,
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
  RedApoyo,
  DoctorPaciente,
  PacienteComorbilidad,
  PacienteAuth,
  PacienteAuthPIN
} from '../models/associations.js';
import logger from '../utils/logger.js';

// Función para generar fechas aleatorias en el pasado
function fechaAleatoria(diasAtras) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - diasAtras);
  return fecha;
}

// Función para generar fechas aleatorias en el futuro
function fechaFutura(diasAdelante) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + diasAdelante);
  return fecha;
}

async function crearPacienteCompleto() {
  const transaction = await sequelize.transaction();

  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 CREANDO PACIENTE COMPLETO');
    console.log('='.repeat(80) + '\n');

    // 1. OBTENER DOCTOR Y MÓDULO
    logger.info('Obteniendo doctor y módulo...');
    const doctor = await Doctor.findOne({ 
      where: { activo: true }
    });

    if (!doctor) {
      throw new Error('No se encontró ningún doctor activo. Crea un doctor primero.');
    }

    const modulo = await Modulo.findOne({ where: { id_modulo: doctor.id_modulo } });
    if (!modulo) {
      throw new Error('Módulo del doctor no encontrado');
    }

    console.log(`✅ Doctor encontrado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);
    console.log(`✅ Módulo: ${modulo.nombre_modulo} (ID: ${modulo.id_modulo})`);

    // 2. CREAR USUARIO
    logger.info('Creando usuario...');
    const email = `paciente.completo${Date.now()}@clinica.com`;
    const password_hash = await bcrypt.hash('password123', 10);

    const usuario = await Usuario.create({
      email: email,
      password_hash: password_hash,
      rol: 'Paciente',
      activo: true,
      fecha_creacion: new Date(),
    }, { transaction });

    console.log(`✅ Usuario creado: ID ${usuario.id_usuario}, Email: ${email}`);

    // 3. CREAR PACIENTE CON DATOS COMPLETOS
    logger.info('Creando paciente...');
    const fechaNacimiento = new Date('1985-06-15');
    const timestamp = Date.now();
    const curpUnico = `GOLL850615MHSN${timestamp.toString().slice(-4)}`;
    const paciente = await Paciente.create({
      id_usuario: usuario.id_usuario,
      nombre: 'María',
      apellido_paterno: 'González',
      apellido_materno: 'López',
      fecha_nacimiento: fechaNacimiento,
      sexo: 'Mujer',
      curp: curpUnico,
      direccion: 'Calle Principal 456, Colonia Centro',
      localidad: 'Ciudad de México',
      numero_celular: '5551234567',
      institucion_salud: 'IMSS',
      id_modulo: modulo.id_modulo,
      activo: true,
      fecha_registro: new Date(),
    }, { transaction });

    console.log(`✅ Paciente creado: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);

    // 4. ASIGNAR DOCTOR AL PACIENTE
    logger.info('Asignando doctor al paciente...');
    const [doctorPaciente, created] = await DoctorPaciente.findOrCreate({
      where: {
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente,
      },
      defaults: {
        fecha_asignacion: new Date(),
        activo: true,
      },
      transaction
    });

    console.log(`✅ Doctor asignado: ${created ? 'Nueva asignación' : 'Ya estaba asignado'}`);

    // 5. CREAR COMORBILIDADES
    logger.info('Asignando comorbilidades...');
    const comorbilidades = await Comorbilidad.findAll({ 
      limit: 3 
    });

    if (comorbilidades.length > 0) {
      for (const comorbilidad of comorbilidades) {
        await PacienteComorbilidad.findOrCreate({
          where: {
            id_paciente: paciente.id_paciente,
            id_comorbilidad: comorbilidad.id_comorbilidad,
          },
          defaults: {
            fecha_deteccion: fechaAleatoria(365), // Diagnóstico hace 1 año
          },
          transaction
        });
      }
      console.log(`✅ ${comorbilidades.length} comorbilidades asignadas`);
    } else {
      logger.warn('No se encontraron comorbilidades en el sistema');
    }

    // 6. CREAR CITAS (pasadas y futuras)
    logger.info('Creando citas...');

    // Cita pasada (hace 30 días)
    const citaPasada = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      fecha_cita: fechaAleatoria(30),
      hora_cita: '10:00:00',
      tipo_consulta: 'Consulta de seguimiento',
      estado: 'Completada',
      motivo: 'Seguimiento de tratamiento',
      notas: 'Paciente evoluciona favorablemente',
      created_at: fechaAleatoria(30),
    }, { transaction });

    console.log(`✅ Cita pasada creada: ${citaPasada.fecha_cita}`);

    // Cita futura (en 15 días)
    const citaFutura = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      fecha_cita: fechaFutura(15),
      hora_cita: '14:00:00',
      tipo_consulta: 'Consulta de control',
      estado: 'Programada',
      motivo: 'Control médico',
      notas: '',
      created_at: new Date(),
    }, { transaction });

    console.log(`✅ Cita futura creada: ${citaFutura.fecha_cita}`);

    // 7. CREAR SIGNOS VITALES
    logger.info('Creando signos vitales...');

    // Signos vitales en la cita pasada
    const signosVitales1 = await SignoVital.create({
      id_paciente: paciente.id_paciente,
      id_cita: citaPasada.id_cita,
      fecha_medicion: citaPasada.fecha_cita,
      registrado_por: 'doctor',
      peso_kg: 65.5,
      talla_m: 1.65,
      medida_cintura_cm: 85,
      presion_sistolica: 120,
      presion_diastolica: 80,
      glucosa_mg_dl: 95,
      colesterol_mg_dl: 180,
      trigliceridos_mg_dl: 120,
      observaciones: 'Signos vitales dentro de parámetros normales',
      created_at: citaPasada.fecha_cita,
    }, { transaction });

    console.log(`✅ Signos vitales 1 creados (IMC: ${(65.5 / (1.65 * 1.65)).toFixed(1)})`);

    // Signos vitales adicionales (hace 60 días)
    const signosVitales2 = await SignoVital.create({
      id_paciente: paciente.id_paciente,
      id_cita: null,
      fecha_medicion: fechaAleatoria(60),
      registrado_por: 'paciente',
      peso_kg: 66.0,
      talla_m: 1.65,
      medida_cintura_cm: 86,
      presion_sistolica: 125,
      presion_diastolica: 82,
      glucosa_mg_dl: 98,
      colesterol_mg_dl: 185,
      trigliceridos_mg_dl: 125,
      observaciones: 'Registro realizado por el paciente',
      created_at: fechaAleatoria(60),
    }, { transaction });

    console.log(`✅ Signos vitales 2 creados`);

    // Signos vitales adicionales (hace 90 días)
    const signosVitales3 = await SignoVital.create({
      id_paciente: paciente.id_paciente,
      id_cita: null,
      fecha_medicion: fechaAleatoria(90),
      registrado_por: 'doctor',
      peso_kg: 67.2,
      talla_m: 1.65,
      medida_cintura_cm: 87,
      presion_sistolica: 118,
      presion_diastolica: 78,
      glucosa_mg_dl: 92,
      colesterol_mg_dl: 175,
      trigliceridos_mg_dl: 115,
      observaciones: 'Control rutinario',
      created_at: fechaAleatoria(90),
    }, { transaction });

    console.log(`✅ Signos vitales 3 creados`);

    // 8. CREAR DIAGNÓSTICOS
    logger.info('Creando diagnósticos...');

    const diagnostico1 = await Diagnostico.create({
      id_cita: citaPasada.id_cita,
      descripcion: 'Hipertensión arterial controlada',
      fecha_registro: citaPasada.fecha_cita,
    }, { transaction });

    console.log(`✅ Diagnóstico 1 creado: ${diagnostico1.descripcion}`);

    // Crear una cita adicional para el segundo diagnóstico (hace 180 días)
    const citaAntigua = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      fecha_cita: fechaAleatoria(180),
      hora_cita: '09:00:00',
      tipo_consulta: 'Consulta inicial',
      estado: 'Completada',
      motivo: 'Diagnóstico de diabetes',
      notas: 'Primera consulta',
      created_at: fechaAleatoria(180),
    }, { transaction });

    const diagnostico2 = await Diagnostico.create({
      id_cita: citaAntigua.id_cita,
      descripcion: 'Diabetes Mellitus Tipo 2',
      fecha_registro: fechaAleatoria(180),
    }, { transaction });

    console.log(`✅ Diagnóstico 2 creado: ${diagnostico2.descripcion}`);
    console.log(`✅ Cita antigua creada para diagnóstico 2: ${citaAntigua.fecha_cita}`);

    // 9. CREAR PLAN DE MEDICACIÓN
    logger.info('Creando plan de medicación...');

    const medicamentos = await Medicamento.findAll({ 
      limit: 3 
    });

    if (medicamentos.length > 0) {
      const planMedicacion = await PlanMedicacion.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        id_cita: citaPasada.id_cita,
        fecha_inicio: fechaAleatoria(30),
        fecha_fin: fechaFutura(60),
        estado: 'Activo',
        instrucciones: 'Tomar con alimentos. Seguir estrictamente el horario indicado.',
        created_at: citaPasada.fecha_cita,
      }, { transaction });

      console.log(`✅ Plan de medicación creado (ID: ${planMedicacion.id_plan})`);

      // Crear detalles del plan
      for (const medicamento of medicamentos) {
        await PlanDetalle.create({
          id_plan: planMedicacion.id_plan,
          id_medicamento: medicamento.id_medicamento,
          dosis: medicamento.nombre_medicamento.includes('Tableta') ? '1 tableta' : '10 mg',
          frecuencia: 'Cada 12 horas',
          duracion_dias: 60,
          activo: true,
          created_at: planMedicacion.fecha_inicio,
        }, { transaction });
      }

      console.log(`✅ ${medicamentos.length} medicamentos agregados al plan`);
    } else {
      logger.warn('No se encontraron medicamentos en el sistema');
    }

    // 10. CREAR ESQUEMA DE VACUNACIÓN
    logger.info('Creando esquema de vacunación...');

    const vacunas = await Vacuna.findAll({ 
      limit: 5 
    });

    if (vacunas.length > 0) {
      for (const vacuna of vacunas) {
        await EsquemaVacunacion.create({
          id_paciente: paciente.id_paciente,
          vacuna: vacuna.nombre_vacuna,
          fecha_aplicacion: fechaAleatoria(Math.floor(Math.random() * 365)), // En el último año
          lote: `LOT${Math.floor(Math.random() * 10000)}`,
          observaciones: 'Aplicación correcta, sin reacciones adversas',
          fecha_creacion: fechaAleatoria(Math.floor(Math.random() * 365)),
        }, { transaction });
      }

      console.log(`✅ ${vacunas.length} vacunas agregadas al esquema`);
    } else {
      logger.warn('No se encontraron vacunas en el sistema');
    }

    // 11. CREAR RED DE APOYO
    logger.info('Creando red de apoyo...');

    const redApoyo1 = await RedApoyo.create({
      id_paciente: paciente.id_paciente,
      nombre_contacto: 'Juan González',
      parentesco: 'Esposo',
      numero_celular: '5559876543',
      email: 'juan.gonzalez@email.com',
      direccion: 'Calle Principal 456, Colonia Centro',
      fecha_creacion: new Date(),
    }, { transaction });

    const redApoyo2 = await RedApoyo.create({
      id_paciente: paciente.id_paciente,
      nombre_contacto: 'Ana González López',
      parentesco: 'Hija',
      numero_celular: '5559876544',
      email: 'ana.gonzalez@email.com',
      direccion: 'Calle Principal 456, Colonia Centro',
      fecha_creacion: new Date(),
    }, { transaction });

    console.log(`✅ Red de apoyo creada: ${redApoyo1.nombre_contacto}, ${redApoyo2.nombre_contacto}`);

    // 12. CONFIGURAR PIN PARA LOGIN
    logger.info('Configurando PIN para login...');
    
    const deviceId = `device_${paciente.id_paciente}_${Date.now()}`;
    const pin = '5678';

    const [authRecord, authCreated] = await PacienteAuth.findOrCreate({
      where: {
        id_paciente: paciente.id_paciente,
        device_id: deviceId,
      },
      defaults: {
        device_type: 'mobile',
        is_primary_device: true,
        failed_attempts: 0,
        locked_until: null,
        activo: true,
      },
      transaction
    });

    const pin_hash = await bcrypt.hash(pin, 10);
    const pin_salt = crypto.randomBytes(16).toString('hex');

    await PacienteAuthPIN.findOrCreate({
      where: {
        id_auth: authRecord.id_auth,
      },
      defaults: {
        pin_hash: pin_hash,
        pin_salt: pin_salt,
        activo: true,
      },
      transaction
    });

    console.log(`✅ PIN configurado: ${pin} (Device ID: ${deviceId})`);

    // COMMIT TRANSACCIÓN
    await transaction.commit();

    console.log('\n' + '='.repeat(80));
    console.log('✅ PACIENTE COMPLETO CREADO EXITOSAMENTE');
    console.log('='.repeat(80) + '\n');

    console.log('📋 RESUMEN DEL PACIENTE CREADO:');
    console.log('─'.repeat(80));
    console.log(`👤 Paciente: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}`);
    console.log(`   ID: ${paciente.id_paciente}`);
    console.log(`   Email: ${email}`);
    console.log(`   PIN: ${pin}`);
    console.log(`   Device ID: ${deviceId}`);
    console.log(`   Fecha Nacimiento: ${fechaNacimiento.toISOString().split('T')[0]}`);
    console.log(`   Edad: ${Math.floor((new Date() - fechaNacimiento) / (365.25 * 24 * 60 * 60 * 1000))} años`);
    console.log(`   CURP: ${paciente.curp}`);
    console.log(`   Teléfono: ${paciente.numero_celular}`);
    console.log(`   Institución: ${paciente.institucion_salud}`);
    console.log('');
    console.log(`👨‍⚕️ Doctor Asignado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);
    console.log(`📦 Módulo: ${modulo.nombre_modulo} (ID: ${modulo.id_modulo})`);
    console.log('');
    console.log(`📊 Datos Médicos:`);
    console.log(`   - Signos Vitales: 3 registros`);
    console.log(`   - Diagnósticos: 2`);
    console.log(`   - Comorbilidades: ${comorbilidades.length}`);
    console.log(`   - Citas: 3 (2 pasadas, 1 futura)`);
    const medicamentosCount = medicamentos.length > 0 ? medicamentos.length : 0;
    console.log(`   - Plan de Medicación: ${medicamentosCount > 0 ? '1 plan con ' + medicamentosCount + ' medicamentos' : 'No creado (no hay medicamentos en sistema)'}`);
    const vacunasCount = vacunas.length > 0 ? vacunas.length : 0;
    console.log(`   - Vacunas: ${vacunasCount}`);
    console.log(`   - Red de Apoyo: 2 contactos`);
    console.log('');

    console.log('🔑 CREDENCIALES PARA LOGIN:');
    console.log('─'.repeat(80));
    console.log(`   ID Paciente: ${paciente.id_paciente}`);
    console.log(`   PIN: ${pin}`);
    console.log(`   Device ID: ${deviceId}`);
    console.log('');

    console.log('🌐 ENDPOINTS PARA PROBAR:');
    console.log('─'.repeat(80));
    console.log(`   Setup PIN: POST /api/paciente-auth/setup-pin`);
    console.log(`   Login: POST /api/paciente-auth/login-pin`);
    console.log(`   Body: { "id_paciente": ${paciente.id_paciente}, "pin": "${pin}", "device_id": "${deviceId}" }`);
    console.log('');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    logger.error('Error creando paciente completo:', error);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar script
crearPacienteCompleto();
