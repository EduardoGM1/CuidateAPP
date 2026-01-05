/**
 * Script para generar datos extensos de comorbilidades para pruebas visuales del Heatmap
 * 
 * Genera:
 * - Múltiples pacientes con diferentes comorbilidades
 * - Enfoque especial en Tabasco
 * - Datos distribuidos en los últimos 2-3 años
 * - Variedad de comorbilidades para visualización completa
 * 
 * @author Senior Developer
 * @date 2025-01-XX
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import { Usuario, Doctor, Paciente, Comorbilidad, DoctorPaciente, PacienteComorbilidad } from '../models/associations.js';
import logger from '../utils/logger.js';

// Todas las comorbilidades disponibles en la BD
const COMORBILIDADES_DISPONIBLES = [
  'Asma',
  'Diabetes',
  'Dislipidemia',
  'Enfermedad cardiovascular',
  'Enfermedad renal crónica',
  'EPOC',
  'Hipertensión',
  'Obesidad',
  'Síndrome Metabólico',
  'Tabaquismo',
  'Tuberculosis'
];

// Nombres comunes mexicanos para generar pacientes
const NOMBRES = [
  'María', 'Juan', 'Ana', 'Carlos', 'Laura', 'Pedro', 'Carmen', 'Roberto', 'Patricia', 'Miguel',
  'Sofía', 'Diego', 'Elena', 'Fernando', 'Isabel', 'Rosa', 'Luis', 'Mónica', 'Jorge', 'Gabriela',
  'Ricardo', 'Adriana', 'Francisco', 'Verónica', 'Alejandro', 'Claudia', 'Óscar', 'Diana', 'Manuel', 'Lucía',
  'Raúl', 'Natalia', 'Andrés', 'Paola', 'Héctor', 'Valeria', 'Emilio', 'Daniela', 'Javier', 'Cecilia',
  'Alberto', 'Mariana', 'Eduardo', 'Patricia', 'Sergio', 'Alejandra', 'Rodrigo', 'Beatriz', 'Mauricio', 'Gloria'
];

const APELLIDOS_PATERNO = [
  'González', 'Pérez', 'Rodríguez', 'Hernández', 'Martínez', 'López', 'García', 'Sánchez', 'Fernández', 'Torres',
  'Ramírez', 'Vargas', 'Morales', 'Jiménez', 'Castro', 'Méndez', 'Gómez', 'Rivera', 'Díaz', 'Cruz',
  'Vega', 'Moreno', 'Ramos', 'Mendoza', 'Sosa', 'Delgado', 'Herrera', 'Medina', 'Guerrero', 'Rojas',
  'Campos', 'Peña', 'Flores', 'Silva', 'Ortega', 'Vázquez', 'Aguilar', 'Navarro', 'Cortés', 'Molina'
];

const APELLIDOS_MATERNO = [
  'López', 'Martínez', 'Sánchez', 'García', 'Torres', 'Ramírez', 'Vargas', 'Morales', 'Jiménez', 'Castro',
  'Díaz', 'Cruz', 'Vega', 'Moreno', 'Ramos', 'Mendoza', 'Sosa', 'Delgado', 'Herrera', 'Medina',
  'Guerrero', 'Rojas', 'Campos', 'Peña', 'Flores', 'Silva', 'Ortega', 'Vázquez', 'Aguilar', 'Navarro'
];

// Estados para distribución (Tabasco será el principal)
const ESTADOS = [
  'Tabasco', 'Tabasco', 'Tabasco', 'Tabasco', 'Tabasco', // 50% Tabasco
  'Ciudad de México', 'Jalisco', 'Nuevo León', 'Puebla', 'Veracruz', 'Guanajuato', 'Yucatán', 'Quintana Roo'
];

/**
 * Genera un CURP único
 */
function generarCURP(index) {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  const letra1 = letras[Math.floor(Math.random() * letras.length)];
  const letra2 = letras[Math.floor(Math.random() * letras.length)];
  const num1 = numeros[Math.floor(Math.random() * numeros.length)];
  const num2 = numeros[Math.floor(Math.random() * numeros.length)];
  return `${letra1}${letra2}${num1}${num2}${Date.now().toString().slice(-10)}${index}`.substring(0, 18);
}

/**
 * Genera fecha de nacimiento aleatoria (entre 20 y 80 años)
 */
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

/**
 * Genera fecha de detección aleatoria en los últimos 2-3 años
 */
function generarFechaDeteccion() {
  const hoy = new Date();
  const añosAtras = Math.random() < 0.5 ? 2 : 3; // 50% en últimos 2 años, 50% en últimos 3 años
  const fechaInicio = new Date(hoy);
  fechaInicio.setFullYear(hoy.getFullYear() - añosAtras);
  
  const tiempoAleatorio = fechaInicio.getTime() + Math.random() * (hoy.getTime() - fechaInicio.getTime());
  const fechaAleatoria = new Date(tiempoAleatorio);
  
  return fechaAleatoria.toISOString().split('T')[0]; // Formato YYYY-MM-DD
}

/**
 * Selecciona comorbilidades aleatorias (1-4 por paciente)
 */
function seleccionarComorbilidades() {
  const numComorbilidades = Math.floor(Math.random() * 4) + 1; // 1-4 comorbilidades
  const comorbilidadesSeleccionadas = [];
  const comorbilidadesDisponibles = [...COMORBILIDADES_DISPONIBLES];
  
  for (let i = 0; i < numComorbilidades && comorbilidadesDisponibles.length > 0; i++) {
    const indice = Math.floor(Math.random() * comorbilidadesDisponibles.length);
    comorbilidadesSeleccionadas.push(comorbilidadesDisponibles[indice]);
    comorbilidadesDisponibles.splice(indice, 1); // Evitar duplicados
  }
  
  return comorbilidadesSeleccionadas;
}

/**
 * Obtiene o crea comorbilidad en la BD
 */
async function obtenerComorbilidad(nombreComorbilidad, transaction) {
  let comorbilidad = await Comorbilidad.findOne({
    where: { nombre_comorbilidad: nombreComorbilidad },
    transaction
  });

  if (!comorbilidad) {
    comorbilidad = await Comorbilidad.create({
      nombre_comorbilidad: nombreComorbilidad,
      descripcion: `Comorbilidad: ${nombreComorbilidad}`
    }, { transaction });
    logger.info(`Comorbilidad creada: ${nombreComorbilidad}`);
  }

  return comorbilidad;
}

/**
 * Genera datos de pacientes
 */
function generarPacientesData(cantidad, estadoPrioritario = 'Tabasco') {
  const pacientes = [];
  
  for (let i = 0; i < cantidad; i++) {
    const nombre = NOMBRES[Math.floor(Math.random() * NOMBRES.length)];
    const apellidoPaterno = APELLIDOS_PATERNO[Math.floor(Math.random() * APELLIDOS_PATERNO.length)];
    const apellidoMaterno = APELLIDOS_MATERNO[Math.floor(Math.random() * APELLIDOS_MATERNO.length)];
    
    // Priorizar el estado especificado
    let estado;
    if (estadoPrioritario && i < cantidad * 0.5) {
      estado = estadoPrioritario;
    } else {
      const indiceAleatorio = Math.floor(Math.random() * ESTADOS.length);
      estado = ESTADOS[indiceAleatorio] || 'Tabasco'; // Fallback a Tabasco si hay problema
    }
    
    // Asegurar que el estado nunca sea null o undefined
    if (!estado || estado.trim() === '') {
      estado = 'Tabasco';
    }
    
    const comorbilidades = seleccionarComorbilidades();
    
    pacientes.push({
      nombre,
      apellido_paterno: apellidoPaterno,
      apellido_materno: apellidoMaterno,
      estado: estado.trim(),
      comorbilidades,
      curp: generarCURP(i),
      fecha_nacimiento: generarFechaNacimiento()
    });
  }
  
  return pacientes;
}

async function generarDatosHeatmap() {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('🚀 Iniciando generación de datos para Heatmap de Comorbilidades...');

    // 1. Obtener el doctor
    const usuarioDoctor = await Usuario.findOne({
      where: { email: 'Doctor@clinica.com' },
      transaction
    });

    if (!usuarioDoctor) {
      throw new Error('No se encontró el usuario Doctor@clinica.com');
    }

    const doctor = await Doctor.findOne({
      where: { id_usuario: usuarioDoctor.id_usuario },
      transaction
    });

    if (!doctor) {
      throw new Error('No se encontró el doctor asociado al usuario');
    }

    logger.info(`✅ Doctor encontrado: ID ${doctor.id_doctor}`);

    // 2. Generar datos de pacientes
    // - 100 pacientes para Tabasco (distribuidos en 2-3 años)
    // - 50 pacientes para otros estados
    const pacientesTabasco = generarPacientesData(100, 'Tabasco');
    const pacientesOtros = generarPacientesData(50, null);
    const todosPacientes = [...pacientesTabasco, ...pacientesOtros];

    logger.info(`📋 Generando ${todosPacientes.length} pacientes...`);
    logger.info(`   - Tabasco: ${pacientesTabasco.length}`);
    logger.info(`   - Otros estados: ${pacientesOtros.length}`);

    let pacientesCreados = 0;
    let comorbilidadesAsignadas = 0;

    // 3. Crear pacientes y asignar comorbilidades
    for (const pacienteData of todosPacientes) {
      // Crear paciente
      const paciente = await Paciente.create({
        nombre: pacienteData.nombre,
        apellido_paterno: pacienteData.apellido_paterno,
        apellido_materno: pacienteData.apellido_materno,
        curp: pacienteData.curp,
        fecha_nacimiento: pacienteData.fecha_nacimiento,
        estado: pacienteData.estado,
        localidad: 'Ciudad',
        numero_celular: `555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
        activo: true,
        fecha_registro: new Date().toISOString().split('T')[0]
      }, { transaction });

      // Asignar paciente al doctor
      await DoctorPaciente.create({
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente,
        fecha_asignacion: new Date().toISOString().split('T')[0]
      }, { transaction });

      // Asignar comorbilidades con fechas de detección distribuidas
      for (const nombreComorbilidad of pacienteData.comorbilidades) {
        const comorbilidad = await obtenerComorbilidad(nombreComorbilidad, transaction);
        const fechaDeteccion = generarFechaDeteccion();

        await PacienteComorbilidad.create({
          id_paciente: paciente.id_paciente,
          id_comorbilidad: comorbilidad.id_comorbilidad,
          fecha_deteccion: fechaDeteccion,
          observaciones: `Detección en ${pacienteData.estado}`
        }, { transaction });

        comorbilidadesAsignadas++;
      }

      pacientesCreados++;
      
      if (pacientesCreados % 25 === 0) {
        logger.info(`   Progreso: ${pacientesCreados}/${todosPacientes.length} pacientes creados...`);
      }
    }

    await transaction.commit();

    logger.info('✅ ¡Proceso completado exitosamente!');
    logger.info('📊 Resumen:');
    logger.info(`   - Pacientes creados: ${pacientesCreados}`);
    logger.info(`   - Comorbilidades asignadas: ${comorbilidadesAsignadas}`);
    logger.info(`   - Pacientes en Tabasco: ${pacientesTabasco.length}`);
    logger.info(`   - Fechas distribuidas en los últimos 2-3 años`);
    logger.info(`   - Variedad de comorbilidades: ${COMORBILIDADES_DISPONIBLES.length} tipos diferentes`);

    // Estadísticas adicionales
    const estadisticasTabasco = {};
    pacientesTabasco.forEach(p => {
      p.comorbilidades.forEach(c => {
        estadisticasTabasco[c] = (estadisticasTabasco[c] || 0) + 1;
      });
    });

    logger.info('\n📈 Distribución de comorbilidades en Tabasco:');
    Object.entries(estadisticasTabasco)
      .sort((a, b) => b[1] - a[1])
      .forEach(([comorbilidad, cantidad]) => {
        logger.info(`   - ${comorbilidad}: ${cantidad} casos`);
      });

  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error generando datos para Heatmap:', error);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar script
generarDatosHeatmap();

