import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Medicamento, Vacuna } from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * Script para añadir medicamentos y vacunas de prueba a la base de datos
 * Incluye medicamentos comunes y vacunas del esquema nacional de vacunación
 */

const medicamentos = [
  // Antidiabéticos
  {
    nombre_medicamento: 'Metformina 500mg',
    descripcion: 'Antidiabético oral de primera línea para Diabetes Mellitus Tipo 2. Reduce la producción de glucosa hepática y mejora la sensibilidad a la insulina.'
  },
  {
    nombre_medicamento: 'Metformina 850mg',
    descripcion: 'Antidiabético oral, dosis más alta para mejor control glucémico.'
  },
  {
    nombre_medicamento: 'Glibenclamida 5mg',
    descripcion: 'Antidiabético oral del grupo de las sulfonilureas. Estimula la secreción de insulina.'
  },
  {
    nombre_medicamento: 'Insulina NPH',
    descripcion: 'Insulina de acción intermedia para el control de la diabetes.'
  },
  {
    nombre_medicamento: 'Insulina Rápida',
    descripcion: 'Insulina de acción rápida para el control de glucemias postprandiales.'
  },

  // Antihipertensivos
  {
    nombre_medicamento: 'Losartán 50mg',
    descripcion: 'Antihipertensivo ARA II. Indicado para Hipertensión Arterial y protección renal en diabéticos.'
  },
  {
    nombre_medicamento: 'Losartán 100mg',
    descripcion: 'Antihipertensivo ARA II, dosis más alta para mejor control tensional.'
  },
  {
    nombre_medicamento: 'Enalapril 10mg',
    descripcion: 'Inhibidor de la enzima convertidora de angiotensina (IECA). Antihipertensivo y cardioprotector.'
  },
  {
    nombre_medicamento: 'Amlodipino 5mg',
    descripcion: 'Bloqueador de canales de calcio. Antihipertensivo de acción prolongada.'
  },
  {
    nombre_medicamento: 'Hidroclorotiazida 25mg',
    descripcion: 'Diurético tiazídico. Antihipertensivo y coadyuvante en el tratamiento de la hipertensión.'
  },

  // Hipolipemiantes
  {
    nombre_medicamento: 'Atorvastatina 20mg',
    descripcion: 'Estatina para el tratamiento de Dislipidemia. Reduce colesterol LDL y triglicéridos.'
  },
  {
    nombre_medicamento: 'Atorvastatina 40mg',
    descripcion: 'Estatina de mayor potencia para control de dislipidemia severa.'
  },
  {
    nombre_medicamento: 'Simvastatina 20mg',
    descripcion: 'Estatina para reducción de colesterol y prevención cardiovascular.'
  },
  {
    nombre_medicamento: 'Rosuvastatina 10mg',
    descripcion: 'Estatina de alta potencia para control de dislipidemia.'
  },

  // Antiagregantes y Anticoagulantes
  {
    nombre_medicamento: 'Ácido Acetilsalicílico 100mg',
    descripcion: 'Antiagregante plaquetario. Prevención de eventos cardiovasculares.'
  },
  {
    nombre_medicamento: 'Clopidogrel 75mg',
    descripcion: 'Antiagregante plaquetario. Indicado en síndromes coronarios agudos.'
  },
  {
    nombre_medicamento: 'Warfarina 5mg',
    descripcion: 'Anticoagulante oral. Prevención de trombosis y embolias.'
  },

  // Antidiabéticos nuevos
  {
    nombre_medicamento: 'Sitagliptina 100mg',
    descripcion: 'Inhibidor de DPP-4. Antidiabético oral de segunda línea.'
  },
  {
    nombre_medicamento: 'Empagliflozina 10mg',
    descripcion: 'Inhibidor de SGLT2. Antidiabético con beneficios cardiovasculares.'
  },

  // Analgésicos y Antiinflamatorios
  {
    nombre_medicamento: 'Paracetamol 500mg',
    descripcion: 'Analgésico y antipirético. Alivio del dolor y fiebre.'
  },
  {
    nombre_medicamento: 'Ibuprofeno 400mg',
    descripcion: 'Antiinflamatorio no esteroideo (AINE). Analgésico, antipirético y antiinflamatorio.'
  },
  {
    nombre_medicamento: 'Naproxeno 500mg',
    descripcion: 'AINE de acción prolongada. Antiinflamatorio y analgésico.'
  },

  // Antibióticos comunes
  {
    nombre_medicamento: 'Amoxicilina 500mg',
    descripcion: 'Antibiótico betalactámico. Tratamiento de infecciones bacterianas comunes.'
  },
  {
    nombre_medicamento: 'Amoxicilina/Ácido Clavulánico 875/125mg',
    descripcion: 'Antibiótico de amplio espectro. Tratamiento de infecciones resistentes.'
  },
  {
    nombre_medicamento: 'Azitromicina 500mg',
    descripcion: 'Antibiótico macrólido. Tratamiento de infecciones respiratorias.'
  },
  {
    nombre_medicamento: 'Ciprofloxacino 500mg',
    descripcion: 'Antibiótico fluoroquinolona. Tratamiento de infecciones del tracto urinario.'
  },

  // Medicamentos para Obesidad
  {
    nombre_medicamento: 'Orlistat 120mg',
    descripcion: 'Inhibidor de lipasa. Coadyuvante en el tratamiento de obesidad.'
  },

  // Broncodilatadores
  {
    nombre_medicamento: 'Salbutamol Inhalador',
    descripcion: 'Broncodilatador beta-2 agonista. Tratamiento del asma y EPOC.'
  },
  {
    nombre_medicamento: 'Budesonida Inhalador',
    descripcion: 'Corticosteroide inhalado. Control del asma y EPOC.'
  },

  // Gastrointestinales
  {
    nombre_medicamento: 'Omeprazol 20mg',
    descripcion: 'Inhibidor de bomba de protones. Tratamiento de úlcera péptica y reflujo gastroesofágico.'
  },
  {
    nombre_medicamento: 'Ranitidina 150mg',
    descripcion: 'Antagonista H2. Reducción de secreción ácida gástrica.'
  },

  // Vitaminas y Suplementos
  {
    nombre_medicamento: 'Ácido Fólico 5mg',
    descripcion: 'Suplemento vitamínico. Prevención de defectos del tubo neural y tratamiento de anemias.'
  },
  {
    nombre_medicamento: 'Vitamina D3 1000 UI',
    descripcion: 'Suplemento de vitamina D. Prevención de deficiencia de vitamina D.'
  },
  {
    nombre_medicamento: 'Hierro Sulfato 200mg',
    descripcion: 'Suplemento de hierro. Tratamiento de anemia ferropénica.'
  }
];

const vacunas = [
  // Vacunas del Esquema Nacional de Vacunación
  {
    nombre_vacuna: 'BCG (Tuberculosis)',
    descripcion: 'Vacuna contra la tuberculosis. Se administra al nacer. Protege contra formas graves de tuberculosis en niños.',
    tipo: 'Bacteriana'
  },
  {
    nombre_vacuna: 'Hepatitis B',
    descripcion: 'Vacuna contra la hepatitis B. Serie de 3 dosis (0, 1 y 6 meses). Protege contra la infección hepática crónica.',
    tipo: 'Viral'
  },
  {
    nombre_vacuna: 'Pentavalente (DTP + Hib + Hepatitis B)',
    descripcion: 'Vacuna combinada que protege contra difteria, tétanos, tos ferina, Haemophilus influenzae tipo b y hepatitis B. Serie de 3 dosis en lactantes.',
    tipo: 'Combinada'
  },
  {
    nombre_vacuna: 'DTP (Difteria, Tétanos, Tos Ferina)',
    descripcion: 'Vacuna combinada contra difteria, tétanos y tos ferina. Refuerzos en niños y adultos.',
    tipo: 'Toxoide/Bacteriana'
  },
  {
    nombre_vacuna: 'Td (Tétanos y Difteria)',
    descripcion: 'Vacuna combinada de tétanos y difteria para adultos. Refuerzo cada 10 años.',
    tipo: 'Toxoide'
  },
  {
    nombre_vacuna: 'Tdap (Tétanos, Difteria, Tos Ferina Acelular)',
    descripcion: 'Vacuna combinada para adolescentes y adultos. Incluye componente de tos ferina acelular.',
    tipo: 'Toxoide/Bacteriana'
  },
  {
    nombre_vacuna: 'Polio (IPV)',
    descripcion: 'Vacuna inactivada contra la poliomielitis. Serie de 3 dosis en lactantes.',
    tipo: 'Viral'
  },
  {
    nombre_vacuna: 'Rotavirus',
    descripcion: 'Vacuna oral contra rotavirus. Previene gastroenteritis grave en lactantes. Serie de 2-3 dosis.',
    tipo: 'Viral'
  },
  {
    nombre_vacuna: 'Neumococo Conjugada (PCV13)',
    descripcion: 'Vacuna conjugada contra neumococo. Protege contra 13 serotipos. Serie de 3-4 dosis en lactantes.',
    tipo: 'Bacteriana'
  },
  {
    nombre_vacuna: 'Neumococo Polisacárida (PPSV23)',
    descripcion: 'Vacuna polisacárida contra neumococo. Protege contra 23 serotipos. Para adultos mayores y grupos de riesgo.',
    tipo: 'Bacteriana'
  },
  {
    nombre_vacuna: 'Triple Viral (MMR: Sarampión, Paperas, Rubéola)',
    descripcion: 'Vacuna combinada contra sarampión, paperas y rubéola. Primera dosis a los 12 meses, segunda a los 6 años.',
    tipo: 'Viral'
  },
  {
    nombre_vacuna: 'Varicela',
    descripcion: 'Vacuna contra varicela. Primera dosis a los 12 meses, segunda entre 4-6 años.',
    tipo: 'Viral'
  },
  {
    nombre_vacuna: 'Influenza (Gripe)',
    descripcion: 'Vacuna anual contra la influenza estacional. Recomendada para todos los grupos de edad, especialmente adultos mayores, niños y grupos de riesgo.',
    tipo: 'Viral'
  },
  {
    nombre_vacuna: 'Fiebre Amarilla',
    descripcion: 'Vacuna contra fiebre amarilla. Requerida para viajes a zonas endémicas. Dosis única con refuerzo cada 10 años.',
    tipo: 'Viral'
  },
  {
    nombre_vacuna: 'Hepatitis A',
    descripcion: 'Vacuna contra hepatitis A. Serie de 2 dosis. Recomendada para niños y grupos de riesgo.',
    tipo: 'Viral'
  },
  {
    nombre_vacuna: 'VPH (Virus del Papiloma Humano)',
    descripcion: 'Vacuna contra el virus del papiloma humano. Previene cáncer cervicouterino y otras enfermedades relacionadas. Serie de 2-3 dosis en adolescentes.',
    tipo: 'Viral'
  },
  {
    nombre_vacuna: 'COVID-19 (mRNA)',
    descripcion: 'Vacuna contra COVID-19 de tecnología mRNA. Serie primaria de 2 dosis más refuerzos según recomendaciones.',
    tipo: 'Viral'
  },
  {
    nombre_vacuna: 'COVID-19 (Vector Viral)',
    descripcion: 'Vacuna contra COVID-19 de vector viral. Serie primaria de 1-2 dosis más refuerzos.',
    tipo: 'Viral'
  },
  {
    nombre_vacuna: 'Meningococo ACWY',
    descripcion: 'Vacuna conjugada contra meningococo serogrupos A, C, W e Y. Recomendada para adolescentes y grupos de riesgo.',
    tipo: 'Bacteriana'
  },
  {
    nombre_vacuna: 'Meningococo B',
    descripcion: 'Vacuna contra meningococo serogrupo B. Recomendada para grupos de riesgo y adolescentes.',
    tipo: 'Bacteriana'
  },
  {
    nombre_vacuna: 'Herpes Zóster',
    descripcion: 'Vacuna contra herpes zóster (culebrilla). Recomendada para adultos mayores de 50 años.',
    tipo: 'Viral'
  }
];

async function seedMedicamentosVacunas() {
  try {
    logger.info('🔌 Conectando a la base de datos...');
    await sequelize.authenticate();
    logger.info('✅ Conexión establecida\n');

    // ============================================
    // MEDICAMENTOS
    // ============================================
    logger.info('💊 Iniciando inserción de medicamentos...\n');
    let medicamentosCreados = 0;
    let medicamentosExistentes = 0;
    let medicamentosErrores = 0;

    for (const medicamento of medicamentos) {
      try {
        const [nuevoMedicamento, created] = await Medicamento.findOrCreate({
          where: { nombre_medicamento: medicamento.nombre_medicamento },
          defaults: {
            nombre_medicamento: medicamento.nombre_medicamento,
            descripcion: medicamento.descripcion
          }
        });

        if (created) {
          logger.info(`  ✅ Creado: ${medicamento.nombre_medicamento}`);
          medicamentosCreados++;
        } else {
          logger.warn(`  ⚠️  Ya existe: ${medicamento.nombre_medicamento}`);
          medicamentosExistentes++;
        }
      } catch (error) {
        logger.error(`  ❌ Error al crear ${medicamento.nombre_medicamento}:`, error.message);
        medicamentosErrores++;
      }
    }

    logger.info('\n📊 Resumen Medicamentos:');
    logger.info(`   ✅ Creados: ${medicamentosCreados}`);
    logger.info(`   ⚠️  Existentes: ${medicamentosExistentes}`);
    logger.info(`   ❌ Errores: ${medicamentosErrores}`);
    logger.info(`   📦 Total procesados: ${medicamentos.length}\n`);

    // ============================================
    // VACUNAS
    // ============================================
    logger.info('💉 Iniciando inserción de vacunas...\n');
    let vacunasCreadas = 0;
    let vacunasExistentes = 0;
    let vacunasErrores = 0;

    for (const vacuna of vacunas) {
      try {
        const [nuevaVacuna, created] = await Vacuna.findOrCreate({
          where: { nombre_vacuna: vacuna.nombre_vacuna },
          defaults: {
            nombre_vacuna: vacuna.nombre_vacuna,
            descripcion: vacuna.descripcion,
            tipo: vacuna.tipo
          }
        });

        if (created) {
          logger.info(`  ✅ Creada: ${vacuna.nombre_vacuna} (${vacuna.tipo})`);
          vacunasCreadas++;
        } else {
          logger.warn(`  ⚠️  Ya existe: ${vacuna.nombre_vacuna}`);
          vacunasExistentes++;
        }
      } catch (error) {
        logger.error(`  ❌ Error al crear ${vacuna.nombre_vacuna}:`, error.message);
        vacunasErrores++;
      }
    }

    logger.info('\n📊 Resumen Vacunas:');
    logger.info(`   ✅ Creadas: ${vacunasCreadas}`);
    logger.info(`   ⚠️  Existentes: ${vacunasExistentes}`);
    logger.info(`   ❌ Errores: ${vacunasErrores}`);
    logger.info(`   📦 Total procesadas: ${vacunas.length}\n`);

    // ============================================
    // RESUMEN FINAL
    // ============================================
    const totalMedicamentos = await Medicamento.count();
    const totalVacunas = await Vacuna.count();

    logger.info('📊 Resumen Final:');
    logger.info(`   💊 Total medicamentos en BD: ${totalMedicamentos}`);
    logger.info(`   💉 Total vacunas en BD: ${totalVacunas}`);
    logger.info('\n✅ Proceso completado exitosamente');

  } catch (error) {
    logger.error('❌ Error en el proceso de seeding:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar el script
seedMedicamentosVacunas()
  .then(() => {
    logger.info('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });


