import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function crearBackup() {
  let connection = null;
  try {
    logger.info('🚀 ========================================');
    logger.info('🚀 CREANDO BACKUP ANTES DE IMPLEMENTACIÓN GRANDE');
    logger.info('🚀 29-12-2025 - DATOS FALTANTES');
    logger.info('🚀 ========================================\n');

    // Conectar a la base de datos
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // Obtener nombre de la base de datos
    const DB_NAME = process.env.DB_NAME || 'medical_db';
    
    // Crear nombre del backup
    const fecha = new Date();
    const fechaStr = fecha.toISOString().replace(/[:.]/g, '-').split('T')[0];
    const horaStr = fecha.toTimeString().split(' ')[0].replace(/:/g, '-');
    const nombreBackup = `ANTES-DE-IMPLEMENTACION-GRANDE-29-12-2025-DASTOS-FALTANTES-${fechaStr}_${horaStr}.sql`;

    // Crear directorio de backups si no existe
    const backupsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
      logger.info(`📁 Directorio de backups creado: ${backupsDir}\n`);
    }

    const backupPath = path.join(backupsDir, nombreBackup);

    logger.info('📊 Configuración de backup:');
    logger.info(`   - Base de datos: ${DB_NAME}`);
    logger.info(`   - Archivo: ${nombreBackup}\n`);

    // Obtener lista de tablas
    logger.info('📋 Obteniendo lista de tablas...');
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    logger.info(`   - Encontradas ${tables.length} tablas\n`);

    // Iniciar archivo de backup
    let backupContent = `-- ============================================================\n`;
    backupContent += `-- BACKUP: ANTES DE IMPLEMENTACIÓN GRANDE - 29-12-2025\n`;
    backupContent += `-- DATOS FALTANTES FORMA 2022 OFICIAL\n`;
    backupContent += `-- Fecha: ${fecha.toISOString()}\n`;
    backupContent += `-- Base de datos: ${DB_NAME}\n`;
    backupContent += `-- ============================================================\n\n`;
    backupContent += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    // Para cada tabla, obtener estructura y datos
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      logger.info(`📦 Procesando tabla: ${tableName}...`);

      // Obtener estructura de la tabla (CREATE TABLE)
      const [createTable] = await sequelize.query(`
        SHOW CREATE TABLE \`${tableName}\`
      `);

      if (createTable.length > 0) {
        backupContent += `-- ============================================================\n`;
        backupContent += `-- Tabla: ${tableName}\n`;
        backupContent += `-- ============================================================\n\n`;
        backupContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n\n`;
        backupContent += `${createTable[0]['Create Table']};\n\n`;

        // Obtener datos de la tabla
        const [rows] = await sequelize.query(`SELECT * FROM \`${tableName}\``);
        
        if (rows.length > 0) {
          // Obtener nombres de columnas
          const [columns] = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '${tableName}'
            ORDER BY ORDINAL_POSITION
          `);

          const columnNames = columns.map(col => `\`${col.COLUMN_NAME}\``).join(', ');

          backupContent += `-- Datos de la tabla ${tableName}\n`;
          backupContent += `INSERT INTO \`${tableName}\` (${columnNames}) VALUES\n`;

          const values = rows.map((row, index) => {
            const rowValues = columns.map(col => {
              const value = row[col.COLUMN_NAME];
              if (value === null || value === undefined) {
                return 'NULL';
              } else if (typeof value === 'string') {
                // Escapar comillas simples y caracteres especiales
                const escaped = value.replace(/'/g, "''").replace(/\\/g, '\\\\');
                return `'${escaped}'`;
              } else if (value instanceof Date) {
                return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
              } else {
                return value;
              }
            }).join(', ');
            return `(${rowValues})${index < rows.length - 1 ? ',' : ';'}`;
          }).join('\n');

          backupContent += values + '\n\n';
        } else {
          backupContent += `-- Tabla ${tableName} está vacía\n\n`;
        }
      }
    }

    backupContent += `SET FOREIGN_KEY_CHECKS = 1;\n\n`;
    backupContent += `-- ============================================================\n`;
    backupContent += `-- FIN DEL BACKUP\n`;
    backupContent += `-- ============================================================\n`;

    // Escribir archivo
    fs.writeFileSync(backupPath, backupContent, 'utf8');

    // Verificar que el archivo se creó
    const stats = fs.statSync(backupPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    logger.info('\n✅ Backup creado exitosamente');
    logger.info(`   - Archivo: ${nombreBackup}`);
    logger.info(`   - Tamaño: ${fileSizeMB} MB`);
    logger.info(`   - Tablas procesadas: ${tables.length}`);
    logger.info(`   - Ruta completa: ${backupPath}\n`);

    if (stats.size === 0) {
      logger.error('❌ ERROR: El archivo de backup está vacío');
      process.exit(1);
    }

    logger.info('✅ Backup completado correctamente\n');
    process.exit(0);

  } catch (error) {
    logger.error('❌ Error creando backup:', error);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

crearBackup();
