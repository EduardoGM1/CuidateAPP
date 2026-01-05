import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function verificarDeviceIds() {
  try {
    await sequelize.authenticate();
    
    const [creds] = await sequelize.query(
      `SELECT ac.id_credential, ac.user_id, ac.auth_method, ac.device_id, p.nombre, p.apellido_paterno
       FROM auth_credentials ac
       LEFT JOIN pacientes p ON p.id_paciente = ac.user_id
       WHERE ac.user_type = 'Paciente' 
         AND ac.auth_method = 'pin' 
         AND ac.activo = 1`
    );

    console.log('\n📱 DEVICE IDs CONFIGURADOS:');
    console.log('='.repeat(80));
    
    creds.forEach(c => {
      const nombre = c.nombre ? `${c.nombre} ${c.apellido_paterno || ''}`.trim() : `Paciente ID ${c.user_id}`;
      console.log(`\n👤 ${nombre}`);
      console.log(`   ID Paciente: ${c.user_id}`);
      console.log(`   Device ID: ${c.device_id}`);
      console.log(`   Credential ID: ${c.id_credential}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

verificarDeviceIds();



