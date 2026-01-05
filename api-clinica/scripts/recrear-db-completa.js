/**
 * Script para recrear completamente la base de datos
 * Elimina todas las tablas y las recrea con Sequelize sync
 * Luego pobla con datos iniciales: módulos, comorbilidades, medicamentos, vacunas
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import {
  Modulo,
  Comorbilidad,
  Medicamento,
  Vacuna,
  Usuario,
  Paciente,
  Doctor,
  SignoVital,
  Cita,
  Diagnostico,
  PlanMedicacion,
  RedApoyo,
  MensajeChat,
  DoctorPaciente,
  EsquemaVacunacion,
  PacienteComorbilidad,
  PlanDetalle,
  PuntoChequeo,
  AuthCredential
} from '../models/associations.js';

import logger from '../utils/logger.js';

// Datos iniciales
const MODULOS = [
  { nombre_modulo: 'Módulo 1' },
  { nombre_modulo: 'Módulo 2' },
  { nombre_modulo: 'Módulo 3' },
  { nombre_modulo: 'Módulo 4' },
  { nombre_modulo: 'Módulo 5' }
];

const COMORBILIDADES = [
  { nombre_comorbilidad: 'Diabetes Mellitus Tipo 2', descripcion: 'Enfermedad metabólica caracterizada por hiperglucemia' },
  { nombre_comorbilidad: 'Hipertensión Arterial', descripcion: 'Presión arterial persistentemente elevada' },
  { nombre_comorbilidad: 'Obesidad', descripcion: 'Exceso de grasa corporal que puede afectar la salud' },
  { nombre_comorbilidad: 'Enfermedad Pulmonar Obstructiva Crónica (EPOC)', descripcion: 'Enfermedad pulmonar crónica caracterizada por obstrucción del flujo aéreo' },
  { nombre_comorbilidad: 'Asma', descripcion: 'Enfermedad crónica de las vías respiratorias' },
  { nombre_comorbilidad: 'Artritis Reumatoide', descripcion: 'Enfermedad autoinmune que afecta las articulaciones' },
  { nombre_comorbilidad: 'Osteoartritis', descripcion: 'Degeneración del cartílago articular' },
  { nombre_comorbilidad: 'Enfermedad Renal Crónica', descripcion: 'Pérdida progresiva de la función renal' },
  { nombre_comorbilidad: 'Insuficiencia Cardíaca', descripcion: 'Incapacidad del corazón para bombear sangre adecuadamente' },
  { nombre_comorbilidad: 'Enfermedad Coronaria', descripcion: 'Obstrucción de las arterias coronarias' },
  { nombre_comorbilidad: 'Accidente Cerebrovascular (ACV)', descripcion: 'Interrupción del flujo sanguíneo al cerebro' },
  { nombre_comorbilidad: 'Enfermedad de Alzheimer', descripcion: 'Trastorno neurodegenerativo progresivo' },
  { nombre_comorbilidad: 'Depresión Mayor', descripcion: 'Trastorno del estado de ánimo caracterizado por tristeza persistente' },
  { nombre_comorbilidad: 'Ansiedad Generalizada', descripcion: 'Trastorno de ansiedad con preocupación excesiva' },
  { nombre_comorbilidad: 'Hipotiroidismo', descripcion: 'Disminución de la función tiroidea' },
  { nombre_comorbilidad: 'Hipertiroidismo', descripcion: 'Aumento de la función tiroidea' },
  { nombre_comorbilidad: 'Osteoporosis', descripcion: 'Pérdida de densidad ósea que aumenta riesgo de fracturas' },
  { nombre_comorbilidad: 'Anemia', descripcion: 'Déficit de glóbulos rojos o hemoglobina' },
  { nombre_comorbilidad: 'Cáncer', descripcion: 'Enfermedad caracterizada por crecimiento descontrolado de células' },
  { nombre_comorbilidad: 'VIH/SIDA', descripcion: 'Infección por virus de inmunodeficiencia humana' }
];

const MEDICAMENTOS = [
  { nombre_medicamento: 'Paracetamol', descripcion: 'Analgésico y antipirético común' },
  { nombre_medicamento: 'Ibuprofeno', descripcion: 'Antiinflamatorio no esteroideo (AINE)' },
  { nombre_medicamento: 'Aspirina', descripcion: 'Antiinflamatorio y anticoagulante' },
  { nombre_medicamento: 'Metformina', descripcion: 'Antidiabético oral para diabetes tipo 2' },
  { nombre_medicamento: 'Insulina', descripcion: 'Hormona para tratamiento de diabetes' },
  { nombre_medicamento: 'Losartán', descripcion: 'Antagonista de receptores de angiotensina II para hipertensión' },
  { nombre_medicamento: 'Amlodipino', descripcion: 'Bloqueador de canales de calcio para hipertensión' },
  { nombre_medicamento: 'Atorvastatina', descripcion: 'Estatinas para reducir colesterol' },
  { nombre_medicamento: 'Omeprazol', descripcion: 'Inhibidor de bomba de protones para acidez gástrica' },
  { nombre_medicamento: 'Amoxicilina', descripcion: 'Antibiótico de amplio espectro' },
  { nombre_medicamento: 'Azitromicina', descripcion: 'Antibiótico macrólido' },
  { nombre_medicamento: 'Ciprofloxacino', descripcion: 'Antibiótico fluoroquinolona' },
  { nombre_medicamento: 'Salbutamol', descripcion: 'Broncodilatador para asma y EPOC' },
  { nombre_medicamento: 'Budesonida', descripcion: 'Corticosteroide inhalado para asma' },
  { nombre_medicamento: 'Warfarina', descripcion: 'Anticoagulante oral' },
  { nombre_medicamento: 'Levotiroxina', descripcion: 'Hormona tiroidea sintética para hipotiroidismo' },
  { nombre_medicamento: 'Sertralina', descripcion: 'Antidepresivo ISRS' },
  { nombre_medicamento: 'Diazepam', descripcion: 'Ansiolítico y sedante' },
  { nombre_medicamento: 'Captopril', descripcion: 'Inhibidor de ECA para hipertensión e insuficiencia cardíaca' },
  { nombre_medicamento: 'Furosemida', descripcion: 'Diurético de asa' },
  { nombre_medicamento: 'Digoxina', descripcion: 'Glucósido cardíaco para insuficiencia cardíaca' },
  { nombre_medicamento: 'Metronidazol', descripcion: 'Antibiótico y antiparasitario' },
  { nombre_medicamento: 'Prednisona', descripcion: 'Corticosteroide sistémico' },
  { nombre_medicamento: 'Clopidogrel', descripcion: 'Antiagregante plaquetario' },
  { nombre_medicamento: 'Enalapril', descripcion: 'Inhibidor de ECA para hipertensión' },
  { nombre_medicamento: 'Atenolol', descripcion: 'Bloqueador beta para hipertensión y cardiopatías' },
  { nombre_medicamento: 'Nifedipino', descripcion: 'Bloqueador de canales de calcio' },
  { nombre_medicamento: 'Metoclopramida', descripcion: 'Antiémético y procinético' },
  { nombre_medicamento: 'Diclofenaco', descripcion: 'Antiinflamatorio no esteroideo' },
  { nombre_medicamento: 'Tramadol', descripcion: 'Analgésico opioide moderado' }
];

const VACUNAS = [
  { nombre_vacuna: 'BCG', descripcion: 'Vacuna contra tuberculosis', tipo: 'Tuberculosis' },
  { nombre_vacuna: 'Hepatitis B', descripcion: 'Vacuna contra hepatitis B', tipo: 'Hepatitis' },
  { nombre_vacuna: 'DTP (Difteria, Tétanos, Tosferina)', descripcion: 'Vacuna combinada contra difteria, tétanos y tosferina', tipo: 'Difteria/Tétanos/Tosferina' },
  { nombre_vacuna: 'Hib (Haemophilus influenzae tipo b)', descripcion: 'Vacuna contra Haemophilus influenzae tipo b', tipo: 'Hib' },
  { nombre_vacuna: 'Polio (OPV)', descripcion: 'Vacuna oral contra poliomielitis', tipo: 'Polio' },
  { nombre_vacuna: 'Neumococo Conjugada (PCV)', descripcion: 'Vacuna contra neumococo', tipo: 'Neumococo' },
  { nombre_vacuna: 'Rotavirus', descripcion: 'Vacuna contra rotavirus', tipo: 'Rotavirus' },
  { nombre_vacuna: 'Sarampión, Paperas, Rubéola (MMR)', descripcion: 'Vacuna combinada contra sarampión, paperas y rubéola', tipo: 'MMR' },
  { nombre_vacuna: 'Varicela', descripcion: 'Vacuna contra varicela', tipo: 'Varicela' },
  { nombre_vacuna: 'Hepatitis A', descripcion: 'Vacuna contra hepatitis A', tipo: 'Hepatitis' },
  { nombre_vacuna: 'Meningococo', descripcion: 'Vacuna contra enfermedad meningocócica', tipo: 'Meningococo' },
  { nombre_vacuna: 'VPH (Virus del Papiloma Humano)', descripcion: 'Vacuna contra virus del papiloma humano', tipo: 'VPH' },
  { nombre_vacuna: 'Influenza (Gripe)', descripcion: 'Vacuna anual contra influenza', tipo: 'Influenza' },
  { nombre_vacuna: 'COVID-19', descripcion: 'Vacuna contra COVID-19', tipo: 'COVID-19' },
  { nombre_vacuna: 'Fiebre Amarilla', descripcion: 'Vacuna contra fiebre amarilla', tipo: 'Fiebre Amarilla' },
  { nombre_vacuna: 'Tétanos y Difteria (Td)', descripcion: 'Refuerzo contra tétanos y difteria', tipo: 'Difteria/Tétanos' },
  { nombre_vacuna: 'Tosferina (DTPa)', descripcion: 'Refuerzo contra tosferina en adultos', tipo: 'Tosferina' },
  { nombre_vacuna: 'Herpes Zóster', descripcion: 'Vacuna contra herpes zóster (culebrilla)', tipo: 'Herpes Zóster' },
  { nombre_vacuna: 'Neumococo Polisacárida (PPSV23)', descripcion: 'Vacuna neumocócica polisacárida para adultos', tipo: 'Neumococo' },
  { nombre_vacuna: 'Fiebre Tifoidea', descripcion: 'Vacuna contra fiebre tifoidea', tipo: 'Fiebre Tifoidea' }
];

async function recrearBaseDatos() {
  try {
    // Primero conectar a la base de datos
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // PASO 0: Importar modelos y asociaciones
    logger.info('📚 Cargando modelos y asociaciones...\n');
    await import('../models/associations.js');
    logger.info('✅ Modelos cargados\n');

    logger.info('🔄 INICIANDO RECREACIÓN COMPLETA DE BASE DE DATOS');
    logger.info('='.repeat(80));

    // PASO 1: Eliminar todas las tablas
    logger.info('\n🗑️  PASO 1: Eliminando todas las tablas existentes...\n');

    const transaction = await sequelize.transaction();

    try {

    const dbDialect = sequelize.getDialect();
    
    if (dbDialect === 'mysql' || dbDialect === 'mariadb') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
    }

    // Obtener lista de todas las tablas
    const [tables] = await sequelize.query(
      `SELECT TABLE_NAME 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_TYPE = 'BASE TABLE'`,
      { transaction }
    );

    logger.info(`Encontradas ${tables.length} tablas para eliminar`);

    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      try {
        await sequelize.query(`DROP TABLE IF EXISTS ${tableName}`, { transaction });
        logger.info(`  ✅ Tabla ${tableName} eliminada`);
      } catch (error) {
        logger.warn(`  ⚠️  Error eliminando ${tableName}: ${error.message}`);
      }
    }

    if (dbDialect === 'mysql' || dbDialect === 'mariadb') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
    }

    logger.info('\n✅ Todas las tablas eliminadas\n');

    await transaction.commit();
    } catch (dropError) {
      await transaction.rollback();
      logger.error('❌ Error eliminando tablas:', dropError);
      throw dropError;
    }

    // Esperar un momento para asegurar que todas las tablas se eliminaron
    await new Promise(resolve => setTimeout(resolve, 500));

    // PASO 2: Recrear todas las tablas usando Sequelize sync
    logger.info('📦 PASO 2: Recreando todas las tablas...\n');

    // Asegurarnos de que todas las tablas se eliminaron antes de recrear
    // Usar force: true para recrear desde cero (elimina y crea)
    // Logging: false para reducir ruido en consola
    await sequelize.sync({ force: true, alter: false, logging: false });

    logger.info('✅ Todas las tablas recreadas\n');

    // PASO 3: Poblar con datos iniciales
    logger.info('📝 PASO 3: Poblando datos iniciales...\n');

    // Nueva transacción para insertar datos
    const insertTransaction = await sequelize.transaction();

    try {
      // 3.1 Módulos (1-5)
      logger.info('📦 Creando módulos...');
      for (const moduloData of MODULOS) {
        await Modulo.create(moduloData, { transaction: insertTransaction });
        logger.info(`  ✅ ${moduloData.nombre_modulo} creado`);
      }

      // 3.2 Comorbilidades
      logger.info('\n🩺 Creando comorbilidades...');
      for (const comorbData of COMORBILIDADES) {
        await Comorbilidad.create(comorbData, { transaction: insertTransaction });
        logger.info(`  ✅ ${comorbData.nombre_comorbilidad}`);
      }

      // 3.3 Medicamentos
      logger.info('\n💊 Creando medicamentos...');
      for (const medicData of MEDICAMENTOS) {
        await Medicamento.create(medicData, { transaction: insertTransaction });
        logger.info(`  ✅ ${medicData.nombre_medicamento}`);
      }

      // 3.4 Vacunas
      logger.info('\n💉 Creando vacunas...');
      for (const vacunaData of VACUNAS) {
        await Vacuna.create(vacunaData, { transaction: insertTransaction });
        logger.info(`  ✅ ${vacunaData.nombre_vacuna}`);
      }

      await insertTransaction.commit();

      // Resumen final
      const totalModulos = await Modulo.count();
      const totalComorbilidades = await Comorbilidad.count();
      const totalMedicamentos = await Medicamento.count();
      const totalVacunas = await Vacuna.count();

      logger.info('\n' + '='.repeat(80));
      logger.info('✅ BASE DE DATOS RECREADA EXITOSAMENTE');
      logger.info('='.repeat(80));
      logger.info(`📦 Módulos: ${totalModulos}`);
      logger.info(`🩺 Comorbilidades: ${totalComorbilidades}`);
      logger.info(`💊 Medicamentos: ${totalMedicamentos}`);
      logger.info(`💉 Vacunas: ${totalVacunas}`);
      logger.info('='.repeat(80));

      logger.info('\n🎉 ¡Base de datos lista para usar!');

    } catch (insertError) {
      await insertTransaction.rollback();
      logger.error('❌ Error insertando datos:', insertError);
      throw insertError;
    }

  } catch (error) {
    logger.error('❌ Error recreando base de datos:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
// Usar una forma más confiable de detectar ejecución directa
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
                     process.argv[1]?.replace(/\\/g, '/').endsWith('recrear-db-completa.js');

if (isMainModule || process.argv[1]?.includes('recrear-db-completa')) {
  recrearBaseDatos()
    .then(() => {
      logger.info('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\n❌ Error fatal:', error);
      console.error('Error detallado:', error);
      process.exit(1);
    });
}

export default recrearBaseDatos;

