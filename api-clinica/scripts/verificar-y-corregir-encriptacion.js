import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verificarYCorregir() {
  let connection;
  
  try {
    console.log('🔍 Verificando estado de columnas de encriptación...\n');
    
    // Crear conexión
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db',
      multipleStatements: true
    });
    
    console.log('✅ Conectado a la base de datos\n');
    
    // Verificar estado actual
    const [columns] = await connection.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'pacientes'
        AND COLUMN_NAME IN ('curp', 'direccion', 'numero_celular')
    `, [process.env.DB_NAME || 'clinica_db']);
    
    console.log('📊 Estado actual de las columnas:');
    columns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.DATA_TYPE})`);
    });
    
    // Verificar qué necesita ser cambiado
    const cambiosNecesarios = [];
    
    for (const col of columns) {
      if (col.COLUMN_NAME === 'curp' && col.DATA_TYPE !== 'text' && col.DATA_TYPE !== 'longtext') {
        cambiosNecesarios.push({
          columna: 'curp',
          actual: col.COLUMN_TYPE,
          necesita: 'TEXT'
        });
      }
      if (col.COLUMN_NAME === 'direccion' && col.DATA_TYPE !== 'text' && col.DATA_TYPE !== 'longtext') {
        cambiosNecesarios.push({
          columna: 'direccion',
          actual: col.COLUMN_TYPE,
          necesita: 'TEXT'
        });
      }
      if (col.COLUMN_NAME === 'numero_celular' && col.DATA_TYPE !== 'text' && col.DATA_TYPE !== 'longtext') {
        cambiosNecesarios.push({
          columna: 'numero_celular',
          actual: col.COLUMN_TYPE,
          necesita: 'TEXT'
        });
      }
    }
    
    if (cambiosNecesarios.length === 0) {
      console.log('\n✅ Todas las columnas ya están configuradas como TEXT');
      return;
    }
    
    console.log('\n⚠️  Cambios necesarios:');
    cambiosNecesarios.forEach(cambio => {
      console.log(`   ${cambio.columna}: ${cambio.actual} → ${cambio.necesita}`);
    });
    
    // Aplicar cambios
    console.log('\n📝 Aplicando cambios...\n');
    
    for (const cambio of cambiosNecesarios) {
      try {
        let sql = '';
        
        if (cambio.columna === 'curp') {
          sql = `ALTER TABLE pacientes MODIFY COLUMN curp TEXT NULL COMMENT 'CURP encriptado con AES-256-GCM'`;
        } else if (cambio.columna === 'direccion') {
          sql = `ALTER TABLE pacientes MODIFY COLUMN direccion TEXT NULL COMMENT 'Dirección encriptada con AES-256-GCM'`;
        } else if (cambio.columna === 'numero_celular') {
          sql = `ALTER TABLE pacientes MODIFY COLUMN numero_celular TEXT NULL COMMENT 'Número de celular encriptado con AES-256-GCM'`;
        }
        
        await connection.query(sql);
        console.log(`✅ ${cambio.columna} cambiado a TEXT`);
      } catch (error) {
        console.error(`❌ Error cambiando ${cambio.columna}:`, error.message);
      }
    }
    
    // Eliminar índice único de CURP PRIMERO (antes de cambiar el tipo)
    try {
      console.log('\n📝 Verificando índices en CURP...');
      const [indexes] = await connection.query(`
        SHOW INDEXES FROM pacientes WHERE Column_name = 'curp'
      `);
      
      if (indexes.length > 0) {
        console.log(`   Encontrados ${indexes.length} índice(s) en CURP`);
        for (const idx of indexes) {
          try {
            console.log(`   Eliminando índice: ${idx.Key_name}`);
            await connection.query(`ALTER TABLE pacientes DROP INDEX ${idx.Key_name}`);
            console.log(`   ✅ Índice ${idx.Key_name} eliminado`);
          } catch (idxError) {
            if (idxError.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
              console.log(`   ⚠️  Índice ${idx.Key_name} no existe o ya fue eliminado`);
            } else {
              console.warn(`   ⚠️  Error eliminando índice ${idx.Key_name}:`, idxError.message);
            }
          }
        }
      } else {
        console.log('   No se encontraron índices en CURP');
      }
    } catch (error) {
      console.warn('⚠️  Advertencia al verificar índices:', error.message);
    }
    
    // Verificar estado final
    console.log('\n📊 Estado final de las columnas:');
    const [finalColumns] = await connection.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'pacientes'
        AND COLUMN_NAME IN ('curp', 'direccion', 'numero_celular')
    `, [process.env.DB_NAME || 'clinica_db']);
    
    finalColumns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
    });
    
    console.log('\n✅ Verificación y corrección completada');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

verificarYCorregir();

