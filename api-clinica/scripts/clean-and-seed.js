import sequelize from '../config/db.js';
import bcrypt from 'bcryptjs';
import { Usuario, Doctor, Modulo, Comorbilidad } from '../models/associations.js';

const cleanAndSeed = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🧹 Iniciando limpieza total de la base de datos...\n');

    // Desactivar temporalmente las restricciones de foreign key
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
    
    // Lista de todas las tablas que necesitamos limpiar (en orden inverso de dependencias)
    const tables = [
      'plan_detalle',
      'plan_medicacion',
      'esquema_vacunacion',
      'punto_chequeo',
      'paciente_comorbilidad',
      'paciente_auth_pin',
      'paciente_auth',
      'red_apoyo',
      'mensaje_chat',
      'doctor_paciente',
      'diagnosticos',
      'signos_vitales',
      'citas',
      'pacientes',
      'medicamentos',
      'comorbilidades',
      'doctores',
      'modulos',
      'usuarios'
    ];

    // Limpiar todas las tablas
    for (const table of tables) {
      try {
        await sequelize.query(`TRUNCATE TABLE ${table}`, { transaction });
        console.log(`  ✅ Tabla ${table} limpiada`);
      } catch (error) {
        console.log(`  ⚠️  Tabla ${table} no existe o ya está vacía: ${error.message}`);
      }
    }

    // Reactivar las restricciones de foreign key
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });

    console.log('\n✅ Base de datos limpiada completamente\n');
    console.log('📝 Creando datos iniciales...\n');

    // ============================================
    // 1. CREAR MÓDULOS (1-5) - DESHABILITADO
    // Los módulos deben crearse manualmente desde la interfaz de gestión
    // ============================================
    // console.log('📦 Creando módulos...');
    // for (let i = 1; i <= 5; i++) {
    //   await Modulo.create({
    //     nombre_modulo: `Modulo ${i}`,
    //     created_at: new Date(),
    //     updated_at: null
    //   }, { transaction });
    //   console.log(`  ✅ Módulo ${i} creado`);
    // }
    console.log('📦 Módulos: Se deben crear manualmente desde la interfaz de gestión');

    // ============================================
    // 2. CREAR COMORBILIDADES
    // ============================================
    console.log('\n🩺 Creando comorbilidades...');
    const comorbilidades = [
      { nombre: 'Diabetes Mellitus Tipo 2', descripcion: 'Trastorno metabólico caracterizado por hiperglucemia crónica' },
      { nombre: 'Hipertensión Arterial', descripcion: 'Presión arterial elevada de forma crónica' },
      { nombre: 'Dislipidemia', descripcion: 'Alteración en los niveles de lípidos en sangre' },
      { nombre: 'Obesidad', descripcion: 'Exceso de peso corporal que puede afectar la salud' },
      { nombre: 'Artritis Reumatoide', descripcion: 'Enfermedad inflamatoria crónica que afecta las articulaciones' },
      { nombre: 'Asma', descripcion: 'Enfermedad inflamatoria crónica de las vías respiratorias' },
      { nombre: 'Depresión', descripcion: 'Trastorno del estado de ánimo caracterizado por tristeza persistente' },
      { nombre: 'Ansiedad', descripcion: 'Trastorno de ansiedad que puede afectar el funcionamiento diario' },
      { nombre: 'Enfermedad Renal Crónica', descripcion: 'Pérdida progresiva de la función renal' },
      { nombre: 'Enfermedad Cardiovascular', descripcion: 'Trastornos del corazón y vasos sanguíneos' },
      { nombre: 'EPOC', descripcion: 'Enfermedad pulmonar obstructiva crónica que dificulta la respiración' },
      { nombre: 'Síndrome Metabólico', descripcion: 'Conjunto de factores de riesgo cardiovascular que incluyen obesidad abdominal, hipertensión, dislipidemia y resistencia a la insulina' },
      { nombre: 'Tabaquismo', descripcion: 'Dependencia al tabaco que aumenta significativamente el riesgo de múltiples enfermedades crónicas' },
      { nombre: 'Tuberculosis', descripcion: 'Infección bacteriana pulmonar causada por Mycobacterium tuberculosis que requiere tratamiento prolongado' }
    ];

    for (const comorbilidad of comorbilidades) {
      await Comorbilidad.create({
        nombre_comorbilidad: comorbilidad.nombre,
        descripcion: comorbilidad.descripcion
      }, { transaction });
      console.log(`  ✅ ${comorbilidad.nombre}`);
    }

    // ============================================
    // 3. CREAR ADMINISTRADOR
    // ============================================
    console.log('\n👤 Creando administrador...');
    const adminPassword = 'Admin123!'; // Contraseña por defecto
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    
    const adminUsuario = await Usuario.create({
      email: 'admin@clinica.com',
      password_hash: adminPasswordHash,
      rol: 'Admin',
      activo: true,
      fecha_creacion: new Date()
    }, { transaction });

    console.log(`  ✅ Administrador creado`);
    console.log(`     📧 Email: admin@clinica.com`);
    console.log(`     🔑 Password: ${adminPassword}`);
    console.log(`     👤 ID Usuario: ${adminUsuario.id_usuario}`);

    // ============================================
    // 4. CREAR DOCTOR
    // ============================================
    console.log('\n👨‍⚕️ Creando doctor...');
    const doctorPassword = 'Doctor123!'; // Contraseña por defecto
    const doctorPasswordHash = await bcrypt.hash(doctorPassword, 10);
    
    // Crear usuario para el doctor
    const doctorUsuario = await Usuario.create({
      email: 'doctor@clinica.com',
      password_hash: doctorPasswordHash,
      rol: 'Doctor',
      activo: true,
      fecha_creacion: new Date()
    }, { transaction });

    // Obtener el primer módulo (Modulo 1)
    const modulo1 = await Modulo.findOne({ 
      where: { nombre_modulo: 'Modulo 1' },
      transaction 
    });

    // Crear perfil del doctor
    const doctor = await Doctor.create({
      id_usuario: doctorUsuario.id_usuario,
      nombre: 'Juan',
      apellido_paterno: 'Pérez',
      apellido_materno: 'García',
      telefono: '555-1234-5678',
      institucion_hospitalaria: 'Hospital General',
      grado_estudio: 'Médico Cirujano',
      anos_servicio: 10,
      id_modulo: modulo1?.id_modulo || null,
      fecha_registro: new Date(),
      activo: true
    }, { transaction });

    console.log(`  ✅ Doctor creado`);
    console.log(`     📧 Email: doctor@clinica.com`);
    console.log(`     🔑 Password: ${doctorPassword}`);
    console.log(`     👤 ID Usuario: ${doctorUsuario.id_usuario}`);
    console.log(`     🏥 ID Doctor: ${doctor.id_doctor}`);
    console.log(`     👨‍⚕️ Nombre: Dr. ${doctor.nombre} ${doctor.apellido_paterno}`);

    await transaction.commit();

    console.log('\n✅ ==========================================');
    console.log('✅ LIMPIEZA Y SEEDING COMPLETADOS');
    console.log('✅ ==========================================\n');
    
    console.log('📋 RESUMEN DE CREDENCIALES:\n');
    console.log('🔴 ADMINISTRADOR:');
    console.log('   Email: admin@clinica.com');
    console.log('   Password: Admin123!');
    console.log('   Rol: Admin\n');
    console.log('🔵 DOCTOR:');
    console.log('   Email: doctor@clinica.com');
    console.log('   Password: Doctor123!');
    console.log('   Rol: Doctor\n');
    console.log('📦 MÓDULOS: Modulo 1, Modulo 2, Modulo 3, Modulo 4, Modulo 5');
    console.log('🩺 COMORBILIDADES: 14 comorbilidades comunes creadas\n');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error durante la limpieza/seeding:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Ejecutar el script
cleanAndSeed()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

