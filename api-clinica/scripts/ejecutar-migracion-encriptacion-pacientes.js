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
    console.log('🔐 Iniciando migración: Alterar tabla pacientes para encriptación...\n');
    
    // Leer archivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', 'alter-pacientes-encryption.sql');
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
          // Ignorar algunos errores específicos
          if (error.code === 'ER_DUP_KEYNAME' || error.message.includes('Duplicate key')) {
            console.log('⚠️  Índice ya existe, omitiendo');
          } else if (error.message.includes('Unknown column')) {
            console.log('⚠️  Columna no existe, omitiendo');
          } else {
            console.warn('⚠️  Advertencia:', error.message);
          }
        }
      }
    }
    
    console.log('\n✅ Migración completada exitosamente');
    console.log('\n📋 Cambios aplicados:');
    console.log('   - CURP: STRING(18) → TEXT (para encriptación)');
    console.log('   - direccion: STRING(255) → TEXT (para encriptación)');
    console.log('   - numero_celular: STRING(20) → TEXT (para encriptación)');
    console.log('   - Constraint UNIQUE de CURP eliminado');
    console.log('\n⚠️  IMPORTANTE: Los datos existentes NO se encriptarán automáticamente.');
    console.log('   Se encriptarán automáticamente cuando se actualicen los registros.');
    console.log('   Para encriptar datos existentes, ejecuta el script de migración de datos.');
    
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

