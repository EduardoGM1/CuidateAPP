import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function verificarPacientes() {
  try {
    await sequelize.authenticate();
    
    const [pacientes] = await sequelize.query(
      `SELECT id_paciente, nombre, apellido_paterno, apellido_materno, curp, numero_celular, activo 
       FROM pacientes 
       ORDER BY id_paciente`
    );

    console.log('\n📊 PACIENTES EN LA BASE DE DATOS:');
    console.log('='.repeat(80));
    
    if (pacientes.length === 0) {
      console.log('   ℹ️  No hay pacientes en la base de datos');
    } else {
      pacientes.forEach(p => {
        const nombre = `${p.nombre} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.trim();
        console.log(`\n   ID: ${p.id_paciente}`);
        console.log(`   Nombre: ${nombre}`);
        console.log(`   CURP: ${p.curp}`);
        console.log(`   Teléfono: ${p.numero_celular}`);
        console.log(`   Activo: ${p.activo ? 'Sí' : 'No'}`);
      });
    }
    
    console.log(`\n📈 Total: ${pacientes.length} paciente(s)`);
    console.log(`   Activos: ${pacientes.filter(p => p.activo).length}`);
    console.log(`   Inactivos: ${pacientes.filter(p => !p.activo).length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

verificarPacientes();



