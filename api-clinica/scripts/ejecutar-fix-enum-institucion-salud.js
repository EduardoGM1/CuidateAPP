import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ejecutarMigracion() {
  try {
    console.log('\n🔧 Ejecutando migración para corregir ENUM de institucion_salud...\n');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../migrations/fix-enum-institucion-salud-completo.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir en statements (separados por ;)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📋 Ejecutando ${statements.length} statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Saltar SELECT statements (solo informativos)
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        console.log(`ℹ️  [${i + 1}/${statements.length}] Ejecutando consulta informativa...`);
        try {
          const [results] = await sequelize.query(statement);
          if (Array.isArray(results) && results.length > 0) {
            console.log('   Resultado:', results[0]);
          }
        } catch (error) {
          console.log(`   ⚠️  Consulta informativa falló (puede ignorarse): ${error.message}`);
        }
        continue;
      }
      
      console.log(`🔧 [${i + 1}/${statements.length}] Ejecutando: ${statement.substring(0, 60)}...`);
      
      try {
        await sequelize.query(statement);
        console.log(`   ✅ Statement ejecutado exitosamente\n`);
      } catch (error) {
        // Si el error es que la columna ya tiene el ENUM correcto, está bien
        if (error.message.includes('Duplicate column name') || 
            error.message.includes('already exists')) {
          console.log(`   ⚠️  Columna ya existe (puede ignorarse)\n`);
        } else {
          throw error;
        }
      }
    }
    
    // Verificación final
    console.log('🔍 Verificando ENUM final...\n');
    const [results] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pacientes'
        AND COLUMN_NAME = 'institucion_salud';
    `);
    
    if (results.length > 0) {
      const enumType = results[0].COLUMN_TYPE;
      console.log('✅ ENUM actualizado:');
      console.log(`   ${enumType}\n`);
      
      // Verificar que incluye "Bienestar"
      if (enumType.includes("'Bienestar'")) {
        console.log('✅ "Bienestar" está incluido en el ENUM\n');
      } else {
        console.log('❌ "Bienestar" NO está incluido en el ENUM\n');
        console.log('⚠️  Puede ser necesario ejecutar manualmente:\n');
        console.log('   ALTER TABLE pacientes MODIFY COLUMN institucion_salud ENUM(\'IMSS\', \'Bienestar\', \'ISSSTE\', \'Particular\', \'Otro\') NULL;\n');
      }
    }
    
    await sequelize.close();
    console.log('✅ Migración completada\n');
    
  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error.message);
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
}

ejecutarMigracion();

