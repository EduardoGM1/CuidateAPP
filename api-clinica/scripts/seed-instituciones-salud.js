/**
 * Crea la tabla instituciones_salud (si no existe) e inserta los valores por defecto.
 * Ejecutar: node scripts/seed-instituciones-salud.js
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import sequelize from '../config/db.js';
import InstitucionSalud from '../models/InstitucionSalud.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const DEFAULT_VALUES = [
  'IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro',
  'SEMAR', 'INSABI', 'PEMEX', 'SEDENA', 'Secretaría de Salud', 'Ninguna'
];

async function main() {
  console.log('\n  Seed: Instituciones de salud\n');
  try {
    await sequelize.authenticate();
    await InstitucionSalud.sync({ alter: false });
    let created = 0;
    for (let i = 0; i < DEFAULT_VALUES.length; i++) {
      const [inst] = await InstitucionSalud.findOrCreate({
        where: { nombre: DEFAULT_VALUES[i] },
        defaults: { nombre: DEFAULT_VALUES[i], activo: true, orden: i + 1 }
      });
      if (inst.isNewRecord) created++;
    }
    console.log(`  Instituciones en BD: ${await InstitucionSalud.count()}, creadas en esta ejecución: ${created}\n`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
