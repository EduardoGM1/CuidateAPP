/**
 * Script para eliminar todas las citas de pacientes diferentes a Eduardo Gonzalez Gonzalez
 * 
 * Ejecutar: node scripts/eliminar-citas-otros-pacientes.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function eliminarCitasOtrosPacientes() {
  let connection;
  
  try {
    console.log('🔍 Buscando paciente Eduardo Gonzalez Gonzalez...\n');

    // Crear conexión
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db',
      multipleStatements: true
    });

    console.log('✅ Conectado a la base de datos\n');

    // 1. Buscar al paciente Eduardo Gonzalez Gonzalez
    const [pacientes] = await connection.query(`
      SELECT 
        id_paciente,
        nombre,
        apellido_paterno,
        apellido_materno,
        CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno) AS nombre_completo
      FROM pacientes
      WHERE nombre LIKE '%Eduardo%' 
        AND apellido_paterno LIKE '%Gonzalez%'
        AND apellido_materno LIKE '%Gonzalez%'
    `);

    if (pacientes.length === 0) {
      console.log('❌ No se encontró el paciente Eduardo Gonzalez Gonzalez');
      return;
    }

    const pacienteEduardo = pacientes[0];
    console.log(`✅ Paciente encontrado: ${pacienteEduardo.nombre_completo} (ID: ${pacienteEduardo.id_paciente})\n`);

    // 2. Contar citas totales antes de eliminar
    const [totalAntes] = await connection.query(`
      SELECT COUNT(*) as total FROM citas
    `);

    // 3. Contar citas de Eduardo antes de eliminar
    const [citasEduardoAntes] = await connection.query(`
      SELECT COUNT(*) as total FROM citas WHERE id_paciente = ?
    `, [pacienteEduardo.id_paciente]);

    // 4. Contar citas de otros pacientes
    const [citasOtrosAntes] = await connection.query(`
      SELECT COUNT(*) as total FROM citas WHERE id_paciente != ?
    `, [pacienteEduardo.id_paciente]);

    console.log('📊 Estadísticas antes de eliminar:');
    console.log(`   - Total de citas: ${totalAntes[0].total}`);
    console.log(`   - Citas de Eduardo Gonzalez: ${citasEduardoAntes[0].total}`);
    console.log(`   - Citas de otros pacientes: ${citasOtrosAntes[0].total}\n`);

    // 5. Ver pacientes que tienen citas
    const [pacientesConCitas] = await connection.query(`
      SELECT 
        p.id_paciente,
        CONCAT(p.nombre, ' ', p.apellido_paterno, ' ', p.apellido_materno) AS nombre_completo,
        COUNT(c.id_cita) as total_citas
      FROM pacientes p
      INNER JOIN citas c ON p.id_paciente = c.id_paciente
      GROUP BY p.id_paciente, p.nombre, p.apellido_paterno, p.apellido_materno
      ORDER BY total_citas DESC
    `);

    console.log('👥 Pacientes con citas:');
    pacientesConCitas.forEach((paciente, index) => {
      const esEduardo = paciente.id_paciente === pacienteEduardo.id_paciente;
      console.log(`   ${index + 1}. ${paciente.nombre_completo} (ID: ${paciente.id_paciente}) - ${paciente.total_citas} citas ${esEduardo ? '✅ (SE MANTIENEN)' : '❌ (SE ELIMINARÁN)'}`);
    });

    // 6. Confirmar antes de eliminar
    console.log(`\n⚠️  ADVERTENCIA: Se eliminarán ${citasOtrosAntes[0].total} citas de otros pacientes.\n`);

    // 7. Eliminar citas de otros pacientes
    console.log('🗑️  Eliminando citas de otros pacientes...\n');
    
    const [resultado] = await connection.query(`
      DELETE FROM citas
      WHERE id_paciente != ?
    `, [pacienteEduardo.id_paciente]);

    console.log(`✅ Citas eliminadas: ${resultado.affectedRows}\n`);

    // 8. Verificar las citas restantes
    const [totalDespues] = await connection.query(`
      SELECT COUNT(*) as total FROM citas
    `);

    const [citasEduardoDespues] = await connection.query(`
      SELECT COUNT(*) as total FROM citas WHERE id_paciente = ?
    `, [pacienteEduardo.id_paciente]);

    console.log('📊 Estadísticas después de eliminar:');
    console.log(`   - Total de citas: ${totalDespues[0].total}`);
    console.log(`   - Citas de Eduardo Gonzalez: ${citasEduardoDespues[0].total}\n`);

    // 9. Mostrar las citas restantes de Eduardo
    const [citasRestantes] = await connection.query(`
      SELECT 
        c.id_cita,
        c.fecha_cita,
        c.motivo,
        c.es_primera_consulta,
        c.estado
      FROM citas c
      WHERE c.id_paciente = ?
      ORDER BY c.fecha_cita ASC, c.id_cita ASC
    `, [pacienteEduardo.id_paciente]);

    if (citasRestantes.length > 0) {
      console.log('📋 Citas restantes de Eduardo Gonzalez Gonzalez:');
      citasRestantes.forEach((cita, index) => {
        console.log(`   ${index + 1}. Cita #${cita.id_cita} - ${cita.fecha_cita} - ${cita.motivo || 'Sin motivo'} - Primera: ${cita.es_primera_consulta ? 'Sí' : 'No'}`);
      });
    }

    console.log('\n✅ Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error ejecutando script:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

eliminarCitasOtrosPacientes();

