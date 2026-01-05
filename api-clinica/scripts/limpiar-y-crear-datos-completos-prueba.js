import sequelize from '../config/db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Importar modelos
import {
  Usuario,
  Paciente,
  Doctor,
  Modulo,
  DoctorPaciente,
  RedApoyo,
  Cita,
  SignoVital,
  Diagnostico,
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
  EsquemaVacunacion,
  Vacuna,
  PacienteComorbilidad,
  Comorbilidad,
  DeteccionComplicacion,
  MensajeChat,
  SesionEducativa,
  SaludBucal,
  DeteccionTuberculosis,
  PuntoChequeo,
  SolicitudReprogramacion,
  NotificacionDoctor,
  AuthCredential
} from '../models/associations.js';

import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';

/**
 * Script para limpiar todos los datos y crear:
 * 1. 1 Administrador (admin@clinica.com / Admin123!)
 * 2. 1 Doctor (doctor@clinica.com / Doctor123!)
 * 3. 1 Paciente con PIN 2020, asignado al doctor, con datos completos
 */

// Datos del paciente
const pacienteData = {
  pin: '2020',
  nombre: 'María',
  apellido_paterno: 'González',
  apellido_materno: 'López',
  fecha_nacimiento: '1985-03-15',
  curp: 'GOLM850315MDFRPR01',
  sexo: 'Mujer',
  institucion_salud: 'IMSS',
  direccion: 'Calle Principal #123, Colonia Centro',
  estado: 'Ciudad de México',
  localidad: 'Ciudad de México',
  numero_celular: '555-9876-5432',
  comorbilidades: ['Diabetes Mellitus Tipo 2', 'Hipertensión Arterial', 'Obesidad'],
  vacunas: [
    { nombre: 'COVID-19 (mRNA)', fecha: '2024-01-15', lote: 'LOT-2024-001' },
    { nombre: 'Influenza (Gripe)', fecha: '2024-10-01', lote: 'LOT-2024-002' },
    { nombre: 'Hepatitis B', fecha: '2023-06-10', lote: 'LOT-2023-001' },
    { nombre: 'Tdap (Tétanos, Difteria, Tos Ferina Acelular)', fecha: '2023-03-20', lote: 'LOT-2023-002' }
  ],
  signosVitales: [
    {
      peso_kg: 75.5,
      talla_m: 1.65,
      medida_cintura_cm: 88,
      presion_sistolica: 140,
      presion_diastolica: 90,
      glucosa_mg_dl: 180,
      colesterol_mg_dl: 220,
      trigliceridos_mg_dl: 195,
      registrado_por: 'doctor'
    },
    {
      peso_kg: 74.8,
      talla_m: 1.65,
      medida_cintura_cm: 86,
      presion_sistolica: 135,
      presion_diastolica: 88,
      glucosa_mg_dl: 165,
      colesterol_mg_dl: 210,
      trigliceridos_mg_dl: 180,
      registrado_por: 'doctor'
    },
    {
      peso_kg: 74.2,
      talla_m: 1.65,
      medida_cintura_cm: 85,
      presion_sistolica: 132,
      presion_diastolica: 85,
      glucosa_mg_dl: 155,
      colesterol_mg_dl: 205,
      trigliceridos_mg_dl: 175,
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
      nombre_contacto: 'Juan González López',
      numero_celular: '555-1111-2222',
      email: 'juan.gonzalez@example.com',
      direccion: 'Calle Secundaria #456',
      parentesco: 'Esposo'
    },
    {
      nombre_contacto: 'Ana González López',
      numero_celular: '555-2222-3333',
      email: 'ana.gonzalez@example.com',
      direccion: 'Calle Principal #123',
      parentesco: 'Hija'
    }
  ]
};

async function limpiarYCrearDatosCompletos() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🗑️  Limpiando todos los datos existentes...\n');
    
    // Eliminar en orden inverso de dependencias
    await NotificacionDoctor.destroy({ where: {}, transaction, force: true });
    await SolicitudReprogramacion.destroy({ where: {}, transaction, force: true });
    await PuntoChequeo.destroy({ where: {}, transaction, force: true });
    await DeteccionTuberculosis.destroy({ where: {}, transaction, force: true });
    await SaludBucal.destroy({ where: {}, transaction, force: true });
    await SesionEducativa.destroy({ where: {}, transaction, force: true });
    await MensajeChat.destroy({ where: {}, transaction, force: true });
    await DeteccionComplicacion.destroy({ where: {}, transaction, force: true });
    await PacienteComorbilidad.destroy({ where: {}, transaction, force: true });
    await EsquemaVacunacion.destroy({ where: {}, transaction, force: true });
    await PlanDetalle.destroy({ where: {}, transaction, force: true });
    await PlanMedicacion.destroy({ where: {}, transaction, force: true });
    await Diagnostico.destroy({ where: {}, transaction, force: true });
    await SignoVital.destroy({ where: {}, transaction, force: true });
    await Cita.destroy({ where: {}, transaction, force: true });
    await RedApoyo.destroy({ where: {}, transaction, force: true });
    await DoctorPaciente.destroy({ where: {}, transaction, force: true });
    await AuthCredential.destroy({ where: {}, transaction, force: true });
    await Paciente.destroy({ where: {}, transaction, force: true });
    await Doctor.destroy({ where: {}, transaction, force: true });
    await Usuario.destroy({ where: {}, transaction, force: true });
    
    console.log('✅ Todos los datos eliminados\n');
    
    // ============================================
    // 1. CREAR MÓDULO
    // ============================================
    console.log('📦 Creando módulo...');
    let modulo = await Modulo.findOne({ where: {}, transaction });
    if (!modulo) {
      modulo = await Modulo.create({
        nombre_modulo: 'Módulo Principal',
        created_at: new Date(),
        updated_at: new Date()
      }, { transaction });
    }
    console.log(`✅ Módulo creado/obtenido (ID: ${modulo.id_modulo})\n`);
    
    // ============================================
    // 2. CREAR ADMINISTRADOR
    // ============================================
    console.log('👤 Creando administrador...');
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const adminUsuario = await Usuario.create({
      email: 'admin@clinica.com',
      password_hash: adminPasswordHash,
      rol: 'Admin',
      fecha_creacion: new Date(),
      activo: true
    }, { transaction });
    // Crear credencial de autenticación para el administrador
    await AuthCredential.create({
      user_type: 'Admin',
      user_id: adminUsuario.id_usuario,
      auth_method: 'password',
      credential_value: adminPasswordHash,
      credential_salt: null, // bcrypt incluye el salt en el hash
      is_primary: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }, { transaction });
    
    console.log(`✅ Administrador creado:`);
    console.log(`   📧 Email: admin@clinica.com`);
    console.log(`   🔑 Password: Admin123!`);
    console.log(`   🔐 Credencial de autenticación creada\n`);
    
    // ============================================
    // 3. CREAR DOCTOR
    // ============================================
    console.log('👨‍⚕️  Creando doctor...');
    const doctorPasswordHash = await bcrypt.hash('Doctor123!', 10);
    const doctorUsuario = await Usuario.create({
      email: 'doctor@clinica.com',
      password_hash: doctorPasswordHash,
      rol: 'Doctor',
      fecha_creacion: new Date(),
      activo: true
    }, { transaction });
    
    const doctor = await Doctor.create({
      id_usuario: doctorUsuario.id_usuario,
      nombre: 'Dr. Juan',
      apellido_paterno: 'Pérez',
      apellido_materno: 'García',
      telefono: '555-1234-5678', // Se encriptará automáticamente
      institucion_hospitalaria: 'Hospital General',
      grado_estudio: 'Especialista en Medicina Familiar',
      anos_servicio: 10,
      id_modulo: modulo.id_modulo,
      fecha_registro: new Date(),
      activo: true
    }, { transaction });
    
    // Crear credencial de autenticación para el doctor
    await AuthCredential.create({
      user_type: 'Doctor',
      user_id: doctorUsuario.id_usuario,
      auth_method: 'password',
      credential_value: doctorPasswordHash,
      credential_salt: null, // bcrypt incluye el salt en el hash
      is_primary: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }, { transaction });
    
    console.log(`✅ Doctor creado:`);
    console.log(`   📧 Email: doctor@clinica.com`);
    console.log(`   🔑 Password: Doctor123!`);
    console.log(`   👤 Nombre: ${doctor.nombre} ${doctor.apellido_paterno}`);
    console.log(`   🔐 Credencial de autenticación creada\n`);
    
    // ============================================
    // 4. CREAR PACIENTE
    // ============================================
    console.log('👤 Creando paciente con PIN 2020...');
    const paciente = await Paciente.create({
      nombre: pacienteData.nombre,
      apellido_paterno: pacienteData.apellido_paterno,
      apellido_materno: pacienteData.apellido_materno,
      fecha_nacimiento: pacienteData.fecha_nacimiento, // Se encriptará automáticamente
      curp: pacienteData.curp, // Se encriptará automáticamente
      numero_celular: pacienteData.numero_celular, // Se encriptará automáticamente
      direccion: pacienteData.direccion, // Se encriptará automáticamente
      estado: pacienteData.estado,
      localidad: pacienteData.localidad,
      institucion_salud: pacienteData.institucion_salud,
      sexo: pacienteData.sexo,
      id_modulo: modulo.id_modulo,
      fecha_registro: new Date(),
      activo: true
    }, { transaction });
    
    console.log(`✅ Paciente creado (ID: ${paciente.id_paciente})`);
    console.log(`   👤 Nombre: ${pacienteData.nombre} ${pacienteData.apellido_paterno}`);
    console.log(`   📅 Fecha de nacimiento: ${pacienteData.fecha_nacimiento}`);
    console.log(`   📱 Teléfono: ${pacienteData.numero_celular}\n`);
    
    // ============================================
    // 5. CONFIGURAR PIN DEL PACIENTE
    // ============================================
    console.log('🔐 Configurando PIN del paciente...');
    const deviceId = `device-${paciente.id_paciente}-${Date.now()}`;
    
    // Crear PIN directamente usando AuthCredential dentro de la transacción
    const bcryptjs = await import('bcryptjs');
    const salt = await bcryptjs.default.genSalt(10);
    const hashedPin = await bcryptjs.default.hash(pacienteData.pin, salt);
    
    await AuthCredential.create({
      user_type: 'Paciente',
      user_id: paciente.id_paciente,
      auth_method: 'pin',
      credential_value: hashedPin,
      credential_salt: salt,
      device_id: deviceId,
      device_name: 'Dispositivo Principal',
      device_type: 'mobile',
      is_primary: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }, { transaction });
    
    console.log(`✅ PIN configurado: ${pacienteData.pin}\n`);
    
    // ============================================
    // 6. ASIGNAR PACIENTE AL DOCTOR
    // ============================================
    console.log('🔗 Asignando paciente al doctor...');
    await DoctorPaciente.create({
      id_doctor: doctor.id_doctor,
      id_paciente: paciente.id_paciente,
      fecha_asignacion: new Date(),
      observaciones: 'Paciente asignado al doctor'
    }, { transaction });
    console.log(`✅ Paciente asignado al doctor\n`);
    
    // ============================================
    // 7. CREAR CITAS
    // ============================================
    console.log('📅 Creando citas...');
    const fechasCitas = [
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Hace 60 días
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Hace 30 días
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),  // Hace 7 días
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)   // En 7 días (futura)
    ];
    
    const citasCreadas = [];
    for (let i = 0; i < fechasCitas.length; i++) {
      const esFutura = i === fechasCitas.length - 1;
      const cita = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fechasCitas[i],
        estado: esFutura ? 'pendiente' : 'atendida',
        asistencia: !esFutura,
        motivo: i === 0 ? 'Primera consulta' : esFutura ? 'Control médico' : 'Consulta de seguimiento',
        es_primera_consulta: i === 0,
        observaciones: `Consulta ${i + 1} del paciente ${pacienteData.nombre} ${pacienteData.apellido_paterno}`,
        fecha_creacion: fechasCitas[i]
      }, { transaction });
      citasCreadas.push(cita);
      console.log(`   ✅ Cita ${i + 1} creada - ${fechasCitas[i].toISOString().split('T')[0]} - ${esFutura ? 'Pendiente' : 'Atendida'}`);
    }
    console.log('');
    
    // ============================================
    // 8. CREAR SIGNOS VITALES
    // ============================================
    console.log('💓 Creando signos vitales...');
    for (let i = 0; i < pacienteData.signosVitales.length; i++) {
      const sv = pacienteData.signosVitales[i];
      const imc = sv.peso_kg && sv.talla_m ? parseFloat((sv.peso_kg / (sv.talla_m * sv.talla_m)).toFixed(2)) : null;
      
      // Convertir valores numéricos a strings para que los hooks de encriptación funcionen correctamente
      const signoVital = await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: citasCreadas[i]?.id_cita || null,
        fecha_medicion: fechasCitas[i],
        peso_kg: sv.peso_kg,
        talla_m: sv.talla_m,
        imc: imc,
        medida_cintura_cm: sv.medida_cintura_cm || null,
        presion_sistolica: sv.presion_sistolica ? String(sv.presion_sistolica) : null,
        presion_diastolica: sv.presion_diastolica ? String(sv.presion_diastolica) : null,
        glucosa_mg_dl: sv.glucosa_mg_dl ? String(sv.glucosa_mg_dl) : null,
        colesterol_mg_dl: sv.colesterol_mg_dl ? String(sv.colesterol_mg_dl) : null,
        trigliceridos_mg_dl: sv.trigliceridos_mg_dl ? String(sv.trigliceridos_mg_dl) : null,
        registrado_por: sv.registrado_por,
        observaciones: `Registro ${i + 1} de signos vitales`,
        fecha_creacion: fechasCitas[i]
      }, { transaction });
      console.log(`   ✅ Signos vitales ${i + 1} creados (IMC: ${imc})`);
    }
    console.log('');
    
    // ============================================
    // 9. CREAR DIAGNÓSTICOS
    // ============================================
    console.log('📋 Creando diagnósticos...');
    for (let i = 0; i < pacienteData.diagnosticos.length; i++) {
      const diagnostico = await Diagnostico.create({
        id_paciente: paciente.id_paciente,
        id_cita: citasCreadas[i]?.id_cita || null,
        descripcion: pacienteData.diagnosticos[i],
        fecha_registro: fechasCitas[i]
      }, { transaction });
      console.log(`   ✅ Diagnóstico ${i + 1} creado`);
    }
    console.log('');
    
    // ============================================
    // 10. CREAR PLAN DE MEDICACIÓN
    // ============================================
    console.log('💊 Creando plan de medicación...');
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
    }, { transaction });
    console.log(`   ✅ Plan de medicación creado (ID: ${planMedicacion.id_plan})`);
    
    // Crear detalles del plan (medicamentos)
    for (const medData of pacienteData.medicamentos) {
      // Buscar medicamento en catálogo
      const medicamento = await Medicamento.findOne({
        where: {
          nombre_medicamento: {
            [Op.like]: `%${medData.nombre}%`
          }
        },
        transaction
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
        }, { transaction });
        console.log(`   ✅ Medicamento "${medData.nombre}" agregado al plan`);
      } else {
        console.log(`   ⚠️  Medicamento "${medData.nombre}" no encontrado en catálogo`);
      }
    }
    console.log('');
    
    // ============================================
    // 11. CREAR RED DE APOYO
    // ============================================
    console.log('👥 Creando red de apoyo...');
    for (const contacto of pacienteData.redApoyo) {
      const redApoyo = await RedApoyo.create({
        id_paciente: paciente.id_paciente,
        nombre_contacto: contacto.nombre_contacto,
        numero_celular: contacto.numero_celular, // Se encriptará automáticamente
        email: contacto.email, // Se encriptará automáticamente
        direccion: contacto.direccion, // Se encriptará automáticamente
        parentesco: contacto.parentesco,
        fecha_creacion: new Date()
      }, { transaction });
      console.log(`   ✅ Contacto "${contacto.nombre_contacto}" agregado (${contacto.parentesco})`);
    }
    console.log('');
    
    // ============================================
    // 12. CREAR HISTORIAL DE VACUNAS
    // ============================================
    console.log('💉 Creando historial de vacunación...');
    for (const vacunaData of pacienteData.vacunas) {
      const vacuna = await Vacuna.findOne({ 
        where: { nombre_vacuna: vacunaData.nombre },
        transaction 
      });
      
      if (vacuna) {
        const esquema = await EsquemaVacunacion.create({
          id_paciente: paciente.id_paciente,
          vacuna: vacunaData.nombre,
          fecha_aplicacion: vacunaData.fecha,
          lote: vacunaData.lote,
          observaciones: `Aplicada en consultorio médico`,
          fecha_creacion: new Date(vacunaData.fecha)
        }, { transaction });
        console.log(`   ✅ Vacuna "${vacunaData.nombre}" registrada (${vacunaData.fecha})`);
      } else {
        // Si no existe en catálogo, crear registro directo
        const esquema = await EsquemaVacunacion.create({
          id_paciente: paciente.id_paciente,
          vacuna: vacunaData.nombre,
          fecha_aplicacion: vacunaData.fecha,
          lote: vacunaData.lote,
          observaciones: `Aplicada en consultorio médico`,
          fecha_creacion: new Date(vacunaData.fecha)
        }, { transaction });
        console.log(`   ✅ Vacuna "${vacunaData.nombre}" registrada (${vacunaData.fecha})`);
      }
    }
    console.log('');
    
    // ============================================
    // 13. ASIGNAR COMORBILIDADES
    // ============================================
    console.log('🏥 Asignando comorbilidades...');
    for (const nombreComorbilidad of pacienteData.comorbilidades) {
      let comorbilidad = await Comorbilidad.findOne({
        where: {
          nombre_comorbilidad: {
            [Op.like]: `%${nombreComorbilidad}%`
          }
        },
        transaction
      });
      
      if (!comorbilidad) {
        // Crear comorbilidad si no existe
        comorbilidad = await Comorbilidad.create({
          nombre_comorbilidad: nombreComorbilidad,
          descripcion: `Comorbilidad: ${nombreComorbilidad}`
        }, { transaction });
      }
      
      await PacienteComorbilidad.create({
        id_paciente: paciente.id_paciente,
        id_comorbilidad: comorbilidad.id_comorbilidad,
        fecha_diagnostico: fechasCitas[0],
        observaciones: `Diagnosticada en primera consulta`
      }, { transaction });
      console.log(`   ✅ Comorbilidad "${nombreComorbilidad}" asignada`);
    }
    console.log('');
    
    await transaction.commit();
    
    console.log('='.repeat(60));
    console.log('✅ DATOS CREADOS EXITOSAMENTE\n');
    console.log('📊 RESUMEN:');
    console.log(`   👤 Administrador: admin@clinica.com / Admin123!`);
    console.log(`   👨‍⚕️  Doctor: doctor@clinica.com / Doctor123!`);
    console.log(`   👤 Paciente: ${pacienteData.nombre} ${pacienteData.apellido_paterno} / PIN: ${pacienteData.pin}\n`);
    console.log('📋 DATOS DEL PACIENTE:');
    console.log(`   ✅ ${citasCreadas.length} citas creadas`);
    console.log(`   ✅ ${pacienteData.signosVitales.length} registros de signos vitales`);
    console.log(`   ✅ ${pacienteData.diagnosticos.length} diagnósticos`);
    console.log(`   ✅ 1 plan de medicación con ${pacienteData.medicamentos.length} medicamentos`);
    console.log(`   ✅ ${pacienteData.redApoyo.length} contactos de red de apoyo`);
    console.log(`   ✅ ${pacienteData.vacunas.length} vacunas registradas`);
    console.log(`   ✅ ${pacienteData.comorbilidades.length} comorbilidades asignadas\n`);
    console.log('🔐 DATOS ENCRIPTADOS:');
    console.log('   ✅ fecha_nacimiento');
    console.log('   ✅ curp');
    console.log('   ✅ numero_celular');
    console.log('   ✅ direccion');
    console.log('   ✅ telefono (doctor)');
    console.log('   ✅ red_apoyo (numero_celular, email, direccion)\n');
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error recreando datos:', error);
    logger.error('Error en limpiarYCrearDatosCompletos', { 
      error: error.message, 
      stack: error.stack 
    });
    throw error;
  }
}

// Ejecutar
limpiarYCrearDatosCompletos()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

