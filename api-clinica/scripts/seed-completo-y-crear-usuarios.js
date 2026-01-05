import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { 
  Medicamento, 
  Vacuna, 
  Comorbilidad, 
  Modulo,
  Usuario,
  Doctor
} from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';

/**
 * Script completo para:
 * 1. Añadir datos a vacunas, comorbilidades, modulos, medicamentos
 * 2. Crear 1 administrador
 * 3. Crear 1 doctor
 * 4. Mostrar credenciales
 */

// ============================================
// DATOS PARA SEED
// ============================================

const medicamentos = [
  // Antidiabéticos
  { nombre_medicamento: 'Metformina 500mg', descripcion: 'Antidiabético oral de primera línea para Diabetes Mellitus Tipo 2. Reduce la producción de glucosa hepática y mejora la sensibilidad a la insulina.' },
  { nombre_medicamento: 'Metformina 850mg', descripcion: 'Antidiabético oral, dosis más alta para mejor control glucémico.' },
  { nombre_medicamento: 'Glibenclamida 5mg', descripcion: 'Antidiabético oral del grupo de las sulfonilureas. Estimula la secreción de insulina.' },
  { nombre_medicamento: 'Insulina NPH', descripcion: 'Insulina de acción intermedia para el control de la diabetes.' },
  { nombre_medicamento: 'Insulina Rápida', descripcion: 'Insulina de acción rápida para el control de glucemias postprandiales.' },
  // Antihipertensivos
  { nombre_medicamento: 'Losartán 50mg', descripcion: 'Antihipertensivo ARA II. Indicado para Hipertensión Arterial y protección renal en diabéticos.' },
  { nombre_medicamento: 'Losartán 100mg', descripcion: 'Antihipertensivo ARA II, dosis más alta para mejor control tensional.' },
  { nombre_medicamento: 'Enalapril 10mg', descripcion: 'Inhibidor de la enzima convertidora de angiotensina (IECA). Antihipertensivo y cardioprotector.' },
  { nombre_medicamento: 'Amlodipino 5mg', descripcion: 'Bloqueador de canales de calcio. Antihipertensivo de acción prolongada.' },
  { nombre_medicamento: 'Hidroclorotiazida 25mg', descripcion: 'Diurético tiazídico. Antihipertensivo y coadyuvante en el tratamiento de la hipertensión.' },
  // Hipolipemiantes
  { nombre_medicamento: 'Atorvastatina 20mg', descripcion: 'Estatina para el tratamiento de Dislipidemia. Reduce colesterol LDL y triglicéridos.' },
  { nombre_medicamento: 'Atorvastatina 40mg', descripcion: 'Estatina de mayor potencia para control de dislipidemia severa.' },
  { nombre_medicamento: 'Simvastatina 20mg', descripcion: 'Estatina para reducción de colesterol y prevención cardiovascular.' },
  { nombre_medicamento: 'Rosuvastatina 10mg', descripcion: 'Estatina de alta potencia para control de dislipidemia.' },
  // Antiagregantes
  { nombre_medicamento: 'Ácido Acetilsalicílico 100mg', descripcion: 'Antiagregante plaquetario. Prevención de eventos cardiovasculares.' },
  { nombre_medicamento: 'Clopidogrel 75mg', descripcion: 'Antiagregante plaquetario. Indicado en síndromes coronarios agudos.' },
  { nombre_medicamento: 'Warfarina 5mg', descripcion: 'Anticoagulante oral. Prevención de trombosis y embolias.' },
  // Otros
  { nombre_medicamento: 'Paracetamol 500mg', descripcion: 'Analgésico y antipirético. Alivio del dolor y fiebre.' },
  { nombre_medicamento: 'Ibuprofeno 400mg', descripcion: 'Antiinflamatorio no esteroideo (AINE). Analgésico, antipirético y antiinflamatorio.' },
  { nombre_medicamento: 'Amoxicilina 500mg', descripcion: 'Antibiótico betalactámico. Tratamiento de infecciones bacterianas comunes.' },
  { nombre_medicamento: 'Omeprazol 20mg', descripcion: 'Inhibidor de bomba de protones. Tratamiento de úlcera péptica y reflujo gastroesofágico.' }
];

const vacunas = [
  { nombre_vacuna: 'BCG (Tuberculosis)', descripcion: 'Vacuna contra la tuberculosis. Se administra al nacer. Protege contra formas graves de tuberculosis en niños.', tipo: 'Bacteriana' },
  { nombre_vacuna: 'Hepatitis B', descripcion: 'Vacuna contra la hepatitis B. Serie de 3 dosis (0, 1 y 6 meses). Protege contra la infección hepática crónica.', tipo: 'Viral' },
  { nombre_vacuna: 'Pentavalente (DTP + Hib + Hepatitis B)', descripcion: 'Vacuna combinada que protege contra difteria, tétanos, tos ferina, Haemophilus influenzae tipo b y hepatitis B.', tipo: 'Combinada' },
  { nombre_vacuna: 'DTP (Difteria, Tétanos, Tos Ferina)', descripcion: 'Vacuna combinada contra difteria, tétanos y tos ferina. Refuerzos en niños y adultos.', tipo: 'Toxoide/Bacteriana' },
  { nombre_vacuna: 'Td (Tétanos y Difteria)', descripcion: 'Vacuna combinada de tétanos y difteria para adultos. Refuerzo cada 10 años.', tipo: 'Toxoide' },
  { nombre_vacuna: 'Tdap (Tétanos, Difteria, Tos Ferina Acelular)', descripcion: 'Vacuna combinada para adolescentes y adultos. Incluye componente de tos ferina acelular.', tipo: 'Toxoide/Bacteriana' },
  { nombre_vacuna: 'Polio (IPV)', descripcion: 'Vacuna inactivada contra la poliomielitis. Serie de 3 dosis en lactantes.', tipo: 'Viral' },
  { nombre_vacuna: 'Rotavirus', descripcion: 'Vacuna oral contra rotavirus. Previene gastroenteritis grave en lactantes. Serie de 2-3 dosis.', tipo: 'Viral' },
  { nombre_vacuna: 'Neumococo Conjugada (PCV13)', descripcion: 'Vacuna conjugada contra neumococo. Protege contra 13 serotipos. Serie de 3-4 dosis en lactantes.', tipo: 'Bacteriana' },
  { nombre_vacuna: 'Neumococo Polisacárida (PPSV23)', descripcion: 'Vacuna polisacárida contra neumococo. Protege contra 23 serotipos. Para adultos mayores y grupos de riesgo.', tipo: 'Bacteriana' },
  { nombre_vacuna: 'Triple Viral (MMR: Sarampión, Paperas, Rubéola)', descripcion: 'Vacuna combinada contra sarampión, paperas y rubéola. Primera dosis a los 12 meses, segunda a los 6 años.', tipo: 'Viral' },
  { nombre_vacuna: 'Varicela', descripcion: 'Vacuna contra varicela. Primera dosis a los 12 meses, segunda entre 4-6 años.', tipo: 'Viral' },
  { nombre_vacuna: 'Influenza (Gripe)', descripcion: 'Vacuna anual contra la influenza estacional. Recomendada para todos los grupos de edad, especialmente adultos mayores, niños y grupos de riesgo.', tipo: 'Viral' },
  { nombre_vacuna: 'Fiebre Amarilla', descripcion: 'Vacuna contra fiebre amarilla. Requerida para viajes a zonas endémicas. Dosis única con refuerzo cada 10 años.', tipo: 'Viral' },
  { nombre_vacuna: 'Hepatitis A', descripcion: 'Vacuna contra hepatitis A. Serie de 2 dosis. Recomendada para niños y grupos de riesgo.', tipo: 'Viral' },
  { nombre_vacuna: 'VPH (Virus del Papiloma Humano)', descripcion: 'Vacuna contra el virus del papiloma humano. Previene cáncer cervicouterino y otras enfermedades relacionadas. Serie de 2-3 dosis en adolescentes.', tipo: 'Viral' },
  { nombre_vacuna: 'COVID-19 (mRNA)', descripcion: 'Vacuna contra COVID-19 de tecnología mRNA. Serie primaria de 2 dosis más refuerzos según recomendaciones.', tipo: 'Viral' },
  { nombre_vacuna: 'COVID-19 (Vector Viral)', descripcion: 'Vacuna contra COVID-19 de vector viral. Serie primaria de 1-2 dosis más refuerzos.', tipo: 'Viral' },
  { nombre_vacuna: 'Meningococo ACWY', descripcion: 'Vacuna conjugada contra meningococo serogrupos A, C, W e Y. Recomendada para adolescentes y grupos de riesgo.', tipo: 'Bacteriana' },
  { nombre_vacuna: 'Meningococo B', descripcion: 'Vacuna contra meningococo serogrupo B. Recomendada para grupos de riesgo y adolescentes.', tipo: 'Bacteriana' },
  { nombre_vacuna: 'Herpes Zóster', descripcion: 'Vacuna contra herpes zóster (culebrilla). Recomendada para adultos mayores de 50 años.', tipo: 'Viral' }
];

const comorbilidades = [
  { nombre_comorbilidad: 'Diabetes', descripcion: 'Diabetes mellitus, una enfermedad metabólica caracterizada por niveles elevados de glucosa en sangre. Incluye Diabetes Tipo 1, Diabetes Tipo 2 y Diabetes Gestacional.' },
  { nombre_comorbilidad: 'Hipertensión', descripcion: 'Hipertensión arterial, condición crónica caracterizada por presión arterial persistentemente elevada (≥140/90 mmHg). Factor de riesgo importante para enfermedades cardiovasculares.' },
  { nombre_comorbilidad: 'Obesidad', descripcion: 'Obesidad, condición médica caracterizada por exceso de grasa corporal (IMC ≥30). Factor de riesgo para múltiples enfermedades crónicas incluyendo diabetes, hipertensión y enfermedades cardiovasculares.' },
  { nombre_comorbilidad: 'Dislipidemia', descripcion: 'Dislipidemia, alteración de los niveles de lípidos en sangre (colesterol, triglicéridos). Incluye hipercolesterolemia, hipertrigliceridemia y combinaciones de ambas.' },
  { nombre_comorbilidad: 'Enfermedad Renal Crónica', descripcion: 'Enfermedad Renal Crónica (ERC), pérdida progresiva e irreversible de la función renal. Puede avanzar a insuficiencia renal terminal requiriendo diálisis o trasplante.' },
  { nombre_comorbilidad: 'EPOC', descripcion: 'Enfermedad Pulmonar Obstructiva Crónica (EPOC), condición pulmonar obstructiva caracterizada por limitación del flujo aéreo. Incluye enfisema y bronquitis crónica.' },
  { nombre_comorbilidad: 'Enfermedad Cardiovascular', descripcion: 'Enfermedad Cardiovascular, grupo de enfermedades que afectan el corazón y los vasos sanguíneos. Incluye enfermedad coronaria, insuficiencia cardíaca, arritmias y enfermedad vascular periférica.' },
  { nombre_comorbilidad: 'Tuberculosis', descripcion: 'Tuberculosis (TB), enfermedad infecciosa causada por Mycobacterium tuberculosis que afecta principalmente los pulmones, pero puede afectar otros órganos. Requiere tratamiento prolongado con antibióticos específicos.' },
  { nombre_comorbilidad: 'Asma', descripcion: 'Asma, enfermedad crónica de las vías respiratorias caracterizada por inflamación, estrechamiento de las vías aéreas y síntomas recurrentes de sibilancias, disnea, opresión torácica y tos.' },
  { nombre_comorbilidad: 'Tabaquismo', descripcion: 'Tabaquismo, adicción a la nicotina y consumo regular de productos del tabaco. Factor de riesgo significativo para múltiples enfermedades incluyendo cáncer, EPOC, enfermedades cardiovasculares y eventos cerebrovasculares.' }
];

const modulos = [
  { nombre_modulo: 'Módulo 1' },
  { nombre_modulo: 'Módulo 2' },
  { nombre_modulo: 'Módulo 3' },
  { nombre_modulo: 'Módulo 4' },
  { nombre_modulo: 'Módulo 5' }
];

// ============================================
// FUNCIONES
// ============================================

async function seedDatos() {
  logger.info('📦 ========================================');
  logger.info('📦 SEED DE DATOS');
  logger.info('📦 ========================================\n');

  // MEDICAMENTOS
  logger.info('💊 Añadiendo medicamentos...');
  let medicamentosCreados = 0;
  for (const med of medicamentos) {
    const [nuevo, created] = await Medicamento.findOrCreate({
      where: { nombre_medicamento: med.nombre_medicamento },
      defaults: med
    });
    if (created) medicamentosCreados++;
  }
  logger.info(`   ✅ ${medicamentosCreados} nuevos medicamentos añadidos\n`);

  // VACUNAS
  logger.info('💉 Añadiendo vacunas...');
  let vacunasCreadas = 0;
  for (const vac of vacunas) {
    const [nueva, created] = await Vacuna.findOrCreate({
      where: { nombre_vacuna: vac.nombre_vacuna },
      defaults: vac
    });
    if (created) vacunasCreadas++;
  }
  logger.info(`   ✅ ${vacunasCreadas} nuevas vacunas añadidas\n`);

  // COMORBILIDADES
  logger.info('🏥 Añadiendo comorbilidades...');
  let comorbilidadesCreadas = 0;
  for (const com of comorbilidades) {
    const [nueva, created] = await Comorbilidad.findOrCreate({
      where: { nombre_comorbilidad: com.nombre_comorbilidad },
      defaults: com
    });
    if (created) comorbilidadesCreadas++;
  }
  logger.info(`   ✅ ${comorbilidadesCreadas} nuevas comorbilidades añadidas\n`);

  // MODULOS
  logger.info('📋 Añadiendo módulos...');
  let modulosCreados = 0;
  for (const mod of modulos) {
    const [nuevo, created] = await Modulo.findOrCreate({
      where: { nombre_modulo: mod.nombre_modulo },
      defaults: mod
    });
    if (created) modulosCreados++;
  }
  logger.info(`   ✅ ${modulosCreados} nuevos módulos añadidos\n`);

  // RESUMEN
  const totalMed = await Medicamento.count();
  const totalVac = await Vacuna.count();
  const totalCom = await Comorbilidad.count();
  const totalMod = await Modulo.count();

  logger.info('📊 Resumen de datos:');
  logger.info(`   💊 Medicamentos: ${totalMed}`);
  logger.info(`   💉 Vacunas: ${totalVac}`);
  logger.info(`   🏥 Comorbilidades: ${totalCom}`);
  logger.info(`   📋 Módulos: ${totalMod}\n`);
}

async function crearAdministrador() {
  logger.info('👤 ========================================');
  logger.info('👤 CREANDO ADMINISTRADOR');
  logger.info('👤 ========================================\n');

  const ADMIN_EMAIL = 'admin@clinica.com';
  const ADMIN_PASSWORD = 'Admin123!';

  // Verificar si ya existe
  let usuario = await Usuario.findOne({ where: { email: ADMIN_EMAIL } });

  if (usuario) {
    if (usuario.rol !== 'Admin') {
      await usuario.update({ rol: 'Admin' });
      logger.info('✅ Rol actualizado a Admin');
    } else {
      logger.info('✅ Usuario Admin ya existe');
    }
  } else {
    usuario = await Usuario.create({
      email: ADMIN_EMAIL,
      password_hash: '',
      rol: 'Admin',
      activo: true
    });
    logger.info(`✅ Usuario Admin creado (ID: ${usuario.id_usuario})`);
  }

  // Crear/actualizar credencial
  const credentials = await UnifiedAuthService.getUserCredentials('Admin', usuario.id_usuario);
  if (credentials.length === 0) {
    await UnifiedAuthService.setupCredential('Admin', usuario.id_usuario, 'password', ADMIN_PASSWORD, { isPrimary: true });
    logger.info('✅ Credencial creada');
  } else {
    // Eliminar credencial existente y crear nueva
    const AuthCredential = (await import('../models/AuthCredential.js')).default;
    await AuthCredential.update(
      { activo: false },
      { where: { id_credential: credentials[0].id_credential } }
    );
    await UnifiedAuthService.setupCredential('Admin', usuario.id_usuario, 'password', ADMIN_PASSWORD, { isPrimary: true });
    logger.info('✅ Credencial actualizada');
  }

  logger.info('\n📋 CREDENCIALES ADMINISTRADOR:');
  logger.info('   📧 Email: ' + ADMIN_EMAIL);
  logger.info('   🔐 Password: ' + ADMIN_PASSWORD);
  logger.info('   🆔 ID Usuario: ' + usuario.id_usuario + '\n');

  return { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, id: usuario.id_usuario };
}

async function crearDoctor() {
  logger.info('👨‍⚕️ ========================================');
  logger.info('👨‍⚕️ CREANDO DOCTOR');
  logger.info('👨‍⚕️ ========================================\n');

  const DOCTOR_EMAIL = 'doctor@clinica.com';
  const DOCTOR_PASSWORD = 'Doctor123!';
  const DOCTOR_NOMBRE = 'Juan';
  const DOCTOR_APELLIDO_PATERNO = 'Pérez';
  const DOCTOR_APELLIDO_MATERNO = 'García';

  // Verificar si ya existe usuario
  let usuario = await Usuario.findOne({ where: { email: DOCTOR_EMAIL } });

  if (usuario) {
    if (usuario.rol !== 'Doctor') {
      await usuario.update({ rol: 'Doctor' });
      logger.info('✅ Rol actualizado a Doctor');
    } else {
      logger.info('✅ Usuario Doctor ya existe');
    }
  } else {
    usuario = await Usuario.create({
      email: DOCTOR_EMAIL,
      password_hash: '',
      rol: 'Doctor',
      activo: true
    });
    logger.info(`✅ Usuario Doctor creado (ID: ${usuario.id_usuario})`);
  }

  // Crear/actualizar doctor
  let doctor = await Doctor.findOne({ where: { id_usuario: usuario.id_usuario } });

  if (doctor) {
    await doctor.update({
      nombre: DOCTOR_NOMBRE,
      apellido_paterno: DOCTOR_APELLIDO_PATERNO,
      apellido_materno: DOCTOR_APELLIDO_MATERNO,
      activo: true
    });
    logger.info('✅ Datos del doctor actualizados');
  } else {
    doctor = await Doctor.create({
      id_usuario: usuario.id_usuario,
      nombre: DOCTOR_NOMBRE,
      apellido_paterno: DOCTOR_APELLIDO_PATERNO,
      apellido_materno: DOCTOR_APELLIDO_MATERNO,
      activo: true
    });
    logger.info(`✅ Doctor creado (ID: ${doctor.id_doctor})`);
  }

  // Crear/actualizar credencial
  const credentials = await UnifiedAuthService.getUserCredentials('Doctor', usuario.id_usuario);
  if (credentials.length === 0) {
    await UnifiedAuthService.setupCredential('Doctor', usuario.id_usuario, 'password', DOCTOR_PASSWORD, { isPrimary: true });
    logger.info('✅ Credencial creada');
  } else {
    // Eliminar credencial existente y crear nueva
    const AuthCredential = (await import('../models/AuthCredential.js')).default;
    await AuthCredential.update(
      { activo: false },
      { where: { id_credential: credentials[0].id_credential } }
    );
    await UnifiedAuthService.setupCredential('Doctor', usuario.id_usuario, 'password', DOCTOR_PASSWORD, { isPrimary: true });
    logger.info('✅ Credencial actualizada');
  }

  logger.info('\n📋 CREDENCIALES DOCTOR:');
  logger.info('   📧 Email: ' + DOCTOR_EMAIL);
  logger.info('   🔐 Password: ' + DOCTOR_PASSWORD);
  logger.info('   👤 Nombre: ' + DOCTOR_NOMBRE + ' ' + DOCTOR_APELLIDO_PATERNO + ' ' + DOCTOR_APELLIDO_MATERNO);
  logger.info('   🆔 ID Usuario: ' + usuario.id_usuario);
  logger.info('   🆔 ID Doctor: ' + doctor.id_doctor + '\n');

  return { email: DOCTOR_EMAIL, password: DOCTOR_PASSWORD, id: usuario.id_usuario, doctorId: doctor.id_doctor };
}

// ============================================
// EJECUCIÓN PRINCIPAL
// ============================================

async function ejecutarTodo() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // Seed de datos
    await seedDatos();

    // Crear usuarios
    const admin = await crearAdministrador();
    const doctor = await crearDoctor();

    // RESUMEN FINAL
    logger.info('✅ ========================================');
    logger.info('✅ PROCESO COMPLETADO');
    logger.info('✅ ========================================\n');
    logger.info('📋 CREDENCIALES DE ACCESO:\n');
    logger.info('👤 ADMINISTRADOR:');
    logger.info('   📧 Email: ' + admin.email);
    logger.info('   🔐 Password: ' + admin.password);
    logger.info('   🆔 ID: ' + admin.id + '\n');
    logger.info('👨‍⚕️ DOCTOR:');
    logger.info('   📧 Email: ' + doctor.email);
    logger.info('   🔐 Password: ' + doctor.password);
    logger.info('   🆔 ID Usuario: ' + doctor.id);
    logger.info('   🆔 ID Doctor: ' + doctor.doctorId + '\n');

  } catch (error) {
    logger.error('❌ Error:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

ejecutarTodo()
  .then(() => {
    logger.info('✅ Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });

