import sequelize from '../config/db.js';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    // Hash para la contraseña "Doctor123"
    const passwordHash = await bcrypt.hash('Doctor123', 10);

    // Insertar Usuarios (Doctores)
    console.log('👥 Insertando usuarios...');
    await sequelize.query(`
      INSERT IGNORE INTO usuarios (email, password_hash, rol, fecha_creacion, activo) VALUES
      ('eduardo@doctor.com', '${passwordHash}', 'Doctor', NOW(), 1),
      ('maria@doctor.com', '${passwordHash}', 'Doctor', NOW(), 1),
      ('carlos@doctor.com', '${passwordHash}', 'Doctor', NOW(), 1)
    `);

    // Insertar Módulos - DESHABILITADO
    // Los módulos deben crearse manualmente desde la interfaz de gestión
    // console.log('📚 Insertando módulos...');
    // await sequelize.query(`
    //   INSERT IGNORE INTO modulos (nombre_modulo) VALUES
    //   ('Módulo 1'),
    //   ('Módulo 2'),
    //   ('Módulo 3'),
    //   ('Módulo 4')
    // `);
    console.log('📚 Módulos: Se deben crear manualmente desde la interfaz de gestión');

    // Insertar Doctores
    console.log('👨‍⚕️ Insertando doctores...');
    await sequelize.query(`
      INSERT IGNORE INTO doctores (id_usuario, nombre, apellido_paterno, telefono, grado_estudio, fecha_registro, activo) VALUES
      (1, 'Dr. Eduardo', 'González', '5551234567', 'Medicina General', NOW(), 1),
      (2, 'Dra. María', 'López', '5552345678', 'Cardiología', NOW(), 1),
      (3, 'Dr. Carlos', 'Martínez', '5553456789', 'Pediatría', NOW(), 1)
    `);

    // Insertar Pacientes
    console.log('🏥 Insertando pacientes...');
    await sequelize.query(`
      INSERT IGNORE INTO pacientes (nombre, apellido_paterno, fecha_nacimiento, curp, direccion, numero_celular, sexo, institucion_salud, fecha_registro, activo) VALUES
      ('Juan', 'Pérez', '1985-03-15', 'PERJ850315HDFRZN01', 'Av. Principal 123', '5551111111', 'Hombre', 'IMSS', NOW(), 1),
      ('Ana', 'García', '1990-07-22', 'GARA900722MDFRCN02', 'Calle Secundaria 456', '5552222222', 'Mujer', 'Bienestar', NOW(), 1),
      ('Carlos', 'López', '1978-11-08', 'LOPC781108HDFPRL03', 'Blvd. Norte 789', '5553333333', 'Hombre', 'ISSSTE', NOW(), 1)
    `);

    // Insertar Medicamentos
    console.log('💊 Insertando medicamentos...');
    await sequelize.query(`
      INSERT IGNORE INTO medicamentos (nombre_medicamento, descripcion) VALUES
      ('Paracetamol', 'Analgésico y antipirético'),
      ('Losartán', 'Antihipertensivo'),
      ('Metformina', 'Antidiabético')
    `);

    // Insertar Comorbilidades
    console.log('🩺 Insertando comorbilidades...');
    await sequelize.query(`
      INSERT IGNORE INTO comorbilidades (nombre_comorbilidad, descripcion) VALUES
      ('Hipertensión Arterial', 'Presión arterial elevada de forma crónica'),
      ('Diabetes Mellitus Tipo 2', 'Trastorno metabólico caracterizado por hiperglucemia'),
      ('Obesidad', 'Acumulación excesiva de grasa corporal')
    `);

    // Insertar Citas
    console.log('📅 Insertando citas...');
    await sequelize.query(`
      INSERT IGNORE INTO citas (id_paciente, id_doctor, fecha_cita, asistencia, motivo, es_primera_consulta, observaciones, fecha_creacion) VALUES
      (1, 1, '2023-01-15 09:00:00', 1, 'Consulta inicial por presión alta', 1, 'Primera consulta, presión 160/100', NOW()),
      (2, 2, '2023-02-01 10:00:00', 1, 'Control general', 0, 'Paciente estable', NOW()),
      (3, 3, '2023-03-10 11:00:00', 1, 'Chequeo rutina', 0, 'Todo normal', NOW())
    `);

    // Insertar Signos Vitales
    console.log('📊 Insertando signos vitales...');
    await sequelize.query(`
      INSERT IGNORE INTO signos_vitales (id_paciente, id_cita, fecha_medicion, peso_kg, talla_m, presion_sistolica, presion_diastolica, glucosa_mg_dl, registrado_por, observaciones, fecha_creacion) VALUES
      (1, 1, NOW(), 78.5, 1.75, 160, 100, 95.0, 'doctor', 'Signos vitales iniciales', NOW()),
      (2, 2, NOW(), 85.2, 1.62, 130, 80, 280.0, 'doctor', 'Glucosa elevada', NOW()),
      (3, 3, NOW(), 82.1, 1.80, 145, 92, 88.0, 'doctor', 'Signos normales', NOW())
    `);

    // Insertar Diagnósticos
    console.log('🔍 Insertando diagnósticos...');
    await sequelize.query(`
      INSERT IGNORE INTO diagnosticos (id_cita, descripcion, fecha_registro) VALUES
      (1, 'Hipertensión arterial esencial', NOW()),
      (2, 'Diabetes mellitus tipo 2 sin complicaciones', NOW()),
      (3, 'Examen médico general - paciente sano', NOW())
    `);

    console.log('🎉 Base de datos poblada exitosamente');
    console.log('📋 Datos de prueba disponibles:');
    console.log('   - Usuario: eduardo@doctor.com');
    console.log('   - Contraseña: Doctor123');
    console.log('   - 3 doctores, 3 pacientes, 3 citas');
    console.log('   - Medicamentos, comorbilidades y signos vitales');

  } catch (error) {
    console.error('❌ Error poblando la base de datos:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada');
  }
};

seedDatabase();