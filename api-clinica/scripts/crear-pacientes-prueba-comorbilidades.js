/**
 * Script para crear 15 pacientes de prueba con diferentes comorbilidades y estados
 * para el doctor con email "Doctor@clinica.com"
 * 
 * Distribución:
 * - 15 pacientes
 * - Máximo 6 estados diferentes
 * - Diferentes comorbilidades asignadas
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import { Usuario, Doctor, Paciente, Comorbilidad, DoctorPaciente, PacienteComorbilidad } from '../models/associations.js';
import logger from '../utils/logger.js';

// Estados de México (seleccionaremos 6)
const estadosSeleccionados = [
  'Ciudad de México',
  'Jalisco',
  'Nuevo León',
  'Puebla',
  'Veracruz',
  'Guanajuato'
];

// Datos de pacientes de prueba
const pacientesData = [
  { nombre: 'María', apellido_paterno: 'González', apellido_materno: 'López', estado: 'Ciudad de México', comorbilidades: ['Diabetes', 'Hipertensión'] },
  { nombre: 'Juan', apellido_paterno: 'Pérez', apellido_materno: 'Martínez', estado: 'Ciudad de México', comorbilidades: ['Obesidad', 'Dislipidemia'] },
  { nombre: 'Ana', apellido_paterno: 'Rodríguez', apellido_materno: 'Sánchez', estado: 'Jalisco', comorbilidades: ['Asma', 'EPOC'] },
  { nombre: 'Carlos', apellido_paterno: 'Hernández', apellido_materno: 'García', estado: 'Jalisco', comorbilidades: ['Hipertensión', 'Enfermedad cardiovascular'] },
  { nombre: 'Laura', apellido_paterno: 'Martínez', apellido_materno: 'Fernández', estado: 'Nuevo León', comorbilidades: ['Diabetes', 'Obesidad', 'Síndrome Metabólico'] },
  { nombre: 'Pedro', apellido_paterno: 'López', apellido_materno: 'González', estado: 'Nuevo León', comorbilidades: ['Hipertensión'] },
  { nombre: 'Carmen', apellido_paterno: 'García', apellido_materno: 'Torres', estado: 'Puebla', comorbilidades: ['Enfermedad renal crónica', 'Hipertensión'] },
  { nombre: 'Roberto', apellido_paterno: 'Sánchez', apellido_materno: 'Ramírez', estado: 'Puebla', comorbilidades: ['Tabaquismo', 'EPOC'] },
  { nombre: 'Patricia', apellido_paterno: 'Fernández', apellido_materno: 'Morales', estado: 'Veracruz', comorbilidades: ['Diabetes', 'Dislipidemia', 'Hipertensión'] },
  { nombre: 'Miguel', apellido_paterno: 'Torres', apellido_materno: 'Jiménez', estado: 'Veracruz', comorbilidades: ['Obesidad'] },
  { nombre: 'Sofía', apellido_paterno: 'Ramírez', apellido_materno: 'Vargas', estado: 'Guanajuato', comorbilidades: ['Asma'] },
  { nombre: 'Diego', apellido_paterno: 'Morales', apellido_materno: 'Castro', estado: 'Guanajuato', comorbilidades: ['Hipertensión', 'Enfermedad cardiovascular'] },
  { nombre: 'Elena', apellido_paterno: 'Jiménez', apellido_materno: 'Ortega', estado: 'Ciudad de México', comorbilidades: ['Tuberculosis'] },
  { nombre: 'Fernando', apellido_paterno: 'Vargas', apellido_materno: 'Ruiz', estado: 'Jalisco', comorbilidades: ['Diabetes', 'Obesidad', 'Hipertensión', 'Dislipidemia'] },
  { nombre: 'Isabel', apellido_paterno: 'Castro', apellido_materno: 'Mendoza', estado: 'Nuevo León', comorbilidades: ['EPOC', 'Tabaquismo'] },
  // 20 pacientes adicionales para Tabasco
  { nombre: 'Rosa', apellido_paterno: 'Méndez', apellido_materno: 'Díaz', estado: 'Tabasco', comorbilidades: ['Diabetes', 'Hipertensión', 'Obesidad'] },
  { nombre: 'Luis', apellido_paterno: 'Gómez', apellido_materno: 'Cruz', estado: 'Tabasco', comorbilidades: ['Hipertensión', 'Dislipidemia'] },
  { nombre: 'Mónica', apellido_paterno: 'Rivera', apellido_materno: 'Vega', estado: 'Tabasco', comorbilidades: ['Asma', 'EPOC', 'Tabaquismo'] },
  { nombre: 'Jorge', apellido_paterno: 'Díaz', apellido_materno: 'Moreno', estado: 'Tabasco', comorbilidades: ['Enfermedad cardiovascular'] },
  { nombre: 'Gabriela', apellido_paterno: 'Cruz', apellido_materno: 'Ramos', estado: 'Tabasco', comorbilidades: ['Diabetes', 'Obesidad'] },
  { nombre: 'Ricardo', apellido_paterno: 'Vega', apellido_materno: 'Mendoza', estado: 'Tabasco', comorbilidades: ['Hipertensión', 'Enfermedad renal crónica'] },
  { nombre: 'Adriana', apellido_paterno: 'Moreno', apellido_materno: 'Sosa', estado: 'Tabasco', comorbilidades: ['Tabaquismo', 'EPOC'] },
  { nombre: 'Francisco', apellido_paterno: 'Ramos', apellido_materno: 'Delgado', estado: 'Tabasco', comorbilidades: ['Diabetes', 'Hipertensión', 'Dislipidemia'] },
  { nombre: 'Verónica', apellido_paterno: 'Mendoza', apellido_materno: 'Herrera', estado: 'Tabasco', comorbilidades: ['Obesidad', 'Dislipidemia'] },
  { nombre: 'Alejandro', apellido_paterno: 'Sosa', apellido_materno: 'Medina', estado: 'Tabasco', comorbilidades: ['Asma'] },
  { nombre: 'Claudia', apellido_paterno: 'Delgado', apellido_materno: 'Guerrero', estado: 'Tabasco', comorbilidades: ['Hipertensión', 'Enfermedad cardiovascular', 'Diabetes'] },
  { nombre: 'Óscar', apellido_paterno: 'Herrera', apellido_materno: 'Rojas', estado: 'Tabasco', comorbilidades: ['Tuberculosis'] },
  { nombre: 'Diana', apellido_paterno: 'Medina', apellido_materno: 'Campos', estado: 'Tabasco', comorbilidades: ['EPOC', 'Tabaquismo', 'Asma'] },
  { nombre: 'Manuel', apellido_paterno: 'Guerrero', apellido_materno: 'Peña', estado: 'Tabasco', comorbilidades: ['Diabetes', 'Obesidad', 'Hipertensión'] },
  { nombre: 'Lucía', apellido_paterno: 'Rojas', apellido_materno: 'Flores', estado: 'Tabasco', comorbilidades: ['Enfermedad renal crónica'] },
  { nombre: 'Raúl', apellido_paterno: 'Campos', apellido_materno: 'Silva', estado: 'Tabasco', comorbilidades: ['Hipertensión', 'Dislipidemia', 'Obesidad'] },
  { nombre: 'Natalia', apellido_paterno: 'Peña', apellido_materno: 'Ortega', estado: 'Tabasco', comorbilidades: ['Asma', 'EPOC'] },
  { nombre: 'Andrés', apellido_paterno: 'Flores', apellido_materno: 'Vázquez', estado: 'Tabasco', comorbilidades: ['Enfermedad cardiovascular', 'Hipertensión'] },
  { nombre: 'Paola', apellido_paterno: 'Silva', apellido_materno: 'Aguilar', estado: 'Tabasco', comorbilidades: ['Diabetes', 'Dislipidemia'] },
  { nombre: 'Héctor', apellido_paterno: 'Ortega', apellido_materno: 'Navarro', estado: 'Tabasco', comorbilidades: ['Tabaquismo', 'EPOC', 'Asma'] },
  { nombre: 'Valeria', apellido_paterno: 'Vázquez', apellido_materno: 'Cortés', estado: 'Tabasco', comorbilidades: ['Obesidad', 'Hipertensión', 'Diabetes'] }
];

// Función para generar CURP único
function generarCURP(index) {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  const letra1 = letras[Math.floor(Math.random() * letras.length)];
  const letra2 = letras[Math.floor(Math.random() * letras.length)];
  const num1 = numeros[Math.floor(Math.random() * numeros.length)];
  const num2 = numeros[Math.floor(Math.random() * numeros.length)];
  return `${letra1}${letra2}${num1}${num2}${Date.now().toString().slice(-10)}${index}`.substring(0, 18);
}

// Función para generar fecha de nacimiento aleatoria (entre 20 y 80 años)
function generarFechaNacimiento() {
  const hoy = new Date();
  const edadMin = 20;
  const edadMax = 80;
  const edad = Math.floor(Math.random() * (edadMax - edadMin + 1)) + edadMin;
  const año = hoy.getFullYear() - edad;
  const mes = Math.floor(Math.random() * 12) + 1;
  const dia = Math.floor(Math.random() * 28) + 1;
  return `${año}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
}

// Función para obtener o crear comorbilidad
async function obtenerComorbilidad(nombreComorbilidad, transaction) {
  // Mapeo de nombres simplificados a nombres completos en BD
  // Basado en las comorbilidades que realmente existen en la BD
  const mapeoComorbilidades = {
    'Diabetes': 'Diabetes',
    'Hipertensión': 'Hipertensión',
    'Obesidad': 'Obesidad',
    'Dislipidemia': 'Dislipidemia',
    'Asma': 'Asma',
    'EPOC': 'EPOC',
    'Enfermedad cardiovascular': 'Enfermedad Cardiovascular',
    'Enfermedad renal crónica': 'Enfermedad Renal Crónica',
    'Síndrome Metabólico': 'Síndrome Metabólico',
    'Tabaquismo': 'Tabaquismo',
    'Tuberculosis': 'Tuberculosis'
  };

  const nombreCompleto = mapeoComorbilidades[nombreComorbilidad] || nombreComorbilidad;

  let comorbilidad = await Comorbilidad.findOne({
    where: { nombre_comorbilidad: nombreCompleto },
    transaction
  });

  // Si no existe, buscar por coincidencia parcial
  if (!comorbilidad) {
    comorbilidad = await Comorbilidad.findOne({
      where: {
        nombre_comorbilidad: {
          [Op.like]: `%${nombreComorbilidad}%`
        }
      },
      transaction
    });
  }

  return comorbilidad;
}

async function crearPacientesPrueba() {
  const transaction = await sequelize.transaction();

  try {
    logger.info('🚀 Iniciando creación de pacientes de prueba con comorbilidades...');

    // 1. Buscar el doctor con email "Doctor@clinica.com"
    const usuarioDoctor = await Usuario.findOne({
      where: { email: 'Doctor@clinica.com' },
      transaction
    });

    if (!usuarioDoctor) {
      throw new Error('No se encontró el usuario con email "Doctor@clinica.com"');
    }

    const doctor = await Doctor.findOne({
      where: { id_usuario: usuarioDoctor.id_usuario },
      transaction
    });

    if (!doctor) {
      throw new Error('No se encontró el doctor asociado al usuario "Doctor@clinica.com"');
    }

    logger.info(`✅ Doctor encontrado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);

    // 2. Obtener todas las comorbilidades disponibles
    const todasComorbilidades = await Comorbilidad.findAll({ transaction });
    logger.info(`📋 Comorbilidades disponibles en BD: ${todasComorbilidades.length}`);
    todasComorbilidades.forEach(c => {
      logger.info(`   - ${c.nombre_comorbilidad}`);
    });

    // 3. Crear los 15 pacientes
    const pacientesCreados = [];
    const institucionesSalud = ['IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro'];
    const sexos = ['Hombre', 'Mujer'];

    for (let i = 0; i < pacientesData.length; i++) {
      const pacienteData = pacientesData[i];
      const fechaNacimiento = generarFechaNacimiento();
      const sexo = sexos[Math.floor(Math.random() * sexos.length)];
      const institucion = institucionesSalud[Math.floor(Math.random() * institucionesSalud.length)];

      // Crear paciente
      const paciente = await Paciente.create({
        nombre: pacienteData.nombre,
        apellido_paterno: pacienteData.apellido_paterno,
        apellido_materno: pacienteData.apellido_materno,
        fecha_nacimiento: fechaNacimiento,
        curp: generarCURP(i),
        estado: pacienteData.estado,
        localidad: `Localidad ${i + 1}`,
        direccion: `Calle ${i + 1}, Col. Centro`,
        numero_celular: `555${String(i + 1).padStart(7, '0')}`,
        sexo: sexo,
        institucion_salud: institucion,
        activo: true
      }, { transaction });

      pacientesCreados.push(paciente);
      logger.info(`✅ Paciente ${i + 1}/15 creado: ${paciente.nombre} ${paciente.apellido_paterno} (Estado: ${paciente.estado})`);

      // Asignar paciente al doctor
      await DoctorPaciente.create({
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente,
        fecha_asignacion: new Date().toISOString().split('T')[0],
        observaciones: `Paciente de prueba creado automáticamente`
      }, { transaction });

      logger.info(`   ✅ Asignado al doctor ${doctor.nombre}`);

      // Asignar comorbilidades
      for (const nombreComorbilidad of pacienteData.comorbilidades) {
        const comorbilidad = await obtenerComorbilidad(nombreComorbilidad, transaction);

        if (comorbilidad) {
          await PacienteComorbilidad.create({
            id_paciente: paciente.id_paciente,
            id_comorbilidad: comorbilidad.id_comorbilidad,
            fecha_deteccion: new Date().toISOString().split('T')[0],
            observaciones: `Comorbilidad asignada en datos de prueba`
          }, { transaction });

          logger.info(`   ✅ Comorbilidad asignada: ${comorbilidad.nombre_comorbilidad}`);
        } else {
          logger.warn(`   ⚠️  Comorbilidad no encontrada: ${nombreComorbilidad}`);
        }
      }
    }

    await transaction.commit();
    logger.info('\n✅ ¡Proceso completado exitosamente!');
    logger.info(`📊 Resumen:`);
    logger.info(`   - Pacientes creados: ${pacientesCreados.length}`);
    
    // Mostrar distribución por estado
    const distribucionPorEstado = {};
    pacientesCreados.forEach(p => {
      distribucionPorEstado[p.estado] = (distribucionPorEstado[p.estado] || 0) + 1;
    });

    const estadosUtilizados = Object.keys(distribucionPorEstado).length;
    logger.info(`   - Estados utilizados: ${estadosUtilizados}`);
    logger.info(`   - Doctor asignado: ${doctor.nombre} ${doctor.apellido_paterno}`);

    logger.info(`\n📈 Distribución por estado:`);
    Object.entries(distribucionPorEstado).sort((a, b) => b[1] - a[1]).forEach(([estado, count]) => {
      logger.info(`   - ${estado}: ${count} paciente(s)`);
    });

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error creando pacientes de prueba:', error);
    process.exit(1);
  }
}

// Ejecutar el script
crearPacientesPrueba();

