/**
 * Script para modificar la tabla diagnosticos y hacer id_cita nullable
 * Ejecuta: node scripts/alter-diagnosticos-id-cita.js
 */

import sequelize from '../config/db.js';
import { QueryTypes } from 'sequelize';

async function alterDiagnosticosTable() {
  try {
    console.log('🔧 Modificando tabla diagnosticos...');
    
    // Verificar estructura actual
    const currentStructure = await sequelize.query(
      "DESCRIBE diagnosticos",
      { type: QueryTypes.SELECT }
    );
    
    console.log('\n📋 Estructura actual de diagnosticos:');
    console.table(currentStructure);
    
    // Obtener información sobre id_cita
    const idCitaInfo = currentStructure.find(col => col.Field === 'id_cita');
    console.log('\n📊 Columna id_cita actual:');
    console.log('  - Nullable:', idCitaInfo?.Null === 'YES' ? '✅ Sí' : '❌ No');
    console.log('  - Tipo:', idCitaInfo?.Type);
    console.log('  - Default:', idCitaInfo?.Default || 'NULL');
    
    if (idCitaInfo?.Null === 'YES') {
      console.log('\n✅ La columna id_cita ya es nullable. No se requiere modificación.');
      return;
    }
    
    // Modificar la columna
    console.log('\n🔨 Modificando columna id_cita para permitir NULL...');
    await sequelize.query(
      "ALTER TABLE `diagnosticos` MODIFY COLUMN `id_cita` INT NULL DEFAULT NULL",
      { type: QueryTypes.RAW }
    );
    
    console.log('✅ Columna modificada exitosamente');
    
    // Verificar el cambio
    const newStructure = await sequelize.query(
      "DESCRIBE diagnosticos",
      { type: QueryTypes.SELECT }
    );
    
    const newIdCitaInfo = newStructure.find(col => col.Field === 'id_cita');
    console.log('\n📊 Nueva estructura de id_cita:');
    console.log('  - Nullable:', newIdCitaInfo?.Null === 'YES' ? '✅ Sí' : '❌ No');
    console.log('  - Tipo:', newIdCitaInfo?.Type);
    console.log('  - Default:', newIdCitaInfo?.Default || 'NULL');
    
    if (newIdCitaInfo?.Null === 'YES') {
      console.log('\n✅ Migración completada exitosamente');
    } else {
      console.log('\n❌ Error: La columna aún no es nullable');
    }
    
  } catch (error) {
    console.error('❌ Error al modificar la tabla:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

alterDiagnosticosTable();


