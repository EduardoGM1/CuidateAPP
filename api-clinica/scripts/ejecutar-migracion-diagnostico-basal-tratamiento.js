import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de conexión a la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clinica_db',
  multipleStatements: true // Permitir múltiples statements
};

async function ejecutarMigracion() {
  let connection;
  
  try {
    console.log('🔌 Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión establecida\n');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../migrations/add-diagnostico-basal-tratamiento-paciente-comorbilidad.sql');
    console.log(`📄 Leyendo archivo de migración: ${sqlPath}`);
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`El archivo de migración no existe: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ Archivo SQL leído correctamente\n');

    console.log('🚀 Ejecutando migración...');
    console.log('   - Agregando campos de diagnóstico basal (①)');
    console.log('   - Agregando campos de tratamiento (② y ③)\n');

    // Ejecutar el SQL
    const [results] = await connection.query(sql);
    
    console.log('✅ Migración ejecutada exitosamente\n');

    // Verificar que los campos fueron agregados
    console.log('🔍 Verificando campos agregados...');
    const [columns] = await connection.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'paciente_comorbilidad'
        AND COLUMN_NAME IN (
          'es_diagnostico_basal',
          'es_agregado_posterior',
          'año_diagnostico',
          'recibe_tratamiento_no_farmacologico',
          'recibe_tratamiento_farmacologico'
        )
      ORDER BY COLUMN_NAME
    `, [dbConfig.database]);

    if (columns.length === 0) {
      console.log('⚠️  No se encontraron los campos esperados. Verifica la migración.');
    } else {
      console.log(`✅ Se encontraron ${columns.length} campos:\n`);
      columns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
        if (col.COLUMN_COMMENT) {
          console.log(`     ${col.COLUMN_COMMENT}`);
        }
      });
    }

    console.log('\n✅ Migración completada exitosamente');

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

// Ejecutar la migración
ejecutarMigracion();

