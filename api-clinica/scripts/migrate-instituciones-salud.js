/**
 * Migración: tabla instituciones_salud + institucion_salud en pacientes a VARCHAR(100).
 * Usa la configuración de .env (DB_*). Ejecutar en el VPS: node scripts/migrate-instituciones-salud.js
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import sequelize from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const STEPS = [
  {
    name: 'Crear tabla instituciones_salud',
    sql: `CREATE TABLE IF NOT EXISTS instituciones_salud (
      id_institucion_salud INT NOT NULL AUTO_INCREMENT,
      nombre VARCHAR(100) NOT NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      orden INT DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id_institucion_salud),
      UNIQUE KEY uk_instituciones_salud_nombre (nombre)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  },
  {
    name: 'Insertar valores por defecto',
    sql: `INSERT IGNORE INTO instituciones_salud (nombre, activo, orden) VALUES
      ('IMSS', 1, 1),
      ('Bienestar', 1, 2),
      ('ISSSTE', 1, 3),
      ('Particular', 1, 4),
      ('Otro', 1, 5),
      ('SEMAR', 1, 6),
      ('INSABI', 1, 7),
      ('PEMEX', 1, 8),
      ('SEDENA', 1, 9),
      ('Secretaría de Salud', 1, 10),
      ('Ninguna', 1, 11)`
  },
  {
    name: 'Cambiar pacientes.institucion_salud a VARCHAR(100)',
    sql: 'ALTER TABLE pacientes MODIFY COLUMN institucion_salud VARCHAR(100) NULL DEFAULT NULL'
  }
];

async function main() {
  console.log('\n  Migración: Instituciones de salud\n');
  try {
    await sequelize.authenticate();
    console.log('  Conexión a BD OK.\n');

    for (const step of STEPS) {
      try {
        await sequelize.query(step.sql);
        console.log('  ✅', step.name);
      } catch (err) {
        if (err.original?.code === 'ER_DUP_FIELD' || err.message?.includes('Duplicate column')) {
          console.log('  ⏭️', step.name, '(ya aplicado)');
        } else {
          throw err;
        }
      }
    }

    const [rows] = await sequelize.query('SELECT COUNT(*) AS total FROM instituciones_salud');
    console.log('\n  Total instituciones_salud en BD:', rows[0].total, '\n');
  } catch (e) {
    console.error('\n  ❌ Error:', e.message);
    if (e.original) console.error('  ', e.original.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
