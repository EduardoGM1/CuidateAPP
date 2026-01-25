/**
 * Script para:
 * 1. Eliminar TODOS los pacientes de la base de datos
 * 2. Crear 1 paciente completo con PIN 2020 y todos los datos:
 *    - Citas (múltiples)
 *    - Revisiones de monitoreo continuo (PuntoChequeo)
 *    - Medicamentos (PlanMedicacion con PlanDetalle)
 *    - Red de apoyo (RedApoyo)
 *    - Esquema de vacunación (EsquemaVacunacion)
 *    - Complicaciones (DeteccionComplicacion)
 *    - Comorbilidades crónicas (PacienteComorbilidad)
 *    - Sesiones educativas (SesionEducativa)
 *    - Salud bucal (SaludBucal)
 *    - Detección de tuberculosis (DeteccionTuberculosis)
 *    - Signos vitales (múltiples, continuos y en citas)
 *    - Diagnósticos
 */

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
import EncryptionService from '../services/encryptionService.js';

const PATIENT_PIN = '2020';

async function limpiarTodosPacientesYCrearUnoCompleto() {
  let transaction;
  
  try {
    logger.info('🔍 Conectando a la base de datos...');
    await sequelize.authenticate();
    logger.info('✅ Conexión establecida\n');
    
    transaction = await sequelize.transaction();

    logger.info('🚀 Iniciando limpieza completa y creación de paciente...\n');

    // 1. Obtener TODOS los pacientes (no solo los de un doctor)
    logger.info('1️⃣ Obteniendo TODOS los pacientes...');
    const todosLosPacientes = await Paciente.findAll({
      attributes: ['id_paciente', 'id_usuario'],
      transaction
    });

    const pacienteIds = todosLosPacientes.map(p => p.id_paciente);
    const usuarioIds = todosLosPacientes.map(p => p.id_usuario).filter(Boolean);
    
    logger.info(`   📋 Encontrados ${pacienteIds.length} pacientes para eliminar\n`);

    // 2. Eliminar todos los datos relacionados
    if (pacienteIds.length > 0) {
      logger.info('2️⃣ Eliminando datos relacionados de pacientes...');
      
      // Eliminar en orden (respetando foreign keys)
      await MensajeChat.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await SolicitudReprogramacion.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await DeteccionTuberculosis.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await SaludBucal.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await SesionEducativa.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await DeteccionComplicacion.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await EsquemaVacunacion.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await PacienteComorbilidad.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await RedApoyo.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await PuntoChequeo.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      
      // Eliminar planes de medicación y detalles
      const planes = await PlanMedicacion.findAll({
        where: { id_paciente: { [Op.in]: pacienteIds } },
        attributes: ['id_plan'],
        transaction
      });
      const planIds = planes.map(p => p.id_plan);
      if (planIds.length > 0) {
        await PlanDetalle.destroy({ where: { id_plan: { [Op.in]: planIds } }, transaction });
        await PlanMedicacion.destroy({ where: { id_plan: { [Op.in]: planIds } }, transaction });
      }
      
      // Obtener citas primero para eliminar diagnósticos asociados
      const citas = await Cita.findAll({
        where: { id_paciente: { [Op.in]: pacienteIds } },
        attributes: ['id_cita'],
        transaction
      });
      const citaIds = citas.map(c => c.id_cita);
      
      // Eliminar diagnósticos por id_cita
      if (citaIds.length > 0) {
        await Diagnostico.destroy({ where: { id_cita: { [Op.in]: citaIds } }, transaction });
      }
      
      // Eliminar signos vitales
      await SignoVital.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      
      // Eliminar citas
      await Cita.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      
      // Eliminar asignaciones doctor-paciente
      await DoctorPaciente.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      
      // Eliminar TODAS las credenciales de pacientes (incluyendo PINs) antes de eliminar pacientes
      // Esto evita conflictos de unicidad de PIN
      await AuthCredential.destroy({ 
        where: { 
          user_type: 'Paciente',
          auth_method: 'pin'
        }, 
        transaction 
      });
      logger.info('   ✅ Credenciales PIN de pacientes eliminadas');
      
      // Eliminar pacientes
      await Paciente.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      
      // Eliminar usuarios asociados
      if (usuarioIds.length > 0) {
        await Usuario.destroy({ where: { id_usuario: { [Op.in]: usuarioIds } }, transaction });
      }
      
      logger.info(`   ✅ Eliminados ${pacienteIds.length} pacientes y todos sus datos relacionados\n`);
    } else {
      logger.info('   ℹ️  No hay pacientes para eliminar\n');
    }

    // 3. Obtener o crear doctor
    logger.info('3️⃣ Obteniendo doctor...');
    let doctor = await Doctor.findOne({
      include: [{ model: Usuario, where: { email: 'Doctor@clinica.com' } }],
      transaction
    });

    if (!doctor) {
      // Buscar usuario doctor
      const usuarioDoctor = await Usuario.findOne({
        where: { email: 'Doctor@clinica.com', rol: 'Doctor' },
        transaction
      });

      if (usuarioDoctor) {
        doctor = await Doctor.findOne({
          where: { id_usuario: usuarioDoctor.id_usuario },
          transaction
        });
      }
    }

    if (!doctor) {
      logger.warn('   ⚠️  No se encontró doctor, se creará uno...');
      const passwordHash = await bcrypt.hash('Doctor123!', 10);
      const usuarioDoctor = await Usuario.create({
        email: 'Doctor@clinica.com',
        password_hash: passwordHash,
        rol: 'Doctor',
        activo: true
      }, { transaction });

      doctor = await Doctor.create({
        id_usuario: usuarioDoctor.id_usuario,
        nombre: 'Carlos',
        apellido_paterno: 'Méndez',
        apellido_materno: 'Rodríguez',
        especialidad: 'Medicina General',
        numero_cedula: 'DOC123456',
        telefono: '5551234567',
        activo: true
      }, { transaction });
    }

    logger.info(`   ✅ Doctor encontrado/creado (ID: ${doctor.id_doctor})\n`);

    // 4. Obtener módulo
    logger.info('4️⃣ Obteniendo módulo...');
    let modulo = await Modulo.findOne({ transaction });
    if (!modulo) {
      modulo = await Modulo.create({
        nombre_modulo: 'Módulo Principal',
        descripcion: 'Módulo principal del sistema',
        activo: true
      }, { transaction });
      logger.info('   ✅ Módulo creado');
    } else {
      logger.info(`   ✅ Módulo encontrado (ID: ${modulo.id_modulo})`);
    }

    // 5. Crear paciente completo con datos realistas
    logger.info('\n5️⃣ Creando paciente completo con datos realistas...');
    
    const fechaNacimiento = new Date('1985-05-15');
    const fechaNacimientoEncrypted = EncryptionService.encryptField(fechaNacimiento.toISOString().split('T')[0]);
    
    // Crear usuario para el paciente
    const passwordHash = await bcrypt.hash('Paciente2020!', 10);
    const usuarioPaciente = await Usuario.create({
      email: `maria.gonzalez.${Date.now()}@clinica.com`,
      password_hash: passwordHash,
      rol: 'Paciente',
      activo: true,
      fecha_creacion: new Date()
    }, { transaction });

    // Crear paciente con datos realistas
    const paciente = await Paciente.create({
      id_usuario: usuarioPaciente.id_usuario,
      nombre: 'María',
      apellido_paterno: 'González',
      apellido_materno: 'López',
      fecha_nacimiento: fechaNacimientoEncrypted,
      sexo: 'Mujer',
      curp: EncryptionService.encryptField('GOLL850515MDFRPR01'),
      telefono: EncryptionService.encryptField('5551234567'),
      numero_celular: EncryptionService.encryptField('5559876543'),
      email: usuarioPaciente.email,
      direccion: EncryptionService.encryptField('Av. Insurgentes Sur 1234, Col. Del Valle, CDMX'),
      estado: 'Ciudad de México',
      localidad: 'Benito Juárez',
      institucion_salud: 'IMSS',
      id_modulo: modulo.id_modulo,
      activo: true,
      estado: 'activo',
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`   ✅ Paciente creado (ID: ${paciente.id_paciente})`);

    // Crear credencial de autenticación con PIN directamente (para evitar validación de unicidad fuera de transacción)
    const pinHash = await bcrypt.hash(PATIENT_PIN, 10);
    const deviceId = `device_${paciente.id_paciente}_${Date.now()}`;
    await AuthCredential.create({
      user_type: 'Paciente',
      user_id: paciente.id_paciente,
      auth_method: 'pin',
      credential_value: pinHash,
      device_id: deviceId,
      device_name: 'Dispositivo Principal',
      device_type: 'mobile',
      is_primary: true,
      activo: true,
      created_at: new Date()
    }, { transaction });
    logger.info(`   ✅ Credencial de autenticación creada (PIN: ${PATIENT_PIN})`);

    // Asignar paciente al doctor
    await DoctorPaciente.create({
      id_doctor: doctor.id_doctor,
      id_paciente: paciente.id_paciente,
      fecha_asignacion: new Date(),
      activo: true
    }, { transaction });
    logger.info('   ✅ Paciente asignado al doctor');

    // 6. Crear múltiples citas
    logger.info('\n6️⃣ Creando citas...');
    const citas = [];
    const fechasCitas = [
      new Date(2024, 0, 15, 10, 0), // Enero
      new Date(2024, 2, 20, 14, 30), // Marzo
      new Date(2024, 5, 10, 9, 0), // Junio
      new Date(2024, 8, 5, 11, 0), // Septiembre
      new Date(2024, 11, 18, 15, 0) // Diciembre
    ];

    for (let i = 0; i < fechasCitas.length; i++) {
      const fechaCita = fechasCitas[i];
      const cita = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fechaCita,
        estado: i === fechasCitas.length - 1 ? 'pendiente' : 'atendida',
        asistencia: i !== fechasCitas.length - 1,
        es_primera_consulta: i === 0,
        motivo: EncryptionService.encryptField(
          i === 0 ? 'Primera consulta y evaluación general' :
          i === 1 ? 'Control de hipertensión y diabetes' :
          i === 2 ? 'Seguimiento de tratamiento' :
          i === 3 ? 'Revisión de comorbilidades' :
          'Control anual y evaluación completa'
        ),
        observaciones: EncryptionService.encryptField(
          i === 0 ? 'Paciente en buen estado general. Se realizará evaluación completa.' :
          'Paciente estable. Continuar con tratamiento actual.'
        ),
        fecha_creacion: fechaCita
      }, { transaction });
      citas.push(cita);
      logger.info(`   ✅ Cita ${i + 1} creada (ID: ${cita.id_cita}, Fecha: ${fechaCita.toLocaleDateString()})`);
    }

    // 7. Crear signos vitales (en citas y monitoreo continuo)
    logger.info('\n7️⃣ Creando signos vitales...');
    
    // Signos vitales en citas
    const signosVitalesCitas = [
      { fecha: fechasCitas[0], peso: 68.5, talla: 1.65, imc: 25.2, presion: { sistolica: '125', diastolica: '82' }, glucosa: '98', colesterol: '185' },
      { fecha: fechasCitas[1], peso: 67.8, talla: 1.65, imc: 24.9, presion: { sistolica: '122', diastolica: '80' }, glucosa: '95', colesterol: '178' },
      { fecha: fechasCitas[2], peso: 67.2, talla: 1.65, imc: 24.7, presion: { sistolica: '120', diastolica: '78' }, glucosa: '92', colesterol: '175' },
      { fecha: fechasCitas[3], peso: 66.8, talla: 1.65, imc: 24.5, presion: { sistolica: '118', diastolica: '76' }, glucosa: '90', colesterol: '170' }
    ];

    for (let i = 0; i < signosVitalesCitas.length; i++) {
      const sv = signosVitalesCitas[i];
      const signoVital = await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: citas[i].id_cita,
        fecha_medicion: sv.fecha,
        peso_kg: sv.peso,
        talla_m: sv.talla,
        imc: sv.imc,
        medida_cintura_cm: 78.0,
        presion_sistolica: EncryptionService.encryptField(sv.presion.sistolica),
        presion_diastolica: EncryptionService.encryptField(sv.presion.diastolica),
        glucosa_mg_dl: EncryptionService.encryptField(sv.glucosa),
        colesterol_mg_dl: EncryptionService.encryptField(sv.colesterol),
        colesterol_ldl: EncryptionService.encryptField('110'),
        colesterol_hdl: EncryptionService.encryptField('55'),
        trigliceridos_mg_dl: EncryptionService.encryptField('120'),
        hba1c_porcentaje: EncryptionService.encryptField('5.5'),
        edad_paciente_en_medicion: 38 + i,
        registrado_por: 'doctor',
        observaciones: EncryptionService.encryptField('Signos vitales dentro de parámetros normales.'),
        fecha_creacion: sv.fecha
      }, { transaction });
      logger.info(`   ✅ Signos vitales en cita ${i + 1} creados (ID: ${signoVital.id_signo})`);
    }

    // Signos vitales de monitoreo continuo (últimos 30 días)
    logger.info('   📊 Creando signos vitales de monitoreo continuo...');
    const hoy = new Date();
    for (let i = 0; i < 30; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      fecha.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
      
      const pesoVariacion = 66.5 + (Math.random() * 2 - 1); // 65.5 - 67.5
      const presionSistolica = 115 + Math.floor(Math.random() * 10); // 115-125
      const presionDiastolica = 75 + Math.floor(Math.random() * 8); // 75-83
      const glucosa = 85 + Math.floor(Math.random() * 20); // 85-105

      await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: null, // Monitoreo continuo
        fecha_medicion: fecha,
        peso_kg: parseFloat(pesoVariacion.toFixed(1)),
        talla_m: 1.65,
        imc: parseFloat((pesoVariacion / (1.65 * 1.65)).toFixed(1)),
        medida_cintura_cm: 77.5 + (Math.random() * 2 - 1),
        presion_sistolica: EncryptionService.encryptField(presionSistolica.toString()),
        presion_diastolica: EncryptionService.encryptField(presionDiastolica.toString()),
        glucosa_mg_dl: EncryptionService.encryptField(glucosa.toString()),
        edad_paciente_en_medicion: 39,
        registrado_por: 'paciente',
        observaciones: EncryptionService.encryptField('Registro de monitoreo continuo'),
        fecha_creacion: fecha
      }, { transaction });
    }
    logger.info('   ✅ 30 registros de monitoreo continuo creados');

    // 8. Crear diagnósticos
    logger.info('\n8️⃣ Creando diagnósticos...');
    const diagnosticos = [
      'Paciente sana. Control de rutina. Sin patologías detectadas. Se recomienda seguimiento en 6 meses.',
      'Hipertensión arterial controlada. Diabetes tipo 2 en control. Continuar con tratamiento actual.',
      'Evolución favorable. Signos vitales estables. Mantener hábitos saludables.',
      'Control de comorbilidades estable. Mejora en parámetros metabólicos.'
    ];

    for (let i = 0; i < diagnosticos.length; i++) {
      const diagnostico = await Diagnostico.create({
        id_paciente: paciente.id_paciente,
        id_cita: citas[i].id_cita,
        fecha_registro: fechasCitas[i],
        descripcion: EncryptionService.encryptField(diagnosticos[i]),
        fecha_creacion: fechasCitas[i]
      }, { transaction });
      logger.info(`   ✅ Diagnóstico ${i + 1} creado (ID: ${diagnostico.id_diagnostico})`);
    }

    // 9. Crear planes de medicación
    logger.info('\n9️⃣ Creando planes de medicación...');
    
    // Buscar o crear medicamentos
    const medicamentosData = [
      { nombre: 'Metformina', descripcion: 'Antidiabético oral', dosis: '500 mg', frecuencia: 'Dos veces al día' },
      { nombre: 'Losartán', descripcion: 'Antihipertensivo', dosis: '50 mg', frecuencia: 'Una vez al día' },
      { nombre: 'Ácido Acetilsalicílico', descripcion: 'Antiagregante plaquetario', dosis: '100 mg', frecuencia: 'Una vez al día' }
    ];

    const medicamentos = [];
    for (const medData of medicamentosData) {
      let medicamento = await Medicamento.findOne({
        where: { nombre_medicamento: medData.nombre },
        transaction
      });
      
      if (!medicamento) {
        medicamento = await Medicamento.create({
          nombre_medicamento: medData.nombre,
          descripcion: medData.descripcion
        }, { transaction });
      }
      medicamentos.push({ ...medicamento.dataValues, ...medData });
    }

    // Crear plan de medicación actual
    const planMedicacion = await PlanMedicacion.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      id_cita: citas[1].id_cita,
      fecha_inicio: fechasCitas[1],
      fecha_fin: new Date(fechasCitas[1].getTime() + 365 * 24 * 60 * 60 * 1000), // 1 año
      observaciones: EncryptionService.encryptField('Plan de medicación para control de hipertensión y diabetes. Revisar en 3 meses.'),
      fecha_creacion: fechasCitas[1]
    }, { transaction });

    // Crear detalles del plan
    for (const med of medicamentos) {
      await PlanDetalle.create({
        id_plan: planMedicacion.id_plan,
        id_medicamento: med.id_medicamento,
        dosis: med.dosis,
        frecuencia: med.frecuencia,
        duracion_dias: 365,
        instrucciones: med.nombre === 'Metformina' ? 'Tomar con alimentos' : 
                      med.nombre === 'Losartán' ? 'Tomar en la mañana' : 
                      'Tomar con el desayuno',
        fecha_creacion: fechasCitas[1]
      }, { transaction });
    }
    logger.info(`   ✅ Plan de medicación creado (ID: ${planMedicacion.id_plan}) con ${medicamentos.length} medicamentos`);

    // 10. Crear comorbilidades crónicas
    logger.info('\n🔟 Creando comorbilidades crónicas...');
    const comorbilidadesData = [
      { nombre: 'Hipertensión Arterial', descripcion: 'Presión arterial elevada', diagnostico: 'Hipertensión controlada con medicación', tratamiento: 'Losartán 50 mg diario' },
      { nombre: 'Diabetes Mellitus Tipo 2', descripcion: 'Diabetes tipo 2', diagnostico: 'Diabetes controlada', tratamiento: 'Metformina 500 mg dos veces al día' },
      { nombre: 'Dislipidemia', descripcion: 'Alteración en lípidos', diagnostico: 'Colesterol elevado', tratamiento: 'Dieta y ejercicio' }
    ];

    for (const comData of comorbilidadesData) {
      let comorbilidad = await Comorbilidad.findOne({
        where: { nombre_comorbilidad: comData.nombre },
        transaction
      });
      
      if (!comorbilidad) {
        comorbilidad = await Comorbilidad.create({
          nombre_comorbilidad: comData.nombre,
          descripcion: comData.descripcion
        }, { transaction });
      }

      await PacienteComorbilidad.create({
        id_paciente: paciente.id_paciente,
        id_comorbilidad: comorbilidad.id_comorbilidad,
        fecha_deteccion: fechasCitas[1].toISOString().split('T')[0],
        observaciones: EncryptionService.encryptField(`${comData.diagnostico}. ${comData.tratamiento}`),
        es_diagnostico_basal: true,
        es_agregado_posterior: false,
        año_diagnostico: fechasCitas[1].getFullYear(),
        recibe_tratamiento_no_farmacologico: true,
        recibe_tratamiento_farmacologico: true
      }, { transaction });
    }
    logger.info(`   ✅ ${comorbilidadesData.length} comorbilidades creadas`);

    // 11. Crear red de apoyo
    logger.info('\n1️⃣1️⃣ Creando red de apoyo...');
    const redApoyoData = [
      { nombre: 'Juan González López', parentesco: 'Esposo', telefono: '5551111111', es_contacto_emergencia: true },
      { nombre: 'Carmen López Martínez', parentesco: 'Madre', telefono: '5552222222', es_contacto_emergencia: true },
      { nombre: 'Roberto González', parentesco: 'Hermano', telefono: '5553333333', es_contacto_emergencia: false }
    ];

    for (const contacto of redApoyoData) {
      await RedApoyo.create({
        id_paciente: paciente.id_paciente,
        nombre_contacto: contacto.nombre,
        parentesco: contacto.parentesco,
        numero_celular: EncryptionService.encryptField(contacto.telefono),
        fecha_creacion: new Date()
      }, { transaction });
    }
    logger.info(`   ✅ ${redApoyoData.length} contactos de red de apoyo creados`);

    // 12. Crear esquema de vacunación
    logger.info('\n1️⃣2️⃣ Creando esquema de vacunación...');
    const vacunasData = [
      { nombre: 'Influenza', fecha: new Date(2024, 9, 15), lote: 'FLU2024-001' },
      { nombre: 'COVID-19', fecha: new Date(2024, 2, 10), lote: 'COV2024-003' },
      { nombre: 'Tétanos', fecha: new Date(2023, 5, 20), lote: 'TET2023-002' }
    ];

    for (const vacData of vacunasData) {
      await EsquemaVacunacion.create({
        id_paciente: paciente.id_paciente,
        vacuna: vacData.nombre,
        fecha_aplicacion: vacData.fecha.toISOString().split('T')[0],
        lote: vacData.lote,
        observaciones: EncryptionService.encryptField('Aplicación correcta, sin reacciones adversas'),
        fecha_creacion: vacData.fecha
      }, { transaction });
    }
    logger.info(`   ✅ ${vacunasData.length} vacunas registradas`);

    // 13. Crear detecciones de complicaciones
    logger.info('\n1️⃣3️⃣ Creando detecciones de complicaciones...');
    const complicacionesData = [
      { tipo: 'Retinopatía diabética', fecha: new Date(2024, 2, 20), severidad: 'leve', descripcion: 'Cambios mínimos en retina, control anual', estado: 'controlada' },
      { tipo: 'Neuropatía periférica', fecha: new Date(2024, 1, 15), severidad: 'leve', descripcion: 'Hormigueo ocasional en extremidades', estado: 'controlada' }
    ];

    for (const compData of complicacionesData) {
      await DeteccionComplicacion.create({
        id_paciente: paciente.id_paciente,
        id_cita: citas[1].id_cita,
        tipo_complicacion: compData.tipo,
        fecha_deteccion: compData.fecha,
        severidad: compData.severidad,
        descripcion: EncryptionService.encryptField(compData.descripcion),
        estado: compData.estado,
        fecha_creacion: compData.fecha
      }, { transaction });
    }
    logger.info(`   ✅ ${complicacionesData.length} complicaciones registradas`);

    // 14. Crear sesiones educativas
    logger.info('\n1️⃣4️⃣ Creando sesiones educativas...');
    const sesionesData = [
      { tipo_sesion: 'medico_preventiva', fecha: new Date(2024, 0, 20), asistencia: true, observaciones: 'Manejo de la diabetes' },
      { tipo_sesion: 'nutricional', fecha: new Date(2024, 3, 10), asistencia: true, observaciones: 'Alimentación saludable' },
      { tipo_sesion: 'actividad_fisica', fecha: new Date(2024, 6, 5), asistencia: true, observaciones: 'Ejercicio y actividad física' },
      { tipo_sesion: 'medico_preventiva', fecha: new Date(2024, 9, 15), asistencia: false, observaciones: 'Monitoreo de signos vitales' }
    ];

    for (const sesData of sesionesData) {
      await SesionEducativa.create({
        id_paciente: paciente.id_paciente,
        tipo_sesion: sesData.tipo_sesion,
        fecha_sesion: sesData.fecha.toISOString().split('T')[0],
        asistio: sesData.asistencia,
        numero_intervenciones: 1,
        observaciones: sesData.observaciones,
        fecha_creacion: sesData.fecha
      }, { transaction });
    }
    logger.info(`   ✅ ${sesionesData.length} sesiones educativas creadas`);

    // 15. Crear salud bucal
    logger.info('\n1️⃣5️⃣ Creando registros de salud bucal...');
    const saludBucalData = [
      { fecha: new Date(2024, 1, 15), presenta_enfermedades: false, recibio_tratamiento: true, observaciones: 'Limpieza dental realizada, sin caries detectadas' },
      { fecha: new Date(2024, 7, 20), presenta_enfermedades: false, recibio_tratamiento: true, observaciones: 'Control dental, encías saludables' }
    ];

    for (const sbData of saludBucalData) {
      await SaludBucal.create({
        id_paciente: paciente.id_paciente,
        fecha_registro: sbData.fecha.toISOString().split('T')[0],
        presenta_enfermedades_odontologicas: sbData.presenta_enfermedades,
        recibio_tratamiento_odontologico: sbData.recibio_tratamiento,
        observaciones: sbData.observaciones,
        fecha_creacion: sbData.fecha
      }, { transaction });
    }
    logger.info(`   ✅ ${saludBucalData.length} registros de salud bucal creados`);

    // 16. Crear detección de tuberculosis
    logger.info('\n1️⃣6️⃣ Creando detección de tuberculosis...');
    const tuberculosisData = [
      {
        fecha_deteccion: new Date(2024, 0, 10).toISOString().split('T')[0],
        aplicacion_encuesta: true,
        baciloscopia_realizada: false,
        baciloscopia_resultado: null,
        ingreso_tratamiento: false,
        observaciones: 'Prueba de tuberculina negativa. Sin signos de tuberculosis activa.'
      },
      {
        fecha_deteccion: new Date(2023, 6, 1).toISOString().split('T')[0],
        aplicacion_encuesta: true,
        baciloscopia_realizada: true,
        baciloscopia_resultado: 'negativo',
        ingreso_tratamiento: false,
        observaciones: 'Baciloscopia negativa. Sin factores de riesgo.'
      }
    ];

    for (const tbData of tuberculosisData) {
      await DeteccionTuberculosis.create({
        id_paciente: paciente.id_paciente,
        fecha_deteccion: tbData.fecha_deteccion,
        aplicacion_encuesta: tbData.aplicacion_encuesta,
        baciloscopia_realizada: tbData.baciloscopia_realizada,
        baciloscopia_resultado: tbData.baciloscopia_resultado,
        ingreso_tratamiento: tbData.ingreso_tratamiento,
        observaciones: tbData.observaciones,
        fecha_creacion: new Date()
      }, { transaction });
    }
    logger.info(`   ✅ ${tuberculosisData.length} registros de detección de tuberculosis creados`);

    // 17. Crear revisiones de monitoreo continuo (PuntoChequeo)
    logger.info('\n1️⃣7️⃣ Creando revisiones de monitoreo continuo...');
    const puntosChequeo = [
      { fecha: new Date(2024, 0, 5), asistencia: true, observaciones: 'Revisión de signos vitales, todo normal' },
      { fecha: new Date(2024, 1, 12), asistencia: true, observaciones: 'Control de peso y presión arterial' },
      { fecha: new Date(2024, 2, 18), asistencia: true, observaciones: 'Revisión de glucosa y colesterol' },
      { fecha: new Date(2024, 3, 25), asistencia: false, motivo: 'No pudo asistir por trabajo' },
      { fecha: new Date(2024, 4, 8), asistencia: true, observaciones: 'Control general, paciente estable' }
    ];

    for (const pcData of puntosChequeo) {
      await PuntoChequeo.create({
        id_paciente: paciente.id_paciente,
        id_cita: null, // Revisión de monitoreo continuo
        asistencia: pcData.asistencia,
        motivo_no_asistencia: pcData.motivo || null,
        observaciones: EncryptionService.encryptField(pcData.observaciones || ''),
        fecha_registro: pcData.fecha
      }, { transaction });
    }
    logger.info(`   ✅ ${puntosChequeo.length} revisiones de monitoreo continuo creadas`);

    await transaction.commit();

    logger.info('\n✅ ✅ ✅ PROCESO COMPLETADO EXITOSAMENTE ✅ ✅ ✅\n');
    logger.info('📊 RESUMEN DEL PACIENTE CREADO:');
    logger.info(`   👤 Paciente: María González López`);
    logger.info(`   📧 Email: ${usuarioPaciente.email}`);
    logger.info(`   🔐 PIN: ${PATIENT_PIN}`);
    logger.info(`   📅 Fecha de Nacimiento: ${fechaNacimiento.toLocaleDateString()}`);
    logger.info(`   📋 Citas: ${citas.length} (${citas.length - 1} atendidas, 1 pendiente)`);
    logger.info(`   💓 Signos Vitales: ${signosVitalesCitas.length} en citas + 30 de monitoreo continuo`);
    logger.info(`   📝 Diagnósticos: ${diagnosticos.length}`);
    logger.info(`   💊 Plan de Medicación: 1 plan con ${medicamentos.length} medicamentos`);
    logger.info(`   🏥 Comorbilidades: ${comorbilidadesData.length}`);
    logger.info(`   👥 Red de Apoyo: ${redApoyoData.length} contactos`);
    logger.info(`   💉 Vacunas: ${vacunasData.length}`);
    logger.info(`   ⚠️  Complicaciones: ${complicacionesData.length}`);
    logger.info(`   📚 Sesiones Educativas: ${sesionesData.length}`);
    logger.info(`   🦷 Salud Bucal: ${saludBucalData.length} registros`);
    logger.info(`   🦠 Tuberculosis: 1 detección`);
    logger.info(`   📍 Revisiones Monitoreo: ${puntosChequeo.length}`);
    logger.info(`   👨‍⚕️  Doctor: ${doctor.nombre} ${doctor.apellido_paterno}\n`);

    return {
      pacienteId: paciente.id_paciente,
      email: usuarioPaciente.email,
      pin: PATIENT_PIN
    };

  } catch (error) {
    if (transaction) await transaction.rollback();
    logger.error('❌ ERROR en el proceso:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar script
limpiarTodosPacientesYCrearUnoCompleto()
  .then((result) => {
    logger.info('\n✅ Script ejecutado exitosamente');
    logger.info('📋 Datos del paciente:', result);
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });
