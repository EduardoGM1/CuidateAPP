import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';

async function verificarEnum() {
  try {
    console.log('\n🔍 Verificando ENUM de institucion_salud en la base de datos...\n');
    
    // Consultar el ENUM directamente desde MySQL
    const [results] = await sequelize.query(`
      SHOW COLUMNS FROM pacientes WHERE Field = 'institucion_salud';
    `);
    
    if (results.length > 0) {
      const columnInfo = results[0];
      console.log('📋 Información de la columna:');
      console.log(JSON.stringify(columnInfo, null, 2));
      
      // Extraer valores del ENUM
      const typeMatch = columnInfo.Type.match(/enum\((.*)\)/i);
      if (typeMatch) {
        const enumValues = typeMatch[1]
          .replace(/'/g, '')
          .split(',')
          .map(v => v.trim());
        
        console.log('\n✅ Valores del ENUM en la base de datos:');
        enumValues.forEach((val, idx) => {
          console.log(`   ${idx + 1}. "${val}"`);
        });
        
        console.log('\n📊 Comparación con modelo:');
        const valoresModelo = ['IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro'];
        console.log('   Modelo espera:', valoresModelo.join(', '));
        
        // Verificar coincidencias
        const faltantes = valoresModelo.filter(v => !enumValues.includes(v));
        const extras = enumValues.filter(v => !valoresModelo.includes(v));
        
        if (faltantes.length > 0) {
          console.log('\n❌ Valores faltantes en BD:', faltantes.join(', '));
        }
        if (extras.length > 0) {
          console.log('\n⚠️  Valores extra en BD:', extras.join(', '));
        }
        if (faltantes.length === 0 && extras.length === 0) {
          console.log('\n✅ ENUM coincide perfectamente con el modelo');
        }
        
        // Verificar específicamente "Bienestar"
        if (enumValues.includes('Bienestar')) {
          console.log('\n✅ "Bienestar" está en el ENUM de la BD');
        } else {
          console.log('\n❌ PROBLEMA: "Bienestar" NO está en el ENUM de la BD');
          console.log('   Esto explica el error "Data truncated"');
          console.log('\n🔧 SOLUCIÓN: Ejecutar migración para actualizar el ENUM');
        }
      }
    } else {
      console.log('❌ No se encontró la columna institucion_salud');
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

verificarEnum();

