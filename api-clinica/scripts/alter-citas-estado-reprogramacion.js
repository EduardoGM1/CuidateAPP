/**
 * Script para aplicar migración de estados de citas y reprogramación
 * Ejecutar: node scripts/alter-citas-estado-reprogramacion.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function ejecutarMigracion() {
  let connection;
  
  try {
    console.log('🔧 Iniciando migración de estados de citas...');
    
    // Crear conexión
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db',
      multipleStatements: true
    });

    console.log('✅ Conexión a la base de datos establecida');

    // Leer archivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', 'alter-citas-estado-reprogramacion.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Ejecutando migración SQL...');
    
    // Ejecutar migración
    await connection.query(sql);
    
    console.log('✅ Migración completada exitosamente');
    console.log('\n📋 Cambios aplicados:');
    console.log('   - Campo estado agregado a tabla citas');
    console.log('   - Campos de reprogramación agregados a tabla citas');
    console.log('   - Tabla solicitudes_reprogramacion creada');
    console.log('   - Datos existentes migrados');
    console.log('   - Índices creados para optimización');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

ejecutarMigracion();

