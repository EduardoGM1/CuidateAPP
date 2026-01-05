/**
 * Script para verificar la estructura de la tabla citas
 * y probar una inserción directa
 * 
 * Ejecutar: node scripts/verificar-tabla-citas.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verificarTablaCitas() {
  let connection;
  
  try {
    console.log('🔍 Verificando estructura de la tabla citas...\n');

    // Crear conexión
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db',
      multipleStatements: true
    });

    console.log('✅ Conectado a la base de datos\n');

    // 1. Verificar estructura de la tabla
    const [columns] = await connection.query(`
      DESCRIBE citas
    `);

    console.log('📋 Estructura de la tabla citas:');
    columns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.Default !== null ? `DEFAULT: ${col.Default}` : ''}`);
    });

    // 2. Verificar si existen los registros necesarios
    const [pacientes] = await connection.query(`
      SELECT id_paciente, nombre, apellido_paterno 
      FROM pacientes 
      WHERE id_paciente = 7
      LIMIT 1
    `);

    const [doctores] = await connection.query(`
      SELECT id_doctor, nombre, apellido_paterno 
      FROM doctores 
      WHERE id_doctor = 1
      LIMIT 1
    `);

    console.log('\n👤 Verificando registros relacionados:');
    if (pacientes.length > 0) {
      console.log(`   ✅ Paciente ID 7 existe: ${pacientes[0].nombre} ${pacientes[0].apellido_paterno}`);
    } else {
      console.log('   ❌ Paciente ID 7 NO existe');
    }

    if (doctores.length > 0) {
      console.log(`   ✅ Doctor ID 1 existe: ${doctores[0].nombre} ${doctores[0].apellido_paterno}`);
    } else {
      console.log('   ❌ Doctor ID 1 NO existe');
    }

    // 3. Intentar insertar una cita de prueba
    if (pacientes.length > 0 && doctores.length > 0) {
      console.log('\n🧪 Intentando insertar cita de prueba...');
      
      const fechaCita = new Date();
      fechaCita.setDate(fechaCita.getDate() + 10);
      fechaCita.setHours(17, 0, 0, 0);

      try {
        const [result] = await connection.query(`
          INSERT INTO citas (
            id_paciente,
            id_doctor,
            fecha_cita,
            motivo,
            observaciones,
            es_primera_consulta,
            estado,
            fecha_creacion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          7, // id_paciente
          1, // id_doctor
          fechaCita,
          'Prueba de inserción',
          'Observaciones de prueba',
          false,
          'pendiente',
          new Date()
        ]);

        console.log(`   ✅ Cita insertada exitosamente (ID: ${result.insertId})`);

        // Eliminar la cita de prueba
        await connection.query(`
          DELETE FROM citas WHERE id_cita = ?
        `, [result.insertId]);
        console.log('   🗑️  Cita de prueba eliminada');

      } catch (insertError) {
        console.error('   ❌ Error insertando cita:', insertError.message);
        console.error('   Código:', insertError.code);
        console.error('   SQL State:', insertError.sqlState);
        if (insertError.sql) {
          console.error('   SQL:', insertError.sql);
        }
      }
    } else {
      console.log('\n⚠️  No se puede probar inserción: faltan registros relacionados');
    }

    // 4. Verificar restricciones de clave foránea
    console.log('\n🔗 Verificando restricciones de clave foránea...');
    const [foreignKeys] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'citas'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    if (foreignKeys.length > 0) {
      foreignKeys.forEach(fk => {
        console.log(`   - ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.log('   ⚠️  No se encontraron restricciones de clave foránea');
    }

    console.log('\n✅ Verificación completada');

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

verificarTablaCitas();

