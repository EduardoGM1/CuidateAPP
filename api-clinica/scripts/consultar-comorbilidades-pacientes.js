/**
 * @file consultar-comorbilidades-pacientes.js
 * @description Script para consultar comorbilidades de todos los pacientes registrados
 * @author Senior Developer
 * @date 2025-10-28
 */

import sequelize from '../config/db.js';
import { normalizeComorbilidades } from '../utils/pacienteMapper.js';

/**
 * Consulta y muestra todas las comorbilidades de cada paciente
 */
async function consultarComorbilidadesPacientes() {
  try {
    console.log('\n🔍 CONSULTANDO COMORBILIDADES DE TODOS LOS PACIENTES...\n');
    console.log('='.repeat(80));

    // Consultar usando SQL directo para evitar problemas con asociaciones de Sequelize
    const [pacientesSQL] = await sequelize.query(`
      SELECT 
        p.id_paciente,
        p.nombre,
        p.apellido_paterno,
        p.apellido_materno,
        p.fecha_nacimiento,
        p.curp,
        c.id_comorbilidad,
        c.nombre_comorbilidad,
        c.descripcion,
        pc.fecha_deteccion,
        pc.observaciones
      FROM pacientes p
      LEFT JOIN paciente_comorbilidad pc ON p.id_paciente = pc.id_paciente
      LEFT JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
      WHERE p.activo = true
      ORDER BY p.id_paciente ASC, c.id_comorbilidad ASC
    `);

    // Agrupar por paciente
    const pacientesMap = new Map();
    pacientesSQL.forEach(row => {
      if (!pacientesMap.has(row.id_paciente)) {
        pacientesMap.set(row.id_paciente, {
          id_paciente: row.id_paciente,
          nombre: row.nombre,
          apellido_paterno: row.apellido_paterno,
          apellido_materno: row.apellido_materno,
          fecha_nacimiento: row.fecha_nacimiento,
          curp: row.curp,
          comorbilidades: []
        });
      }
      
      if (row.id_comorbilidad) {
        const paciente = pacientesMap.get(row.id_paciente);
        paciente.comorbilidades.push({
          id_comorbilidad: row.id_comorbilidad,
          nombre_comorbilidad: row.nombre_comorbilidad,
          descripcion: row.descripcion,
          PacienteComorbilidad: {
            fecha_deteccion: row.fecha_deteccion,
            observaciones: row.observaciones
          }
        });
      }
    });

    const pacientes = Array.from(pacientesMap.values());

    if (!pacientes || pacientes.length === 0) {
      console.log('❌ No se encontraron pacientes registrados en la base de datos.');
      return;
    }

    console.log(`\n📊 Total de pacientes encontrados: ${pacientes.length}\n`);
    console.log('='.repeat(80));

    let pacientesConComorbilidades = 0;
    let pacientesSinComorbilidades = 0;
    let totalComorbilidades = 0;

    // Procesar cada paciente
    for (const pacienteData of pacientes) {
      const nombreCompleto = `${pacienteData.nombre} ${pacienteData.apellido_paterno} ${pacienteData.apellido_materno || ''}`.trim();
      
      // Normalizar comorbilidades usando el mapper
      const comorbilidades = normalizeComorbilidades(pacienteData.comorbilidades);

      console.log(`\n👤 PACIENTE #${pacienteData.id_paciente}`);
      console.log(`   Nombre: ${nombreCompleto}`);
      console.log(`   CURP: ${pacienteData.curp || 'No registrado'}`);
      console.log(`   Fecha de Nacimiento: ${pacienteData.fecha_nacimiento || 'No registrada'}`);

      if (comorbilidades.length > 0) {
        pacientesConComorbilidades++;
        totalComorbilidades += comorbilidades.length;
        
        console.log(`   📋 Comorbilidades (${comorbilidades.length}):`);
        
        comorbilidades.forEach((com, index) => {
          console.log(`      ${index + 1}. ${com.nombre}`);
          if (com.descripcion) {
            console.log(`         Descripción: ${com.descripcion}`);
          }
          if (com.fecha_deteccion) {
            console.log(`         Fecha de Detección: ${com.fecha_deteccion}`);
          }
          if (com.observaciones) {
            console.log(`         Observaciones: ${com.observaciones}`);
          }
        });
      } else {
        pacientesSinComorbilidades++;
        console.log(`   ❌ Sin comorbilidades registradas`);
      }

      console.log('-'.repeat(80));
    }

    // Resumen estadístico
    console.log('\n' + '='.repeat(80));
    console.log('\n📈 RESUMEN ESTADÍSTICO:');
    console.log('='.repeat(80));
    console.log(`   Total de Pacientes: ${pacientes.length}`);
    console.log(`   Pacientes con Comorbilidades: ${pacientesConComorbilidades} (${((pacientesConComorbilidades / pacientes.length) * 100).toFixed(1)}%)`);
    console.log(`   Pacientes sin Comorbilidades: ${pacientesSinComorbilidades} (${((pacientesSinComorbilidades / pacientes.length) * 100).toFixed(1)}%)`);
    console.log(`   Total de Comorbilidades Registradas: ${totalComorbilidades}`);
    
    if (totalComorbilidades > 0) {
      console.log(`   Promedio de Comorbilidades por Paciente: ${(totalComorbilidades / pacientesConComorbilidades).toFixed(2)}`);
    }

    // Lista de todas las comorbilidades únicas registradas
    const todasComorbilidades = pacientes.flatMap(p => normalizeComorbilidades(p.comorbilidades));
    const comorbilidadesUnicas = [...new Set(todasComorbilidades.map(c => c.nombre))];
    
    if (comorbilidadesUnicas.length > 0) {
      console.log(`\n   📋 Tipos de Comorbilidades Registradas (${comorbilidadesUnicas.length}):`);
      comorbilidadesUnicas.forEach((nombre, index) => {
        const count = todasComorbilidades.filter(c => c.nombre === nombre).length;
        console.log(`      ${index + 1}. ${nombre} (${count} paciente${count !== 1 ? 's' : ''})`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Consulta completada exitosamente.\n');

  } catch (error) {
    console.error('\n❌ ERROR al consultar comorbilidades:');
    console.error(error);
    console.error('\n');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar consulta
consultarComorbilidadesPacientes();
