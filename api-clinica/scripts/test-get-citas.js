import sequelize from '../config/db.js';
import { Cita, Doctor, Paciente } from '../models/associations.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testGetCitas() {
  try {
    console.log('🔍 Probando obtención de citas...\n');
    await sequelize.authenticate();
    
    // Simular usuario doctor
    const { Usuario } = await import('../models/associations.js');
    const doctorUsuario = await Doctor.findOne({
      where: { id_usuario: 122 }, // ID del doctor de prueba
      include: [{ model: Usuario }]
    });
    
    if (!doctorUsuario) {
      console.log('❌ No se encontró doctor');
      process.exit(1);
    }
    
    console.log(`✅ Doctor encontrado: ${doctorUsuario.nombre} (ID: ${doctorUsuario.id_doctor})\n`);
    
    // Obtener citas como lo hace el controlador
    const whereCondition = { id_doctor: doctorUsuario.id_doctor };
    
    console.log('📋 Obteniendo citas con findAndCountAll...');
    const { count, rows: citas } = await Cita.findAndCountAll({
      where: whereCondition,
      include: [
        { 
          model: Paciente, 
          attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno'],
          required: false
        },
        { 
          model: Doctor, 
          attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno'],
          required: false
        }
      ],
      order: [['fecha_cita', 'DESC']],
      limit: 50,
      offset: 0,
      raw: false
    });
    
    console.log(`✅ Citas obtenidas: ${citas.length} de ${count} totales\n`);
    
    if (citas.length > 0) {
      const primeraCita = citas[0];
      console.log('📄 Primera cita (muestra):');
      console.log(`   ID: ${primeraCita.id_cita}`);
      console.log(`   Motivo tipo: ${typeof primeraCita.motivo}`);
      console.log(`   Motivo valor: ${primeraCita.motivo ? primeraCita.motivo.substring(0, 50) + '...' : 'null'}`);
      console.log(`   Observaciones tipo: ${typeof primeraCita.observaciones}`);
      console.log(`   Observaciones valor: ${primeraCita.observaciones ? primeraCita.observaciones.substring(0, 50) + '...' : 'null'}`);
      console.log(`   Tiene Paciente: ${!!primeraCita.Paciente}`);
      console.log(`   Tiene Doctor: ${!!primeraCita.Doctor}\n`);
      
      // Intentar formatear como lo hace el controlador
      console.log('🔄 Formateando citas...');
      try {
        const citasFormateadas = citas.map(cita => {
          const citaData = cita.toJSON ? cita.toJSON() : cita;
          return {
            id_cita: citaData.id_cita,
            id_paciente: citaData.id_paciente,
            id_doctor: citaData.id_doctor,
            fecha_cita: citaData.fecha_cita,
            motivo: citaData.motivo || null,
            observaciones: citaData.observaciones || null,
            paciente_nombre: citaData.Paciente ? 
              `${citaData.Paciente.nombre || ''} ${citaData.Paciente.apellido_paterno || ''}`.trim() : 
              'Sin paciente',
            doctor_nombre: citaData.Doctor ? 
              `${citaData.Doctor.nombre || ''} ${citaData.Doctor.apellido_paterno || ''}`.trim() : 
              'Sin doctor'
          };
        });
        
        console.log(`✅ Citas formateadas exitosamente: ${citasFormateadas.length}\n`);
        console.log('📄 Primera cita formateada:');
        console.log(JSON.stringify(citasFormateadas[0], null, 2));
      } catch (formatError) {
        console.error('❌ Error formateando citas:', formatError);
        console.error('Stack:', formatError.stack);
      }
    } else {
      console.log('⚠️  No hay citas para este doctor\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    if (error.original) {
      console.error('Original error:', error.original);
    }
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

testGetCitas();

