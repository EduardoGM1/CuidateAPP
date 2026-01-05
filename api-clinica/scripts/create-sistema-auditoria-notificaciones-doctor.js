/**
 * Script para crear tablas de auditoría y notificaciones
 * Ejecutar: node scripts/create-sistema-auditoria-notificaciones-doctor.js
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

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true
};

async function ejecutarMigracion() {
  let connection;
  
  try {
    console.log('🔌 Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión establecida');

    // Leer archivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', 'create-sistema-auditoria-notificaciones-doctor.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Ejecutando migración...');
    await connection.query(sql);
    console.log('✅ Migración ejecutada exitosamente');

    // Verificar que las tablas se crearon
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('sistema_auditoria', 'notificaciones_doctor')
    `, [dbConfig.database]);

    console.log('\n📊 Tablas creadas:');
    tables.forEach(table => {
      console.log(`   ✅ ${table.TABLE_NAME}`);
    });

    console.log('\n✅ Proceso completado exitosamente');
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

ejecutarMigracion();

