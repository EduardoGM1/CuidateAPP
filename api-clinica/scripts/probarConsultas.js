// Script simple para probar las consultas del dashboard
import sequelize from '../config/db.js';
import { Paciente, Doctor, Cita } from '../models/index.js';

async function probarConsultas() {
  console.log('🔍 PROBANDO CONSULTAS DEL DASHBOARD');
  console.log('===================================\n');
  
  try {
    // Probar conexión a la base de datos
    console.log('1️⃣ Probando conexión a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos exitosa');
    
    // Probar consulta de pacientes
    console.log('\n2️⃣ Probando consulta de pacientes...');
    try {
      const totalPacientes = await Paciente.count({
        where: { activo: true }
      });
      console.log(`✅ Total de pacientes: ${totalPacientes}`);
    } catch (error) {
      console.log(`❌ Error en consulta de pacientes: ${error.message}`);
    }
    
    // Probar consulta de doctores
    console.log('\n3️⃣ Probando consulta de doctores...');
    try {
      const totalDoctores = await Doctor.count({
        where: { activo: true }
      });
      console.log(`✅ Total de doctores: ${totalDoctores}`);
    } catch (error) {
      console.log(`❌ Error en consulta de doctores: ${error.message}`);
    }
    
    // Probar consulta de citas
    console.log('\n4️⃣ Probando consulta de citas...');
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const mañana = new Date(hoy);
      mañana.setDate(mañana.getDate() + 1);

      const citas = await Cita.findAll({
        where: {
          fecha_cita: {
            [sequelize.Sequelize.Op.gte]: hoy,
            [sequelize.Sequelize.Op.lt]: mañana
          }
        }
      });
      console.log(`✅ Citas de hoy: ${citas.length}`);
    } catch (error) {
      console.log(`❌ Error en consulta de citas: ${error.message}`);
    }
    
    // Probar consulta SQL directa
    console.log('\n5️⃣ Probando consulta SQL directa...');
    try {
      const sieteDiasAtras = new Date();
      sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);
      sieteDiasAtras.setHours(0, 0, 0, 0);

      const citas = await sequelize.query(`
        SELECT 
          DATE(fecha_cita) as fecha,
          CASE DAYNAME(fecha_cita)
            WHEN 'Monday' THEN 'Lun'
            WHEN 'Tuesday' THEN 'Mar'
            WHEN 'Wednesday' THEN 'Mié'
            WHEN 'Thursday' THEN 'Jue'
            WHEN 'Friday' THEN 'Vie'
            WHEN 'Saturday' THEN 'Sáb'
            WHEN 'Sunday' THEN 'Dom'
          END as dia,
          COUNT(*) as citas
        FROM citas 
        WHERE fecha_cita >= :fechaInicio
        GROUP BY DATE(fecha_cita), DAYNAME(fecha_cita)
        ORDER BY fecha_cita ASC
      `, {
        replacements: { fechaInicio: sieteDiasAtras },
        type: sequelize.QueryTypes.SELECT
      });
      console.log(`✅ Consulta SQL exitosa: ${citas.length} registros`);
    } catch (error) {
      console.log(`❌ Error en consulta SQL: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Error general: ${error.message}`);
    console.log('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
  }
}

probarConsultas().catch(console.error);
