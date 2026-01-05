import sequelize from '../config/db.js';

const verifyData = async () => {
  try {
    console.log('🔄 Verificando datos en la base de datos...');
    await sequelize.authenticate();

    // Verificar usuarios
    const [usuarios] = await sequelize.query('SELECT COUNT(*) as count FROM usuarios');
    console.log(`👥 Usuarios: ${usuarios[0].count}`);

    // Verificar doctores
    const [doctores] = await sequelize.query('SELECT COUNT(*) as count FROM doctores');
    console.log(`👨⚕️ Doctores: ${doctores[0].count}`);

    // Verificar pacientes
    const [pacientes] = await sequelize.query('SELECT COUNT(*) as count FROM pacientes');
    console.log(`🏥 Pacientes: ${pacientes[0].count}`);

    // Verificar medicamentos
    const [medicamentos] = await sequelize.query('SELECT COUNT(*) as count FROM medicamentos');
    console.log(`💊 Medicamentos: ${medicamentos[0].count}`);

    // Verificar comorbilidades
    const [comorbilidades] = await sequelize.query('SELECT COUNT(*) as count FROM comorbilidades');
    console.log(`🩺 Comorbilidades: ${comorbilidades[0].count}`);

    // Verificar citas
    const [citas] = await sequelize.query('SELECT COUNT(*) as count FROM citas');
    console.log(`📅 Citas: ${citas[0].count}`);

    // Verificar signos vitales
    const [signos] = await sequelize.query('SELECT COUNT(*) as count FROM signos_vitales');
    console.log(`📊 Signos Vitales: ${signos[0].count}`);

    // Verificar diagnósticos
    const [diagnosticos] = await sequelize.query('SELECT COUNT(*) as count FROM diagnosticos');
    console.log(`🔍 Diagnósticos: ${diagnosticos[0].count}`);

    // Mostrar datos de ejemplo
    console.log('\n📋 Datos de ejemplo:');
    const [doctorData] = await sequelize.query(`
      SELECT d.nombre, d.apellido_paterno, d.grado_estudio, u.email 
      FROM doctores d 
      JOIN usuarios u ON d.id_usuario = u.id_usuario 
      LIMIT 1
    `);
    if (doctorData[0]) {
      console.log(`   Doctor: ${doctorData[0].nombre} ${doctorData[0].apellido_paterno}`);
      console.log(`   Email: ${doctorData[0].email}`);
      console.log(`   Especialidad: ${doctorData[0].grado_estudio}`);
    }

    const [pacienteData] = await sequelize.query(`
      SELECT nombre, apellido_paterno, sexo, institucion_salud 
      FROM pacientes 
      LIMIT 1
    `);
    if (pacienteData[0]) {
      console.log(`   Paciente: ${pacienteData[0].nombre} ${pacienteData[0].apellido_paterno}`);
      console.log(`   Sexo: ${pacienteData[0].sexo}`);
      console.log(`   Institución: ${pacienteData[0].institucion_salud}`);
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error verificando datos:', error);
  } finally {
    await sequelize.close();
  }
};

verifyData();