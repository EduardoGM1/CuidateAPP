/**
 * Script para crear un nuevo paciente completo con datos médicos
 * y credenciales para login
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

// Función para generar fechas en el pasado
function fechaAleatoria(diasAtras) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - diasAtras);
  return fecha;
}

// Función para generar fechas en el futuro
function fechaFutura(diasAdelante) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + diasAdelante);
  return fecha;
}

async function crearPacienteNuevo() {
  const transaction = await sequelize.transaction();

  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 CREANDO NUEVO PACIENTE CON DATOS COMPLETOS');
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
    const timestamp = Date.now();
    const email = `paciente.${timestamp}@clinica.com`;
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
    const fechaNacimiento = new Date('1990-03-20');
    const curpUnico = `TEST900320MXPR${timestamp.toString().slice(-4)}`;
    
    const paciente = await Paciente.create({
      id_usuario: usuario.id_usuario,
      nombre: 'Eduardo',
      apellido_paterno: 'Rodríguez',
      apellido_materno: 'Morales',
      fecha_nacimiento: fechaNacimiento,
      sexo: 'Hombre',
      curp: curpUnico,
      direccion: 'Avenida Principal 789, Colonia Reforma',
      localidad: 'Guadalajara',
      numero_celular: '5559876543',
      institucion_salud: 'IMSS',
      id_modulo: modulo.id_modulo,
      activo: true,
      fecha_registro: new Date(),
    }, { transaction });

    console.log(`✅ Paciente creado: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno} (ID: ${paciente.id_paciente})`);

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
      limit: 2
    });

    if (comorbilidades.length > 0) {
      for (const comorbilidad of comorbilidades) {
        await PacienteComorbilidad.findOrCreate({
          where: {
            id_paciente: paciente.id_paciente,
            id_comorbilidad: comorbilidad.id_comorbilidad,
          },
          defaults: {
            fecha_deteccion: fechaAleatoria(120), // Diagnóstico hace 4 meses
          },
          transaction
        });
      }
      console.log(`✅ ${comorbilidades.length} comorbilidades asignadas`);
    }

    // 6. CREAR CITAS (pasadas y futuras)
    logger.info('Creando citas...');

    // Cita pasada (hace 20 días)
    const citaPasada = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      fecha_cita: fechaAleatoria(20),
      hora_cita: '11:00:00',
      tipo_consulta: 'Consulta de seguimiento',
      estado: 'Completada',
      asistencia: true,
      es_primera_consulta: false,
      motivo: 'Control de presión arterial',
      observaciones: 'Paciente estable, presión controlada',
      fecha_creacion: fechaAleatoria(20),
    }, { transaction });

    console.log(`✅ Cita pasada creada: ${citaPasada.fecha_cita.toISOString().split('T')[0]}`);

    // Cita futura (en 7 días)
    const citaFutura = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      fecha_cita: fechaFutura(7),
      hora_cita: '15:30:00',
      tipo_consulta: 'Consulta de control',
      estado: 'Programada',
      asistencia: false,
      es_primera_consulta: false,
      motivo: 'Seguimiento mensual',
      observaciones: '',
      fecha_creacion: new Date(),
    }, { transaction });

    console.log(`✅ Cita futura creada: ${citaFutura.fecha_cita.toISOString().split('T')[0]}`);

    // 7. CREAR SIGNOS VITALES
    logger.info('Creando signos vitales...');

    const signosVitales1 = await SignoVital.create({
      id_paciente: paciente.id_paciente,
      id_cita: citaPasada.id_cita,
      fecha_medicion: citaPasada.fecha_cita,
      registrado_por: 'doctor',
      peso_kg: 72.5,
      talla_m: 1.72,
      medida_cintura_cm: 88,
      presion_sistolica: 125,
      presion_diastolica: 82,
      glucosa_mg_dl: 98,
      colesterol_mg_dl: 185,
      trigliceridos_mg_dl: 140,
      observaciones: 'Signos vitales dentro de parámetros normales',
      fecha_creacion: citaPasada.fecha_cita,
    }, { transaction });

    const imc = (72.5 / (1.72 * 1.72)).toFixed(1);
    console.log(`✅ Signos vitales 1 creados (IMC: ${imc})`);

    // Signos vitales adicionales (hace 5 días)
    const signosVitales2 = await SignoVital.create({
      id_paciente: paciente.id_paciente,
      id_cita: null,
      fecha_medicion: fechaAleatoria(5),
      registrado_por: 'paciente',
      peso_kg: 73.0,
      talla_m: 1.72,
      medida_cintura_cm: 89,
      presion_sistolica: 123,
      presion_diastolica: 80,
      glucosa_mg_dl: 95,
      colesterol_mg_dl: 180,
      trigliceridos_mg_dl: 135,
      observaciones: 'Registro realizado por el paciente',
      fecha_creacion: fechaAleatoria(5),
    }, { transaction });

    console.log(`✅ Signos vitales 2 creados`);

    // 8. CREAR DIAGNÓSTICOS
    logger.info('Creando diagnósticos...');

    const diagnostico1 = await Diagnostico.create({
      id_cita: citaPasada.id_cita,
      descripcion: 'Hipertensión arterial leve controlada',
      fecha_registro: citaPasada.fecha_cita,
    }, { transaction });

    console.log(`✅ Diagnóstico 1 creado: ${diagnostico1.descripcion}`);

    // 9. CREAR PLAN DE MEDICACIÓN
    logger.info('Creando plan de medicación...');

    const medicamentos = await Medicamento.findAll({
      limit: 2
    });

    if (medicamentos.length > 0) {
      const planMedicacion = await PlanMedicacion.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        id_cita: citaPasada.id_cita,
        fecha_inicio: citaPasada.fecha_cita,
        fecha_fin: fechaFutura(90), // Plan de 3 meses
        observaciones: 'Plan de medicación para control de hipertensión',
        activo: true,
        fecha_creacion: citaPasada.fecha_cita,
      }, { transaction });

      console.log(`✅ Plan de medicación creado (ID: ${planMedicacion.id_plan})`);

      // Crear detalles del plan
      for (const medicamento of medicamentos) {
        await PlanDetalle.create({
          id_plan: planMedicacion.id_plan,
          id_medicamento: medicamento.id_medicamento,
          dosis: '1 tableta',
          frecuencia: 'Una vez al día',
          duracion_dias: 90,
          activo: true,
          fecha_creacion: planMedicacion.fecha_inicio,
        }, { transaction });
      }

      console.log(`✅ ${medicamentos.length} medicamentos agregados al plan`);
    }

    // 10. CREAR ESQUEMA DE VACUNACIÓN
    logger.info('Creando esquema de vacunación...');

    const vacunas = await Vacuna.findAll({
      limit: 4
    });

    if (vacunas.length > 0) {
      for (const vacuna of vacunas) {
        await EsquemaVacunacion.create({
          id_paciente: paciente.id_paciente,
          vacuna: vacuna.nombre_vacuna,
          fecha_aplicacion: fechaAleatoria(Math.floor(Math.random() * 365)),
          lote: `LOT${Math.floor(Math.random() * 10000)}`,
          observaciones: 'Aplicación correcta',
          fecha_creacion: fechaAleatoria(Math.floor(Math.random() * 365)),
        }, { transaction });
      }

      console.log(`✅ ${vacunas.length} vacunas agregadas al esquema`);
    }

    // 11. CREAR RED DE APOYO
    logger.info('Creando red de apoyo...');

    const redApoyo1 = await RedApoyo.create({
      id_paciente: paciente.id_paciente,
      nombre_contacto: 'Laura Rodríguez Morales',
      parentesco: 'Hermana',
      numero_celular: '5559876544',
      email: 'laura.rodriguez@email.com',
      direccion: 'Avenida Principal 789, Colonia Reforma',
      localidad: 'Guadalajara',
      es_contacto_emergencia: true,
      activo: true,
      fecha_creacion: new Date(),
    }, { transaction });

    console.log(`✅ Red de apoyo creada: ${redApoyo1.nombre_contacto}`);

    // 12. CONFIGURAR PIN PARA LOGIN
    logger.info('Configurando PIN para login...');

    // Generar PIN aleatorio de 4 dígitos
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const deviceId = `device_${paciente.id_paciente}_${timestamp}`;

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
    console.log('✅ NUEVO PACIENTE CREADO EXITOSAMENTE');
    console.log('='.repeat(80) + '\n');

    console.log('📋 RESUMEN DEL PACIENTE CREADO:');
    console.log('─'.repeat(80));
    console.log(`👤 Paciente: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}`);
    console.log(`   ID: ${paciente.id_paciente}`);
    console.log(`   Email: ${email}`);
    console.log(`   Fecha Nacimiento: ${fechaNacimiento.toISOString().split('T')[0]}`);
    console.log(`   Edad: ${Math.floor((new Date() - fechaNacimiento) / (365.25 * 24 * 60 * 60 * 1000))} años`);
    console.log(`   CURP: ${paciente.curp}`);
    console.log(`   Teléfono: ${paciente.numero_celular}`);
    console.log(`   Institución: ${paciente.institucion_salud}`);
    console.log(`   Localidad: ${paciente.localidad}`);
    console.log('');
    console.log(`👨‍⚕️ Doctor Asignado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);
    console.log(`📦 Módulo: ${modulo.nombre_modulo} (ID: ${modulo.id_modulo})`);
    console.log('');
    console.log(`📊 Datos Médicos:`);
    console.log(`   - Signos Vitales: 2 registros`);
    console.log(`   - Diagnósticos: 1`);
    console.log(`   - Comorbilidades: ${comorbilidades.length}`);
    console.log(`   - Citas: 2 (1 pasada, 1 futura)`);
    const medicamentosCount = medicamentos.length > 0 ? medicamentos.length : 0;
    console.log(`   - Plan de Medicación: ${medicamentosCount > 0 ? '1 plan con ' + medicamentosCount + ' medicamentos' : 'No creado'}`);
    const vacunasCount = vacunas.length > 0 ? vacunas.length : 0;
    console.log(`   - Vacunas: ${vacunasCount}`);
    console.log(`   - Red de Apoyo: 1 contacto`);
    console.log('');
    console.log('🔑 CREDENCIALES PARA LOGIN:');
    console.log('─'.repeat(80));
    console.log(`   ID Paciente: ${paciente.id_paciente}`);
    console.log(`   PIN: ${pin} ⭐`);
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
    logger.error('Error creando nuevo paciente:', error);
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar script
crearPacienteNuevo();




