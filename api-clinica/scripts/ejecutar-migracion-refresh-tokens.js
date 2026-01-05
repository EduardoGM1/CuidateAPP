import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ejecutarMigracion() {
  let connection;
  
  try {
    console.log('🔐 Iniciando migración: Crear tabla refresh_tokens...\n');
    
    // Leer archivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', 'create-refresh-tokens-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Crear conexión
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db',
      multipleStatements: true
    });
    
    console.log('✅ Conectado a la base de datos\n');
    
    // Ejecutar migración
    console.log('📝 Ejecutando migración...\n');
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
          console.log('✅ Comando ejecutado exitosamente');
        } catch (error) {
          // Ignorar error si la tabla ya existe
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('⚠️  Tabla refresh_tokens ya existe, omitiendo creación');
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('\n✅ Migración completada exitosamente');
    console.log('\n📋 Tabla refresh_tokens creada con los siguientes campos:');
    console.log('   - id (PK)');
    console.log('   - user_id');
    console.log('   - user_type');
    console.log('   - token_hash (SHA-256)');
    console.log('   - jti (JWT ID único)');
    console.log('   - expires_at');
    console.log('   - user_agent');
    console.log('   - ip_address');
    console.log('   - revoked');
    console.log('   - revoked_at');
    console.log('   - created_at');
    
  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error.message);
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

ejecutarMigracion();

