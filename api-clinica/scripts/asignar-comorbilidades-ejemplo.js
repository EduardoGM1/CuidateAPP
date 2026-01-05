/**
 * @file asignar-comorbilidades-ejemplo.js
 * @description Script para asignar comorbilidades de ejemplo a los pacientes existentes
 * @author Senior Developer
 * @date 2025-10-28
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
 * Asigna comorbilidades de ejemplo a los pacientes
 */
async function asignarComorbilidadesEjemplo() {
  try {
    console.log('\n🔧 ASIGNANDO COMORBILIDADES DE EJEMPLO A LOS PACIENTES...\n');
    console.log('='.repeat(80));

    // Obtener o crear comorbilidades disponibles
    console.log('\n📋 Verificando/creando comorbilidades disponibles...\n');
    
    const hipertension = await obtenerOCrearComorbilidad(
      'Hipertensión Arterial',
      'Presión arterial elevada de forma crónica'
    );
    
    const diabetes = await obtenerOCrearComorbilidad(
      'Diabetes Mellitus Tipo 2',
      'Trastorno metabólico caracterizado por hiperglucemia crónica'
    );
    
    const obesidad = await obtenerOCrearComorbilidad(
      'Obesidad',
      'Exceso de peso corporal que puede afectar la salud'
    );
    
    const dislipidemia = await obtenerOCrearComorbilidad(
      'Dislipidemia',
      'Alteración en los niveles de lípidos en sangre'
    );
    
    const asma = await obtenerOCrearComorbilidad(
      'Asma',
      'Enfermedad inflamatoria crónica de las vías respiratorias'
    );

    // Obtener todos los pacientes activos
    const pacientes = await Paciente.findAll({
      where: { activo: true },
      order: [['id_paciente', 'ASC']]
    });

    if (!pacientes || pacientes.length === 0) {
      console.log('❌ No se encontraron pacientes activos.');
      return;
    }

    console.log(`\n👥 Pacientes encontrados: ${pacientes.length}\n`);
    console.log('='.repeat(80));

    // Asignar comorbilidades de ejemplo a cada paciente
    // Paciente 59 (Juan Ramírez, 67 años) - hipertensión y dislipidemia
    // Paciente 60 (Fernando Pérez, 36 años) - diabetes y obesidad  
    // Paciente 61 (Beatriz Torres, 28 años) - asma

    const asignaciones = [
      {
        pacienteId: 59,
        comorbilidades: [
          { comorbilidad: hipertension, fecha: '2023-01-15', observaciones: 'Detección en primera consulta, presión 160/100' },
          { comorbilidad: dislipidemia, fecha: '2023-06-20', observaciones: 'Colesterol elevado detectado en análisis' }
        ]
      },
      {
        pacienteId: 60,
        comorbilidades: [
          { comorbilidad: diabetes, fecha: '2024-03-10', observaciones: 'Diagnóstico inicial, glucosa pesada 280 mg/dL' },
          { comorbilidad: obesidad, fecha: '2024-03-10', observaciones: 'IMC 32.5, requiere control dietético' }
        ]
      },
      {
        pacienteId: 61,
        comorbilidades: [
          { comorbilidad: asma, fecha: '2024-08-15', observaciones: 'Asma alérgica estacional, control con inhalador' }
        ]
      }
    ];

    let totalAsignadas = 0;
    let totalExistentes = 0;

    for (const asignacion of asignaciones) {
      const paciente = pacientes.find(p => p.id_paciente === asignacion.pacienteId);
      
      if (!paciente) {
        console.log(`\n⚠️  Paciente #${asignacion.pacienteId} no encontrado, saltando...`);
        continue;
      }

      const pacienteData = paciente.toJSON();
      const nombreCompleto = `${pacienteData.nombre} ${pacienteData.apellido_paterno} ${pacienteData.apellido_materno || ''}`.trim();
      
      console.log(`\n👤 Asignando comorbilidades a: ${nombreCompleto} (ID: ${pacienteData.id_paciente})`);

      for (const item of asignacion.comorbilidades) {
        // Verificar si ya existe la relación
        const existe = await PacienteComorbilidad.findOne({
          where: {
            id_paciente: pacienteData.id_paciente,
            id_comorbilidad: item.comorbilidad.id_comorbilidad
          }
        });

        if (existe) {
          console.log(`   ⚠️  Ya existe: ${item.comorbilidad.nombre_comorbilidad} - saltando...`);
          totalExistentes++;
          continue;
        }

        // Crear la relación
        await PacienteComorbilidad.create({
          id_paciente: pacienteData.id_paciente,
          id_comorbilidad: item.comorbilidad.id_comorbilidad,
          fecha_deteccion: item.fecha,
          observaciones: item.observaciones || null
        });

        console.log(`   ✅ Asignada: ${item.comorbilidad.nombre_comorbilidad}`);
        console.log(`      Fecha detección: ${item.fecha}`);
        if (item.observaciones) {
          console.log(`      Observaciones: ${item.observaciones}`);
        }
        
        totalAsignadas++;
      }
    }

    // Resumen
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 RESUMEN:');
    console.log('='.repeat(80));
    console.log(`   Comorbilidades asignadas: ${totalAsignadas}`);
    console.log(`   Comorbilidades ya existentes (omitidas): ${totalExistentes}`);
    console.log(`   Total procesado: ${totalAsignadas + totalExistentes}`);
    console.log('\n✅ Asignación completada exitosamente.\n');

  } catch (error) {
    console.error('\n❌ ERROR al asignar comorbilidades:');
    console.error(error);
    console.error('\n');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar asignación
asignarComorbilidadesEjemplo();

