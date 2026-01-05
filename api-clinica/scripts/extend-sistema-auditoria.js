/**
 * Script para ejecutar la migración de extensión de sistema_auditoria
 * Ejecutar: node scripts/extend-sistema-auditoria.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function ejecutarMigracion() {
  let connection;
  
  try {
    console.log('🔄 Iniciando migración de extensión de sistema_auditoria...\n');

    // Crear conexión
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db',
      multipleStatements: true
    });

    console.log('✅ Conectado a la base de datos\n');

    // Leer archivo SQL
    const sqlPath = join(__dirname, '../migrations/extend-sistema-auditoria.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Ejecutar migración
    console.log('📝 Ejecutando migración...\n');
    await connection.query(sql);

    console.log('✅ Migración ejecutada exitosamente\n');
    console.log('📊 Cambios aplicados:');
    console.log('   - Nuevos tipos de acción: login_exitoso, login_fallido, acceso_sospechoso, error_sistema, error_critico');
    console.log('   - Nuevas entidades: acceso, error');
    console.log('   - Nuevos campos: ip_address, user_agent, severidad, stack_trace');
    console.log('   - Nuevos índices para mejorar performance\n');

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

