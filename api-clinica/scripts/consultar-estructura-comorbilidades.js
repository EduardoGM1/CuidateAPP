/**
 * Script para mostrar la estructura completa de las comorbilidades en la BD
 */

import sequelize from '../config/db.js';

async function consultarEstructura() {
  try {
    console.log('\n📊 ESTRUCTURA DE COMORBILIDADES EN LA BASE DE DATOS\n');
    console.log('='.repeat(60));
    
    // 1. Estructura de la tabla comorbilidades
    console.log('\n1️⃣ TABLA: comorbilidades');
    console.log('-'.repeat(60));
    const [estructuraComorbilidades] = await sequelize.query(`
      SELECT 
        COLUMN_NAME as Campo,
        DATA_TYPE as Tipo,
        CHARACTER_MAXIMUM_LENGTH as Longitud,
        IS_NULLABLE as PermiteNull,
        COLUMN_DEFAULT as ValorDefault
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'comorbilidades'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(estructuraComorbilidades);
    
    // 2. Estructura de la tabla paciente_comorbilidad
    console.log('\n2️⃣ TABLA: paciente_comorbilidad (Tabla Intermedia)');
    console.log('-'.repeat(60));
    const [estructuraRelacion] = await sequelize.query(`
      SELECT 
        COLUMN_NAME as Campo,
        DATA_TYPE as Tipo,
        CHARACTER_MAXIMUM_LENGTH as Longitud,
        IS_NULLABLE as PermiteNull,
        COLUMN_DEFAULT as ValorDefault
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'paciente_comorbilidad'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(estructuraRelacion);
    
    // 3. Ejemplo de datos de comorbilidades
    console.log('\n3️⃣ EJEMPLO DE COMORBILIDADES REGISTRADAS');
    console.log('-'.repeat(60));
    const [comorbilidades] = await sequelize.query(`
      SELECT 
        id_comorbilidad,
        nombre_comorbilidad,
        LEFT(descripcion, 50) as descripcion_corta
      FROM comorbilidades
      ORDER BY id_comorbilidad
      LIMIT 10
    `);
    
    console.table(comorbilidades);
    
    // 4. Ejemplo de relaciones paciente-comorbilidad
    console.log('\n4️⃣ EJEMPLO DE RELACIONES PACIENTE-COMORBILIDAD');
    console.log('-'.repeat(60));
    const [relaciones] = await sequelize.query(`
      SELECT 
        pc.id_paciente,
        p.nombre,
        p.apellido_paterno,
        pc.id_comorbilidad,
        c.nombre_comorbilidad,
        pc.fecha_deteccion,
        LEFT(pc.observaciones, 40) as observaciones_cortas
      FROM paciente_comorbilidad pc
      INNER JOIN pacientes p ON pc.id_paciente = p.id_paciente
      INNER JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
      ORDER BY pc.id_paciente, pc.id_comorbilidad
      LIMIT 10
    `);
    
    console.table(relaciones);
    
    // 5. Relaciones con otras tablas
    console.log('\n5️⃣ RELACIONES CON OTRAS TABLAS');
    console.log('-'.repeat(60));
    console.log('  • comorbilidades <--(N:M)--> pacientes (a través de paciente_comorbilidad)');
    console.log('  • paciente_comorbilidad contiene datos específicos de la relación:');
    console.log('    - fecha_deteccion: Cuándo se detectó la comorbilidad');
    console.log('    - observaciones: Notas adicionales sobre la detección/diagnóstico');
    
    // 6. Estadísticas
    console.log('\n6️⃣ ESTADÍSTICAS');
    console.log('-'.repeat(60));
    const [stats] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT c.id_comorbilidad) as total_comorbilidades,
        COUNT(DISTINCT pc.id_paciente) as pacientes_con_comorbilidades,
        COUNT(pc.id_paciente) as total_relaciones,
        AVG(comorb_count.comorb_count) as promedio_comorbilidades_por_paciente
      FROM comorbilidades c
      LEFT JOIN paciente_comorbilidad pc ON c.id_comorbilidad = pc.id_comorbilidad
      LEFT JOIN (
        SELECT id_paciente, COUNT(*) as comorb_count
        FROM paciente_comorbilidad
        GROUP BY id_paciente
      ) comorb_count ON pc.id_paciente = comorb_count.id_paciente
    `);
    
    console.table(stats);
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await sequelize.close();
  }
}

consultarEstructura();

