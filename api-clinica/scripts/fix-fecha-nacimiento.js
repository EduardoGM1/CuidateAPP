import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixFechaNacimiento() {
  let connection;
  try {
    console.log('🔧 Corrigiendo fecha_nacimiento...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db'
    });
    
    await connection.execute(`
      ALTER TABLE pacientes 
      MODIFY COLUMN fecha_nacimiento TEXT NOT NULL 
      COMMENT 'Fecha de nacimiento encriptada con AES-256-GCM (LFPDPPP, HIPAA §164.514)'
    `);
    
    console.log('✅ fecha_nacimiento actualizado correctamente\n');
    await connection.end();
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
      console.log('⚠️  fecha_nacimiento ya está actualizado\n');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

fixFechaNacimiento();

