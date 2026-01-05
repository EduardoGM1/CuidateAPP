// Script para verificar usuarios en la base de datos
import sequelize from './config/db.js';
import { Usuario, Paciente } from './models/index.js';

async function verificarUsuarios() {
  try {
    console.log('🔍 Verificando usuarios en la base de datos...\n');
    
    // Verificar usuarios del sistema
    const usuarios = await Usuario.findAll({
      attributes: ['id_usuario', 'email', 'rol', 'activo'],
      order: [['id_usuario', 'ASC']]
    });
    
    console.log('👥 USUARIOS DEL SISTEMA:');
    console.log('========================');
    usuarios.forEach(usuario => {
      console.log(`ID: ${usuario.id_usuario}`);
      console.log(`Email: ${usuario.email}`);
      console.log(`Rol: ${usuario.rol}`);
      console.log(`Activo: ${usuario.activo ? '✅' : '❌'}`);
      console.log('---');
    });
    
    // Verificar pacientes
    const pacientes = await Paciente.findAll({
      attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno', 'activo'],
      order: [['id_paciente', 'ASC']],
      limit: 10
    });
    
    console.log('\n🏥 PACIENTES DISPONIBLES:');
    console.log('=========================');
    pacientes.forEach(paciente => {
      console.log(`ID: ${paciente.id_paciente}`);
      console.log(`Nombre: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`);
      console.log(`Activo: ${paciente.activo ? '✅' : '❌'}`);
      console.log('---');
    });
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error verificando usuarios:', error.message);
  } finally {
    await sequelize.close();
  }
}

verificarUsuarios();
