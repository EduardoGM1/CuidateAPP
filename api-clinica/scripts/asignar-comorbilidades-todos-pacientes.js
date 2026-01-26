/**
 * @file asignar-comorbilidades-todos-pacientes.js
 * @description Script para asignar comorbilidades a todos los pacientes (5 pacientes por comorbilidad)
 */

import sequelize from '../config/db.js';
import { Paciente, Comorbilidad, PacienteComorbilidad } from '../models/associations.js';

/**
 * Obtiene o crea una comorbilidad por nombre
 */
async function obtenerOCrearComorbilidad(nombre, descripcion) {
  let comorbilidad = await Comorbilidad.findOne({
    where: { nombre_comorbilidad: nombre }
  });

  if (!comorbilidad) {
    comorbilidad = await Comorbilidad.create({
      nombre_comorbilidad: nombre,
      descripcion: descripcion
    });
    console.log(`   ✅ Creada comorbilidad: ${nombre}`);
  }

  return comorbilidad;
}

/**
 * Genera una fecha aleatoria en los últimos 2 años
 */
function generarFechaAleatoria() {
  const ahora = new Date();
  const hace2Anos = new Date(ahora);
  hace2Anos.setFullYear(hace2Anos.getFullYear() - 2);
  
  const tiempoAleatorio = hace2Anos.getTime() + Math.random() * (ahora.getTime() - hace2Anos.getTime());
  const fecha = new Date(tiempoAleatorio);
  
  return fecha.toISOString().split('T')[0];
}

/**
 * Asigna comorbilidades a todos los pacientes
 */
async function asignarComorbilidadesTodosPacientes() {
  try {
    console.log('\n🔧 ASIGNANDO COMORBILIDADES A TODOS LOS PACIENTES...\n');
    console.log('='.repeat(80));

    // Primero, limpiar todas las asignaciones existentes
    console.log('\n🗑️  Limpiando comorbilidades existentes...');
    await PacienteComorbilidad.destroy({ where: {} });
    console.log('   ✅ Comorbilidades anteriores eliminadas\n');

    // Obtener o crear las 10 comorbilidades principales
    console.log('📋 Verificando/creando comorbilidades disponibles...\n');
    
    const comorbilidades = [
      await obtenerOCrearComorbilidad('Diabetes', 'Diabetes Mellitus - Trastorno metabólico caracterizado por hiperglucemia'),
      await obtenerOCrearComorbilidad('Hipertensión', 'Hipertensión Arterial - Presión arterial elevada de forma crónica'),
      await obtenerOCrearComorbilidad('Obesidad', 'Exceso de peso corporal que puede afectar la salud'),
      await obtenerOCrearComorbilidad('Dislipidemia', 'Alteración en los niveles de lípidos en sangre'),
      await obtenerOCrearComorbilidad('Enfermedad renal crónica', 'Pérdida gradual de la función renal'),
      await obtenerOCrearComorbilidad('EPOC', 'Enfermedad Pulmonar Obstructiva Crónica'),
      await obtenerOCrearComorbilidad('Enfermedad cardiovascular', 'Enfermedades del corazón y vasos sanguíneos'),
      await obtenerOCrearComorbilidad('Tuberculosis', 'Enfermedad infecciosa bacteriana'),
      await obtenerOCrearComorbilidad('Asma', 'Enfermedad inflamatoria crónica de las vías respiratorias'),
      await obtenerOCrearComorbilidad('Tabaquismo', 'Consumo de tabaco como factor de riesgo')
    ];

    console.log(`\n✅ ${comorbilidades.length} comorbilidades disponibles\n`);

    // Obtener todos los pacientes
    const pacientes = await Paciente.findAll({
      order: [['id_paciente', 'ASC']]
    });

    if (!pacientes || pacientes.length === 0) {
      console.log('❌ No se encontraron pacientes.');
      return;
    }

    console.log(`👥 Pacientes encontrados: ${pacientes.length}\n`);
    console.log('='.repeat(80));

    // Distribuir pacientes entre comorbilidades (5 pacientes por comorbilidad)
    let totalAsignadas = 0;
    const pacientesPorComorbilidad = 5;

    for (let i = 0; i < pacientes.length; i++) {
      const paciente = pacientes[i];
      const pacienteData = paciente.toJSON();
      const nombreCompleto = `${pacienteData.nombre} ${pacienteData.apellido_paterno || ''} ${pacienteData.apellido_materno || ''}`.trim();
      
      // Calcular qué comorbilidad asignar (ciclo a través de las comorbilidades)
      const indiceComorb = Math.floor(i / pacientesPorComorbilidad) % comorbilidades.length;
      const comorbilidad = comorbilidades[indiceComorb];
      
      // Generar fecha de detección aleatoria
      const fechaDeteccion = generarFechaAleatoria();
      
      // Crear la relación
      await PacienteComorbilidad.create({
        id_paciente: pacienteData.id_paciente,
        id_comorbilidad: comorbilidad.id_comorbilidad,
        fecha_deteccion: fechaDeteccion,
        observaciones: `Detectado en consulta de rutina - ${comorbilidad.nombre_comorbilidad}`
      });

      console.log(`✅ Paciente ${i + 1}/${pacientes.length}: ${nombreCompleto} → ${comorbilidad.nombre_comorbilidad}`);
      totalAsignadas++;
    }

    // Resumen por comorbilidad
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 RESUMEN POR COMORBILIDAD:');
    console.log('='.repeat(80));
    
    for (const comorbilidad of comorbilidades) {
      const count = await PacienteComorbilidad.count({
        where: { id_comorbilidad: comorbilidad.id_comorbilidad }
      });
      console.log(`   ${comorbilidad.nombre_comorbilidad}: ${count} pacientes`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Total de asignaciones realizadas: ${totalAsignadas}`);
    console.log('✅ Asignación completada exitosamente.\n');

  } catch (error) {
    console.error('\n❌ ERROR al asignar comorbilidades:');
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar asignación
asignarComorbilidadesTodosPacientes();
