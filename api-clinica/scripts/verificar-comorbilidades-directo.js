/**
 * @file verificar-comorbilidades-directo.js
 * @description Script para verificar directamente las comorbilidades asignadas
 */

import sequelize from '../config/db.js';
import { Paciente, Comorbilidad } from '../models/associations.js';

async function verificarComorbilidades() {
  try {
    console.log('\n🔍 VERIFICACIÓN DIRECTA DE COMORBILIDADES...\n');
    
    // Consulta directa usando SQL
    const [relaciones] = await sequelize.query(`
      SELECT 
        pc.id_paciente,
        pc.id_comorbilidad,
        pc.fecha_deteccion,
        pc.observaciones,
        p.nombre,
        p.apellido_paterno,
        p.apellido_materno,
        c.nombre_comorbilidad
      FROM paciente_comorbilidad pc
      INNER JOIN pacientes p ON pc.id_paciente = p.id_paciente
      INNER JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
      ORDER BY pc.id_paciente, pc.id_comorbilidad
    `);

    console.log(`\n📊 Total de relaciones encontradas: ${relaciones.length}\n`);
    
    if (relaciones.length === 0) {
      console.log('❌ No se encontraron relaciones paciente-comorbilidad.');
    } else {
      relaciones.forEach(rel => {
        console.log('─'.repeat(80));
        console.log(`👤 Paciente: ${rel.nombre} ${rel.apellido_paterno} ${rel.apellido_materno || ''} (ID: ${rel.id_paciente})`);
        console.log(`🏥 Comorbilidad: ${rel.nombre_comorbilidad} (ID: ${rel.id_comorbilidad})`);
        console.log(`📅 Fecha Detección: ${rel.fecha_deteccion}`);
        console.log(`📝 Observaciones: ${rel.observaciones || 'N/A'}`);
      });
    }

    // Ahora consultar con Sequelize usando el modelo Paciente
    console.log('\n\n🔍 CONSULTA CON PACIENTE.INCLUDE(COMORBILIDAD)...\n');
    
    const pacientes = await Paciente.findAll({
      where: { activo: true },
      include: [
        {
          model: Comorbilidad,
          through: {
            attributes: ['fecha_deteccion', 'observaciones']
          },
          attributes: ['id_comorbilidad', 'nombre_comorbilidad', 'descripcion'],
          required: false
        }
      ],
      order: [['id_paciente', 'ASC']]
    });

    pacientes.forEach(p => {
      const pData = p.toJSON();
      const nombre = `${pData.nombre} ${pData.apellido_paterno} ${pData.apellido_materno || ''}`.trim();
      console.log(`\n👤 ${nombre} (ID: ${pData.id_paciente})`);
      
      if (pData.Comorbilidades && pData.Comorbilidades.length > 0) {
        console.log(`   📋 Comorbilidades (${pData.Comorbilidades.length}):`);
        pData.Comorbilidades.forEach((c, idx) => {
          console.log(`   ${idx + 1}. ${c.nombre_comorbilidad}`);
          if (c.PacienteComorbilidad) {
            console.log(`      📅 Fecha: ${c.PacienteComorbilidad.fecha_deteccion}`);
            console.log(`      📝 Observaciones: ${c.PacienteComorbilidad.observaciones || 'N/A'}`);
          }
        });
      } else {
        console.log('   ❌ Sin comorbilidades');
      }
    });

    console.log('\n✅ Verificación completada.\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await sequelize.close();
  }
}

verificarComorbilidades();
