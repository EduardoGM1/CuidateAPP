import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixRedApoyo() {
  let connection;
  try {
    console.log('🔧 Corrigiendo campos de red_apoyo...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db'
    });
    
    await connection.execute(`
      ALTER TABLE red_apoyo 
      MODIFY COLUMN numero_celular TEXT NULL 
      COMMENT 'Número de celular encriptado con AES-256-GCM (LFPDPPP, HIPAA §164.514)'
    `);
    
    await connection.execute(`
      ALTER TABLE red_apoyo 
      MODIFY COLUMN email TEXT NULL 
      COMMENT 'Email encriptado con AES-256-GCM (LFPDPPP)'
    `);
    
    await connection.execute(`
      ALTER TABLE red_apoyo 
      MODIFY COLUMN direccion TEXT NULL 
      COMMENT 'Dirección encriptada con AES-256-GCM (LFPDPPP, HIPAA §164.514)'
    `);
    
    console.log('✅ Campos de red_apoyo actualizados correctamente\n');
    await connection.end();
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
      console.log('⚠️  Campos de red_apoyo ya están actualizados\n');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

fixRedApoyo();

