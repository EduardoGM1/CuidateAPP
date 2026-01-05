import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import {
  Usuario,
  Paciente,
  Doctor,
  DoctorPaciente,
  Cita,
  SignoVital,
  Diagnostico,
  EsquemaVacunacion,
  PacienteComorbilidad,
  Comorbilidad,
  Vacuna,
  Modulo,
  PlanMedicacion,
  PlanDetalle,
  RedApoyo,
  Medicamento
} from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';

/**
 * Script para crear un paciente completo con PIN 2020
 * Incluye: signos vitales, citas, diagnósticos, medicamentos, red de apoyo, vacunas, comorbilidades
 */

const pacienteData = {
  pin: '2020',
  nombre: 'Roberto',
  apellido_paterno: 'Torres',
  apellido_materno: 'García',
  fecha_nacimiento: '1980-11-20',
  curp: 'TOGR801120HDFRCR04',
  sexo: 'Hombre',
  institucion_salud: 'IMSS',
  direccion: 'Avenida Insurgentes 456',
  localidad: 'Ciudad de México',
  numero_celular: '5559876543',
  comorbilidades: ['Diabetes', 'Hipertensión', 'Obesidad'],
  vacunas: ['COVID-19 (mRNA)', 'Influenza (Gripe)', 'Hepatitis B', 'Tdap (Tétanos, Difteria, Tos Ferina Acelular)'],
  signosVitales: [
    {
      peso_kg: 88.5,
      talla_m: 1.72,
      medida_cintura_cm: 98,
      presion_sistolica: 145,
      presion_diastolica: 92,
      glucosa_mg_dl: 195,
      colesterol_mg_dl: 235,
      trigliceridos_mg_dl: 195,
      registrado_por: 'doctor'
    },
    {
      peso_kg: 87.2,
      talla_m: 1.72,
      medida_cintura_cm: 96,
      presion_sistolica: 142,
      presion_diastolica: 90,
      glucosa_mg_dl: 180,
      registrado_por: 'doctor'
    },
    {
      peso_kg: 86.8,
      talla_m: 1.72,
      medida_cintura_cm: 95,
      presion_sistolica: 138,
      presion_diastolica: 88,
      glucosa_mg_dl: 175,
      registrado_por: 'doctor'
    }
  ],
  diagnosticos: [
    'Diabetes Mellitus Tipo 2, mal controlada. Hipertensión arterial grado 1. Obesidad grado I. Indicado tratamiento con metformina 850mg cada 12 horas, losartán 50mg diario y plan de alimentación.',
    'Control parcial de diabetes e hipertensión. Mejora en parámetros metabólicos. Continuar con tratamiento y seguimiento mensual.',
    'Evolución favorable. Glucosa y presión arterial en mejor control. Mantener tratamiento actual y reforzar medidas dietéticas.'
  ],
  medicamentos: [
    {
      nombre: 'Metformina',
      dosis: '850mg',
      frecuencia: 'Cada 12 horas',
      horario: '08:00',
      via_administracion: 'Oral',
      observaciones: 'Tomar con alimentos'
    },
    {
      nombre: 'Losartán',
      dosis: '50mg',
      frecuencia: 'Una vez al día',
      horario: '08:00',
      via_administracion: 'Oral',
      observaciones: 'Tomar en ayunas'
    }
  ],
  redApoyo: [
    {
      nombre_contacto: 'María Torres García',
      numero_celular: '5551234567',
      email: 'maria.torres@email.com',
      direccion: 'Avenida Insurgentes 456',
      localidad: 'Ciudad de México',
      parentesco: 'Esposa'
    },
    {
      nombre_contacto: 'Carlos Torres García',
      numero_celular: '5552345678',
      email: 'carlos.torres@email.com',
      direccion: 'Avenida Insurgentes 456',
      localidad: 'Ciudad de México',
      parentesco: 'Hijo'
    },
    {
      nombre_contacto: 'Ana García López',
      numero_celular: '5553456789',
      email: null,
      direccion: 'Calle Principal 789',
      localidad: 'Ciudad de México',
      parentesco: 'Hermana'
    }
  ]
};

async function crearPacienteCompleto() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // Obtener el primer doctor disponible
    const doctor = await Doctor.findOne({
      include: [{ model: Usuario, required: true }],
      order: [['id_doctor', 'ASC']]
    });
    
    if (!doctor) {
      throw new Error('No se encontró ningún doctor en la base de datos. Asegúrate de que exista al menos un doctor.');
    }
    
    logger.info(`👨‍⚕️ Doctor asignado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})\n`);

    // Obtener un módulo disponible
    const modulo = await Modulo.findOne({ order: [['id_modulo', 'ASC']] });
    const moduloId = modulo?.id_modulo || null;

    logger.info(`\n👤 ========================================`);
    logger.info(`👤 CREANDO PACIENTE: ${pacienteData.nombre} ${pacienteData.apellido_paterno}`);
    logger.info(`👤 ========================================\n`);

    // 1. Crear paciente directamente (sin usuario/email)
    let paciente = await Paciente.findOne({ 
      where: { 
        nombre: pacienteData.nombre,
        apellido_paterno: pacienteData.apellido_paterno,
        fecha_nacimiento: pacienteData.fecha_nacimiento
      } 
    });
    
    if (paciente) {
      await paciente.update({
        nombre: pacienteData.nombre,
        apellido_paterno: pacienteData.apellido_paterno,
        apellido_materno: pacienteData.apellido_materno,
        fecha_nacimiento: pacienteData.fecha_nacimiento,
        curp: pacienteData.curp,
        sexo: pacienteData.sexo,
        institucion_salud: pacienteData.institucion_salud,
        direccion: pacienteData.direccion,
        localidad: pacienteData.localidad,
        numero_celular: pacienteData.numero_celular,
        id_modulo: moduloId,
        activo: true
      });
      logger.info(`✅ Datos del paciente actualizados (ID: ${paciente.id_paciente})`);
    } else {
      paciente = await Paciente.create({
        id_usuario: null,
        nombre: pacienteData.nombre,
        apellido_paterno: pacienteData.apellido_paterno,
        apellido_materno: pacienteData.apellido_materno,
        fecha_nacimiento: pacienteData.fecha_nacimiento,
        curp: pacienteData.curp,
        sexo: pacienteData.sexo,
        institucion_salud: pacienteData.institucion_salud,
        direccion: pacienteData.direccion,
        localidad: pacienteData.localidad,
        numero_celular: pacienteData.numero_celular,
        id_modulo: moduloId,
        activo: true
      });
      logger.info(`✅ Paciente creado (ID: ${paciente.id_paciente})`);
    }

    // 2. Crear/Actualizar credencial PIN
    const credentials = await UnifiedAuthService.getUserCredentials('Paciente', paciente.id_paciente);
    const existingPinCredential = credentials.find(c => c.auth_method === 'pin' && c.isPrimary);
    
    if (existingPinCredential) {
      // Actualizar PIN existente
      const AuthCredential = (await import('../models/AuthCredential.js')).default;
      const bcrypt = (await import('bcryptjs')).default;
      const salt = await bcrypt.genSalt(10);
      const hashedPin = await bcrypt.hash(pacienteData.pin, salt);
      
      await AuthCredential.update(
        {
          credential_value: hashedPin,
          credential_salt: salt
        },
        {
          where: {
            id_credential: existingPinCredential.id_credential
          }
        }
      );
      logger.info(`✅ PIN actualizado: ${pacienteData.pin}`);
    } else {
      // Crear nuevo PIN
      const deviceId = `device-${paciente.id_paciente}-${Date.now()}`;
      await UnifiedAuthService.setupCredential(
        'Paciente',
        paciente.id_paciente,
        'pin',
        pacienteData.pin,
        {
          deviceId: deviceId,
          deviceName: 'Dispositivo Principal',
          deviceType: 'mobile',
          isPrimary: true
        }
      );
      logger.info(`✅ PIN configurado: ${pacienteData.pin}`);
    }

    // 3. Asignar al doctor
    const asignacion = await DoctorPaciente.findOrCreate({
      where: {
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente
      },
      defaults: {
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente,
        fecha_asignacion: new Date(),
        observaciones: 'Asignado automáticamente'
      }
    });
    logger.info(`✅ Asignado al doctor ${doctor.nombre} ${doctor.apellido_paterno}`);

    // 4. Crear citas
    logger.info('\n📅 Creando citas...');
    const fechasCitas = [
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Hace 60 días
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Hace 30 días
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),  // Hace 7 días
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)   // En 7 días (futura)
    ];

    const citasCreadas = [];
    for (let j = 0; j < fechasCitas.length; j++) {
      const esFutura = j === fechasCitas.length - 1;
      const cita = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fechasCitas[j],
        estado: esFutura ? 'pendiente' : 'atendida',
        asistencia: !esFutura,
        motivo: j === 0 ? 'Primera consulta' : j === fechasCitas.length - 1 ? 'Control médico' : 'Consulta de seguimiento',
        es_primera_consulta: j === 0,
        observaciones: `Consulta ${j + 1} del paciente ${pacienteData.nombre} ${pacienteData.apellido_paterno}`,
        fecha_creacion: fechasCitas[j]
      });
      citasCreadas.push(cita);
      logger.info(`   ✅ Cita ${j + 1} creada (ID: ${cita.id_cita}) - ${fechasCitas[j].toISOString().split('T')[0]} - ${esFutura ? 'Pendiente' : 'Atendida'}`);
    }

    // 5. Crear signos vitales
    logger.info('\n💓 Creando signos vitales...');
    for (let j = 0; j < pacienteData.signosVitales.length; j++) {
      const sv = pacienteData.signosVitales[j];
      const imc = sv.peso_kg && sv.talla_m ? parseFloat((sv.peso_kg / (sv.talla_m * sv.talla_m)).toFixed(2)) : null;
      
      const signoVital = await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: citasCreadas[j]?.id_cita || null,
        fecha_medicion: fechasCitas[j],
        peso_kg: sv.peso_kg,
        talla_m: sv.talla_m,
        imc: imc,
        medida_cintura_cm: sv.medida_cintura_cm || null,
        presion_sistolica: sv.presion_sistolica,
        presion_diastolica: sv.presion_diastolica,
        glucosa_mg_dl: sv.glucosa_mg_dl || null,
        colesterol_mg_dl: sv.colesterol_mg_dl || null,
        trigliceridos_mg_dl: sv.trigliceridos_mg_dl || null,
        registrado_por: sv.registrado_por,
        observaciones: `Registro ${j + 1} de signos vitales`,
        fecha_creacion: fechasCitas[j]
      });
      logger.info(`   ✅ Signos vitales ${j + 1} creados (ID: ${signoVital.id_signo})`);
    }

    // 6. Crear diagnósticos
    logger.info('\n📋 Creando diagnósticos...');
    for (let j = 0; j < pacienteData.diagnosticos.length; j++) {
      const diagnostico = await Diagnostico.create({
        id_paciente: paciente.id_paciente,
        id_cita: citasCreadas[j]?.id_cita || null,
        descripcion: pacienteData.diagnosticos[j],
        fecha_registro: fechasCitas[j]
      });
      logger.info(`   ✅ Diagnóstico ${j + 1} creado (ID: ${diagnostico.id_diagnostico})`);
    }

    // 7. Crear plan de medicación con medicamentos
    logger.info('\n💊 Creando plan de medicación...');
    const fechaInicio = fechasCitas[0];
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMonth(fechaFin.getMonth() + 6); // 6 meses de tratamiento

    const planMedicacion = await PlanMedicacion.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      id_cita: citasCreadas[0]?.id_cita || null,
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
      observaciones: 'Plan de medicación para control de diabetes e hipertensión',
      activo: true,
      fecha_creacion: fechaInicio
    });
    logger.info(`   ✅ Plan de medicación creado (ID: ${planMedicacion.id_plan})`);

    // Crear detalles del plan (medicamentos)
    for (const medData of pacienteData.medicamentos) {
      // Buscar medicamento en catálogo
      const medicamento = await Medicamento.findOne({
        where: {
          nombre_medicamento: {
            [Op.like]: `%${medData.nombre}%`
          }
        }
      });

      if (medicamento) {
        await PlanDetalle.create({
          id_plan: planMedicacion.id_plan,
          id_medicamento: medicamento.id_medicamento,
          dosis: medData.dosis,
          frecuencia: medData.frecuencia,
          horario: medData.horario,
          via_administracion: medData.via_administracion,
          observaciones: medData.observaciones
        });
        logger.info(`   ✅ Medicamento "${medData.nombre}" agregado al plan`);
      } else {
        logger.warn(`   ⚠️  Medicamento "${medData.nombre}" no encontrado en catálogo`);
      }
    }

    // 8. Crear red de apoyo
    logger.info('\n👥 Creando red de apoyo...');
    for (const contacto of pacienteData.redApoyo) {
      const redApoyo = await RedApoyo.create({
        id_paciente: paciente.id_paciente,
        nombre_contacto: contacto.nombre_contacto,
        numero_celular: contacto.numero_celular,
        email: contacto.email,
        direccion: contacto.direccion,
        localidad: contacto.localidad,
        parentesco: contacto.parentesco,
        fecha_creacion: new Date()
      });
      logger.info(`   ✅ Contacto "${contacto.nombre_contacto}" agregado (ID: ${redApoyo.id_red_apoyo})`);
    }

    // 9. Crear historial de vacunas
    logger.info('\n💉 Creando historial de vacunación...');
    for (const nombreVacuna of pacienteData.vacunas) {
      const vacuna = await Vacuna.findOne({ where: { nombre_vacuna: nombreVacuna } });
      if (vacuna) {
        const fechaAplicacion = new Date(Date.now() - Math.floor(Math.random() * 730) * 24 * 60 * 60 * 1000); // Últimos 2 años
        const esquema = await EsquemaVacunacion.create({
          id_paciente: paciente.id_paciente,
          vacuna: nombreVacuna,
          fecha_aplicacion: fechaAplicacion.toISOString().split('T')[0],
          lote: `LOT-${Math.floor(Math.random() * 10000)}`,
          observaciones: `Aplicada en consultorio médico`,
          fecha_creacion: fechaAplicacion
        });
        logger.info(`   ✅ Vacuna "${nombreVacuna}" registrada (ID: ${esquema.id_esquema})`);
      } else {
        logger.warn(`   ⚠️  Vacuna "${nombreVacuna}" no encontrada en catálogo`);
      }
    }

    // 10. Asignar comorbilidades
    logger.info('\n🏥 Asignando comorbilidades...');
    for (const nombreComorbilidad of pacienteData.comorbilidades) {
      const comorbilidad = await Comorbilidad.findOne({ where: { nombre_comorbilidad: nombreComorbilidad } });
      if (comorbilidad) {
        const fechaDeteccion = new Date(Date.now() - Math.floor(Math.random() * 1095) * 24 * 60 * 60 * 1000); // Últimos 3 años
        const anosPadecimiento = Math.floor((Date.now() - fechaDeteccion.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        
        const pacienteComorbilidad = await PacienteComorbilidad.findOrCreate({
          where: {
            id_paciente: paciente.id_paciente,
            id_comorbilidad: comorbilidad.id_comorbilidad
          },
          defaults: {
            id_paciente: paciente.id_paciente,
            id_comorbilidad: comorbilidad.id_comorbilidad,
            fecha_deteccion: fechaDeteccion.toISOString().split('T')[0],
            observaciones: `Diagnosticada en consulta médica`,
            anos_padecimiento: anosPadecimiento
          }
        });
        
        if (pacienteComorbilidad[1]) {
          logger.info(`   ✅ Comorbilidad "${nombreComorbilidad}" asignada (${anosPadecimiento} años de padecimiento)`);
        } else {
          logger.info(`   ⚠️  Comorbilidad "${nombreComorbilidad}" ya estaba asignada`);
        }
      } else {
        logger.warn(`   ⚠️  Comorbilidad "${nombreComorbilidad}" no encontrada en catálogo`);
      }
    }

    // RESUMEN FINAL
    logger.info('\n✅ ========================================');
    logger.info('✅ PACIENTE CREADO EXITOSAMENTE');
    logger.info('✅ ========================================\n');
    logger.info('📋 RESUMEN DEL PACIENTE:\n');
    logger.info(`👤 Nombre: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`);
    logger.info(`🔐 PIN: ${pacienteData.pin} (USAR ESTE PARA LOGIN)`);
    logger.info(`🆔 ID Paciente: ${paciente.id_paciente}`);
    logger.info(`📞 Teléfono: ${paciente.numero_celular}`);
    logger.info(`👨‍⚕️ Doctor asignado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);
    logger.info(`📅 Citas: ${citasCreadas.length} (${citasCreadas.filter(c => c.estado === 'pendiente').length} pendiente(s), ${citasCreadas.filter(c => c.estado === 'atendida').length} atendida(s))`);
    logger.info(`💓 Signos vitales: ${pacienteData.signosVitales.length}`);
    logger.info(`📋 Diagnósticos: ${pacienteData.diagnosticos.length}`);
    logger.info(`💊 Medicamentos: ${pacienteData.medicamentos.length}`);
    logger.info(`👥 Red de apoyo: ${pacienteData.redApoyo.length} contactos`);
    logger.info(`💉 Vacunas: ${pacienteData.vacunas.length}`);
    logger.info(`🏥 Comorbilidades: ${pacienteData.comorbilidades.length}`);
    logger.info('');

    logger.info('✅ Paciente creado y asignado al doctor correctamente\n');

  } catch (error) {
    logger.error('❌ Error:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

crearPacienteCompleto()
  .then(() => {
    logger.info('✅ Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });



import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import {
  Usuario,
  Paciente,
  Doctor,
  DoctorPaciente,
  Cita,
  SignoVital,
  Diagnostico,
  EsquemaVacunacion,
  PacienteComorbilidad,
  Comorbilidad,
  Vacuna,
  Modulo,
  PlanMedicacion,
  PlanDetalle,
  RedApoyo,
  Medicamento
} from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';

/**
 * Script para crear un paciente completo con PIN 2020
 * Incluye: signos vitales, citas, diagnósticos, medicamentos, red de apoyo, vacunas, comorbilidades
 */

const pacienteData = {
  pin: '2020',
  nombre: 'Roberto',
  apellido_paterno: 'Torres',
  apellido_materno: 'García',
  fecha_nacimiento: '1980-11-20',
  curp: 'TOGR801120HDFRCR04',
  sexo: 'Hombre',
  institucion_salud: 'IMSS',
  direccion: 'Avenida Insurgentes 456',
  localidad: 'Ciudad de México',
  numero_celular: '5559876543',
  comorbilidades: ['Diabetes', 'Hipertensión', 'Obesidad'],
  vacunas: ['COVID-19 (mRNA)', 'Influenza (Gripe)', 'Hepatitis B', 'Tdap (Tétanos, Difteria, Tos Ferina Acelular)'],
  signosVitales: [
    {
      peso_kg: 88.5,
      talla_m: 1.72,
      medida_cintura_cm: 98,
      presion_sistolica: 145,
      presion_diastolica: 92,
      glucosa_mg_dl: 195,
      colesterol_mg_dl: 235,
      trigliceridos_mg_dl: 195,
      registrado_por: 'doctor'
    },
    {
      peso_kg: 87.2,
      talla_m: 1.72,
      medida_cintura_cm: 96,
      presion_sistolica: 142,
      presion_diastolica: 90,
      glucosa_mg_dl: 180,
      registrado_por: 'doctor'
    },
    {
      peso_kg: 86.8,
      talla_m: 1.72,
      medida_cintura_cm: 95,
      presion_sistolica: 138,
      presion_diastolica: 88,
      glucosa_mg_dl: 175,
      registrado_por: 'doctor'
    }
  ],
  diagnosticos: [
    'Diabetes Mellitus Tipo 2, mal controlada. Hipertensión arterial grado 1. Obesidad grado I. Indicado tratamiento con metformina 850mg cada 12 horas, losartán 50mg diario y plan de alimentación.',
    'Control parcial de diabetes e hipertensión. Mejora en parámetros metabólicos. Continuar con tratamiento y seguimiento mensual.',
    'Evolución favorable. Glucosa y presión arterial en mejor control. Mantener tratamiento actual y reforzar medidas dietéticas.'
  ],
  medicamentos: [
    {
      nombre: 'Metformina',
      dosis: '850mg',
      frecuencia: 'Cada 12 horas',
      horario: '08:00',
      via_administracion: 'Oral',
      observaciones: 'Tomar con alimentos'
    },
    {
      nombre: 'Losartán',
      dosis: '50mg',
      frecuencia: 'Una vez al día',
      horario: '08:00',
      via_administracion: 'Oral',
      observaciones: 'Tomar en ayunas'
    }
  ],
  redApoyo: [
    {
      nombre_contacto: 'María Torres García',
      numero_celular: '5551234567',
      email: 'maria.torres@email.com',
      direccion: 'Avenida Insurgentes 456',
      localidad: 'Ciudad de México',
      parentesco: 'Esposa'
    },
    {
      nombre_contacto: 'Carlos Torres García',
      numero_celular: '5552345678',
      email: 'carlos.torres@email.com',
      direccion: 'Avenida Insurgentes 456',
      localidad: 'Ciudad de México',
      parentesco: 'Hijo'
    },
    {
      nombre_contacto: 'Ana García López',
      numero_celular: '5553456789',
      email: null,
      direccion: 'Calle Principal 789',
      localidad: 'Ciudad de México',
      parentesco: 'Hermana'
    }
  ]
};

async function crearPacienteCompleto() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // Obtener el primer doctor disponible
    const doctor = await Doctor.findOne({
      include: [{ model: Usuario, required: true }],
      order: [['id_doctor', 'ASC']]
    });
    
    if (!doctor) {
      throw new Error('No se encontró ningún doctor en la base de datos. Asegúrate de que exista al menos un doctor.');
    }
    
    logger.info(`👨‍⚕️ Doctor asignado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})\n`);

    // Obtener un módulo disponible
    const modulo = await Modulo.findOne({ order: [['id_modulo', 'ASC']] });
    const moduloId = modulo?.id_modulo || null;

    logger.info(`\n👤 ========================================`);
    logger.info(`👤 CREANDO PACIENTE: ${pacienteData.nombre} ${pacienteData.apellido_paterno}`);
    logger.info(`👤 ========================================\n`);

    // 1. Crear paciente directamente (sin usuario/email)
    let paciente = await Paciente.findOne({ 
      where: { 
        nombre: pacienteData.nombre,
        apellido_paterno: pacienteData.apellido_paterno,
        fecha_nacimiento: pacienteData.fecha_nacimiento
      } 
    });
    
    if (paciente) {
      await paciente.update({
        nombre: pacienteData.nombre,
        apellido_paterno: pacienteData.apellido_paterno,
        apellido_materno: pacienteData.apellido_materno,
        fecha_nacimiento: pacienteData.fecha_nacimiento,
        curp: pacienteData.curp,
        sexo: pacienteData.sexo,
        institucion_salud: pacienteData.institucion_salud,
        direccion: pacienteData.direccion,
        localidad: pacienteData.localidad,
        numero_celular: pacienteData.numero_celular,
        id_modulo: moduloId,
        activo: true
      });
      logger.info(`✅ Datos del paciente actualizados (ID: ${paciente.id_paciente})`);
    } else {
      paciente = await Paciente.create({
        id_usuario: null,
        nombre: pacienteData.nombre,
        apellido_paterno: pacienteData.apellido_paterno,
        apellido_materno: pacienteData.apellido_materno,
        fecha_nacimiento: pacienteData.fecha_nacimiento,
        curp: pacienteData.curp,
        sexo: pacienteData.sexo,
        institucion_salud: pacienteData.institucion_salud,
        direccion: pacienteData.direccion,
        localidad: pacienteData.localidad,
        numero_celular: pacienteData.numero_celular,
        id_modulo: moduloId,
        activo: true
      });
      logger.info(`✅ Paciente creado (ID: ${paciente.id_paciente})`);
    }

    // 2. Crear/Actualizar credencial PIN
    const credentials = await UnifiedAuthService.getUserCredentials('Paciente', paciente.id_paciente);
    const existingPinCredential = credentials.find(c => c.auth_method === 'pin' && c.isPrimary);
    
    if (existingPinCredential) {
      // Actualizar PIN existente
      const AuthCredential = (await import('../models/AuthCredential.js')).default;
      const bcrypt = (await import('bcryptjs')).default;
      const salt = await bcrypt.genSalt(10);
      const hashedPin = await bcrypt.hash(pacienteData.pin, salt);
      
      await AuthCredential.update(
        {
          credential_value: hashedPin,
          credential_salt: salt
        },
        {
          where: {
            id_credential: existingPinCredential.id_credential
          }
        }
      );
      logger.info(`✅ PIN actualizado: ${pacienteData.pin}`);
    } else {
      // Crear nuevo PIN
      const deviceId = `device-${paciente.id_paciente}-${Date.now()}`;
      await UnifiedAuthService.setupCredential(
        'Paciente',
        paciente.id_paciente,
        'pin',
        pacienteData.pin,
        {
          deviceId: deviceId,
          deviceName: 'Dispositivo Principal',
          deviceType: 'mobile',
          isPrimary: true
        }
      );
      logger.info(`✅ PIN configurado: ${pacienteData.pin}`);
    }

    // 3. Asignar al doctor
    const asignacion = await DoctorPaciente.findOrCreate({
      where: {
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente
      },
      defaults: {
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente,
        fecha_asignacion: new Date(),
        observaciones: 'Asignado automáticamente'
      }
    });
    logger.info(`✅ Asignado al doctor ${doctor.nombre} ${doctor.apellido_paterno}`);

    // 4. Crear citas
    logger.info('\n📅 Creando citas...');
    const fechasCitas = [
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Hace 60 días
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Hace 30 días
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),  // Hace 7 días
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)   // En 7 días (futura)
    ];

    const citasCreadas = [];
    for (let j = 0; j < fechasCitas.length; j++) {
      const esFutura = j === fechasCitas.length - 1;
      const cita = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fechasCitas[j],
        estado: esFutura ? 'pendiente' : 'atendida',
        asistencia: !esFutura,
        motivo: j === 0 ? 'Primera consulta' : j === fechasCitas.length - 1 ? 'Control médico' : 'Consulta de seguimiento',
        es_primera_consulta: j === 0,
        observaciones: `Consulta ${j + 1} del paciente ${pacienteData.nombre} ${pacienteData.apellido_paterno}`,
        fecha_creacion: fechasCitas[j]
      });
      citasCreadas.push(cita);
      logger.info(`   ✅ Cita ${j + 1} creada (ID: ${cita.id_cita}) - ${fechasCitas[j].toISOString().split('T')[0]} - ${esFutura ? 'Pendiente' : 'Atendida'}`);
    }

    // 5. Crear signos vitales
    logger.info('\n💓 Creando signos vitales...');
    for (let j = 0; j < pacienteData.signosVitales.length; j++) {
      const sv = pacienteData.signosVitales[j];
      const imc = sv.peso_kg && sv.talla_m ? parseFloat((sv.peso_kg / (sv.talla_m * sv.talla_m)).toFixed(2)) : null;
      
      const signoVital = await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: citasCreadas[j]?.id_cita || null,
        fecha_medicion: fechasCitas[j],
        peso_kg: sv.peso_kg,
        talla_m: sv.talla_m,
        imc: imc,
        medida_cintura_cm: sv.medida_cintura_cm || null,
        presion_sistolica: sv.presion_sistolica,
        presion_diastolica: sv.presion_diastolica,
        glucosa_mg_dl: sv.glucosa_mg_dl || null,
        colesterol_mg_dl: sv.colesterol_mg_dl || null,
        trigliceridos_mg_dl: sv.trigliceridos_mg_dl || null,
        registrado_por: sv.registrado_por,
        observaciones: `Registro ${j + 1} de signos vitales`,
        fecha_creacion: fechasCitas[j]
      });
      logger.info(`   ✅ Signos vitales ${j + 1} creados (ID: ${signoVital.id_signo})`);
    }

    // 6. Crear diagnósticos
    logger.info('\n📋 Creando diagnósticos...');
    for (let j = 0; j < pacienteData.diagnosticos.length; j++) {
      const diagnostico = await Diagnostico.create({
        id_paciente: paciente.id_paciente,
        id_cita: citasCreadas[j]?.id_cita || null,
        descripcion: pacienteData.diagnosticos[j],
        fecha_registro: fechasCitas[j]
      });
      logger.info(`   ✅ Diagnóstico ${j + 1} creado (ID: ${diagnostico.id_diagnostico})`);
    }

    // 7. Crear plan de medicación con medicamentos
    logger.info('\n💊 Creando plan de medicación...');
    const fechaInicio = fechasCitas[0];
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMonth(fechaFin.getMonth() + 6); // 6 meses de tratamiento

    const planMedicacion = await PlanMedicacion.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      id_cita: citasCreadas[0]?.id_cita || null,
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
      observaciones: 'Plan de medicación para control de diabetes e hipertensión',
      activo: true,
      fecha_creacion: fechaInicio
    });
    logger.info(`   ✅ Plan de medicación creado (ID: ${planMedicacion.id_plan})`);

    // Crear detalles del plan (medicamentos)
    for (const medData of pacienteData.medicamentos) {
      // Buscar medicamento en catálogo
      const medicamento = await Medicamento.findOne({
        where: {
          nombre_medicamento: {
            [Op.like]: `%${medData.nombre}%`
          }
        }
      });

      if (medicamento) {
        await PlanDetalle.create({
          id_plan: planMedicacion.id_plan,
          id_medicamento: medicamento.id_medicamento,
          dosis: medData.dosis,
          frecuencia: medData.frecuencia,
          horario: medData.horario,
          via_administracion: medData.via_administracion,
          observaciones: medData.observaciones
        });
        logger.info(`   ✅ Medicamento "${medData.nombre}" agregado al plan`);
      } else {
        logger.warn(`   ⚠️  Medicamento "${medData.nombre}" no encontrado en catálogo`);
      }
    }

    // 8. Crear red de apoyo
    logger.info('\n👥 Creando red de apoyo...');
    for (const contacto of pacienteData.redApoyo) {
      const redApoyo = await RedApoyo.create({
        id_paciente: paciente.id_paciente,
        nombre_contacto: contacto.nombre_contacto,
        numero_celular: contacto.numero_celular,
        email: contacto.email,
        direccion: contacto.direccion,
        localidad: contacto.localidad,
        parentesco: contacto.parentesco,
        fecha_creacion: new Date()
      });
      logger.info(`   ✅ Contacto "${contacto.nombre_contacto}" agregado (ID: ${redApoyo.id_red_apoyo})`);
    }

    // 9. Crear historial de vacunas
    logger.info('\n💉 Creando historial de vacunación...');
    for (const nombreVacuna of pacienteData.vacunas) {
      const vacuna = await Vacuna.findOne({ where: { nombre_vacuna: nombreVacuna } });
      if (vacuna) {
        const fechaAplicacion = new Date(Date.now() - Math.floor(Math.random() * 730) * 24 * 60 * 60 * 1000); // Últimos 2 años
        const esquema = await EsquemaVacunacion.create({
          id_paciente: paciente.id_paciente,
          vacuna: nombreVacuna,
          fecha_aplicacion: fechaAplicacion.toISOString().split('T')[0],
          lote: `LOT-${Math.floor(Math.random() * 10000)}`,
          observaciones: `Aplicada en consultorio médico`,
          fecha_creacion: fechaAplicacion
        });
        logger.info(`   ✅ Vacuna "${nombreVacuna}" registrada (ID: ${esquema.id_esquema})`);
      } else {
        logger.warn(`   ⚠️  Vacuna "${nombreVacuna}" no encontrada en catálogo`);
      }
    }

    // 10. Asignar comorbilidades
    logger.info('\n🏥 Asignando comorbilidades...');
    for (const nombreComorbilidad of pacienteData.comorbilidades) {
      const comorbilidad = await Comorbilidad.findOne({ where: { nombre_comorbilidad: nombreComorbilidad } });
      if (comorbilidad) {
        const fechaDeteccion = new Date(Date.now() - Math.floor(Math.random() * 1095) * 24 * 60 * 60 * 1000); // Últimos 3 años
        const anosPadecimiento = Math.floor((Date.now() - fechaDeteccion.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        
        const pacienteComorbilidad = await PacienteComorbilidad.findOrCreate({
          where: {
            id_paciente: paciente.id_paciente,
            id_comorbilidad: comorbilidad.id_comorbilidad
          },
          defaults: {
            id_paciente: paciente.id_paciente,
            id_comorbilidad: comorbilidad.id_comorbilidad,
            fecha_deteccion: fechaDeteccion.toISOString().split('T')[0],
            observaciones: `Diagnosticada en consulta médica`,
            anos_padecimiento: anosPadecimiento
          }
        });
        
        if (pacienteComorbilidad[1]) {
          logger.info(`   ✅ Comorbilidad "${nombreComorbilidad}" asignada (${anosPadecimiento} años de padecimiento)`);
        } else {
          logger.info(`   ⚠️  Comorbilidad "${nombreComorbilidad}" ya estaba asignada`);
        }
      } else {
        logger.warn(`   ⚠️  Comorbilidad "${nombreComorbilidad}" no encontrada en catálogo`);
      }
    }

    // RESUMEN FINAL
    logger.info('\n✅ ========================================');
    logger.info('✅ PACIENTE CREADO EXITOSAMENTE');
    logger.info('✅ ========================================\n');
    logger.info('📋 RESUMEN DEL PACIENTE:\n');
    logger.info(`👤 Nombre: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`);
    logger.info(`🔐 PIN: ${pacienteData.pin} (USAR ESTE PARA LOGIN)`);
    logger.info(`🆔 ID Paciente: ${paciente.id_paciente}`);
    logger.info(`📞 Teléfono: ${paciente.numero_celular}`);
    logger.info(`👨‍⚕️ Doctor asignado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);
    logger.info(`📅 Citas: ${citasCreadas.length} (${citasCreadas.filter(c => c.estado === 'pendiente').length} pendiente(s), ${citasCreadas.filter(c => c.estado === 'atendida').length} atendida(s))`);
    logger.info(`💓 Signos vitales: ${pacienteData.signosVitales.length}`);
    logger.info(`📋 Diagnósticos: ${pacienteData.diagnosticos.length}`);
    logger.info(`💊 Medicamentos: ${pacienteData.medicamentos.length}`);
    logger.info(`👥 Red de apoyo: ${pacienteData.redApoyo.length} contactos`);
    logger.info(`💉 Vacunas: ${pacienteData.vacunas.length}`);
    logger.info(`🏥 Comorbilidades: ${pacienteData.comorbilidades.length}`);
    logger.info('');

    logger.info('✅ Paciente creado y asignado al doctor correctamente\n');

  } catch (error) {
    logger.error('❌ Error:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

crearPacienteCompleto()
  .then(() => {
    logger.info('✅ Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });









