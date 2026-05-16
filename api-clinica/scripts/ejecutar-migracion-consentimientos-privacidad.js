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
    console.log('🔐 Migración: consentimientos_privacidad\n');

    const sqlPath = path.join(__dirname, '..', 'migrations', 'create-consentimientos-privacidad-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db',
      multipleStatements: true,
    });

    const statements = sql.split(';').filter((s) => s.trim().length > 0);

    for (const statement of statements) {
      if (!statement.trim()) continue;
      try {
        await connection.query(statement);
        console.log('✅ Comando ejecutado');
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('⚠️  Tabla ya existe, omitiendo');
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Migración consentimientos_privacidad completada');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

ejecutarMigracion();
