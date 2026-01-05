import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Script para ejecutar la migración de encriptación de campos críticos
 * 
 * Este script:
 * 1. Cambia los tipos de datos a TEXT para permitir encriptación
 * 2. Los datos existentes se encriptarán automáticamente mediante hooks
 */
async function ejecutarMigracion() {
  let connection;
  
  try {
    console.log('🔐 Iniciando migración de encriptación de campos críticos...\n');
    
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db',
      multipleStatements: true
    });
    
    console.log('✅ Conectado a la base de datos\n');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../migrations/encriptar-campos-criticos.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Leyendo archivo de migración...\n');
    
    // Ejecutar la migración
    console.log('⚙️  Ejecutando cambios de tipos de datos...\n');
    
    // Dividir en statements individuales
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log(`✅ Ejecutado: ${statement.substring(0, 60)}...`);
        } catch (error) {
          // Ignorar errores de "Column already exists" o similares
          if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('already exists')) {
            console.log(`⚠️  Ya existe: ${statement.substring(0, 60)}...`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('\n✅ Migración completada exitosamente!');
    console.log('\n📝 Notas importantes:');
    console.log('   - Los tipos de datos han sido cambiados a TEXT');
    console.log('   - Los hooks de Sequelize encriptarán automáticamente nuevos datos');
    console.log('   - Los datos existentes se encriptarán al actualizarse');
    console.log('   - Para encriptar datos existentes, ejecuta el script de migración de datos');
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar migración
ejecutarMigracion();

