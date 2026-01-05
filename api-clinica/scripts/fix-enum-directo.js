import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';

async function fixEnum() {
  try {
    console.log('\n🔧 Corrigiendo ENUM de institucion_salud...\n');
    
    // Verificar valores actuales
    console.log('📋 Verificando ENUM actual...');
    const [before] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pacientes'
        AND COLUMN_NAME = 'institucion_salud';
    `);
    
    if (before.length > 0) {
      console.log('   ENUM actual:', before[0].COLUMN_TYPE);
    }
    
    // Actualizar ENUM
    console.log('\n🔧 Actualizando ENUM...');
    await sequelize.query(`
      ALTER TABLE pacientes 
      MODIFY COLUMN institucion_salud ENUM(
        'IMSS', 
        'Bienestar', 
        'ISSSTE', 
        'Particular', 
        'Otro',
        'SEMAR',
        'INSABI',
        'PEMEX',
        'SEDENA',
        'Secretaría de Salud',
        'Ninguna'
      ) NULL DEFAULT NULL;
    `);
    
    console.log('   ✅ ENUM actualizado\n');
    
    // Verificar valores finales
    console.log('📋 Verificando ENUM final...');
    const [after] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pacientes'
        AND COLUMN_NAME = 'institucion_salud';
    `);
    
    if (after.length > 0) {
      console.log('   ENUM final:', after[0].COLUMN_TYPE);
      
      // Verificar que incluye "Bienestar"
      if (after[0].COLUMN_TYPE.includes("'Bienestar'")) {
        console.log('\n✅ "Bienestar" está incluido en el ENUM');
      } else {
        console.log('\n❌ "Bienestar" NO está incluido');
      }
    }
    
    await sequelize.close();
    console.log('\n✅ Migración completada\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.original) {
      console.error('   Detalles:', error.original.message);
    }
    await sequelize.close();
    process.exit(1);
  }
}

fixEnum();

