import sequelize from '../config/db.js';
import { Medicamento } from '../models/associations.js';

/**
 * Script para agregar medicamentos comunes utilizados para tratar comorbilidades
 */

const medicamentos = [
  {
    nombre_medicamento: 'Metformina 500mg',
    descripcion: 'Antidiabético oral de primera línea para el tratamiento de Diabetes Mellitus Tipo 2. Reduce la producción de glucosa hepática y mejora la sensibilidad a la insulina. Indicado también en pacientes con síndrome metabólico.'
  },
  {
    nombre_medicamento: 'Losartán 50mg',
    descripcion: 'Antihipertensivo del grupo de los antagonistas de los receptores de angiotensina II (ARA II). Indicado para el tratamiento de Hipertensión Arterial. También tiene efecto renoprotector en pacientes con Diabetes y enfermedad renal.'
  },
  {
    nombre_medicamento: 'Atorvastatina 20mg',
    descripcion: 'Hipolipemiante del grupo de las estatinas. Indicado para el tratamiento de Dislipidemia, reduce los niveles de colesterol LDL y triglicéridos. También se utiliza en prevención cardiovascular secundaria.'
  },
  {
    nombre_medicamento: 'Orlistat 120mg',
    descripcion: 'Inhibidor de la lipasa pancreática utilizado como coadyuvante en el tratamiento de Obesidad. Actúa bloqueando la absorción de grasas en el intestino. Debe acompañarse de dieta baja en calorías y ejercicio físico.'
  }
];

async function seedMedicamentos() {
  try {
    console.log('💊 Iniciando inserción de medicamentos para comorbilidades...\n');

    let creados = 0;
    let duplicados = 0;

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
          console.log(`  ✅ Creado: ${medicamento.nombre_medicamento}`);
          console.log(`     📝 ${medicamento.descripcion.substring(0, 80)}...`);
          creados++;
        } else {
          console.log(`  ⚠️  Ya existe: ${medicamento.nombre_medicamento}`);
          duplicados++;
        }
      } catch (error) {
        console.error(`  ❌ Error al crear ${medicamento.nombre_medicamento}:`, error.message);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Medicamentos creados: ${creados}`);
    console.log(`   ⚠️  Medicamentos duplicados (omitidos): ${duplicados}`);
    console.log(`   📦 Total procesados: ${medicamentos.length}\n`);

    // Mostrar todos los medicamentos en la base de datos
    const totalMedicamentos = await Medicamento.count();
    console.log(`💊 Total de medicamentos en el sistema: ${totalMedicamentos}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  }
}

// Ejecutar script
seedMedicamentos();


