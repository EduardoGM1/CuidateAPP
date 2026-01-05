import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import {
  Modulo,
  Comorbilidad,
  Medicamento,
  Vacuna
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
  { nombre_comorbilidad: 'Insuficiencia Cardíaca', descripcion: 'Incapacidad del corazón para bombear suficiente sangre' },
  { nombre_comorbilidad: 'Enfermedad Renal Crónica', descripcion: 'Pérdida progresiva de la función renal' },
  { nombre_comorbilidad: 'Cáncer', descripcion: 'Crecimiento descontrolado de células anormales' },
  { nombre_comorbilidad: 'Depresión', descripcion: 'Trastorno del estado de ánimo que causa tristeza persistente' },
  { nombre_comorbilidad: 'Ansiedad', descripcion: 'Sentimientos de preocupación, nerviosismo o miedo' },
  { nombre_comorbilidad: 'Demencia', descripcion: 'Deterioro de la función cognitiva' },
  { nombre_comorbilidad: 'Accidente Cerebrovascular (ACV)', descripcion: 'Interrupción del flujo sanguíneo al cerebro' },
  { nombre_comorbilidad: 'Osteoporosis', descripcion: 'Enfermedad que debilita los huesos' },
  { nombre_comorbilidad: 'VIH/SIDA', descripcion: 'Virus de inmunodeficiencia humana' },
  { nombre_comorbilidad: 'Hepatitis Crónica', descripcion: 'Inflamación crónica del hígado' },
  { nombre_comorbilidad: 'Enfermedad de Parkinson', descripcion: 'Trastorno progresivo del sistema nervioso' },
  { nombre_comorbilidad: 'Epilepsia', descripcion: 'Trastorno neurológico con convulsiones recurrentes' },
  { nombre_comorbilidad: 'Migraña Crónica', descripcion: 'Dolores de cabeza recurrentes y severos' },
  { nombre_comorbilidad: 'Síndrome de Intestino Irritable (SII)', descripcion: 'Trastorno que afecta el intestino grueso' }
];

const MEDICAMENTOS = [
  { nombre_medicamento: 'Metformina', descripcion: 'Antidiabético oral' },
  { nombre_medicamento: 'Lisinopril', descripcion: 'Inhibidor de la ECA para hipertensión' },
  { nombre_medicamento: 'Atorvastatina', descripcion: 'Estatina para colesterol alto' },
  { nombre_medicamento: 'Salbutamol', descripcion: 'Broncodilatador para asma/EPOC' },
  { nombre_medicamento: 'Insulina Glargina', descripcion: 'Insulina de acción prolongada' },
  { nombre_medicamento: 'Amoxicilina', descripcion: 'Antibiótico de amplio espectro' },
  { nombre_medicamento: 'Paracetamol', descripcion: 'Analgésico y antipirético' },
  { nombre_medicamento: 'Ibuprofeno', descripcion: 'Antiinflamatorio no esteroideo (AINE)' },
  { nombre_medicamento: 'Omeprazol', descripcion: 'Inhibidor de la bomba de protones' },
  { nombre_medicamento: 'Sertralina', descripcion: 'Antidepresivo ISRS' },
  { nombre_medicamento: 'Losartán', descripcion: 'Antagonista del receptor de angiotensina II' },
  { nombre_medicamento: 'Warfarina', descripcion: 'Anticoagulante' },
  { nombre_medicamento: 'Levotiroxina', descripcion: 'Hormona tiroidea' },
  { nombre_medicamento: 'Vitamina D', descripcion: 'Suplemento vitamínico' },
  { nombre_medicamento: 'Furosemida', descripcion: 'Diurético' },
  { nombre_medicamento: 'Gabapentina', descripcion: 'Anticonvulsivo y para dolor neuropático' },
  { nombre_medicamento: 'Tramadol', descripcion: 'Analgésico opioide' },
  { nombre_medicamento: 'Prednisona', descripcion: 'Corticosteroide' },
  { nombre_medicamento: 'Ranitidina', descripcion: 'Antiácido y antiulceroso' },
  { nombre_medicamento: 'Clonazepam', descripcion: 'Ansiolítico y anticonvulsivo' },
  { nombre_medicamento: 'Amlodipino', descripcion: 'Bloqueador de canales de calcio' },
  { nombre_medicamento: 'Metoprolol', descripcion: 'Bloqueador beta' },
  { nombre_medicamento: 'Atenolol', descripcion: 'Bloqueador beta selectivo' },
  { nombre_medicamento: 'Dipirona', descripcion: 'Analgésico y antipirético' },
  { nombre_medicamento: 'Diclofenaco', descripcion: 'Antiinflamatorio no esteroideo' },
  { nombre_medicamento: 'Azitromicina', descripcion: 'Antibiótico macrólido' },
  { nombre_medicamento: 'Ciprofloxacino', descripcion: 'Antibiótico fluoroquinolona' },
  { nombre_medicamento: 'Budesonida', descripcion: 'Corticosteroide inhalado' },
  { nombre_medicamento: 'Digoxina', descripcion: 'Cardiotónico' },
  { nombre_medicamento: 'Metronidazol', descripcion: 'Antibiótico y antiparasitario' },
  { nombre_medicamento: 'Clopidogrel', descripcion: 'Antiplaquetario' }
];

const VACUNAS = [
  { nombre_vacuna: 'Influenza Estacional', descripcion: 'Vacuna anual contra la gripe', tipo: 'Influenza' },
  { nombre_vacuna: 'COVID-19 (Pfizer)', descripcion: 'Vacuna contra el SARS-CoV-2', tipo: 'COVID-19' },
  { nombre_vacuna: 'COVID-19 (Moderna)', descripcion: 'Vacuna contra el SARS-CoV-2', tipo: 'COVID-19' },
  { nombre_vacuna: 'Tétanos, Difteria y Tos Ferina (Tdap)', descripcion: 'Vacuna para adultos contra tétanos, difteria y tos ferina', tipo: 'Tdap' },
  { nombre_vacuna: 'Hepatitis B', descripcion: 'Vacuna contra el virus de la Hepatitis B', tipo: 'Hepatitis' },
  { nombre_vacuna: 'Virus del Papiloma Humano (VPH)', descripcion: 'Vacuna contra el VPH', tipo: 'VPH' },
  { nombre_vacuna: 'Sarampión, Paperas y Rubéola (MMR)', descripcion: 'Vacuna triple vírica', tipo: 'MMR' },
  { nombre_vacuna: 'Varicela', descripcion: 'Vacuna contra la varicela', tipo: 'Varicela' },
  { nombre_vacuna: 'Herpes Zóster', descripcion: 'Vacuna contra herpes zóster (culebrilla)', tipo: 'Herpes Zóster' },
  { nombre_vacuna: 'Neumococo Polisacárida (PPSV23)', descripcion: 'Vacuna neumocócica polisacárida para adultos', tipo: 'Neumococo' },
  { nombre_vacuna: 'Fiebre Tifoidea', descripcion: 'Vacuna contra fiebre tifoidea', tipo: 'Fiebre Tifoidea' },
  { nombre_vacuna: 'BCG', descripcion: 'Vacuna contra tuberculosis', tipo: 'BCG' },
  { nombre_vacuna: 'DTP (Difteria, Tétanos, Tosferina)', descripcion: 'Vacuna triple bacteriana', tipo: 'DTP' },
  { nombre_vacuna: 'Hib (Haemophilus influenzae tipo b)', descripcion: 'Vacuna contra Haemophilus influenzae tipo b', tipo: 'Hib' },
  { nombre_vacuna: 'Polio (OPV)', descripcion: 'Vacuna antipoliomielítica oral', tipo: 'Polio' },
  { nombre_vacuna: 'Neumococo Conjugada (PCV)', descripcion: 'Vacuna neumocócica conjugada', tipo: 'Neumococo' },
  { nombre_vacuna: 'Rotavirus', descripcion: 'Vacuna contra rotavirus', tipo: 'Rotavirus' },
  { nombre_vacuna: 'Hepatitis A', descripcion: 'Vacuna contra Hepatitis A', tipo: 'Hepatitis' },
  { nombre_vacuna: 'Meningococo', descripcion: 'Vacuna contra meningococo', tipo: 'Meningococo' },
  { nombre_vacuna: 'Fiebre Amarilla', descripcion: 'Vacuna contra fiebre amarilla', tipo: 'Fiebre Amarilla' }
];

async function poblarDatosMaestros() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    logger.info('📝 POBLANDO DATOS MAESTROS');
    logger.info('='.repeat(80));

    const transaction = await sequelize.transaction();

    try {
      let creados = 0;
      let existentes = 0;

      // 1. Módulos (1-5)
      logger.info('\n📦 Creando módulos...');
      for (const moduloData of MODULOS) {
        const [modulo, created] = await Modulo.findOrCreate({
          where: { nombre_modulo: moduloData.nombre_modulo },
          defaults: moduloData,
          transaction
        });
        if (created) {
          logger.info(`  ✅ ${moduloData.nombre_modulo} creado`);
          creados++;
        } else {
          logger.info(`  ⚠️  ${moduloData.nombre_modulo} ya existe`);
          existentes++;
        }
      }

      // 2. Comorbilidades
      logger.info('\n🩺 Creando comorbilidades...');
      for (const comorbData of COMORBILIDADES) {
        const [comorb, created] = await Comorbilidad.findOrCreate({
          where: { nombre_comorbilidad: comorbData.nombre_comorbilidad },
          defaults: comorbData,
          transaction
        });
        if (created) {
          logger.info(`  ✅ ${comorbData.nombre_comorbilidad}`);
          creados++;
        } else {
          existentes++;
        }
      }

      // 3. Medicamentos
      logger.info('\n💊 Creando medicamentos...');
      for (const medicData of MEDICAMENTOS) {
        const [medic, created] = await Medicamento.findOrCreate({
          where: { nombre_medicamento: medicData.nombre_medicamento },
          defaults: medicData,
          transaction
        });
        if (created) {
          logger.info(`  ✅ ${medicData.nombre_medicamento}`);
          creados++;
        } else {
          existentes++;
        }
      }

      // 4. Vacunas
      logger.info('\n💉 Creando vacunas...');
      for (const vacunaData of VACUNAS) {
        const [vacuna, created] = await Vacuna.findOrCreate({
          where: { nombre_vacuna: vacunaData.nombre_vacuna },
          defaults: vacunaData,
          transaction
        });
        if (created) {
          logger.info(`  ✅ ${vacunaData.nombre_vacuna}`);
          creados++;
        } else {
          existentes++;
        }
      }

      await transaction.commit();

      // Resumen final
      const totalModulos = await Modulo.count();
      const totalComorbilidades = await Comorbilidad.count();
      const totalMedicamentos = await Medicamento.count();
      const totalVacunas = await Vacuna.count();

      logger.info('\n' + '='.repeat(80));
      logger.info('✅ DATOS MAESTROS POBLADOS EXITOSAMENTE');
      logger.info('='.repeat(80));
      logger.info(`📦 Módulos: ${totalModulos} (${creados} nuevos, ${existentes} ya existían)`);
      logger.info(`🩺 Comorbilidades: ${totalComorbilidades}`);
      logger.info(`💊 Medicamentos: ${totalMedicamentos}`);
      logger.info(`💉 Vacunas: ${totalVacunas}`);
      logger.info('='.repeat(80));

      logger.info('\n🎉 ¡Datos maestros listos para usar!');

    } catch (insertError) {
      await transaction.rollback();
      logger.error('❌ Error insertando datos:', insertError);
      throw insertError;
    }

  } catch (error) {
    logger.error('❌ Error poblando datos maestros:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
                     process.argv[1]?.replace(/\\/g, '/').endsWith('poblar-datos-maestros.js');

if (isMainModule || process.argv[1]?.includes('poblar-datos-maestros')) {
  poblarDatosMaestros()
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

export default poblarDatosMaestros;

