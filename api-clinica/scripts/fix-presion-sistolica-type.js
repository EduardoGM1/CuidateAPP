import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixPresionSistolica() {
  let connection;
  
  try {
    console.log('🔧 Corrigiendo tipo de dato de presion_sistolica...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db'
    });
    
    console.log('✅ Conectado a la base de datos\n');
    
    const alterStatements = [
      'ALTER TABLE signos_vitales MODIFY COLUMN presion_sistolica TEXT NULL',
      'ALTER TABLE signos_vitales MODIFY COLUMN presion_diastolica TEXT NULL',
      'ALTER TABLE signos_vitales MODIFY COLUMN glucosa_mg_dl TEXT NULL',
      'ALTER TABLE signos_vitales MODIFY COLUMN colesterol_mg_dl TEXT NULL',
      'ALTER TABLE signos_vitales MODIFY COLUMN trigliceridos_mg_dl TEXT NULL'
    ];
    
    for (const statement of alterStatements) {
      try {
        await connection.execute(statement);
        console.log(`✅ ${statement}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('already exists')) {
          console.log(`⚠️  Ya existe: ${statement.substring(0, 60)}...`);
        } else {
          console.error(`❌ Error: ${error.message}`);
        }
      }
    }
    
    console.log('\n✅ Corrección completada\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixPresionSistolica();

